-- Create storage bucket for attachments
-- This needs to be run in Supabase SQL Editor

-- Create bucket (if not exists via UI, use this as reference)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('attachments', 'attachments', false);

-- Storage policies for attachments bucket
-- Users can upload their own files
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
