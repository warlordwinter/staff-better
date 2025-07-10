"use client";

import React from "react";
import Navbar from "@/components/navBar";
import AssociateTable from "@/components/associates/associateTable";

export default function TestJobs() {
  return (
    <div>
      <Navbar />
        <div className="overflow-x-auto">
            <div className="min-w-[800px]">
                <AssociateTable />
            </div>
        </div>
    </div>
  );
}
