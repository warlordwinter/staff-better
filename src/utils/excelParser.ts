import ExcelJS from "exceljs";

// Helper function to check file extension
function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// Parse .cvs files
async function extractHeadersFromCSV(file: File): Promise<string[]> {
  const text = await file.text();
  const firstLine = text.split("\n")[0].replace("\r", "");
  return firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
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
export async function extractDataWithHeaders(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  console.log("🔍 extractDataWithHeaders called with file:", file.name);
  const extension = getFileExtension(file.name);
  console.log("📁 File extension detected:", extension);

  if (extension === "csv") {
    console.log("📄 Processing CSV file...");
    const text = await file.text();
    const [headerLine, ...lines] = text
      .split("\n")
      .map((line) => line.trim().replace("\r", ""));

    // Improved CSV parsing that handles quoted fields properly
    const parseCSVLine = (line: string): string[] => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          // End of field
          values.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      // Add last field
      values.push(current.trim().replace(/^"|"$/g, ""));
      return values;
    };

    const headers = parseCSVLine(headerLine);
    console.log("📋 CSV Headers parsed:", headers);

    const rows = lines
      .filter((line) => line.trim().length > 0) // Filter empty lines
      .map((line, lineIndex) => {
        const values = parseCSVLine(line);

        // Debug logging and special handling for phone numbers
        const phoneIndex = headers.findIndex((h) =>
          h.toLowerCase().includes("phone")
        );

        if (lineIndex === 0) {
          // Log phone column detection for first row
          console.log(`🔍 Phone column detection - phoneIndex: ${phoneIndex}`);
          if (phoneIndex >= 0) {
            console.log(
              `  ✅ Phone column found at index ${phoneIndex}: "${headers[phoneIndex]}"`
            );
          } else {
            console.log(`  ❌ No phone column found. Headers:`, headers);
          }
        }

        if (phoneIndex >= 0 && values[phoneIndex]) {
          let phoneValue = values[phoneIndex];
          const originalValue = phoneValue;

          // Handle scientific notation in CSV (Excel might export numbers as "1.23E+09")
          if (phoneValue.includes("e") || phoneValue.includes("E")) {
            const numValue = parseFloat(phoneValue);
            if (!isNaN(numValue)) {
              phoneValue = numValue.toFixed(0).replace(/\.0+$/, "");
              values[phoneIndex] = phoneValue; // Update the value
            }
          } else {
            // Check if it's a pure number (might have lost precision)
            // If it's a number with 7-9 digits, it might be truncated
            const numValue = parseFloat(phoneValue);
            const digitsOnly = phoneValue.replace(/\D/g, "");

            if (
              !isNaN(numValue) &&
              phoneValue === numValue.toString() &&
              digitsOnly.length >= 7 &&
              digitsOnly.length < 10
            ) {
              // It's a pure number that looks truncated (7-9 digits)
              // Try to find the full phone number in the raw line
              // Look for 10+ digit numbers, prioritizing ones that start with the truncated number
              const digitPattern = /\d{10,15}/g;
              const matches = line.match(digitPattern);
              if (matches && matches.length > 0) {
                // Find a match that starts with our truncated number
                const fullMatch = matches.find((match) =>
                  match.startsWith(digitsOnly)
                );
                if (fullMatch && fullMatch.length >= 10) {
                  phoneValue = fullMatch;
                  values[phoneIndex] = phoneValue;
                  console.log(
                    `  ⚠️ Phone number appeared truncated (${digitsOnly.length} digits), found full number in raw line: "${phoneValue}"`
                  );
                } else {
                  // No match starting with truncated number, use longest 10+ digit number
                  const longestMatch = matches.reduce((a, b) =>
                    a.length > b.length ? a : b
                  );
                  if (longestMatch.length >= 10) {
                    phoneValue = longestMatch;
                    values[phoneIndex] = phoneValue;
                    console.log(
                      `  ⚠️ Phone number appeared truncated (${digitsOnly.length} digits), using longest 10+ digit number from raw line: "${phoneValue}"`
                    );
                  }
                }
              }
            }
          }

          console.log(`📞 CSV Row ${lineIndex + 1} - Phone column extraction:`);
          console.log(`  - Raw line: "${line}"`);
          console.log(`  - Original parsed value: "${originalValue}"`);
          console.log(`  - Final phone value: "${values[phoneIndex]}"`);
          console.log(`  - Phone value length: ${values[phoneIndex].length}`);
          const digitsOnly = values[phoneIndex].replace(/\D/g, "");
          console.log(
            `  - Digits only: "${digitsOnly}" (${digitsOnly.length} digits)`
          );
        } else if (phoneIndex >= 0 && !values[phoneIndex]) {
          // Phone column exists but value is empty
          console.log(
            `📞 CSV Row ${
              lineIndex + 1
            } - Phone column found but value is empty`
          );
        } else if (phoneIndex < 0) {
          // No phone column found - log only for first few rows to avoid spam
          if (lineIndex < 3) {
            console.log(
              `📞 CSV Row ${
                lineIndex + 1
              } - No phone column detected in headers`
            );
          }
        }

        return Object.fromEntries(
          headers.map((h, i) => [h, values[i]?.trim() || ""])
        );
      });

    console.log(
      `✅ CSV parsing complete. Headers: ${headers.length}, Rows: ${rows.length}`
    );
    return { headers, rows };
  } else if (extension === "xlsx") {
    console.log("📊 Processing XLSX file...");
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

        let cellValue: string;

        // For numbers, we need to be careful about precision loss
        // Excel might store phone numbers as numbers and lose precision or use scientific notation
        // For phone numbers specifically, we should prioritize cell.text if it exists
        if (cell.type === ExcelJS.ValueType.Number) {
          const numValue = cell.value as number;

          // Convert number to string, handling scientific notation properly
          const numStr = numValue.toString();
          const numDigits = numStr.replace(/\D/g, "");

          // Check if this might be a phone number (7-15 digits)
          // If so, prioritize cell.text which might preserve formatting/precision better
          const isLikelyPhoneNumber =
            numDigits.length >= 7 && numDigits.length <= 15;

          if (isLikelyPhoneNumber && cell.text && cell.text.trim() !== "") {
            // For phone numbers, check if cell.text has more or equal digits
            const textDigits = cell.text.replace(/\D/g, "");

            // Debug logging for phone number extraction
            if (header.toLowerCase().includes("phone")) {
              console.log(`📞 Phone number extraction for header "${header}":`);
              console.log(`  - cell.value (raw): ${numValue}`);
              console.log(`  - cell.value.toString(): "${numStr}"`);
              console.log(`  - cell.text: "${cell.text}"`);
              console.log(
                `  - numDigits: ${numDigits.length} digits ("${numDigits}")`
              );
              console.log(
                `  - textDigits: ${textDigits.length} digits ("${textDigits}")`
              );
            }

            if (textDigits.length >= numDigits.length) {
              // cell.text has equal or more digits - use it to preserve formatting
              cellValue = cell.text;
              if (header.toLowerCase().includes("phone")) {
                console.log(`  ✅ Using cell.text: "${cellValue}"`);
              }
            } else {
              // cell.text has fewer digits, so the raw number is better
              // But still check for scientific notation
              if (numStr.includes("e") || numStr.includes("E")) {
                const fixed = numValue.toFixed(0);
                cellValue = fixed.replace(/\.0+$/, "");
                if (header.toLowerCase().includes("phone")) {
                  console.log(
                    `  ✅ Using fixed scientific notation: "${cellValue}"`
                  );
                }
              } else {
                cellValue = numStr;
                if (header.toLowerCase().includes("phone")) {
                  console.log(`  ✅ Using raw number: "${cellValue}"`);
                }
              }
            }
          } else {
            // Not a phone number or cell.text not available - use raw number
            if (numStr.includes("e") || numStr.includes("E")) {
              // Number is in scientific notation - convert without losing precision
              const fixed = numValue.toFixed(0);
              cellValue = fixed.replace(/\.0+$/, "");
            } else {
              // Number is not in scientific notation
              cellValue = numStr;
            }
          }
        } else if (
          cell.text !== undefined &&
          cell.text !== null &&
          cell.text !== ""
        ) {
          // For non-number types, prefer cell.text (formatted display value)
          // This is especially important for dates and other formatted cells
          cellValue = cell.text;
        } else {
          // For other types, convert to string
          cellValue = cell.value?.toString() || "";
        }

        rowData[header] = cellValue;
      });
      rows.push(rowData);
    });

    return { headers, rows };
  }

  throw new Error("Unsupported file format.");
}
