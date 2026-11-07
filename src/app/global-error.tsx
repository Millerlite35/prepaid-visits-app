"use client";

// Last resort when even the main layout fails: plain HTML, no app styles or fonts.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#5b6676" }}>We&apos;ve been told about it. Try again in a moment.</p>
          <button type="button" onClick={() => retry()} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e1e6ec", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
