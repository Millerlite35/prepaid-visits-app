"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  cleanPasskeyName,
  deletePasskey,
  finishRegistration,
  listPasskeys,
  passkeyErrorMessage,
  registrationOptions,
  sendPasskeyAlert,
  type PasskeyOptions,
} from "@/lib/passkeys";

export type StartResult = PasskeyOptions | { error: string };
export type DoneResult = { ok?: true; error?: string };

// Adding a passkey: step 1 gets the options, the browser runs Face ID / fingerprint,
// step 2 sends the answer back. Both need a full two-step sign-in (requireUser).
export async function startPasskeySetup(): Promise<StartResult> {
  await requireUser();
  try {
    return await registrationOptions();
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
}

export async function finishPasskeySetup(challengeId: string, credential: unknown, name: string): Promise<DoneResult> {
  const user = await requireUser();
  const clean = cleanPasskeyName(name);
  try {
    await finishRegistration(challengeId, credential, clean);
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
  await sendPasskeyAlert(user.email, "added", clean);
  revalidatePath("/dashboard/security");
  return { ok: true };
}

export async function removePasskey(passkeyId: string): Promise<DoneResult> {
  const user = await requireUser();
  // only the person's own passkeys (Supabase also refuses other people's)
  const own = (await listPasskeys().catch(() => [])).find((p) => p.id === passkeyId);
  if (!own) return { error: "That passkey wasn't found." };
  try {
    await deletePasskey(passkeyId);
  } catch (e) {
    console.warn("remove passkey failed:", e instanceof Error ? e.message : e);
    return { error: "Couldn't remove that passkey. Please try again." };
  }
  await sendPasskeyAlert(user.email, "removed", own.name);
  revalidatePath("/dashboard/security");
  return { ok: true };
}
