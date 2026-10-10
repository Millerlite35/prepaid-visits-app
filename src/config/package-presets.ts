// Ready-made packages a provider can add in one click from the Packages page.
// Prices are worked out from the provider's usual price per visit, minus the discount,
// rounded to whole dollars. Providers can rename or change anything after adding.
// Names stay neutral (no specialty or health wording): they can appear on passes.
export type PackagePreset = {
  id: string;
  name: string;
  visits: number;
  discountPercent: number;
  expiresDays: number | null; // null = never expires
  selectedByDefault: boolean;
};

export const packagePresets: PackagePreset[] = [
  { id: "starter", name: "Starter", visits: 3, discountPercent: 5, expiresDays: 180, selectedByDefault: true },
  { id: "standard", name: "Standard", visits: 6, discountPercent: 10, expiresDays: 365, selectedByDefault: true },
  { id: "committed", name: "Committed", visits: 10, discountPercent: 15, expiresDays: 365, selectedByDefault: true },
  { id: "intensive", name: "Intensive", visits: 20, discountPercent: 20, expiresDays: 365, selectedByDefault: false },
];
