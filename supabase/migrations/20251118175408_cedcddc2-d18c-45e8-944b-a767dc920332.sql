-- Create storage bucket for medicine images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medicine-images',
  'medicine-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for medicine images
CREATE POLICY "Anyone can view medicine images"
ON storage.objects FOR SELECT
USING (bucket_id = 'medicine-images');

CREATE POLICY "Authenticated users can upload medicine images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medicine-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own medicine images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'medicine-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own medicine images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medicine-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);