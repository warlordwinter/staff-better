import React from "react";
import { associates } from "./data";
import { AssociateTableHeader } from "./associateTableHeader";
import { AssociateTableRow } from "./associateTableRow";
import { AssociateTableTitle } from "./associateTableTitle";


export default function AssociateTable() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 overflow-x-auto">
      <AssociateTableTitle />

      <table className="w-full table-auto border-collapse mt-4">
        <thead>
          <AssociateTableHeader />
        </thead>
        <tbody>
          {associates.map((associate, index) => (
            <AssociateTableRow
              key={index}
              data={associate}
            />
          ))}
        </tbody>
      </table>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 mt-2 mb-2">
      </div>
    </div>
  );
}
