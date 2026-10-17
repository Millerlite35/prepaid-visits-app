-- The practice's regular price for a single visit (optional). Used to show savings on the
-- purchase page and flyers ("Save 10%"). Must be a price the practice really charges.

alter table providers
  add column usual_price_cents integer check (usual_price_cents is null or usual_price_cents between 100 and 1000000);

grant update (usual_price_cents) on providers to authenticated;
