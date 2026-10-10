-- Demo data for local testing only. Fake names, fake emails.
insert into providers (id, slug, display_name, vocab_singular, vocab_plural, pass_label, terms_text)
values ('00000000-0000-0000-0000-0000000000a1', 'demo-chiro', 'Northshore Chiropractic',
        'visit', 'visits', 'Wellness visit card',
        'Visits expire 12 months from purchase. Unused visits can be refunded within 30 days.');

insert into package_templates (provider_id, name, visits, price_cents, expires_days, sort_order) values
 ('00000000-0000-0000-0000-0000000000a1', 'Starter',   3,  24000, 365, 1),
 ('00000000-0000-0000-0000-0000000000a1', 'Standard',  6,  45000, 365, 2),
 ('00000000-0000-0000-0000-0000000000a1', 'Committed', 10, 70000, 365, 3);
