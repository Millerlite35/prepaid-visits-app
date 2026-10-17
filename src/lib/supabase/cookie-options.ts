// Login cookie settings, shared by proxy.ts and the server client.
// httpOnly: page scripts can't read the login token, so a script injected into a page
// couldn't steal it. We never use Supabase from the browser, so nothing needs it there.
// sameSite lax: other sites can't make the browser send it along with their forms.
// secure: https only (production; localhost is plain http).
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
