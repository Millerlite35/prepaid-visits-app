// Payment business settings. Not secret; changing them is a business decision.

// What kind of Stripe account each provider gets when they connect.
//   "full":    providers get their own full Stripe account and dashboard. They handle
//              their own refunds and disputes, pay Stripe's fees, and STRIPE (not us)
//              covers losses a provider can't pay back.
//   "express": lighter signup and Stripe's simpler Express dashboard, but WE (the
//              platform) pay Stripe's fees and are liable for chargebacks and negative
//              balances a provider can't cover.
// OPEN DECISION: raise with the attorney before the pilot (see CLAUDE.md).
// Changing this only affects providers who connect afterwards.
export const connectAccountStyle: "full" | "express" = "full";

// Our cut of each package sale, in percent. 0 = we take nothing from sales (founder decision
// Nov 21, 2026: monthly fee only, $19.99 founder price). Raising it later is a business decision:
// give 30 days' notice (terms page) and keep founder accounts on their promised price.
// Checkout skips the application fee entirely while this is 0; help and terms wording follow it.
export const platformFeePercent = 0;
