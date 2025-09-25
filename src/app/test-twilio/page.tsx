"use client";

import { useState } from "react";

export default function TestTwilioPage() {
  const [jobId, setJobId] = useState("");
  const [associateId, setAssociateId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendTestReminder = async () => {
    if (!jobId || !associateId) {
      alert("Please enter both Job ID and Associate ID");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/test-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, associateId }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to send test reminder" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Twilio SMS</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Job ID:</label>
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter job ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Associate ID:
          </label>
          <input
            type="text"
            value={associateId}
            onChange={(e) => setAssociateId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter associate ID"
          />
        </div>

        <button
          onClick={sendTestReminder}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "Sending..." : "Send Test Reminder"}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
