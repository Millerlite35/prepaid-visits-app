"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

// Accept an invitation. The database checks it's for this user's email (from their
// verified login token; Supabase only lets confirmed emails sign in), still open and
// not expired. requireUser() means two-step verification is already done.
export async function acceptInvite(inviteId: string): Promise<void> {
  const user = await requireUser();
  const { error } = await getAdminClient().rpc("accept_staff_invite", {
    p_invite_id: inviteId,
    p_user_id: user.id,
    p_email: user.email,
  });
  if (error) console.warn("accept_staff_invite refused:", error.message);
  refresh();
}
