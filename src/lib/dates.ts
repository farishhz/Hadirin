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

export function getDaysInMonth(monthKey: string): string[] {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const dates: string[] = [];
  while (date.getMonth() === month - 1) {
    dates.push(date.toISOString().slice(0, 10));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

