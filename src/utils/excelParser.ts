import ExcelJS from "exceljs";

// Helper function to check file extension
function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}

// Parse .cvs files
async function extractHeadersFromCSV(file: File): Promise<string[]> {
    const text = await file.text();
    const firstLine = text.split('\n')[0].replace('\r', '');
    return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ""));
}

// Parse .xlsx files
async function extractHeadersFromXLSX(file: File): Promise<string[]> {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Get the worksheet (the first one)
    const worksheet = workbook.worksheets[0];

    // Get first row (headers)
    const headerRow = worksheet.getRow(1);

    // Collect headers, filtering out empty cells
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
        headers.push(cell.value?.toString() || "");
    });

    return headers;
}

export async function extractHeaders(file: File): Promise<string[]> {
    const extension = getFileExtension(file.name);

    if (extension === "csv") {
        return await extractHeadersFromCSV(file);
    } else if (extension === "xlsx") {
        return await extractHeadersFromXLSX(file);
    } else {
        throw new Error("Invalid file type");
    }
}

// In excelParser.ts
export async function extractDataWithHeaders(file: File): Promise<{ headers: string[], rows: Record<string, string>[] }> {
  const extension = getFileExtension(file.name);

  if (extension === "csv") {
    const text = await file.text();
    const [headerLine, ...lines] = text.split('\n').map(line => line.trim().replace('\r', ''));
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.map(line => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim()]));
    });
    return { headers, rows };
  } else if (extension === "xlsx") {
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
      if (rowNumber === 1) return; // skip header row
      const rowData: Record<string, string> = {};
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        rowData[header] = cell.value?.toString() || "";
      });
      rows.push(rowData);
    });

    return { headers, rows };
  }

  throw new Error("Unsupported file format.");
}
