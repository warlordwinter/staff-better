import { localDateTimeToUTCISO, localDateTimeToUTCDate } from "../timeServer";

describe("timeServer timezone helpers", () => {
  it("converts standard time (MST) to UTC", () => {
    const iso = localDateTimeToUTCISO("2025-01-15", "09:00:00");
    expect(iso).toBe("2025-01-15T16:00:00.000Z");
  });

  it("converts daylight time (MDT) to UTC", () => {
    const iso = localDateTimeToUTCISO("2025-07-10", "09:00:00");
    expect(iso).toBe("2025-07-10T15:00:00.000Z");
  });

  it("computes day-before reminder time at 7pm local", () => {
    const date = localDateTimeToUTCDate("2025-08-05", "19:00:00");
    expect(date.toISOString()).toBe("2025-08-06T01:00:00.000Z");
  });
});
