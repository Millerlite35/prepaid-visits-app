"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  beginPasskeyEnrollment,
  cleanPasskeyName,
  listPasskeys,
  passkeyErrorMessage,
  removePasskey,
  verifyPasskey,
  type PasskeyChallenge,
} from "@/lib/passkeys";

export type StartResult = ({ factorId: string } & PasskeyChallenge) | { error: string };
export type DoneResult = { ok?: true; error?: string };

// Adding a passkey: step 1 makes the challenge, the browser runs Face ID / fingerprint,
// step 2 sends the answer back. Both steps need a full two-step sign-in (requireUser).
export async function startPasskeySetup(name: string): Promise<StartResult> {
  await requireUser();
  try {
    return await beginPasskeyEnrollment(cleanPasskeyName(name));
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
}

export async function finishPasskeySetup(factorId: string, challengeId: string, credential: unknown): Promise<DoneResult> {
  await requireUser();
  try {
    await verifyPasskey(factorId, challengeId, "create", credential);
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
  revalidatePath("/dashboard/security");
  return { ok: true };
}

export async function deletePasskey(factorId: string): Promise<DoneResult> {
  await requireUser();
  // only the person's own passkeys (Supabase also refuses other people's factors)
  if (!(await listPasskeys()).some((p) => p.id === factorId)) return { error: "That passkey wasn't found." };
  try {
    await removePasskey(factorId);
  } catch (e) {
    console.warn("remove passkey failed:", e instanceof Error ? e.message : e);
    return { error: "Couldn't remove that passkey. Please try again." };
  }
  revalidatePath("/dashboard/security");
  return { ok: true };
}
