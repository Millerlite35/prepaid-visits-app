import { Suspense } from "react";
import type { Viewport } from "next";
import { BusinessNav, type NavGroup } from "@/components/business-nav";
import { requireUser, type StaffRole } from "@/lib/auth";
import { logoUrl } from "@/lib/branding";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

// lets the phone bottom bar read the iPhone home-indicator inset (env(safe-area-inset-bottom))
export const viewport: Viewport = { viewportFit: "cover" };

// Every business page gets the sidebar (a bottom bar on phones). It only shows links the person's role can use;
// each page still checks access itself (requireStaff / requireManager / requireOwner).
export default function BusinessLayout({ children, params }: LayoutProps<"/dashboard/business/[providerId]">) {
  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <Suspense fallback={<div className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block" />}>
        <Nav params={params} />
      </Suspense>
      {/* room for the phone bottom bar so it never covers the end of the page */}
      <div className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Suspense>
          <ClosedBanner params={params} />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

// A closed business (migration 0021) keeps its records for the owner; say so on every page
async function ClosedBanner({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireUser();
  // read as the user: row-level security only returns it to the business's own staff
  const db = await createSessionClient();
  const { data } = await db.from("providers").select("closed_at").eq("id", providerId).maybeSingle<{ closed_at: string | null }>();
  if (!data?.closed_at) return null;
  return (
    <p className="border-b border-warning-line bg-warning-soft px-4 py-2.5 text-sm text-warning sm:px-8">
      This business is closed: it no longer sells and its passes are cancelled. Purchases and history are kept here.
    </p>
  );
}

function groupsFor(base: string, providerId: string, role: StaffRole): NavGroup[] {
  const manager = role === "owner" || role === "manager";
  const groups: NavGroup[] = [
    {
      label: "Front desk",
      items: [
        { href: `${base}/scan`, label: "Scan", icon: "scan", bar: true },
        // scan-only staff have no other pages, so self check-in gets their second bar spot
        { href: `/kiosk/${providerId}`, label: "Self check-in", icon: "kiosk", external: true, bar: !manager },
      ],
    },
  ];
  if (manager) {
    groups.unshift({
      label: "Business",
      items: [
        { href: base, label: "Overview", icon: "overview", bar: true },
        { href: `${base}/clients`, label: "Clients", icon: "clients", bar: true },
        { href: `${base}/packages`, label: "Packages", icon: "packages", bar: true },
      ],
    });
    groups.push({
      label: "Marketing",
      items: [
        { href: `${base}/marketing`, label: "Flyers and signs", icon: "flyers" },
        { href: `${base}/cards`, label: "QR cards", icon: "cards" },
      ],
    });
  }
  if (role === "owner") {
    groups.push({
      label: "Admin",
      items: [
        { href: `${base}/staff`, label: "Staff", icon: "staff" },
        { href: `${base}/settings`, label: "Page settings", icon: "settings" },
      ],
    });
  }
  return groups;
}

async function Nav({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const user = await requireUser();
  // read as the user: row-level security only shows their own memberships
  const db = await createSessionClient();
  const { data: member } = await db
    .from("provider_members")
    .select("role")
    .eq("provider_id", providerId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: StaffRole }>();
  if (!member) return null;

  // scan-only staff can't read the providers table, so the name and logo are read on
  // the server after the membership check above
  const { data: p } = await getAdminClient()
    .from("providers")
    .select("display_name, logo_path")
    .eq("id", providerId)
    .maybeSingle<{ display_name: string; logo_path: string | null }>();

  const base = `/dashboard/business/${providerId}`;
  return (
    <BusinessNav
      groups={groupsFor(base, providerId, member.role)}
      overviewHref={base}
      businessName={p?.display_name ?? "Your business"}
      logo={logoUrl(p?.logo_path ?? null)}
    />
  );
}
