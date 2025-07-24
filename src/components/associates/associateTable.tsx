"use client";
import React, { useState } from "react";
import { associates } from "./data";
import { AssociateTableHeader } from "./associateTableHeader";
import { AssociateTableRow } from "./associateTableRow";
import { AssociateTableTitle } from "./associateTableTitle";

export default function AssociateTable() {
  const [associatesData, setAssociatesData] = useState(associates);

  const handleSave = (index: number, updatedData: any) => {
    setAssociatesData(prev => 
      prev.map((associate, i) => 
        i === index ? updatedData : associate
      )
    );
    console.log('Updated data at index', index, ':', updatedData);
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Are you sure you want to delete this associate?')) {
      setAssociatesData(prev => 
        prev.filter((_, i) => i !== index)
      );
      console.log('Deleted associate at index:', index);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 overflow-x-auto">
      <AssociateTableTitle />

      <table className="w-full table-auto border-collapse mt-4">
        <thead>
          <AssociateTableHeader />
        </thead>
        <tbody>
          {associatesData.map((associate, index) => (
            <AssociateTableRow
              key={index}
              data={associate}
              index={index}
              onSave={(updatedData) => handleSave(index, updatedData)}
              onDelete={() => handleDelete(index)}
            />
          ))}
        </tbody>
      </table>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 mt-2 mb-2">
      </div>
    </div>
  );
}
