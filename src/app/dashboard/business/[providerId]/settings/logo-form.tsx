"use client";

import { useActionState, useState } from "react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "@/lib/branding";
import type { SettingsState } from "./actions";
import { Notice } from "@/components/ui";

type Props = {
  action: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
  removeAction: () => Promise<void>;
  currentUrl: string | null;
};

export function LogoForm({ action, removeAction, currentUrl }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function choose(file: File | undefined) {
    setPreview(null);
    setProblem(null);
    if (!file) return;
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return setProblem("Use a PNG, JPG or WebP image.");
    if (file.size > LOGO_MAX_BYTES) return setProblem("That image is over 1 MB. Try a smaller version.");
    setPreview(URL.createObjectURL(file));
  }

  const shown = preview ?? currentUrl;

  return (
    <div className="space-y-3">
      <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line bg-white p-2">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded logo or local preview
          <img src={shown} alt="Logo preview" className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className="text-sm text-ink-muted">No logo yet</span>
        )}
      </div>

      <form action={formAction} className="space-y-3">
        <input
          name="logo"
          type="file"
          accept={LOGO_TYPES.join(",")}
          required
          onChange={(e) => choose(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2"
        />
        <p className="text-xs text-ink-muted">
          PNG, JPG or WebP, up to 1 MB.
        </p>
        {problem && <p className="text-sm text-danger">{problem}</p>}
        {!pending && state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {!pending && state.saved && <Notice tone="success">Logo saved</Notice>}
        <button
          disabled={pending || !preview}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload logo"}
        </button>
      </form>

      {currentUrl && (
        <form action={removeAction}>
          <ConfirmSubmit label="Remove logo" question="Remove your logo?" confirmLabel="Yes, remove" className="text-sm text-danger underline" />
        </form>
      )}
    </div>
  );
}
