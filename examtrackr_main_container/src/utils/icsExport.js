/**
 * Utility to export exam or milestone events as .ics file for calendar import.
 * examsOrMilestones: Array of { title, description, date (ISO), ...}
 * filename: string
 */
// PUBLIC_INTERFACE
export function exportToICS(events, filename = "examtrackr_events.ics") {
  const pad = n => (n < 10 ? "0" + n : n);
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExamTrackr//EN"
  ];

  for (const ev of events) {
    const dt = new Date(ev.date);
    const dtStr =
      dt.getUTCFullYear().toString() +
      pad(dt.getUTCMonth() + 1) +
      pad(dt.getUTCDate()) +
      "T" +
      pad(dt.getUTCHours()) +
      pad(dt.getUTCMinutes()) +
      "00Z";

    icsContent.push(
      "BEGIN:VEVENT",
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || ""}`,
      `DTSTART:${dtStr}`,
      `DTEND:${dtStr}`,
      "END:VEVENT"
    );
  }
  icsContent.push("END:VCALENDAR");
  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}
