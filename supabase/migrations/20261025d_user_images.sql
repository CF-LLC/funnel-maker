-- Public-read bucket for user image uploads (avatars, funnel images). Additive only.
-- Paths: <uid>/<uuid>.<ext>. 3 MB cap, PNG/JPEG/WebP/GIF only (no SVG).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-images', 'user-images', true, 3145728, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- App uploads go through /api/uploads/image (server validation, service role). These policies also allow
-- direct authenticated access only inside the user's own folder; anyone can read (bucket is public).
create policy user_images_read on storage.objects for select to public using (bucket_id = 'user-images');
create policy user_images_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy user_images_update_own on storage.objects for update to authenticated using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy user_images_delete_own on storage.objects for delete to authenticated using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
