"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "@/components/ui";

// bar: shown in the phone bottom bar (everything else goes under "More")
export type NavItem = { href: string; label: string; icon: IconName; external?: boolean; bar?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

// Sidebar on large screens; on phones a bottom bar with Scan in the middle and a "More"
// sheet for the rest. The active page is highlighted; the overview only matches its own
// address, other items their section.
export function BusinessNav({ groups, overviewHref, businessName, logo }: { groups: NavGroup[]; overviewHref: string; businessName: string; logo: string | null }) {
  const path = usePathname();
  const active = (href: string) => (href === overviewHref ? path === href : path === href || path.startsWith(`${href}/`));
  const all = groups.flatMap((g) => g.items);

  return (
    <>
      {/* phones and tablets: business name on top, navigation in the bottom bar */}
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink lg:hidden print:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage */}
        {logo && <img src={logo} alt="" className="h-6 w-auto max-w-[80px] object-contain" />}
        <span className="truncate">{businessName}</span>
      </div>
      <BottomBar items={all} active={active} businessName={businessName} />

      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block print:hidden">
        <div className="sticky top-14 flex max-h-[calc(100vh-3.5rem)] flex-col overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-4 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage */}
            {logo && <img src={logo} alt="" className="mb-2 h-12 w-auto max-w-[180px] object-contain" />}
            <p className="leading-snug font-semibold text-ink">{businessName}</p>
            <Link href="/dashboard" className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              <Icon name="back" className="h-3 w-3" />
              All businesses
            </Link>
          </div>
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p className="mb-1 px-2 text-[11px] font-medium tracking-wider text-ink-muted uppercase">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      aria-current={active(item.href) ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-md px-2 py-[5px] text-sm transition",
                        active(item.href) ? "bg-brand/10 font-medium text-brand" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                      )}
                    >
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {item.external && <Icon name="external" className="h-3.5 w-3.5 opacity-60" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

// Fixed to the bottom of the screen on phones, above the iPhone home indicator
// (safe-area inset; the business layout sets viewport-fit=cover so the inset is known).
// Scan sits in the middle as a raised round button; the other bar items split around it.
function BottomBar({ items, active, businessName }: { items: NavItem[]; active: (href: string) => boolean; businessName: string }) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scan = items.find((i) => i.bar && i.icon === "scan");
  const sides = items.filter((i) => i.bar && i !== scan);
  const rest = items.filter((i) => !i.bar);
  const moreActive = rest.some((i) => active(i.href));
  const half = Math.ceil((sides.length + 1) / 2);
  const left = sides.slice(0, half);
  const right = sides.slice(half);

  // Escape closes the sheet; the page behind doesn't scroll while it's open
  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const tab = (isActive: boolean) =>
    cx(
      "flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] leading-tight",
      isActive ? "font-semibold text-ink" : "text-ink-muted",
    );

  return (
    <>
      <nav
        aria-label="Business"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        <ul className="mx-auto flex max-w-md items-end px-1">
          {left.map((item) => (
            <li key={item.href} className="flex flex-1">
              <BarLink item={item} className={tab(active(item.href))} current={active(item.href)} />
            </li>
          ))}
          {scan && (
            <li className="flex flex-1 justify-center">
              <Link
                href={scan.href}
                aria-current={active(scan.href) ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-0.5 pb-1.5 text-[11px] leading-tight",
                  active(scan.href) ? "font-semibold text-ink" : "text-ink-muted",
                )}
              >
                <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white ring-4 ring-surface">
                  <Icon name="scan" className="h-6 w-6" />
                </span>
                {scan.label}
              </Link>
            </li>
          )}
          {right.map((item) => (
            <li key={item.href} className="flex flex-1">
              <BarLink item={item} className={tab(active(item.href))} current={active(item.href)} />
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={tab(moreActive)}>
              <Icon name="more" className="h-6 w-6" />
              More
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="rounded-t-xl bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] outline-none"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-ink">{businessName}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-2 text-ink-muted hover:bg-surface-muted hover:text-ink">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <ul className="divide-y divide-line">
              {rest.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    aria-current={active(item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cx("flex items-center gap-3 py-3 text-base", active(item.href) ? "font-semibold text-ink" : "text-ink")}
                  >
                    <Icon name={item.icon} className="h-5 w-5 text-ink-muted" />
                    <span className="flex-1">{item.label}</span>
                    {item.external && <Icon name="external" className="h-4 w-4 text-ink-muted" />}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 py-3 text-base text-ink-muted">
                  <Icon name="back" className="h-5 w-5" />
                  All businesses
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function BarLink({ item, className, current }: { item: NavItem; className: string; current: boolean }) {
  return (
    <Link href={item.href} target={item.external ? "_blank" : undefined} aria-current={current ? "page" : undefined} className={className}>
      <Icon name={item.icon} className="h-6 w-6" />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
