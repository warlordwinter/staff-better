"use client"

import React from "react";
import Navbar from "@/components/navBar";
import JobTable from "@/components/jobTableComp/jobTable";

export default function Jobs(){
    return(
        <div>
            <Navbar/>
            <JobTable/>
        </div>
    );
}
