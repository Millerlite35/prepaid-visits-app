-- Provider logos, stored in Supabase Storage.
-- The bucket is PUBLIC to read, because logos appear on public purchase pages, passes and
-- emails. Nothing else may ever go in it. There are no write policies: only our server
-- (service role, after checking the user is the owner) uploads or deletes logos.
-- SVG is not allowed (it can contain scripts). Max 1 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-logos', 'provider-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
