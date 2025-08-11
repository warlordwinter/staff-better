"use client";

import React, { useState } from "react";
import { extractDataWithHeaders } from "@/utils/excelParser";

const TestUploadExcel = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [excelRows, setExcelRows] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<unknown>(null);

  // Reminder Service Test State
  const [jobId, setJobId] = useState("");
  const [associateId, setAssociateId] = useState("");
  const [reminderTesting, setReminderTesting] = useState(false);
  const [reminderResult, setReminderResult] = useState<unknown>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { headers, rows } = await extractDataWithHeaders(file);
    setHeaders(headers);
    setExcelRows(rows);
    setMapping({});
    setUploadResult(null);
  };

  const handleMapColumns = async () => {
    setLoading(true);
    setMapping({});
    const res = await fetch("/api/column-mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers }),
    });
    const data = await res.json();
    setMapping(data);
    setLoading(false);
  };

  const handleUploadToSupabase = async () => {
    setUploading(true);
    setUploadResult(null);

    const transformed = excelRows.map((row) => {
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
            console.log("Date is now:", value);
          }

          mappedRow[dbField] = value;
        }
      }
      return mappedRow;
    });

    console.log("Transformed rows:", transformed);

    try {
      const res = await fetch("/api/insert-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: transformed }),
      });

      const result = await res.json();
      setUploadResult(result);
      console.log("Insert result:", result);
    } catch (err) {
      console.error("Upload failed", err);
      setUploadResult({ error: "Upload failed. Check console for details." });
    }

    setUploading(false);
  };

  // Test Reminder Service
  const handleTestReminder = async () => {
    if (!jobId.trim() || !associateId.trim()) {
      alert("Please enter both Job ID and Associate ID");
      return;
    }

    setReminderTesting(true);
    setReminderResult(null);

    try {
      const res = await fetch("/api/test-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          jobId: jobId.trim(), 
          associateId: associateId.trim() 
        }),
      });

      const result = await res.json();
      setReminderResult(result);
      console.log("Reminder test result:", result);
    } catch (err) {
      console.error("Reminder test failed", err);
      setReminderResult({ error: "Reminder test failed. Check console for details." });
    }

    setReminderTesting(false);
  };

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "1rem" }}>
      {/* Excel Upload Section */}
      <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Excel Upload Test</h2>
        <input type="file" accept=".xlsx,.csv" onChange={handleFileChange} />

        {headers.length > 0 && (
          <div>
            <h3>Column Headers:</h3>
            <ul>
              {headers.map((header, idx) => (
                <li key={idx}>{header}</li>
              ))}
            </ul>
            <button onClick={handleMapColumns} disabled={loading}>
              {loading ? "Mapping..." : "Map Columns with AI"}
            </button>
          </div>
        )}

        {mapping && Object.keys(mapping).length > 0 && (
          <div>
            <h3>AI Mapping Result:</h3>
            <pre>{JSON.stringify(mapping, null, 2)}</pre>
          </div>
        )}

        {mapping && excelRows.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <p>Previewing {excelRows.length} rows to be uploaded.</p>
            <button onClick={handleUploadToSupabase} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload to Supabase"}
            </button>
          </div>
        )}

        {uploadResult !== null && (
          <div style={{ marginTop: "1rem" }}>
            <h4>Upload Result:</h4>
            <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Reminder Service Test Section */}
      <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
        <h2>Reminder Service Test</h2>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Job ID:
            <input
              type="text"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Enter job ID"
              style={{ 
                marginLeft: "0.5rem", 
                padding: "0.25rem", 
                border: "1px solid #ccc", 
                borderRadius: "4px",
                width: "200px"
              }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Associate ID:
            <input
              type="text"
              value={associateId}
              onChange={(e) => setAssociateId(e.target.value)}
              placeholder="Enter associate ID"
              style={{ 
                marginLeft: "0.5rem", 
                padding: "0.25rem", 
                border: "1px solid #ccc", 
                borderRadius: "4px",
                width: "200px"
              }}
            />
          </label>
        </div>

        <button 
          onClick={handleTestReminder} 
          disabled={reminderTesting}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: reminderTesting ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: reminderTesting ? "not-allowed" : "pointer"
          }}
        >
          {reminderTesting ? "Sending Test Reminder..." : "Send Test Reminder"}
        </button>

        {reminderResult !== null && (
          <div style={{ marginTop: "1rem" }}>
            <h4>Reminder Test Result:</h4>
            <pre style={{ 
              backgroundColor: "white", 
              padding: "1rem", 
              border: "1px solid #ddd",
              borderRadius: "4px",
              overflow: "auto"
            }}>
              {JSON.stringify(reminderResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestUploadExcel;