import { Suspense } from "react";
import { BusinessNav, type NavGroup } from "@/components/business-nav";
import { requireUser, type StaffRole } from "@/lib/auth";
import { logoUrl } from "@/lib/branding";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

// Every business page gets the sidebar. It only shows links the person's role can use;
// each page still checks access itself (requireStaff / requireManager / requireOwner).
export default function BusinessLayout({ children, params }: LayoutProps<"/dashboard/business/[providerId]">) {
  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <Suspense fallback={<div className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block" />}>
        <Nav params={params} />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function groupsFor(base: string, providerId: string, role: StaffRole): NavGroup[] {
  const manager = role === "owner" || role === "manager";
  const groups: NavGroup[] = [
    {
      label: "Front desk",
      items: [
        { href: `${base}/scan`, label: "Scan", icon: "scan" },
        { href: `/kiosk/${providerId}`, label: "Self check-in", icon: "kiosk", external: true },
      ],
    },
  ];
  if (manager) {
    groups.unshift({
      label: "Business",
      items: [
        { href: base, label: "Overview", icon: "overview" },
        { href: `${base}/clients`, label: "Clients", icon: "clients" },
        { href: `${base}/packages`, label: "Packages", icon: "packages" },
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
