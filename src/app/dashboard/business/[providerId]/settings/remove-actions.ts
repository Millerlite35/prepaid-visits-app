"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { confirmPassword } from "@/lib/confirm-password";
import { removeLogoFile } from "@/lib/logos";
import { getAdminClient } from "@/lib/supabase/admin";

export type RemoveState = { error?: string };

// Owner only: delete a business that never sold anything, or close one that has sales
// (migration 0021 decides which is allowed and does the work in one transaction).
// The owner confirms with their password, so a signed-in computer left open isn't enough.
export async function removeBusiness(providerId: string, _prev: RemoveState, formData: FormData): Promise<RemoveState> {
  const owner = await requireOwner(providerId);
  const mode = formData.get("mode") === "close" ? "close" : "delete";
  const admin = getAdminClient(); // after requireOwner; the functions check ownership again

  const { data: p } = await admin
    .from("providers")
    .select("display_name, logo_path")
    .eq("id", providerId)
    .maybeSingle<{ display_name: string; logo_path: string | null }>();
  if (!p) return { error: "That business wasn't found." };

  const checked = await confirmPassword(owner.id, owner.email, String(formData.get("password") ?? ""));
  if (checked === "too_many") return { error: "Too many tries. Please wait 15 minutes and try again." };
  if (checked === "wrong") return { error: "That password isn't right." };

  const fn = mode === "delete" ? "delete_provider" : "close_provider";
  const { data: result, error } = await admin.rpc(fn, { p_provider_id: providerId, p_actor_id: owner.id });
  if (error) {
    console.error(`${fn} failed:`, error.message);
    return { error: "Something went wrong. Nothing was changed. Please try again." };
  }
  if (result === "has_sales") return { error: "This business has sales, so it can be closed but not deleted." };
  if (result === "not_owner") return { error: "Only the owner can do this." };
  if (result === "already_closed") redirect("/dashboard");
  if (result !== "deleted" && result !== "closed") return { error: "Something went wrong. Please try again." };

  if (result === "deleted" && p.logo_path) await removeLogoFile(p.logo_path).catch(() => {});
  redirect(`/dashboard?removed=${result}`);
}
