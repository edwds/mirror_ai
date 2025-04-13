import sharp from 'sharp'; // Sharp와 같은 이미지 처리 라이브러리 사용 가정
// import { extract } from 'exif-parser'; // EXIF 파서 라이브러리 사용 가정 - 주석 처리함
import ExifReader from 'exifreader'; // 대체 EXIF 파서 라이브러리
import path from "path";
import fs from "fs";
// Firebase, S3 등 다른 서비스도 필요시 import
import { uploadImageToFirebase, uploadBase64ImageToFirebase } from "../firebase"; // Firebase 서비스 사용

// 이미지 처리 결과 타입 정의 (예시)
export interface ProcessedImagePaths {
  displayImagePath: string;       // 웹 표시용 경로 (상대 경로)
  analysisImagePath: string;      // 분석용 이미지 경로 (상대 경로)
  base64DisplayImage?: string;    // 웹 표시용 Base64 (옵션)
  base64AnalysisImage?: string;   // 분석용 Base64 (필수 또는 URL 대안)
  firebaseDisplayUrl?: string;
  firebaseAnalysisUrl?: string;
  s3DisplayUrl?: string;          // S3 등 다른 스토리지 사용 시
  s3AnalysisUrl?: string;
  replitDisplayUrl?: string;      // Replit 환경 대응
  replitAnalysisUrl?: string;
}

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

class ImageService {

  /**
   * 업로드된 Base64 이미지를 처리하여 다양한 경로와 형식으로 저장/반환
   * @param base64Image Base64 인코딩된 이미지 데이터 (data:image/...)
   * @param originalFilename 원본 파일명
   * @returns 처리된 이미지 경로 및 URL 정보
   */
  async processUploadedImage(base64Image: string, originalFilename: string): Promise<ProcessedImagePaths> {
    console.log(`🖼️ 이미지 처리 시작: ${originalFilename}`);
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // EXIF 데이터에서 orientation 값 추출 및 이미지 자동 회전 처리
    let orientation = 1; // 기본값 (정방향)
    try {
      const tags = ExifReader.load(buffer);
      orientation = tags.Orientation?.value || 1;
      console.log(`   - EXIF Orientation 감지: ${orientation}`);
    } catch (exifError) {
      console.warn("⚠️ EXIF Orientation 추출 실패, 기본값 사용:", exifError);
    }

    const uniqueId = Date.now().toString();
    const fileExt = path.extname(originalFilename) || '.jpg'; // 확장자 추출 또는 기본값
    const baseFilename = path.basename(originalFilename, fileExt).replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const displayFilename = `${baseFilename}_${uniqueId}_display${fileExt}`;
    const analysisFilename = `${baseFilename}_${uniqueId}_analysis${fileExt}`;

    const displayFilePath = path.join(uploadsDir, displayFilename);
    const analysisFilePath = path.join(uploadsDir, analysisFilename);

    const displayImagePath = `/uploads/${displayFilename}`; // 웹 접근 경로
    const analysisImagePath = `/uploads/${analysisFilename}`; // 웹 접근 경로

    let results: ProcessedImagePaths = { displayImagePath, analysisImagePath };

    const isDeployedEnvironment = process.env.REPLIT_DEPLOYMENT_URL !== undefined || process.env.NODE_ENV === 'production'; // 배포 환경 확인 강화
    const useFirebase = process.env.FIREBASE_API_KEY && process.env.FIREBASE_STORAGE_BUCKET;

    try {
      // 1. 분석용 이미지 생성/저장 (리사이즈 등) - 자동 회전 적용
      const analysisBuffer = await sharp(buffer)
        .rotate() // 자동 회전 - EXIF orientation 기반
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }) // 예: 최대 1024x1024
        .jpeg({ quality: 85 }) // 예: JPEG, 품질 85
        .toBuffer();
      results.base64AnalysisImage = `data:image/jpeg;base64,${analysisBuffer.toString('base64')}`; // 분석용 Base64 항상 생성

      // 2. 표시용 이미지 생성/저장 (리사이즈 등) - 자동 회전 적용
      const displayBuffer = await sharp(buffer)
        .rotate() // 자동 회전 - EXIF orientation 기반
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }) // 예: 최대 800x800
        .webp({ quality: 80 }) // 예: WebP, 품질 80
        .toBuffer();

       // 3. 파일 저장 및 클라우드 업로드 (환경에 따라)
       if (!isDeployedEnvironment) {
         // 로컬 개발 환경: 파일 직접 저장
         await fs.promises.writeFile(analysisFilePath, analysisBuffer);
         await fs.promises.writeFile(displayFilePath, displayBuffer);
         console.log(`   - 로컬 저장 완료: ${displayImagePath}, ${analysisImagePath}`);
       } else if (useFirebase) {
         // Firebase 사용 환경: Firebase에 업로드
         try {
           console.log("   - Firebase 업로드 시도...");
           results.firebaseAnalysisUrl = await uploadBase64ImageToFirebase(results.base64AnalysisImage, analysisFilename, 'analysis_images');
           results.firebaseDisplayUrl = await uploadImageToFirebase(displayBuffer, displayFilename, 'display_images', 'image/webp'); // WebP mime type 지정
           console.log(`   - Firebase 업로드 완료: ${results.firebaseDisplayUrl?.substring(0,40)}..., ${results.firebaseAnalysisUrl?.substring(0,40)}...`);
           // Firebase URL이 있으면 로컬 경로는 중요하지 않지만, DB 저장을 위해 유지할 수 있음
           results.displayImagePath = results.firebaseDisplayUrl; // 대표 경로를 Firebase URL로 설정
           results.analysisImagePath = results.firebaseAnalysisUrl;
         } catch (firebaseError) {
           console.error("   - Firebase 업로드 실패:", firebaseError);
           // Firebase 실패 시 Base64로 fallback (이미 results에 포함됨)
           // 또는 다른 클라우드(S3, Replit 등) 시도 로직 추가
         }
       } else {
          // 기타 배포 환경 (Replit 등 파일 시스템 제약): Base64만 사용하거나 다른 스토리지 필요
          console.log("   - 배포 환경 (Firebase 미설정): Base64 이미지 사용");
          // Replit Object Storage 등 사용 시 업로드 로직 추가
          // results.replitDisplayUrl = await uploadToReplitStorage(...);
          // results.replitAnalysisUrl = await uploadToReplitStorage(...);
          // 필요시 Base64 표시용 이미지 생성
          results.base64DisplayImage = `data:image/webp;base64,${displayBuffer.toString('base64')}`;
          // 이 경우 DB에는 Base64를 저장하거나, 임시 URL 제공 방안 고려 필요
          // 또는 이미지 프록시를 통해 Base64를 서빙하는 방법도 있음
          // 결과 경로를 식별 가능한 형태로 설정 (예: base64://...)
          results.displayImagePath = 'base64://display_image';
          results.analysisImagePath = 'base64://analysis_image';
       }

    } catch (error) {
      console.error(`❌ 이미지 처리 중 오류 (${originalFilename}):`, error);
      // 오류 발생 시에도 기본적인 경로와 분석용 Base64는 반환 시도
      results.base64AnalysisImage = `data:image/jpeg;base64,${buffer.toString('base64')}`; // 원본을 분석용으로 사용
      results.displayImagePath = 'error://processing_failed'; // 오류 표시 경로
      results.analysisImagePath = 'error://processing_failed';
      // throw error; // 오류를 다시 던져서 컨트롤러에서 처리하게 할 수도 있음
    }

    console.log(`   - 처리 완료: Display=${results.displayImagePath}, Analysis=${results.analysisImagePath}`);
    return results;
  }

  /**
   * 이미지 버퍼에서 EXIF 데이터를 추출
   * @param buffer 이미지 데이터 버퍼
   * @returns 추출된 EXIF 데이터 (JSON 객체)
   */
  async extractExifData(buffer: Buffer): Promise<any> {
    try {
      console.log("📸 EXIF 데이터 추출 시도...");
      // ExifReader 사용하도록 수정
      const tags = ExifReader.load(buffer);

      // 필요한 데이터만 추출 및 정리 (예시)
      const exifData = {
        dimensions: {
          width: tags.ImageWidth?.value || tags.PixelXDimension?.value || 0,
          height: tags.ImageHeight?.value || tags.PixelYDimension?.value || 0,
        },
        orientation: tags.Orientation?.value || 1, // 회전값 추가 (기본값 1: 정방향)
        cameraInfo: `${tags.Make?.value || ''} ${tags.Model?.value || ''}`.trim() || "N/A",
        exposureTime: tags.ExposureTime?.value || tags.ShutterSpeedValue?.value,
        fNumber: tags.FNumber?.value,
        iso: tags.ISOSpeedRatings?.value,
        focalLength: tags.FocalLength?.value,
        lensModel: tags.LensModel?.value || "N/A",
        createDate: tags.DateTimeOriginal?.value || tags.CreateDate?.value,
        gps: {
          latitude: tags.GPSLatitude?.value,
          longitude: tags.GPSLongitude?.value
        },
        colorSpace: tags.ColorSpace?.value,
        // 요약 정보 생성 (예시)
        exifSummary: [
          tags.Make?.value && tags.Model?.value ? `${tags.Make.value} ${tags.Model.value}` : null,
          tags.FocalLength?.value ? `${tags.FocalLength.value}mm` : null,
          tags.FNumber?.value ? `f/${tags.FNumber.value}` : null,
          tags.ExposureTime?.value ? `${tags.ExposureTime.value}s` : null,
          tags.ISOSpeedRatings?.value ? `ISO ${tags.ISOSpeedRatings.value}` : null,
        ].filter(Boolean).join(' | ') || "Not available",
      };

      // 안전성: 제어 문자 제거 - 문자열이 확실한 경우에만 replace 실행
      if (typeof exifData.cameraInfo === 'string') {
        exifData.cameraInfo = exifData.cameraInfo.replace(/[^\x20-\x7E]/g, '');
      }
      if (typeof exifData.lensModel === 'string') {
        exifData.lensModel = exifData.lensModel.replace(/[^\x20-\x7E]/g, '');
      }
      if (typeof exifData.exifSummary === 'string') {
        exifData.exifSummary = exifData.exifSummary.replace(/[^\x20-\x7E]/g, '');
      }


      console.log(`   - EXIF 추출 완료: ${exifData.exifSummary}`);
      return exifData;

    } catch (error) {
      console.warn("⚠️ EXIF 데이터 추출 오류:", error);
      return {
        dimensions: {},
        cameraInfo: "N/A",
        exifSummary: "Not available"
      };
    }
  }
}

export const imageService = new ImageService();