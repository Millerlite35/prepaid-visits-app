"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-checks the page every few seconds (up to about a minute) while waiting for Stripe.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > 20) clearInterval(timer);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
