"use client";

import { useState } from "react";

export default function TestIncomingMessagesPage() {
  const [phoneNumber, setPhoneNumber] = useState("+1234567890");
  const [message, setMessage] = useState("C");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testIncomingMessage = async () => {
    if (!phoneNumber || !message) {
      alert("Please enter both phone number and message");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/test-incoming-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber, message }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Failed to process incoming message" });
    } finally {
      setLoading(false);
    }
  };

  const testTwilioWebhook = async () => {
    if (!phoneNumber || !message) {
      alert("Please enter both phone number and message");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("From", phoneNumber);
      formData.append("Body", message);

      const response = await fetch("/api/twilio/webhook", {
        method: "POST",
        body: formData,
      });

      const data = await response.text();
      setResult({
        success: response.ok,
        status: response.status,
        response: data,
        message: "Twilio webhook processed",
      });
    } catch (error) {
      setResult({ error: "Failed to process Twilio webhook" });
    } finally {
      setLoading(false);
    }
  };

  const predefinedTests = [
    { phone: "+1234567890", message: "C", description: "Confirmation (C)" },
    {
      phone: "+1234567890",
      message: "confirm",
      description: "Confirmation (confirm)",
    },
    { phone: "+1234567890", message: "yes", description: "Confirmation (yes)" },
    { phone: "+1234567890", message: "help", description: "Help request" },
    { phone: "+1234567890", message: "stop", description: "Opt-out request" },
    {
      phone: "+1234567890",
      message: "random message",
      description: "Unknown message",
    },
  ];

  const runPredefinedTest = (test: (typeof predefinedTests)[0]) => {
    setPhoneNumber(test.phone);
    setMessage(test.message);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">
        Test Incoming Messages Service
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manual Test */}
        <div className="border p-6 rounded-lg bg-blue-50">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            Manual Test
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="C, help, stop, etc."
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={testIncomingMessage}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Direct API"}
              </button>
              <button
                onClick={testTwilioWebhook}
                disabled={loading}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Twilio Webhook"}
              </button>
            </div>
          </div>
        </div>

        {/* Predefined Tests */}
        <div className="border p-6 rounded-lg bg-green-50">
          <h2 className="text-xl font-semibold mb-4 text-green-800">
            Predefined Tests
          </h2>
          <div className="space-y-2">
            {predefinedTests.map((test, index) => (
              <button
                key={index}
                onClick={() => runPredefinedTest(test)}
                className="w-full text-left p-3 border rounded hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium">{test.description}</div>
                <div className="text-sm text-gray-600">
                  {test.phone} → "{test.message}"
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Types Reference */}
        <div className="border p-6 rounded-lg bg-purple-50">
          <h2 className="text-xl font-semibold mb-4 text-purple-800">
            Message Types
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Confirmation:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• C, c</li>
                <li>• confirm, confirmed</li>
                <li>• yes, y</li>
                <li>• ok, okay</li>
                <li>• sure</li>
                <li>• "will be there"</li>
                <li>• "i'll be there"</li>
              </ul>
            </div>
            <div>
              <strong>Help:</strong>
              <ul className="ml-4 mt-1">
                <li>• help</li>
              </ul>
            </div>
            <div>
              <strong>Opt-out:</strong>
              <ul className="ml-4 mt-1">
                <li>• stop</li>
                <li>• unsubscribe</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="border p-6 rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Service Status
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Incoming Message Service:</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Twilio Webhook:</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>SMS Response:</span>
              <span className="text-green-600 font-medium">Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-8 border p-6 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Test Result</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Success:</span>
              <span
                className={result.success ? "text-green-600" : "text-red-600"}
              >
                {result.success ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            {result.action && (
              <div className="flex justify-between">
                <span>Action:</span>
                <span className="font-medium">{result.action}</span>
              </div>
            )}
            {result.associate_id && (
              <div className="flex justify-between">
                <span>Associate ID:</span>
                <span className="font-medium">{result.associate_id}</span>
              </div>
            )}
          </div>
          <pre className="text-sm overflow-auto bg-white p-4 rounded border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
