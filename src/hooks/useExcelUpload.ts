// hooks/useExcelUpload.ts
import { useState } from "react";
import { extractDataWithHeaders } from "@/utils/excelParser";

// A safe JSON value type for API payloads
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

interface UploadResult {
  success: boolean;
  data?: Json; // ⬅️ replace any with Json
  error?: string;
  rowsProcessed?: number;
}

interface UseExcelUploadReturn {
  uploadExcelFile: (file: File) => Promise<UploadResult>;
  isUploading: boolean;
  progress: {
    step:
      | "idle"
      | "parsing"
      | "mapping"
      | "transforming"
      | "uploading"
      | "complete"
      | "error";
    message: string;
  };
  reset: () => void;
}

export const useExcelUpload = (): UseExcelUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{
    step:
      | "idle"
      | "parsing"
      | "mapping"
      | "transforming"
      | "uploading"
      | "complete"
      | "error";
    message: string;
  }>({
    step: "idle",
    message: "Ready to upload",
  });

  const updateProgress = (step: typeof progress.step, message: string) => {
    setProgress({ step, message });
  };

  const uploadExcelFile = async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    updateProgress("parsing", "Parsing Excel file...");

    try {
      const { headers, rows } = await extractDataWithHeaders(file);
      console.log("=== EXCEL HEADERS ===");
      console.log(JSON.stringify(headers, null, 2));
      console.log("=== EXCEL ROWS (first 2) ===");
      console.log(JSON.stringify(rows.slice(0, 2), null, 2));
      console.log("=== END EXCEL DATA ===");

      if (!headers.length || !rows.length)
        throw new Error("No data found in the Excel file");

      updateProgress("mapping", "Mapping columns with AI...");
      const mappingRes = await fetch("/api/column-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers }),
      });
      if (!mappingRes.ok) throw new Error("Failed to map columns");

      const mapping: Record<string, string> = await mappingRes.json();
      console.log("=== COLUMN MAPPING RESPONSE ===");
      console.log(JSON.stringify(mapping, null, 2));
      console.log("=== END COLUMN MAPPING ===");

      updateProgress("transforming", "Transforming data...");
      const transformed = rows.map((row, rowIndex) => {
        const mappedRow: Record<string, string> = {};
        console.log(`Processing row ${rowIndex}:`, row);

        for (const dbField in mapping) {
          const sheetColumn = mapping[dbField];
          let value: string | Date = "unknown"; // Default fallback

          console.log(
            `Field: ${dbField}, Column: ${sheetColumn}, Value: ${row[sheetColumn]}`
          );

          if (sheetColumn !== "unknown") {
            value = row[sheetColumn] as string | Date;
          }

          // If value is undefined, null, empty, or column doesn't exist, generate fallback data
          if (
            value === undefined ||
            value === null ||
            value === "" ||
            !row[sheetColumn]
          ) {
            if (dbField === "first_name") value = "Unknown";
            else if (dbField === "last_name") value = "User";
            else if (dbField === "phone_number") value = "555-0000";
            else if (dbField === "email_address") value = "unknown@example.com";
            else if (dbField === "job_title") value = "Unknown Position";
            else if (dbField === "customer_name") value = "Unknown Customer";
            else if (dbField === "company_id")
              value = "unknown"; // This will need to be set by the API
            else if (dbField === "work_date") value = "unknown";
            else if (dbField === "start_time") value = "unknown";
            else if (dbField === "start_date") value = "unknown";
            else value = "unknown";

            console.log(`Generated fallback for ${dbField}: ${value}`);
          } else {
            console.log(`Using existing value for ${dbField}: ${value}`);
          }

          if (dbField === "start_date") {
            const date = new Date(value);
            if (!isNaN(date.getTime()))
              value = date.toISOString().split("T")[0];
          }

          if (dbField === "work_date") {
            const date = new Date(value);
            if (!isNaN(date.getTime()))
              value = date.toISOString().split("T")[0];
          }

          if (dbField === "start_time") {
            // Handle case where Excel converted time to a Date object
            if (
              value instanceof Date ||
              (typeof value === "string" && value.includes("GMT"))
            ) {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                // Extract just the time portion in HH:mm format
                const hours = date.getHours().toString().padStart(2, "0");
                const minutes = date.getMinutes().toString().padStart(2, "0");
                value = `${hours}:${minutes}`;
              }
            }
            // If it's already a string like "13:00" or "1:00 PM", leave it as is
            // Your API layer will handle the timezone conversion
          }

          if (dbField === "email_address" && typeof value === "object") {
            value = String(value);
          }

          mappedRow[dbField] = String(value);
        }
        console.log(`Final mapped row ${rowIndex}:`, mappedRow);
        return mappedRow;
      });

      console.log("=== FINAL TRANSFORMED DATA ===");
      console.log(JSON.stringify(transformed, null, 2));
      console.log("=== END TRANSFORMED DATA ===");

      updateProgress("uploading", `Uploading ${transformed.length} rows...`);
      const uploadRes = await fetch("/api/insert-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: transformed }),
      });
      if (!uploadRes.ok) throw new Error("Failed to upload data to database");

      const result: Json = await uploadRes.json(); // ⬅️ ensure result is Json

      updateProgress(
        "complete",
        `Successfully uploaded ${transformed.length} rows`
      );
      return { success: true, data: result, rowsProcessed: transformed.length };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      updateProgress("error", `Upload failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress({ step: "idle", message: "Ready to upload" });
  };

  return { uploadExcelFile, isUploading, progress, reset };
};
