import type { Instrumentation } from "next";

// Next.js calls this for every error on the server (pages, server actions, API routes):
// the founder gets an email (throttled; no client details, see src/lib/alerts.ts).
// Reports the route's FILE path (e.g. /dashboard/business/[providerId]/clients), never the
// real address, which could hold a pass code or a private page key.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // alerts need Node (email, database)
  const { alertFounder } = await import("@/lib/alerts");
  const error = err as { message?: string; digest?: string; name?: string };
  await alertFounder(`Server error on ${context.routePath}`, {
    what: `${error.name ?? "Error"}: ${error.message ?? String(err)}`,
    route: context.routePath,
    kind: context.routeType,
    method: request.method,
    digest: error.digest,
  });
};
