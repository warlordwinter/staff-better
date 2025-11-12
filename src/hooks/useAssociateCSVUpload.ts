import { useState } from "react";
import { isValidPhoneNumber } from "@/utils/phoneUtils";
import { extractDataWithHeaders } from "@/utils/excelParser";

export interface UseAssociateCSVUploadReturn {
  isUploading: boolean;
  uploadCSVFile: (
    file: File,
    onSuccess: () => Promise<void>,
    onError: (message: string) => void,
    onToast: (message: string, type: "error" | "success" | "info") => void
  ) => Promise<void>;
}

export function useAssociateCSVUpload(): UseAssociateCSVUploadReturn {
  const [isUploading, setIsUploading] = useState(false);

  // Helper function to split name into first and last
  const splitName = (fullName: string): { first: string; last: string } => {
    const trimmed = fullName.trim();
    if (!trimmed) return { first: "", last: "" };

    // Remove extra whitespace and split on spaces
    const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);

    if (parts.length === 0) {
      return { first: "", last: "" };
    }

    if (parts.length === 1) {
      // Single word: use as first name only
      return { first: parts[0], last: "" };
    }

    if (parts.length === 2) {
      // Two words: first = first name, second = last name
      return { first: parts[0], last: parts[1] };
    }

    // Three or more words: first word = first name, rest = last name
    // This handles cases like "Mary Jane Watson" -> first: "Mary", last: "Jane Watson"
    const first = parts[0];
    const last = parts.slice(1).join(" ");
    return { first, last };
  };

  // Handle CSV file upload
  const uploadCSVFile = async (
    file: File,
    onSuccess: () => Promise<void>,
    onError: (message: string) => void,
    onToast: (message: string, type: "error" | "success" | "info") => void
  ) => {
    setIsUploading(true);

    try {
      // Parse CSV file
      const { headers, rows } = await extractDataWithHeaders(file);

      if (!headers.length || !rows.length) {
        throw new Error("No data found in the file");
      }

      // Use AI column mapping
      let mappingRes;
      try {
        mappingRes = await fetch("/api/column-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers }),
        });
      } catch (fetchError) {
        console.error("❌ Fetch error calling column-mapping:", fetchError);
        throw new Error(`Failed to call column mapping API: ${fetchError}`);
      }

      if (!mappingRes.ok) {
        const errorText = await mappingRes.text();
        console.error("❌ Column mapping failed:", errorText);
        throw new Error(`Failed to map columns: ${errorText}`);
      }

      const aiMapping = await mappingRes.json();

      // Filter to only associate fields and convert to our format
      const columnMap: Record<string, string> = {};
      const associateFields = [
        "name",
        "first_name",
        "last_name",
        "phone_number",
        "email_address",
      ];

      associateFields.forEach((field) => {
        if (aiMapping[field] && aiMapping[field] !== "unknown") {
          columnMap[field] = aiMapping[field];
        }
      });

      // Check if required fields are present - either "name" or both "first_name" and "last_name"
      const hasNameColumn = columnMap["name"];
      const hasSeparateNames =
        columnMap["first_name"] && columnMap["last_name"];

      if (!hasNameColumn && !hasSeparateNames) {
        throw new Error(
          "File must contain either a 'Name' column or both 'First Name' and 'Last Name' columns"
        );
      }

      // Transform rows to associate format
      const phoneValidationWarnings: string[] = [];
      const associates = rows
        .filter((row) => {
          // Filter out empty rows
          if (hasNameColumn) {
            const name = row[columnMap["name"]]?.trim();
            return name && name.length > 0;
          } else {
            const firstName = row[columnMap["first_name"]]?.trim();
            const lastName = row[columnMap["last_name"]]?.trim();
            return firstName && lastName;
          }
        })
        .map((row, index) => {
          let firstName = "";
          let lastName = "";

          if (hasNameColumn) {
            const fullName = row[columnMap["name"]]?.trim() || "";
            const split = splitName(fullName);
            firstName = split.first;
            lastName = split.last;
          } else {
            firstName = row[columnMap["first_name"]]?.trim() || "";
            lastName = row[columnMap["last_name"]]?.trim() || "";
          }

          const phoneColumnName = columnMap["phone_number"];
          // Handle case-insensitive lookup in case Excel/CSV has different casing
          let rawPhoneValue: string | undefined = undefined;
          if (phoneColumnName) {
            rawPhoneValue = row[phoneColumnName];
            // If direct lookup fails, try case-insensitive match
            if (rawPhoneValue === undefined || rawPhoneValue === "") {
              const rowKeys = Object.keys(row);
              const matchingKey = rowKeys.find(
                (key) => key.toLowerCase() === phoneColumnName.toLowerCase()
              );
              if (matchingKey) {
                rawPhoneValue = row[matchingKey];
              }
            }
          }
          const rawPhoneNumber = rawPhoneValue?.trim() || null;
          let validatedPhoneNumber: string | null = null;

          // Validate phone number before sending to API
          if (rawPhoneNumber) {
            const digitsOnly = rawPhoneNumber.replace(/\D/g, "");

            // Check if phone number has at least 10 digits
            if (digitsOnly.length >= 10) {
              // Validate format using isValidPhoneNumber
              const isValid = isValidPhoneNumber(rawPhoneNumber);

              if (isValid) {
                validatedPhoneNumber = rawPhoneNumber;
              } else {
                // Invalid format - set to null and warn
                phoneValidationWarnings.push(
                  `Row ${
                    index + 1
                  } (${firstName} ${lastName}): Invalid phone number format "${rawPhoneNumber}" - will be stored without phone number`
                );
              }
            } else {
              // Too few digits - set to null and warn
              phoneValidationWarnings.push(
                `Row ${
                  index + 1
                } (${firstName} ${lastName}): Phone number has only ${
                  digitsOnly.length
                } digit(s), needs at least 10 - will be stored without phone number`
              );
            }
          }

          const associate: Record<string, string | null> = {
            first_name: firstName,
            last_name: lastName,
            phone_number: validatedPhoneNumber,
            email_address: row[columnMap["email_address"]]?.trim() || null,
          };

          return associate;
        });

      if (associates.length === 0) {
        throw new Error("No valid associate data found in file");
      }

      // Post to API
      const response = await fetch("/api/associates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(associates),
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload associates from CSV";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("API Error Response:", errorData);
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          const errorText = await response.text().catch(() => "");
          console.error("API Error (non-JSON):", errorText);
          errorMessage = errorText || errorMessage;
        }
        console.error("Response status:", response.status);
        console.error(
          "Associates being sent:",
          JSON.stringify(associates, null, 2)
        );
        throw new Error(errorMessage);
      }

      // Refresh associates list
      await onSuccess();

      // Show success toast with warnings if any
      let successMessage = `Successfully uploaded ${associates.length} associate(s) from file`;
      if (phoneValidationWarnings.length > 0) {
        successMessage += `\n\nWarning: ${
          phoneValidationWarnings.length
        } phone number(s) were invalid and will not be used for messaging:\n${phoneValidationWarnings
          .slice(0, 5)
          .join("\n")}`;
        if (phoneValidationWarnings.length > 5) {
          successMessage += `\n... and ${
            phoneValidationWarnings.length - 5
          } more`;
        }
      }
      onToast(
        successMessage,
        phoneValidationWarnings.length > 0 ? "info" : "success"
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload file. Please try again.";
      onError(errorMessage);
      onToast(errorMessage, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadCSVFile,
  };
}
