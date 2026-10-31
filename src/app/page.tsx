import { redirect } from "next/navigation";

// The app has no home page of its own: the marketing site lives on the root domain and
// this app on its own subdomain. The dashboard sends signed-out visitors to /login.
export default function Home() {
  redirect("/dashboard");
}
