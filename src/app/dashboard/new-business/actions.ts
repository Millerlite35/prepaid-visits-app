"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { checkSlug } from "@/lib/slug";
import { getAdminClient } from "@/lib/supabase/admin";

export type BusinessFormState = { error?: string };

const DEFAULT_TIMEZONE = "America/New_York";

export async function createBusiness(_prev: BusinessFormState, formData: FormData): Promise<BusinessFormState> {
  const user = await requireUser(); // signed in AND passed two-step verification

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const timezone = String(formData.get("timezone") ?? "");

  if (name.length < 1 || name.length > 80) return { error: "Enter a business name (up to 80 characters)." };
  const slugProblem = checkSlug(slug);
  if (slugProblem) return { error: slugProblem };

  // Creating a business needs the server key (signed-in users can't insert providers).
  // Safe here: the owner is always the verified user above, never a value from the form.
  const { error } = await getAdminClient().rpc("create_provider", {
    p_user_id: user.id,
    p_slug: slug,
    p_display_name: name,
    p_timezone: isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE,
  });
  if (error) {
    if (error.code === "23505") return { error: "That web address is already taken. Try another." };
    console.error("create_provider failed:", error.code, error.message);
    return { error: "Couldn't create your business. Please try again." };
  }
  redirect("/dashboard");
}

function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
