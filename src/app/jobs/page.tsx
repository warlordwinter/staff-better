import React from "react";
import Navbar from "@/components/ui/navBar";
import JobTable from "@/components/jobTableComp/jobTable";
import { getAuthUser } from "@/lib/auth/utils";
import { redirect } from "next/navigation";

export default async function Jobs() {
  // Otherwise, render the landing page
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <Navbar />
      <JobTable />
    </div>
  );
}
