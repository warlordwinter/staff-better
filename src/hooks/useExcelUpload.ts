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

      updateProgress("transforming", "Transforming data...");
      const transformed = rows.map((row) => {
        const mappedRow: Record<string, string> = {};
        for (const dbField in mapping) {
          const sheetColumn = mapping[dbField];
          if (sheetColumn !== "unknown") {
            let value: string | Date = row[sheetColumn] as string | Date;

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
        }
        return mappedRow;
      });

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
