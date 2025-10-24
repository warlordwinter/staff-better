// Simple test script to test the reminder functionality
const testReminder = async () => {
  try {
    // First, let's get available jobs
    console.log("Fetching jobs...");
    const jobsResponse = await fetch("http://localhost:3000/api/jobs");
    const jobs = await jobsResponse.json();
    console.log("Available jobs:", jobs);

    // Get available associates
    console.log("Fetching associates...");
    const associatesResponse = await fetch(
      "http://localhost:3000/api/associates"
    );
    const associates = await associatesResponse.json();
    console.log("Available associates:", associates);

    // If we have both jobs and associates, test the reminder
    if (jobs.length > 0 && associates.length > 0) {
      const jobId = jobs[0].id;
      const associateId = associates[0].id;

      console.log(
        `Testing reminder for job ${jobId} and associate ${associateId}`
      );

      // First, check if there's already a job assignment
      console.log("Checking for existing job assignments...");
      const assignmentsResponse = await fetch(
        `http://localhost:3000/api/job-assignments/${jobId}`
      );
      const assignments = await assignmentsResponse.json();
      console.log("Existing assignments:", assignments);

      // Use the first existing assignment if available, otherwise create one
      let testAssociateId = associateId;
      if (assignments && assignments.length > 0) {
        testAssociateId = assignments[0].associate_id;
        console.log(
          `Using existing assignment with associate ID: ${testAssociateId}`
        );
      } else {
        console.log("Creating job assignment...");
        const createAssignmentResponse = await fetch(
          `http://localhost:3000/api/job-assignments/${jobId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              associate_id: associateId,
              confirmation_status: "PENDING",
              work_date: "2025-01-15",
              start_time: "09:00",
              num_reminders: 0,
            }),
          }
        );

        if (!createAssignmentResponse.ok) {
          const errorText = await createAssignmentResponse.text();
          console.error("Failed to create job assignment:", errorText);
          return;
        }

        const newAssignment = await createAssignmentResponse.json();
        console.log("Created job assignment:", newAssignment);
      }

      // Now test the reminder
      console.log(
        `Testing reminder with job ID: ${jobId} and associate ID: ${testAssociateId}`
      );
      const reminderResponse = await fetch(
        "http://localhost:3000/api/test-reminder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: jobId,
            associateId: testAssociateId,
          }),
        }
      );

      const result = await reminderResponse.json();
      console.log("Reminder test result:", result);
    } else {
      console.log(
        "No jobs or associates found. Please add some test data first."
      );
    }
  } catch (error) {
    console.error("Error testing reminder:", error);
  }
};

testReminder();
