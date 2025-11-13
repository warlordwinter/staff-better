/**
 * @jest-environment node
 */
import { extractHeaders, extractDataWithHeaders } from "@/utils/excelParser";
import ExcelJS from "exceljs";

// Mock ExcelJS
jest.mock("exceljs", () => {
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      worksheets: [],
      xlsx: {
        load: jest.fn(),
      },
    })),
    ValueType: {
      String: 1,
      Number: 2,
      Date: 3,
      Formula: 4,
    },
  };
});

describe("excelParser", () => {
  describe("extractHeaders", () => {
    describe("CSV files", () => {
      it("should extract headers from a simple CSV file", async () => {
        const csvContent = "Name,Phone,Email\n";
        const file = new File([csvContent], "test.csv", { type: "text/csv" });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["Name", "Phone", "Email"]);
      });

      it("should handle CSV headers with quoted values", async () => {
        const csvContent = '"First Name","Last Name","Phone Number"\n';
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["First Name", "Last Name", "Phone Number"]);
      });

      it("should handle CSV headers with escaped quotes", async () => {
        const csvContent = '"Name with ""quotes""","Phone","Email"\n';
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(['Name with "quotes"', "Phone", "Email"]);
      });

      it("should handle CSV headers with Windows line endings", async () => {
        const csvContent = "Name,Phone,Email\r\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["Name", "Phone", "Email"]);
      });

      it("should handle CSV headers with spaces and special characters", async () => {
        const csvContent = "First Name,Phone #,Email Address\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["First Name", "Phone #", "Email Address"]);
      });
    });

    describe("XLSX files", () => {
      let mockWorkbook: any;
      let mockWorksheet: any;
      let mockRow: any;

      beforeEach(() => {
        mockRow = {
          eachCell: jest.fn((options, callback) => {
            // Handle both signatures: eachCell(callback) and eachCell(options, callback)
            const actualCallback =
              typeof options === "function" ? options : callback;
            const cells = [
              { value: "Name" },
              { value: "Phone" },
              { value: "Email" },
            ];
            cells.forEach((cell, index) => {
              actualCallback(cell, index + 1);
            });
          }),
        };

        mockWorksheet = {
          getRow: jest.fn(() => mockRow),
        };

        mockWorkbook = {
          worksheets: [mockWorksheet],
          xlsx: {
            load: jest.fn().mockResolvedValue(undefined),
          },
        };

        (ExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);
      });

      it("should extract headers from an XLSX file", async () => {
        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["Name", "Phone", "Email"]);
        expect(ExcelJS.Workbook).toHaveBeenCalled();
        expect(mockWorkbook.xlsx.load).toHaveBeenCalledWith(buffer);
        expect(mockWorksheet.getRow).toHaveBeenCalledWith(1);
      });

      it("should handle XLSX headers with empty cells", async () => {
        mockRow.eachCell = jest.fn((_, callback) => {
          const cells = [{ value: "Name" }, { value: "Phone" }];
          cells.forEach((cell, index) => {
            callback(cell, index + 1);
          });
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["Name", "Phone"]);
      });

      it("should handle XLSX headers with null values", async () => {
        mockRow.eachCell = jest.fn((options, callback) => {
          const cells = [
            { value: "Name" },
            { value: null },
            { value: "Email" },
          ];
          cells.forEach((cell, index) => {
            if (cell.value !== null) {
              callback(cell, index + 1);
            }
          });
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const headers = await extractHeaders(file);

        expect(headers).toEqual(["Name", "Email"]);
      });
    });

    describe("Error handling", () => {
      it("should throw error for unsupported file types", async () => {
        const file = new File(["content"], "test.txt", { type: "text/plain" });

        await expect(extractHeaders(file)).rejects.toThrow("Invalid file type");
      });

      it("should throw error for files without extension", async () => {
        const file = new File(["content"], "test", { type: "text/plain" });

        await expect(extractHeaders(file)).rejects.toThrow("Invalid file type");
      });
    });
  });

  describe("extractDataWithHeaders", () => {
    describe("CSV files", () => {
      it("should extract data with headers from a simple CSV file", async () => {
        const csvContent =
          "Name,Phone,Email\nJohn Doe,1234567890,john@example.com\nJane Smith,0987654321,jane@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.headers).toEqual(["Name", "Phone", "Email"]);
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toEqual({
          Name: "John Doe",
          Phone: "1234567890",
          Email: "john@example.com",
        });
        expect(result.rows[1]).toEqual({
          Name: "Jane Smith",
          Phone: "0987654321",
          Email: "jane@example.com",
        });
      });

      it("should normalize phone numbers in CSV data", async () => {
        const csvContent =
          "Name,Phone Number,Email\nJohn Doe,(123) 456-7890,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0]["Phone Number"]).toBe("1234567890");
      });

      it("should handle phone numbers in scientific notation", async () => {
        const csvContent =
          "Name,Phone,Email\nJohn Doe,1.23456789e+09,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("1234567890");
      });

      it("should handle CSV with quoted values containing commas", async () => {
        const csvContent =
          'Name,Address,Phone\n"John Doe","123 Main St, Apt 4",1234567890\n';
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0]).toEqual({
          Name: "John Doe",
          Address: "123 Main St, Apt 4",
          Phone: "1234567890",
        });
      });

      it("should filter out empty lines", async () => {
        const csvContent =
          "Name,Phone,Email\nJohn Doe,1234567890,john@example.com\n\nJane Smith,0987654321,jane@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows).toHaveLength(2);
      });

      it("should handle CSV with Windows line endings", async () => {
        const csvContent =
          "Name,Phone,Email\r\nJohn Doe,1234567890,john@example.com\r\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.headers).toEqual(["Name", "Phone", "Email"]);
        expect(result.rows).toHaveLength(1);
      });

      it("should trim whitespace from cell values", async () => {
        const csvContent =
          "Name,Phone,Email\n  John Doe  ,  1234567890  ,  john@example.com  \n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0]).toEqual({
          Name: "John Doe",
          Phone: "1234567890",
          Email: "john@example.com",
        });
      });

      it("should handle missing values in CSV rows", async () => {
        const csvContent =
          "Name,Phone,Email\nJohn Doe,,john@example.com\nJane Smith,0987654321,\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("");
        expect(result.rows[1].Email).toBe("");
      });

      it("should handle phone column with different case variations", async () => {
        const csvContent =
          "Name,PHONE,Email\nJohn Doe,1234567890,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].PHONE).toBe("1234567890");
      });

      it("should handle phone column with 'phone' in the name", async () => {
        const csvContent =
          "Name,Phone Number,Email\nJohn Doe,1234567890,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0]["Phone Number"]).toBe("1234567890");
      });
    });

    describe("XLSX files", () => {
      let mockWorkbook: any;
      let mockWorksheet: any;
      let mockHeaderRow: any;
      let mockDataRows: any[];

      beforeEach(() => {
        mockHeaderRow = {
          eachCell: jest.fn((options, callback) => {
            // Handle both signatures: eachCell(callback) and eachCell(options, callback)
            const actualCallback =
              typeof options === "function" ? options : callback;
            const cells = [
              { value: "Name" },
              { value: "Phone" },
              { value: "Email" },
            ];
            cells.forEach((cell, index) => {
              actualCallback(cell, index + 1);
            });
          }),
        };

        mockDataRows = [
          {
            rowNumber: 1,
            eachCell: jest.fn(() => {
              // This is the header row, should be skipped
            }),
          },
          {
            rowNumber: 2,
            eachCell: jest.fn((options, callback) => {
              // Handle both signatures: eachCell(callback) and eachCell(options, callback)
              const actualCallback =
                typeof options === "function" ? options : callback;
              const cells = [
                { value: "John Doe", type: 1 }, // ExcelJS.ValueType.String
                { value: 1234567890, type: 2 }, // ExcelJS.ValueType.Number
                { value: "john@example.com", type: 1 }, // ExcelJS.ValueType.String
              ];
              cells.forEach((cell, index) => {
                actualCallback(cell, index + 1);
              });
            }),
          },
          {
            rowNumber: 3,
            eachCell: jest.fn((options, callback) => {
              // Handle both signatures: eachCell(callback) and eachCell(options, callback)
              const actualCallback =
                typeof options === "function" ? options : callback;
              const cells = [
                { value: "Jane Smith", type: 1 }, // ExcelJS.ValueType.String
                { value: 987654321, type: 2 }, // ExcelJS.ValueType.Number
                { value: "jane@example.com", type: 1 }, // ExcelJS.ValueType.String
              ];
              cells.forEach((cell, index) => {
                actualCallback(cell, index + 1);
              });
            }),
          },
        ];

        mockWorksheet = {
          getRow: jest.fn((rowNum) => {
            if (rowNum === 1) return mockHeaderRow;
            return mockDataRows[rowNum - 1];
          }),
          eachRow: jest.fn((callback) => {
            mockDataRows.forEach((row) => callback(row, row.rowNumber));
          }),
        };

        mockWorkbook = {
          worksheets: [mockWorksheet],
          xlsx: {
            load: jest.fn().mockResolvedValue(undefined),
          },
        };

        (ExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);
      });

      it("should extract data with headers from an XLSX file", async () => {
        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.headers).toEqual(["Name", "Phone", "Email"]);
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toEqual({
          Name: "John Doe",
          Phone: "1234567890",
          Email: "john@example.com",
        });
        expect(result.rows[1]).toEqual({
          Name: "Jane Smith",
          Phone: "987654321",
          Email: "jane@example.com",
        });
      });

      it("should handle phone numbers in scientific notation in XLSX", async () => {
        mockDataRows[1].eachCell = jest.fn((options, callback) => {
          // Handle both signatures: eachCell(callback) and eachCell(options, callback)
          const actualCallback =
            typeof options === "function" ? options : callback;
          const cells = [
            { value: "John Doe", type: 1 }, // ExcelJS.ValueType.String
            {
              value: 1.23456789e9,
              type: 2, // ExcelJS.ValueType.Number
              toString: () => "1.23456789e+09",
            } as { value: number; type: number; toString: () => string },
            { value: "john@example.com", type: 1 }, // ExcelJS.ValueType.String
          ];
          cells.forEach((cell, index) => {
            actualCallback(cell, index + 1);
          });
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("1234567890");
      });

      it("should normalize phone numbers in XLSX data", async () => {
        mockDataRows[1].eachCell = jest.fn((options, callback) => {
          // Handle both signatures: eachCell(callback) and eachCell(options, callback)
          const actualCallback =
            typeof options === "function" ? options : callback;
          const cells = [
            { value: "John Doe", type: 1 }, // ExcelJS.ValueType.String
            {
              value: "(123) 456-7890",
              type: 1, // ExcelJS.ValueType.String
              text: "(123) 456-7890",
            },
            { value: "john@example.com", type: 1 }, // ExcelJS.ValueType.String
          ];
          cells.forEach((cell, index) => {
            actualCallback(cell, index + 1);
          });
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("1234567890");
      });

      it("should handle empty cells in XLSX rows", async () => {
        mockDataRows[1].eachCell = jest.fn((options, callback) => {
          // Handle both signatures: eachCell(callback) and eachCell(options, callback)
          const actualCallback =
            typeof options === "function" ? options : callback;
          const cells = [
            { value: "John Doe", type: 1 }, // ExcelJS.ValueType.String
            // Phone cell is empty
            { value: "john@example.com", type: 1 }, // ExcelJS.ValueType.String
          ];
          // Only call callback for non-empty cells
          actualCallback(cells[0], 1);
          actualCallback(cells[1], 3); // Email is in column 3
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Name).toBe("John Doe");
        expect(result.rows[0].Phone).toBe("");
        expect(result.rows[0].Email).toBe("john@example.com");
      });

      it("should use cell.text when available", async () => {
        mockDataRows[1].eachCell = jest.fn((options, callback) => {
          // Handle both signatures: eachCell(callback) and eachCell(options, callback)
          const actualCallback =
            typeof options === "function" ? options : callback;
          const cells = [
            {
              value: "John Doe",
              type: 1, // ExcelJS.ValueType.String
              text: "John Doe (Formatted)",
            },
            { value: 1234567890, type: 2 }, // ExcelJS.ValueType.Number
            { value: "john@example.com", type: 1 }, // ExcelJS.ValueType.String
          ];
          cells.forEach((cell, index) => {
            actualCallback(cell, index + 1);
          });
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Name).toBe("John Doe (Formatted)");
      });

      it("should handle phone column with different case variations in XLSX", async () => {
        mockHeaderRow.eachCell = jest.fn((options, callback) => {
          // Handle both signatures: eachCell(callback) and eachCell(options, callback)
          const actualCallback =
            typeof options === "function" ? options : callback;
          const cells = [
            { value: "Name" },
            { value: "PHONE" },
            { value: "Email" },
          ];
          cells.forEach((cell, index) => {
            actualCallback(cell, index + 1);
          });
        });

        mockDataRows[1].eachCell = jest.fn((options, callback) => {
          // Handle both signatures: eachCell(callback) and eachCell(options, callback)
          const actualCallback =
            typeof options === "function" ? options : callback;
          const cells = [
            { value: "John Doe", type: 1 }, // ExcelJS.ValueType.String
            {
              value: "(123) 456-7890",
              type: 1, // ExcelJS.ValueType.String
              text: "(123) 456-7890",
            },
            { value: "john@example.com", type: 1 }, // ExcelJS.ValueType.String
          ];
          cells.forEach((cell, index) => {
            actualCallback(cell, index + 1);
          });
        });

        const buffer = new ArrayBuffer(8);
        const file = new File([buffer], "test.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].PHONE).toBe("1234567890");
      });
    });

    describe("Error handling", () => {
      it("should throw error for unsupported file formats", async () => {
        const file = new File(["content"], "test.txt", { type: "text/plain" });

        await expect(extractDataWithHeaders(file)).rejects.toThrow(
          "Unsupported file format."
        );
      });

      it("should throw error for files without extension", async () => {
        const file = new File(["content"], "test", { type: "text/plain" });

        await expect(extractDataWithHeaders(file)).rejects.toThrow(
          "Unsupported file format."
        );
      });
    });

    describe("Phone number normalization edge cases", () => {
      it("should handle empty phone values", async () => {
        const csvContent = "Name,Phone,Email\nJohn Doe,,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("");
      });

      it("should handle phone values with only whitespace", async () => {
        const csvContent = "Name,Phone,Email\nJohn Doe,   ,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("");
      });

      it("should handle phone numbers with less than 10 digits", async () => {
        const csvContent =
          "Name,Phone,Email\nJohn Doe,12345,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("12345");
      });

      it("should handle phone numbers with non-numeric characters", async () => {
        const csvContent =
          "Name,Phone,Email\nJohn Doe,123-456-7890,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("1234567890");
      });

      it("should preserve original value if normalization fails", async () => {
        const csvContent = "Name,Phone,Email\nJohn Doe,abc,john@example.com\n";
        const file = new File([csvContent], "test.csv", {
          type: "text/csv",
        });

        const result = await extractDataWithHeaders(file);

        expect(result.rows[0].Phone).toBe("abc");
      });
    });
  });
});
