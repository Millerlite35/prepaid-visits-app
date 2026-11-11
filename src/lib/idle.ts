// Automatic sign-out after inactivity on staff pages (HIPAA "automatic logoff",
// docs/hipaa-risk-assessment.md R5). Shared by the browser timer and the sign-in page's notice.
export const IDLE_MINUTES = 30;
// how long the "Still there?" warning shows before signing out
export const IDLE_WARNING_SECONDS = 60;
// anything that isn't a click or key press but still means someone is working
// (e.g. a camera scan on the scanner page) can announce itself with this event
export const ACTIVITY_EVENT = "app-activity";
