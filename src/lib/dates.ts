export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKeyFromDate(date: string) {
  return date.slice(0, 7);
}

export function isDateInMonth(date: string, monthKey: string) {
  return date.startsWith(`${monthKey}-`);
}

export function formatIndonesianDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}
