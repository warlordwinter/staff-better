import React from "react";
import Navbar from "@/components/ui/navBar";
import AssociateTable from "@/components/associates/associateTable";
import { getAuthUser } from "@/lib/auth/utils";
import { redirect } from "next/navigation";

export default async function AssociatesPage() {
  // Check authentication
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <Navbar />
      <AssociateTable />
    </div>
  );
}
