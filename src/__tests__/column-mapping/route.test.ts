/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/column-mapping/route";
import { GoogleGenAI } from "@google/genai";

// Mock the GoogleGenAI module
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn(),
      },
    })),
  };
});

describe("POST /api/column-mapping", () => {
  let mockGenerateContent: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Setup mock
    const mockGenAI = new GoogleGenAI({ apiKey: "test-key" });
    mockGenerateContent = mockGenAI.models.generateContent as jest.Mock;
    (GoogleGenAI as jest.Mock).mockImplementation(() => mockGenAI);

    // Set default API key
    process.env.GEMINI_API_KEY = "test-api-key";

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  const createMockRequest = (body: any): NextRequest => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue(body),
    };
    return mockRequest as any;
  };

  describe("Input Validation", () => {
    it("should return 400 if headers is missing", async () => {
      const req = createMockRequest({});
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Headers array is required");
    });

    it("should return 400 if headers is not an array", async () => {
      const req = createMockRequest({ headers: "not-an-array" });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Headers array is required");
    });

    it("should return 400 if headers is an empty array", async () => {
      const req = createMockRequest({ headers: [] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Headers array is required");
    });
  });

  describe("Environment Configuration", () => {
    it("should return 500 if GEMINI_API_KEY is not configured", async () => {
      delete process.env.GEMINI_API_KEY;

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("GEMINI_API_KEY not configured");
    });
  });

  describe("Successful Column Mapping", () => {
    it("should map columns with single name field", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "Name",
          phone_number: "Phone",
          email_address: "Email",
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["Name", "Phone", "Email"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name");
      expect(data.phone_number).toBe("Phone");
      expect(data.email_address).toBe("Email");
      expect(data.first_name).toBe("unknown");
      expect(data.last_name).toBe("unknown");
    });

    it("should map columns with separate first and last name fields", async () => {
      const mockResponse = {
        text: JSON.stringify({
          first_name: "First Name",
          last_name: "Last Name",
          phone_number: "Phone",
          email_address: "Email",
          name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["First Name", "Last Name", "Phone", "Email"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.first_name).toBe("First Name");
      expect(data.last_name).toBe("Last Name");
      expect(data.phone_number).toBe("Phone");
      expect(data.name).toBe("unknown");
    });

    it("should map job-related columns", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "unknown",
          first_name: "unknown",
          last_name: "unknown",
          phone_number: "unknown",
          email_address: "unknown",
          job_title: "Job Title",
          customer_name: "Customer",
          start_date: "Start Date",
          start_time: "Start Time",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["Job Title", "Customer", "Start Date", "Start Time"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.job_title).toBe("Job Title");
      expect(data.customer_name).toBe("Customer");
      expect(data.start_date).toBe("Start Date");
      expect(data.start_time).toBe("Start Time");
    });
  });

  describe("AI Response Format Handling", () => {
    it("should handle plain JSON response", async () => {
      const mockResponse = {
        text: '{"name":"Name","phone_number":"Phone","email_address":"unknown","first_name":"unknown","last_name":"unknown","job_title":"unknown","customer_name":"unknown","start_date":"unknown","start_time":"unknown"}',
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name");
      expect(data.phone_number).toBe("Phone");
    });

    it("should handle JSON wrapped in markdown code blocks", async () => {
      const mockResponse = {
        text: '```json\n{"name":"Name","phone_number":"Phone","email_address":"unknown","first_name":"unknown","last_name":"unknown","job_title":"unknown","customer_name":"unknown","start_date":"unknown","start_time":"unknown"}\n```',
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name");
      expect(data.phone_number).toBe("Phone");
    });

    it("should handle JSON as a string (with escaped quotes)", async () => {
      const mockResponse = {
        text: '"{\\"name\\":\\"Name\\",\\"phone_number\\":\\"Phone\\",\\"email_address\\":\\"unknown\\",\\"first_name\\":\\"unknown\\",\\"last_name\\":\\"unknown\\",\\"job_title\\":\\"unknown\\",\\"customer_name\\":\\"unknown\\",\\"start_date\\":\\"unknown\\",\\"start_time\\":\\"unknown\\"}"',
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name");
      expect(data.phone_number).toBe("Phone");
    });

    it("should extract JSON from text with surrounding content", async () => {
      const mockResponse = {
        text: 'Here is the mapping: {"name":"Name","phone_number":"Phone","email_address":"unknown","first_name":"unknown","last_name":"unknown","job_title":"unknown","customer_name":"unknown","start_date":"unknown","start_time":"unknown"} This is the result.',
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name");
      expect(data.phone_number).toBe("Phone");
    });
  });

  describe("Response Validation", () => {
    it("should filter out invalid column names that are not in headers", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "Name",
          phone_number: "Invalid Column", // Not in headers
          email_address: "Email",
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["Name", "Email"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name");
      expect(data.email_address).toBe("Email");
      // Invalid column should be filtered out or set to unknown
      expect(data.phone_number).toBeUndefined();
    });

    it("should only include valid database fields", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "Name",
          phone_number: "Phone",
          email_address: "Email",
          invalid_field: "Some Column", // Should be filtered
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["Name", "Phone", "Email"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invalid_field).toBeUndefined();
      expect(data.name).toBe("Name");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 if AI returns empty response", async () => {
      const mockResponse = {
        text: "",
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("AI returned empty response");
    });

    it("should return 500 if AI response cannot be parsed", async () => {
      const mockResponse = {
        text: "This is not valid JSON at all",
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      // The error will be the actual JSON parsing error message
      expect(typeof data.error).toBe("string");
    });

    it("should handle AI service errors", async () => {
      const error = new Error("AI service unavailable");
      mockGenerateContent.mockRejectedValue(error);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("AI service unavailable");
    });
  });

  describe("Retry Logic", () => {
    it("should retry on 503 errors", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "Name",
          phone_number: "Phone",
          email_address: "unknown",
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      // First call fails with 503, second succeeds
      mockGenerateContent
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });

      // Use Promise.resolve to handle the async retry
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("should retry on 429 rate limit errors", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "Name",
          phone_number: "Phone",
          email_address: "unknown",
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      // const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const error = new Error("Invalid API key") as Error & { status?: number };
      error.status = 401;
      mockGenerateContent.mockRejectedValue(error);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(data.error).toBe("Invalid API key");
    });

    it("should fail after max retries", async () => {
      const error = { status: 503 };
      mockGenerateContent.mockRejectedValue(error);

      const req = createMockRequest({ headers: ["Name", "Phone"] });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(data.error).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in column names", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "Name (Full)",
          phone_number: "Phone #",
          email_address: "Email@Address",
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["Name (Full)", "Phone #", "Email@Address"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Name (Full)");
      expect(data.phone_number).toBe("Phone #");
      expect(data.email_address).toBe("Email@Address");
    });

    it("should handle all fields set to unknown", async () => {
      const mockResponse = {
        text: JSON.stringify({
          name: "unknown",
          phone_number: "unknown",
          email_address: "unknown",
          first_name: "unknown",
          last_name: "unknown",
          job_title: "unknown",
          customer_name: "unknown",
          start_date: "unknown",
          start_time: "unknown",
        }),
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const req = createMockRequest({
        headers: ["Column1", "Column2", "Column3"],
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("unknown");
      expect(data.phone_number).toBe("unknown");
    });
  });
});
