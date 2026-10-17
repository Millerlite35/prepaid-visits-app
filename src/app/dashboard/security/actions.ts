"use server";

import { requireUser } from "@/lib/auth";
import { createBackupCodes } from "@/lib/backup-codes";

export type CodesState = { codes?: string[]; error?: string };

// Make a fresh set of backup codes. They're returned once, to show on screen, and never
// stored in readable form.
export async function makeBackupCodes(): Promise<CodesState> {
  const user = await requireUser();
  try {
    return { codes: await createBackupCodes(user.id) };
  } catch (e) {
    console.error("create backup codes failed:", e instanceof Error ? e.message : e);
    return { error: "Couldn't make backup codes. Please try again." };
  }
}
