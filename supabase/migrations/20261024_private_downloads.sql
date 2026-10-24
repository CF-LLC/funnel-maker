-- fm-downloads becomes private. Files are served by /api/funnels/[id]/download/[stepId] via short-lived signed URLs.
-- Files are kept as-is. Owner insert/select policies unchanged (builder upload + owner reads).
update storage.buckets set public = false where id = 'fm-downloads';
