export function formatMatchDate(date?: string | null): string {
  if (!date) {
    return "Date TBA";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(new Date(date));
}

export function formatMatchTime(date?: string | null): string {
  if (!date) {
    return "Time TBA";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function formatLastUpdated(date?: string | null): string {
  if (!date) {
    return "Not loaded yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}
