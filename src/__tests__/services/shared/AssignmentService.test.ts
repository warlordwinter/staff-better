// Tests for AssignmentService

import { AssignmentService } from "@/lib/services/shared/AssignmentService";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { ActiveAssignment } from "@/lib/services/interfaces/ActiveAssignment";
import * as JobsAssignmentsDao from "@/lib/dao/JobsAssignmentsDao";

// Mock the DAO
jest.mock("@/lib/dao/JobsAssignmentsDao");

const mockedJobsDao = jest.mocked(JobsAssignmentsDao);

describe("AssignmentService", () => {
  let assignmentService: AssignmentService;

  const mockActiveAssignment: ActiveAssignment = {
    job_id: "job-123",
    associate_id: "assoc-456",
    work_date: new Date("2023-10-01"),
    start_time: "09:00",
    confirmation_status: ConfirmationStatus.UNCONFIRMED,
  };

  beforeEach(() => {
    assignmentService = new AssignmentService();
    jest.clearAllMocks();
  });

  describe("getActiveAssignments", () => {
    it("should get active assignments for associate", async () => {
      // Arrange
      const mockAssignments = [
        {
          job_id: "job-123",
          associate_id: "assoc-456",
          work_date: "2023-10-01",
          start_time: "09:00",
          confirmation_status: "unconfirmed",
        },
      ];

      mockedJobsDao.getActiveAssignmentsFromDatabase.mockResolvedValue(
        mockAssignments
      );

      // Act
      const result = await assignmentService.getActiveAssignments("assoc-456");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].job_id).toBe("job-123");
      expect(result[0].associate_id).toBe("assoc-456");
      expect(result[0].confirmation_status).toBe(ConfirmationStatus.UNCONFIRMED);
      expect(mockedJobsDao.getActiveAssignmentsFromDatabase).toHaveBeenCalledWith(
        expect.any(String), // today
        expect.any(String), // 7 days from now
        "assoc-456"
      );
    });

    it("should handle empty assignments", async () => {
      // Arrange
      mockedJobsDao.getActiveAssignmentsFromDatabase.mockResolvedValue([]);

      // Act
      const result = await assignmentService.getActiveAssignments("assoc-456");

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("determineConfirmationStatus", () => {
    it("should return CONFIRMED for work within 6 hours", () => {
      const now = new Date("2023-10-01T08:00:00Z");
      const workDate = new Date("2023-10-01T12:00:00Z"); // 4 hours later
      const assignment = {
        ...mockActiveAssignment,
        work_date: workDate,
        start_time: "12:00",
      };

      // Mock the current time
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const result = assignmentService.determineConfirmationStatus(assignment);

      expect(result).toBe(ConfirmationStatus.CONFIRMED);

      jest.useRealTimers();
    });

    it("should return LIKELY_CONFIRMED for work within 24 hours", () => {
      const now = new Date("2023-10-01T08:00:00Z");
      const workDate = new Date("2023-10-01T20:00:00Z"); // 12 hours later
      const assignment = {
        ...mockActiveAssignment,
        work_date: workDate,
        start_time: "20:00",
      };

      jest.useFakeTimers();
      jest.setSystemTime(now);

      const result = assignmentService.determineConfirmationStatus(assignment);

      expect(result).toBe(ConfirmationStatus.LIKELY_CONFIRMED);

      jest.useRealTimers();
    });

    it("should return SOFT_CONFIRMED for work more than 24 hours away", () => {
      const now = new Date("2023-10-01T08:00:00Z");
      const workDate = new Date("2023-10-02T20:00:00Z"); // 36 hours later
      const assignment = {
        ...mockActiveAssignment,
        work_date: workDate,
        start_time: "20:00",
      };

      jest.useFakeTimers();
      jest.setSystemTime(now);

      const result = assignmentService.determineConfirmationStatus(assignment);

      expect(result).toBe(ConfirmationStatus.SOFT_CONFIRMED);

      jest.useRealTimers();
    });
  });

  describe("updateAssignmentStatus", () => {
    it("should update assignment status", async () => {
      // Arrange
      mockedJobsDao.updateJobAssignment.mockResolvedValue([]);

      // Act
      await assignmentService.updateAssignmentStatus(
        "job-123",
        "assoc-456",
        ConfirmationStatus.CONFIRMED
      );

      // Assert
      expect(mockedJobsDao.updateJobAssignment).toHaveBeenCalledWith(
        "job-123",
        "assoc-456",
        {
          confirmation_status: ConfirmationStatus.CONFIRMED,
          last_confirmation_time: expect.any(String),
        }
      );
    });
  });

  describe("updateMultipleAssignments", () => {
    it("should update multiple assignments", async () => {
      // Arrange
      const assignments = [mockActiveAssignment, { ...mockActiveAssignment, job_id: "job-456" }];
      mockedJobsDao.updateJobAssignment.mockResolvedValue([]);

      // Act
      const updatedCount = await assignmentService.updateMultipleAssignments(
        assignments,
        ConfirmationStatus.CONFIRMED
      );

      // Assert
      expect(updatedCount).toBe(2);
      expect(mockedJobsDao.updateJobAssignment).toHaveBeenCalledTimes(2);
    });

    it("should handle empty assignments array", async () => {
      // Act
      const updatedCount = await assignmentService.updateMultipleAssignments(
        [],
        ConfirmationStatus.CONFIRMED
      );

      // Assert
      expect(updatedCount).toBe(0);
      expect(mockedJobsDao.updateJobAssignment).not.toHaveBeenCalled();
    });
  });
});
