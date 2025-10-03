import React from "react";
import Navbar from "@/components/ui/navBar";
import JobTable from "@/components/jobTableComp/jobTable";

export default async function Jobs() {
  // Otherwise, render the landing page
  return (
    <div>
      <Navbar />
      <JobTable />
    </div>
  );
}
