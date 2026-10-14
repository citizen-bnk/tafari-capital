export const recordStatuses: Record<string, string[]> = {
  listings: [
    "draft",
    "submitted",
    "changes_requested",
    "approved",
    "under_offer",
    "sold",
    "withdrawn",
  ],
  offers: [
    "pending",
    "accepted",
    "declined",
    "withdrawn",
    "completed",
    "cancelled",
  ],
  users: ["active", "suspended"],
  enquiries: ["new", "in_progress", "resolved"],
  documents: ["pending", "ready"],
};
export function recordStatus(view: string, value: string | null) {
  return value && recordStatuses[view]?.includes(value) ? value : "";
}
export function backOfficeHref(tab: string, status = "", query = "", page = 0) {
  const params = new URLSearchParams({ tab });
  if (status) params.set("status", status);
  if (query) params.set("q", query);
  if (page) params.set("page", String(page));
  return "/back-office?" + params.toString();
}
