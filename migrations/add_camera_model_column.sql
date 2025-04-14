-- Add camera_model column to analyses table
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS camera_model TEXT;

-- Update existing records with camera model information from photos
UPDATE analyses a
SET camera_model = (
    SELECT 
        CASE
            WHEN (p.exif_data->>'cameraModel') IS NOT NULL THEN p.exif_data->>'cameraModel'
            WHEN (p.exif_data->>'camera_model') IS NOT NULL THEN p.exif_data->>'camera_model'
            WHEN (p.exif_data->>'model') IS NOT NULL THEN p.exif_data->>'model'
            ELSE NULL
        END
    FROM photos p
    WHERE p.id = a.photo_id
);

-- Create index on camera_model for faster queries
CREATE INDEX IF NOT EXISTS idx_analyses_camera_model ON analyses(camera_model);