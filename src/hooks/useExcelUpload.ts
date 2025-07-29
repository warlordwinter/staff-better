// hooks/useExcelUpload.ts
import { useState } from "react";
import { extractDataWithHeaders } from "@/utils/excelParser";

interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  rowsProcessed?: number;
}

interface UseExcelUploadReturn {
  uploadExcelFile: (file: File) => Promise<UploadResult>;
  isUploading: boolean;
  progress: {
    step: 'idle' | 'parsing' | 'mapping' | 'transforming' | 'uploading' | 'complete' | 'error';
    message: string;
  };
  reset: () => void;
}

export const useExcelUpload = (): UseExcelUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{
    step: 'idle' | 'parsing' | 'mapping' | 'transforming' | 'uploading' | 'complete' | 'error';
    message: string;
  }>({
    step: 'idle',
    message: 'Ready to upload'
  });

  const updateProgress = (step: typeof progress.step, message: string) => {
    setProgress({ step, message });
  };

  const uploadExcelFile = async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    updateProgress('parsing', 'Parsing Excel file...');

    try {
      // Step 1: Parse the Excel file
      const { headers, rows } = await extractDataWithHeaders(file);
      
      if (!headers.length || !rows.length) {
        throw new Error('No data found in the Excel file');
      }

      updateProgress('mapping', 'Mapping columns with AI...');

      // Step 2: Get AI mapping
      const mappingRes = await fetch("/api/column-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers }),
      });

      if (!mappingRes.ok) {
        throw new Error('Failed to map columns');
      }

      const mapping = await mappingRes.json();

      updateProgress('transforming', 'Transforming data...');

      // Step 3: Transform the data
      const transformed = rows.map((row) => {
        const mappedRow: Record<string, string> = {};
        for (const dbField in mapping) {
          const sheetColumn = mapping[dbField];
          if (sheetColumn !== "unknown") {
            let value = row[sheetColumn];

            // Normalize start_date if needed
            if (dbField === "start_date") {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                value = date.toISOString().split("T")[0]; // convert to YYYY-MM-DD
              }
            }

            mappedRow[dbField] = value;
          }
        }
        return mappedRow;
      });

      updateProgress('uploading', `Uploading ${transformed.length} rows...`);

      // Step 4: Upload to database
      const uploadRes = await fetch("/api/insert-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: transformed }),
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload data to database');
      }

      const result = await uploadRes.json();

      updateProgress('complete', `Successfully uploaded ${transformed.length} rows`);
      
      return {
        success: true,
        data: result,
        rowsProcessed: transformed.length
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateProgress('error', `Upload failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress({
      step: 'idle',
      message: 'Ready to upload'
    });
  };

  return {
    uploadExcelFile,
    isUploading,
    progress,
    reset
  };
};