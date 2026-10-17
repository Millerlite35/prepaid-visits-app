"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; icon: IconName; external?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

// Sidebar on large screens, a scrollable tab strip on phones. The active page is
// highlighted; the overview only matches its own address, other items their section.
export function BusinessNav({ groups, overviewHref, businessName, logo }: { groups: NavGroup[]; overviewHref: string; businessName: string; logo: string | null }) {
  const path = usePathname();
  const active = (href: string) => (href === overviewHref ? path === href : path === href || path.startsWith(`${href}/`));
  const all = groups.flatMap((g) => g.items);

  return (
    <>
      {/* phones and tablets */}
      <nav aria-label="Business" className="border-b border-line bg-surface lg:hidden print:hidden">
        <div className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage */}
          {logo && <img src={logo} alt="" className="h-6 w-auto max-w-[80px] object-contain" />}
          <span className="truncate">{businessName}</span>
        </div>
        <ul className="flex gap-1 overflow-x-auto px-3 py-2">
          {all.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                aria-current={active(item.href) ? "page" : undefined}
                className={cx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
                  active(item.href) ? "bg-brand/10 font-medium text-brand" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block print:hidden">
        <div className="sticky top-14 flex max-h-[calc(100vh-3.5rem)] flex-col overflow-y-auto px-3 py-5">
          <div className="mb-5 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage */}
            {logo && <img src={logo} alt="" className="mb-2 h-10 w-auto max-w-[180px] object-contain" />}
            <p className="truncate font-semibold text-ink">{businessName}</p>
            <Link href="/dashboard" className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              <Icon name="back" className="h-3 w-3" />
              All businesses
            </Link>
          </div>
          {groups.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="mb-1 px-2 text-[11px] font-medium tracking-wider text-ink-muted uppercase">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      aria-current={active(item.href) ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition",
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
