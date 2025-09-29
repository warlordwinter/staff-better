"use client";

import { useState } from "react";

interface TestMessage {
  phoneNumber: string;
  message: string;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export default function TestIncomingMessagesPage() {
  const [testMessage, setTestMessage] = useState<TestMessage>({
    phoneNumber: "",
    message: "",
  });
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-incoming-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testMessage),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: "Test message processed successfully",
          data,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to process test message",
          data,
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Network error occurred",
        data: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof TestMessage) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setTestMessage((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Test Incoming Messages
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={testMessage.phoneNumber}
                onChange={handleInputChange("phoneNumber")}
                placeholder="+1234567890"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700"
              >
                Message
              </label>
              <textarea
                id="message"
                value={testMessage.message}
                onChange={handleInputChange("message")}
                placeholder="Enter test message content"
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Send Test Message"}
            </button>
          </form>

          {result && (
            <div className="mt-6">
              <div
                className={`p-4 rounded-md ${
                  result.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <h3
                  className={`text-sm font-medium ${
                    result.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result.success ? "Success" : "Error"}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    result.success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {String(result.message)}
                </p>
                {result.data != null && typeof result.data === "object" && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <p>
              This page allows you to test incoming message processing by
              simulating SMS messages that would be received by the system.
            </p>
            <p className="mt-2">
              Enter a phone number and message to test how the system processes
              incoming communications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
