// Facts the privacy policy and terms (/privacy, /terms) depend on. Only the founder can
// confirm them; the pages show a "draft" notice until the attorney has reviewed them.
export const legal = {
  // CONFIRM: the business's legal name (e.g. "Shadow Mode LLC"), as registered
  operator: "VisitBundle",
  // CONFIRM: an inbox that really receives mail (Cloudflare Email Routing can forward it for free)
  contactEmail: "support@visitbundle.com",
  // CONFIRM with the attorney: which state's law governs the terms (null = sentence left out)
  governingState: null as string | null,
  lastUpdated: "November 7, 2026",
  attorneyReviewed: false,
} as const;
