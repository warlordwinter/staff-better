"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/ui/navBar";
import AssociateTable from "@/components/associates/associateTable";
import { Job } from "@/model/interfaces/Job";
import LoadingSpinner from "@/components/ui/loadingSpinner";

export default function JobAssociates() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        console.log("Job ID:", jobId);
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch job');
        }
        const jobData = await res.json();
        setJob(jobData);
      } catch (error) {
        console.error('Failed to fetch job:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div>
        <Navbar />
          <LoadingSpinner />
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div>Job not found</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <AssociateTable jobId={jobId} job={job} />
    </div>
  );
}