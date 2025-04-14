-- 1. analyses 테이블에 userId 필드 추가
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "user_id" INTEGER REFERENCES "users"("id");

-- 2. analyses 테이블에 카메라 제조사 필드 추가
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "camera_manufacturer" TEXT;

-- 3. 기존 레코드 업데이트 (photo.userId 기반으로 analyses.userId 설정)
UPDATE "analyses" a 
SET "user_id" = p."user_id"
FROM "photos" p 
WHERE a."photo_id" = p."id" 
AND a."user_id" IS NULL;

-- 4. 기존 레코드 업데이트 (exif 데이터 기반으로 카메라 제조사 설정)
UPDATE "analyses" a
SET 
  "camera_manufacturer" = CASE 
    WHEN p."exif_data"->>'cameraMake' IS NOT NULL THEN p."exif_data"->>'cameraMake'
    ELSE NULL
  END
FROM "photos" p
WHERE a."photo_id" = p."id"
AND a."camera_manufacturer" IS NULL;

-- 이 마이그레이션 스크립트는 기존 데이터베이스에 새 컬럼을 추가하고
-- 기존 레코드의 값을 설정합니다. 이 스크립트는 수동으로 실행하거나
-- 애플리케이션 시작 시 자동으로 실행될 수 있습니다.