export const formatTime = (date: string | Date): string => {
  const time = new Date(date);
  const hours = time.getUTCHours().toString().padStart(2, "0");
  const minutes = time.getUTCMinutes().toString().padStart(2, "0");
  const seconds = time.getUTCSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

// Helper function to format date (e.g., "Jan 15")
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  } catch {
    return dateString;
  }
};

// Helper function to format date and time (e.g., "Jan 15, 3:45 PM")
export const formatDateTime = (
  dateString: string,
  timeString?: string | null
): string => {
  try {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Parse the date portion
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      return dateString; // Return original if parsing fails
    }

    const month = months[dateObj.getMonth()];
    const day = dateObj.getDate();

    // If timeString is provided, format it with timezone conversion
    if (timeString) {
      // Parse the timestamp to get the date for timezone conversion
      const timeDate = new Date(timeString);
      if (!isNaN(timeDate.getTime())) {
        // Use the date from timeString for the month/day, but convert time properly
        const timeMonth = months[timeDate.getMonth()];
        const timeDay = timeDate.getDate();

        // Convert UTC time to Mountain Time for display
        const mountainTime = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Denver",
          hour12: true,
          hour: "numeric",
          minute: "2-digit",
        }).format(timeDate);

        return `${timeMonth} ${timeDay}, ${mountainTime}`;
      }
    }

    // Check if dateString contains time info
    if (dateString.includes("T") || dateString.includes(" ")) {
      const dateWithTime = new Date(dateString);
      if (!isNaN(dateWithTime.getTime())) {
        // Convert to Mountain Time
        const mountainTime = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Denver",
          hour12: true,
          hour: "numeric",
          minute: "2-digit",
        }).format(dateWithTime);

        return `${month} ${day}, ${mountainTime}`;
      }
    }

    // Just return the date if no time info
    return `${month} ${day}`;
  } catch {
    return dateString;
  }
};
