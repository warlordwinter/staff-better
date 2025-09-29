// Tests for SMSService

import { SMSService } from "@/lib/services/shared/SMSService";
import * as SMS from "@/lib/twilio/sms";
import { SMSSuccess, SMSError } from "@/lib/twilio/types";

// Mock the SMS module
jest.mock("@/lib/twilio/sms");

const mockedSMS = jest.mocked(SMS);

describe("SMSService", () => {
  let smsService: SMSService;

  beforeEach(() => {
    smsService = new SMSService();
    jest.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should send SMS successfully", async () => {
      // Arrange
      const mockSMSResult: SMSSuccess = {
        success: true,
        messageId: "msg-123",
        status: "sent",
        to: "+1234567890",
        from: "+15559876543",
        sentAt: new Date(),
      };

      mockedSMS.sendSMS.mockResolvedValue(mockSMSResult);

      // Act
      const result = await smsService.sendMessage("+1234567890", "Test message");

      // Assert
      expect(result).toEqual(mockSMSResult);
      expect(mockedSMS.sendSMS).toHaveBeenCalledWith({
        to: "+1234567890",
        body: "Test message",
      });
    });

    it("should handle SMS failure", async () => {
      // Arrange
      const mockSMSResult: SMSError = {
        success: false,
        error: "Invalid phone number",
        code: "21211",
        to: "+1234567890",
        sentAt: new Date(),
      };

      mockedSMS.sendSMS.mockResolvedValue(mockSMSResult);

      // Act
      const result = await smsService.sendMessage("+1234567890", "Test message");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid phone number");
    });

    it("should handle exceptions", async () => {
      // Arrange
      const error = new Error("Network error");
      mockedSMS.sendSMS.mockRejectedValue(error);

      // Act
      const result = await smsService.sendMessage("+1234567890", "Test message");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.code).toBe("UNKNOWN");
      expect(result.to).toBe("+1234567890");
      expect(result.sentAt).toBeInstanceOf(Date);
    });
  });

  describe("formatPhoneNumber", () => {
    it("should format phone number using the twilio function", () => {
      // Arrange
      const phoneNumber = "1234567890";
      const expectedFormatted = "+1234567890";
      mockedSMS.formatPhoneNumber.mockReturnValue(expectedFormatted);

      // Act
      const result = smsService.formatPhoneNumber(phoneNumber);

      // Assert
      expect(result).toBe(expectedFormatted);
      expect(mockedSMS.formatPhoneNumber).toHaveBeenCalledWith(phoneNumber);
    });
  });

  describe("normalizePhoneNumber", () => {
    it("should normalize 11-digit number starting with 1", () => {
      const result = smsService.normalizePhoneNumber("11234567890");
      expect(result).toBe("+1234567890");
    });

    it("should normalize 10-digit number", () => {
      const result = smsService.normalizePhoneNumber("1234567890");
      expect(result).toBe("+1234567890");
    });

    it("should handle already formatted numbers", () => {
      const result = smsService.normalizePhoneNumber("+1234567890");
      expect(result).toBe("+1234567890");
    });

    it("should handle numbers with formatting", () => {
      const result = smsService.normalizePhoneNumber("(123) 456-7890");
      expect(result).toBe("+1234567890");
    });
  });

  describe("validatePhoneNumber", () => {
    it("should validate properly formatted numbers", () => {
      expect(smsService.validatePhoneNumber("+1234567890")).toBe(true);
      expect(smsService.validatePhoneNumber("1234567890")).toBe(true);
      expect(smsService.validatePhoneNumber("(123) 456-7890")).toBe(true);
    });

    it("should reject invalid numbers", () => {
      expect(smsService.validatePhoneNumber("123")).toBe(false);
      expect(smsService.validatePhoneNumber("+12345678901")).toBe(false);
      expect(smsService.validatePhoneNumber("invalid")).toBe(false);
    });
  });
});
