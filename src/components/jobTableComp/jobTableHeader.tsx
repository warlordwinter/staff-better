"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ImportOptions from "./importOptions";
import { useExcelUpload } from "@/hooks/useExcelUpload";

interface Props {
  onFileSelect?: (file: File) => void;
  onAddManually?: () => void;
  onUploadComplete?: (result: {
    success: boolean;
    data?: unknown;
    error?: string;
    rowsProcessed?: number;
  }) => void;
}

const JobTableHeader: React.FC<Props> = ({
  onFileSelect,
  onAddManually,
  onUploadComplete,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { uploadExcelFile, isUploading, progress, reset } = useExcelUpload();

  // Add click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    if (showOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOptions]);

  const handleUploadCSV = () => {
    fileInputRef.current?.click();
    setShowOptions(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an Excel file (xlsx, xls) or CSV
    const isExcelFile =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls") ||
      file.type.includes("sheet") ||
      file.type.includes("excel");

    if (isExcelFile) {
      // Use the Excel upload hook for Excel files
      try {
        const result = await uploadExcelFile(file);
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      } catch (error) {
        console.error("Excel upload failed:", error);
        if (onUploadComplete) {
          onUploadComplete({
            success: false,
            error: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }
    } else {
      // Use the existing file select handler for CSV files
      if (onFileSelect) {
        onFileSelect(file);
      }
    }

    // Clear the input
    e.target.value = "";
  };

  const handleResetUpload = () => {
    reset();
  };

  return (
    <div className="relative flex justify-between items-center">
      <h1 className="text-black text-5xl font-semibold font-['Inter']">Jobs</h1>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowOptions((prev) => !prev)}
          className="px-3 py-2 bg-blue-600 rounded-xl inline-flex justify-center items-center gap-1 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUploading}
        >
          <span className="text-sm font-normal font-['Inter']">
            {isUploading ? "Processing..." : "Add"}
          </span>
          <div className="w-4 h-4 relative">
            <Image
              src="/icons/plus-w.svg"
              alt="Upload"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
        </button>

        {showOptions && (
          <div className="absolute right-0 mt-2 z-10">
            <ImportOptions
              onUploadCSV={handleUploadCSV}
              onAddManually={() => {
                if (onAddManually) {
                  onAddManually();
                }
                setShowOptions(false);
              }}
            />
          </div>
        )}

        {/* Progress indicator */}
        {isUploading && (
          <div className="absolute right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-64">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                Upload Progress
              </h4>
              <button
                onClick={handleResetUpload}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Step: {progress.step}
            </div>
            <div className="text-xs text-gray-500">{progress.message}</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width:
                    progress.step === "idle"
                      ? "0%"
                      : progress.step === "parsing"
                      ? "20%"
                      : progress.step === "mapping"
                      ? "40%"
                      : progress.step === "transforming"
                      ? "60%"
                      : progress.step === "uploading"
                      ? "80%"
                      : progress.step === "complete"
                      ? "100%"
                      : progress.step === "error"
                      ? "100%"
                      : "0%",
                }}
              />
            </div>
          </div>
        )}

        {/* Success/Error message */}
        {(progress.step === "complete" || progress.step === "error") &&
          !isUploading && (
            <div
              className={`absolute right-0 mt-2 p-3 border rounded-lg shadow-lg z-20 min-w-64 ${
                progress.step === "complete"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h4
                  className={`text-sm font-medium ${
                    progress.step === "complete"
                      ? "text-green-900"
                      : "text-red-900"
                  }`}
                >
                  {progress.step === "complete"
                    ? "Upload Complete!"
                    : "Upload Failed"}
                </h4>
                <button
                  onClick={handleResetUpload}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div
                className={`text-xs ${
                  progress.step === "complete"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {progress.message}
              </div>
            </div>
          )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};

export default JobTableHeader;
