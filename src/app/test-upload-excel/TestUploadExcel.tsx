"use client";

import React, { useState } from "react";
import { extractHeaders } from "@/utils/excelParser";

const TestUploadExcel = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await extractHeaders(file);
    setHeaders(result);
    setMapping({});
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

  return (
    <div>
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
    </div>
  );
};

export default TestUploadExcel;
