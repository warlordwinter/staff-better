// jest.setup.ts
import "@testing-library/jest-dom";

// Mock console methods globally to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Date.now for consistent testing
const mockDate = new Date("2025-08-04T10:00:00Z");
jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Mock Supabase modules that cause ESM issues
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    // Mock the client methods you use in your tests
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  })),
}));

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(),
  createServerClient: jest.fn(),
}));

// Polyfill for NextRequest in test environment
if (typeof global.Request === "undefined") {
  global.Request = class Request {
    constructor(public url: string, public init?: any) {}
  } as any;
}

if (typeof global.Response === "undefined") {
  global.Response = class Response {
    constructor(public body?: any, public init?: any) {}
    json() {
      return Promise.resolve(this.body);
    }
    text() {
      return Promise.resolve(String(this.body));
    }
  } as any;
}

// Declare the custom matcher type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}
