-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a temporary PostGIS geometry column (MultiPolygon only)
ALTER TABLE
  "geometry_output"
ADD
  COLUMN "geom_temp" geometry(MultiPolygon, 4326);

-- Convert GeoJSON data from the jsonb column to PostGIS geometry
-- Automatically convert Polygon to MultiPolygon using ST_Multi()
UPDATE
  "geometry_output"
SET
  "geom_temp" = CASE
    WHEN "geometry" ->> 'type' = 'Polygon' THEN ST_Multi(ST_GeomFromGeoJSON("geometry" :: text))
    ELSE ST_GeomFromGeoJSON("geometry" :: text)
  END
WHERE
  "geometry" IS NOT NULL;

-- Make the temp column NOT NULL after data is populated
ALTER TABLE
  "geometry_output"
ALTER COLUMN
  "geom_temp"
SET
  NOT NULL;

-- Drop the old jsonb geometry column
ALTER TABLE
  "geometry_output" DROP COLUMN "geometry";

-- Rename the temp column to maintain the same column name
ALTER TABLE
  "geometry_output" RENAME COLUMN "geom_temp" TO "geometry";