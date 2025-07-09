"use client";

import React, { useState } from "react";
import { extractHeaders } from "@/utils/excelParser";

const TestUploadExcel = () => {
    // Temp? As it will be set in database
    const [headers, setHeaders] = useState<string[]>([]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return;
        const result = await extractHeaders(file);
        setHeaders(result);

        console.log(result);
    }

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
                </div>
            )}
        </div>
    )
}

export default TestUploadExcel;