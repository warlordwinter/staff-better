import ExcelJS from "exceljs";

function getFileExtension(filename: string): string {
  return filename?.split(".").pop()?.toLowerCase() || "";
}

function getFileType(file: File | Blob): string {
  // Try to get extension from filename first
  const filename = (file as File).name;
  if (filename) {
    return getFileExtension(filename);
  }

  // Fallback to MIME type
  if (file.type === "text/csv") {
    return "csv";
  } else if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }

  return "";
}

function normalizePhoneNumber(phoneValue: string): string {
  if (!phoneValue?.trim()) return phoneValue;
  let normalized = phoneValue.trim();

  // Handle scientific notation
  if (normalized.includes("e") || normalized.includes("E")) {
    const numValue = parseFloat(normalized);
    if (!isNaN(numValue)) normalized = numValue.toFixed(0).replace(/\.0+$/, "");
  }

  // Check for extensions before stripping all non-digits
  const extMatch = normalized.match(/(.*?)\s+(ext(?:ension)?|x)\s*(\d+)/i);
  if (extMatch) {
    const phonepart = extMatch[1].trim();
    const extension = extMatch[2] + " " + extMatch[3];
    const digitsOnly = phonepart.replace(/\D/g, "");
    return digitsOnly.length >= 10
      ? digitsOnly + " " + extension
      : digitsOnly.length > 0
      ? digitsOnly + " " + extension
      : normalized;
  }

  // No extension found, proceed with normal normalization
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
  let wasQuoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote - add a single quote to the current value
        current += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        if (!inQuotes) {
          wasQuoted = true;
        }
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      values.push(wasQuoted ? current : current.trim());
      current = "";
      wasQuoted = false;
    } else {
      current += char;
    }
  }

  // Add the last field
  values.push(wasQuoted ? current : current.trim());
  return values;
}

export async function extractHeaders(file: File): Promise<string[]> {
  const ext = getFileType(file);
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
  const ext = getFileType(file);

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
      // Initialize all headers with empty strings
      headers.forEach((header) => {
        rowData[header] = "";
      });

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
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
        }
      });
      rows.push(rowData);
    });
    return { headers, rows };
  }
  throw new Error("Unsupported file format.");
}
