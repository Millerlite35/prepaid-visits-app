-- The practice's own contact details (not the client's), printed on QR cards and flyers.
-- All optional. Owners edit them in Page settings, so they join the column grant list.

alter table providers
  add column office_address text check (office_address is null or char_length(office_address) <= 200),
  add column office_phone   text check (office_phone is null or char_length(office_phone) <= 40),
  add column office_website text check (office_website is null or char_length(office_website) <= 100);

grant update (office_address, office_phone, office_website) on providers to authenticated;
