import ExcelJS from "exceljs";

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function normalizePhoneNumber(phoneValue: string): string {
  if (!phoneValue?.trim()) return phoneValue;
  let normalized = phoneValue.trim();
  if (normalized.includes("e") || normalized.includes("E")) {
    const numValue = parseFloat(normalized);
    if (!isNaN(numValue)) normalized = numValue.toFixed(0).replace(/\.0+$/, "");
  }
  const digitsOnly = normalized.replace(/\D/g, "");
  return digitsOnly.length >= 10
    ? digitsOnly
    : digitsOnly.length > 0
    ? digitsOnly
    : normalized;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

export async function extractHeaders(file: File): Promise<string[]> {
  const ext = getFileExtension(file.name);
  if (ext === "csv") {
    const text = await file.text();
    const firstLine = text.split("\n")[0].replace("\r", "");
    return parseCSVLine(firstLine);
  } else if (ext === "xlsx") {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const headers: string[] = [];
    workbook.worksheets[0]
      .getRow(1)
      .eachCell({ includeEmpty: false }, (cell) => {
        headers.push(cell.value?.toString() || "");
      });
    return headers;
  }
  throw new Error("Invalid file type");
}

export async function extractDataWithHeaders(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ext = getFileExtension(file.name);

  if (ext === "csv") {
    const text = await file.text();
    const [headerLine, ...lines] = text
      .split("\n")
      .map((line) => line.trim().replace("\r", ""));
    const headers = parseCSVLine(headerLine);
    const rows = lines
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const values = parseCSVLine(line);
        const phoneIndex = headers.findIndex((h) =>
          h.toLowerCase().includes("phone")
        );
        if (phoneIndex >= 0 && values[phoneIndex]) {
          values[phoneIndex] = normalizePhoneNumber(values[phoneIndex]);
        }
        return Object.fromEntries(
          headers.map((h, i) => [h, values[i]?.trim() || ""])
        );
      });
    return { headers, rows };
  } else if (ext === "xlsx") {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString() || "");
    });
    const rows: Record<string, string>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: Record<string, string> = {};
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        let cellValue: string;
        if (cell.type === ExcelJS.ValueType.Number) {
          const numValue = cell.value as number;
          const numStr = numValue.toString();
          if (numStr.includes("e") || numStr.includes("E")) {
            cellValue = numValue.toFixed(0).replace(/\.0+$/, "");
          } else {
            cellValue = numStr;
          }
        } else {
          cellValue = cell.text || cell.value?.toString() || "";
        }
        if (header.toLowerCase().includes("phone") && cellValue) {
          cellValue = normalizePhoneNumber(cellValue);
        }
        rowData[header] = cellValue;
      });
      rows.push(rowData);
    });
    return { headers, rows };
  }
  throw new Error("Unsupported file format.");
}
