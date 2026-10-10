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

// Our platform fee on each package sale, in percent (business plan: 0.5 to 1%).
// Used by checkout in build step 6.
export const platformFeePercent = 1;
