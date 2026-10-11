"use server";

import { refresh } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { inviteText, sendInviteEmail } from "@/lib/staff";
import { getAdminClient } from "@/lib/supabase/admin";

// Owner-only staff management. The rules (owner can't be removed or demoted, one open
// invitation per email) are enforced in the database functions too.

export type InviteState = { error?: string; message?: string; shareText?: string };

export async function inviteStaff(providerId: string, _prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireOwner(providerId);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (email === user.email.toLowerCase()) return { error: "That's your own email. You're already the owner." };

  const db = getAdminClient();
  const { data: inviteId, error } = await db.rpc("create_staff_invite", {
    p_provider_id: providerId,
    p_email: email,
    p_role: role,
    p_user_id: user.id,
  });
  if (error || !inviteId) {
    if (error?.message.includes("valid email")) return { error: "Enter a valid email address." };
    console.error("create_staff_invite failed:", error?.code, error?.message);
    return { error: "Couldn't create the invitation. Please try again." };
  }

  const { data: provider } = await db.from("providers").select("display_name").eq("id", providerId).single<{ display_name: string }>();
  const name = provider?.display_name ?? "your business";
  const emailed = await sendInviteEmail(String(inviteId), name, email, role);
  refresh();
  return {
    message: emailed
      ? `Invitation emailed to ${email}. You can also send them the message below.`
      : `Invitation created for ${email}. Send them the message below (by text or email).`,
    shareText: inviteText(name, email, role),
  };
}

export async function cancelInvite(providerId: string, inviteId: string): Promise<void> {
  const user = await requireOwner(providerId);
  const { error } = await getAdminClient().rpc("cancel_staff_invite", { p_provider_id: providerId, p_invite_id: inviteId, p_user_id: user.id });
  if (error) console.error("cancel_staff_invite failed:", error.message);
  refresh();
}

export async function changeRole(providerId: string, memberId: string, formData: FormData): Promise<void> {
  const user = await requireOwner(providerId);
  const role = String(formData.get("role") ?? "");
  const { error } = await getAdminClient().rpc("change_member_role", {
    p_provider_id: providerId,
    p_member_id: memberId,
    p_role: role,
    p_user_id: user.id,
  });
  if (error) console.error("change_member_role failed:", error.message);
  refresh();
}

export async function removeMember(providerId: string, memberId: string): Promise<void> {
  const user = await requireOwner(providerId);
  const { error } = await getAdminClient().rpc("remove_member", { p_provider_id: providerId, p_member_id: memberId, p_user_id: user.id });
  if (error) console.error("remove_member failed:", error.message);
  refresh();
}
