import { logoUrl } from "@/lib/branding";

// The provider's logo (if they uploaded one) and name, for client-facing pages.
export function ProviderHeader({
  name,
  color,
  logoPath,
  subtitle,
  center = false,
}: {
  name: string;
  color: string;
  logoPath: string | null;
  subtitle?: string;
  center?: boolean;
}) {
  const logo = logoUrl(logoPath);
  return (
    <header className={center ? "text-center" : ""}>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage
        <img src={logo} alt={`${name} logo`} className={`mb-3 max-h-16 max-w-[220px] object-contain ${center ? "mx-auto" : ""}`} />
      )}
      <h1 className="text-2xl font-semibold" style={{ color }}>
        {name}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
    </header>
  );
}
