"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";

// A password field with a "Show"/"Hide" eye button. Only changes what's on screen;
// the form still sends the field as usual.
export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative mt-1 block">
      <input {...props} type={shown ? "text" : "password"} className={cx(className, "!mt-0 pr-11")} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Icon name={shown ? "eyeOff" : "eye"} className="h-5 w-5" />
      </button>
    </span>
  );
}
