import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import ExifReader from 'exifreader';
// Firebase만 사용
import { uploadBase64ImageToFirebase } from "./firebase";

// 개발/배포 환경 확인
const isProduction = process.env.NODE_ENV === 'production';
const isDeployedEnvironment = process.env.REPLIT_DEPLOYMENT_URL !== undefined;

// Ensure directory exists
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

export interface ProcessedImages {
  displayImagePath: string;      // 로컬 파일 시스템 경로 (개발 환경용, 항상 URL 형식으로 변환됨)
  analysisImagePath: string;     // 로컬 파일 시스템 경로 (개발 환경용, 항상 URL 형식으로 변환됨)
  base64AnalysisImage: string;   // API 호출용 분석 이미지
  base64DisplayImage?: string;   // 폴백용 디스플레이 이미지
  firebaseDisplayUrl?: string;   // Firebase Storage URL (주 저장소)
  firebaseAnalysisUrl?: string;  // Firebase Storage URL (주 저장소)
  // 호환성을 위해 유지하지만 실제로 사용하지 않음
  s3DisplayUrl?: string;
  s3AnalysisUrl?: string;
  replitDisplayUrl?: string;
  replitAnalysisUrl?: string;
}

export async function processUploadedImage(
  base64Image: string,
  filename: string
): Promise<ProcessedImages> {
  try {
    // Remove the data:image/jpeg;base64, part
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate a unique identifier for the image
    const uniqueId = uuidv4();
    const fileExt = path.extname(filename) || ".jpg";
    // 파일명 정리 및 밑줄로 시작하는 파일명 처리 (밑줄로 시작하는 파일명은 영구 저장에 문제가 발생할 수 있음)
    let cleanFilename = path.basename(filename, fileExt).replace(/[^a-z0-9]/gi, "_").toLowerCase();
    // 파일명이 밑줄로 시작하면 앞에 'img'를 붙여 밑줄로 시작하지 않도록 함
    if (cleanFilename.startsWith('_')) {
      cleanFilename = 'img' + cleanFilename;
    }
    
    // 환경 확인
    console.log("Environment check:", { 
      isProduction, 
      isDeployedEnvironment,
      deploymentUrl: process.env.REPLIT_DEPLOYMENT_URL
    });
    
    // Firebase가 우선이지만, 로컬 경로도 백업용으로 생성
    const displayImageFilename = `${cleanFilename}_${uniqueId}_display${fileExt}`;
    const analysisImageFilename = `${cleanFilename}_${uniqueId}_analysis${fileExt}`;
    
    // 로컬 경로 (Firebase 실패 시 대체 경로로 사용)
    const displayImagePath = `/uploads/${displayImageFilename}`;
    const analysisImagePath = `/uploads/${analysisImageFilename}`;
    
    // Process the display image (1024px on the long edge, 80% quality)
    const imageMetadata = await sharp(buffer).metadata();
    const { width = 0, height = 0 } = imageMetadata;
    
    const isLandscape = width > height;
    const displayResize = isLandscape 
      ? { width: 1024, height: undefined } 
      : { width: undefined, height: 1024 };
    
    // 디스플레이 이미지용 base64 문자열 생성 (Firebase 업로드용)
    let base64DisplayImage = '';
    let displayBuffer;
    
    try {
      // 디스플레이 이미지용 버퍼 생성
      displayBuffer = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(displayResize)
        .withMetadata() // Preserve metadata including orientation
        .jpeg({ quality: 80 })
        .toBuffer();
        
      // base64 인코딩
      base64DisplayImage = `data:image/jpeg;base64,${displayBuffer.toString("base64")}`;
      console.log("Display image processed successfully");
      
      // 로컬 저장은 Firebase 실패 시에만 하거나 개발 환경에서만 수행
      if (!isDeployedEnvironment) {
        try {
          // 업로드 디렉토리 확인/생성
          const uploadsDir = path.join(process.cwd(), "uploads");
          await ensureDir(uploadsDir);
          
          // 로컬 파일 시스템에 저장 (개발 환경에서만)
          const localDisplayPath = path.join(uploadsDir, displayImageFilename);
          await fs.writeFile(localDisplayPath, displayBuffer);
          console.log("Display image saved to local filesystem (development only)");
        } catch (localError) {
          console.error("Local filesystem error:", localError);
          // 로컬 저장 실패는 무시 (Firebase에 의존)
        }
      }
    } catch (error) {
      const displayImageError = error as Error;
      console.error(`Failed to process display image: ${displayImageError.message}`);
      // 기본 처리 실패 시 원본 이미지 사용
      base64DisplayImage = base64Image;
    }
    
    // Process the analysis image (512px on the long edge)
    const analysisResize = isLandscape 
      ? { width: 512, height: undefined } 
      : { width: undefined, height: 512 };
    
    // 분석용 이미지 처리 및 base64 생성
    let base64AnalysisImage = '';
    try {
      const analysisBuffer = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(analysisResize)
        .withMetadata() // Preserve metadata including orientation
        .jpeg({ quality: 80 })
        .toBuffer();
      
      base64AnalysisImage = `data:image/jpeg;base64,${analysisBuffer.toString("base64")}`;
      console.log("Analysis image processed successfully");
      
      // 개발 환경에서만 로컬 파일 시스템에 저장
      if (!isDeployedEnvironment) {
        try {
          const uploadsDir = path.join(process.cwd(), "uploads");
          const localAnalysisPath = path.join(uploadsDir, analysisImageFilename);
          await fs.writeFile(localAnalysisPath, analysisBuffer);
          console.log("Analysis image saved to local filesystem (development only)");
        } catch (localError) {
          console.error("Local filesystem error for analysis image:", localError);
          // 로컬 저장 실패는 무시
        }
      }
    } catch (error) {
      const analysisError = error as Error;
      console.error(`Failed to process analysis image: ${analysisError.message}`);
      // 분석 이미지 생성 실패 시 디스플레이 이미지로 대체
      base64AnalysisImage = base64DisplayImage || base64Image;
    }
    
    // Firebase Storage를 유일한 저장소로 사용
    console.log("Using Firebase Storage as primary image storage");
    let firebaseDisplayUrl = '';
    let firebaseAnalysisUrl = '';
    
    // Firebase 환경 변수 확인
    const firebaseConfigAvailable = process.env.FIREBASE_API_KEY && 
                                   process.env.FIREBASE_STORAGE_BUCKET;
    
    if (!firebaseConfigAvailable) {
      console.error("Firebase 환경 변수가 설정되지 않았습니다. Firebase 스토리지를 사용할 수 없습니다.");
    } else {
      try {
        // Firebase 환경 변수 로깅 (마스킹)
        console.log("Firebase Storage 사용 전 환경 변수 확인:");
        console.log("- FIREBASE_API_KEY:", process.env.FIREBASE_API_KEY ? "설정됨 (길이: " + process.env.FIREBASE_API_KEY.length + ")" : "설정되지 않음");
        console.log("- FIREBASE_STORAGE_BUCKET:", process.env.FIREBASE_STORAGE_BUCKET || "설정되지 않음");
        console.log("- FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || "설정되지 않음");
        
        // 디스플레이 이미지를 Firebase에 업로드 (로컬 경로 폴백 포함)
        console.log("Firebase Storage에 디스플레이 이미지 업로드 시작...");
        firebaseDisplayUrl = await uploadBase64ImageToFirebase(
          base64DisplayImage || base64Image,
          `${cleanFilename}_display`,
          "photos/display",
          displayImagePath // 로컬 파일 경로를 폴백으로 제공
        );
        
        // 분석용 이미지를 Firebase에 업로드 (로컬 경로 폴백 포함)
        console.log("Firebase Storage에 분석용 이미지 업로드 시작...");
        firebaseAnalysisUrl = await uploadBase64ImageToFirebase(
          base64AnalysisImage,
          `${cleanFilename}_analysis`,
          "photos/analysis",
          analysisImagePath // 로컬 파일 경로를 폴백으로 제공
        );
        
        console.log("Firebase Storage 업로드 성공! Firebase URLs:", { 
          firebaseDisplayUrl: firebaseDisplayUrl.substring(0, 60) + "...", // 보안을 위해 URL 일부만 표시
          firebaseAnalysisUrl: firebaseAnalysisUrl.substring(0, 60) + "..." 
        });
      } catch (firebaseError) {
        console.error("Firebase 업로드 오류:", firebaseError);
        console.warn("Firebase 업로드에 실패했습니다. Base64 이미지를 대신 사용합니다.");
        
        // Firebase 실패 시 개발 환경에서만 로컬 파일 시스템 시도
        if (!isDeployedEnvironment) {
          console.log("개발 환경에서는 로컬 파일 시스템도 사용 가능합니다.");
        }
      }
    }
    
    // 다른 저장소는 사용하지 않음 - Firebase만 사용
    const s3DisplayUrl = '';
    const s3AnalysisUrl = '';
    const replitDisplayUrl = '';
    const replitAnalysisUrl = '';
    
    // Firebase만 사용
    return {
      displayImagePath, // 로컬 경로는 개발 환경에서만 사용되는 폴백
      analysisImagePath, // 로컬 경로는 개발 환경에서만 사용되는 폴백
      base64AnalysisImage, // API 호출용으로 유지
      base64DisplayImage, // 폴백용으로 유지
      firebaseDisplayUrl, // Firebase 이미지 URL (주 저장소)
      firebaseAnalysisUrl, // Firebase 분석용 이미지 URL (주 저장소)
      s3DisplayUrl, // 사용하지 않음 (빈 문자열)
      s3AnalysisUrl, // 사용하지 않음 (빈 문자열)
      replitDisplayUrl, // 사용하지 않음 (빈 문자열)
      replitAnalysisUrl // 사용하지 않음 (빈 문자열)
    };
  } catch (error: any) {
    console.error("Error processing image:", error);
    throw new Error(`Failed to process uploaded image: ${error.message}`);
  }
}

/**
 * Sanitize object to remove invalid Unicode escape sequences
 * This is a recursive function that will clean objects, arrays, and primitive values
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item));
    } else {
      const result: Record<string, any> = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Skip properties with problematic values or ensure they're sanitized
          try {
            const value = data[key];
            result[key] = sanitizeData(value);
          } catch (e) {
            console.log(`Skipping problematic property ${key}:`, e);
            result[key] = null;
          }
        }
      }
      return result;
    }
  } else if (typeof data === 'string') {
    // Replace any problematic Unicode escape sequences
    try {
      return data.replace(/\\u[0-9a-fA-F]{4}/g, match => {
        try {
          return JSON.parse(`"${match}"`);
        } catch (e) {
          return '';
        }
      });
    } catch (e) {
      return '';
    }
  }
  
  return data;
}

export async function extractExifData(buffer: Buffer): Promise<any> {
  try {
    // Get basic metadata from Sharp (with auto-rotation applied)
    const metadata = await sharp(buffer).rotate().metadata();
    const { width, height, format, space, channels, hasAlpha, hasProfile, orientation } = metadata;
    
    // 초기화
    let cameraInfo = '';
    let exifData = {};
    let cameraMake = '';
    let cameraModel = '';
    
    try {
      // EXIF 데이터 파싱
      const tags = ExifReader.load(buffer);
      
      // 카메라 제조사와 모델명 추출
      const make = tags.Make?.description || '';
      const model = tags.Model?.description || '';
      
      // 제조사와 모델명 별도 저장
      cameraMake = make.trim();
      cameraModel = model.trim();
      
      // 통합 카메라 정보 문자열 생성
      if (make && model) {
        cameraInfo = `${make.trim()} | ${model.trim()}`;
      } else if (make || model) {
        cameraInfo = `${make}${model}`.trim();
      }
      
      console.log('카메라 정보 추출:', { make, model, cameraMake, cameraModel, cameraInfo });
      
      // 카메라 설정 정보 추출
      const fNumber = tags.FNumber?.description ? `f/${tags.FNumber.description}` : '';
      const exposureTime = tags.ExposureTime?.description ? `${tags.ExposureTime.description}s` : '';
      const iso = tags.ISOSpeedRatings?.description ? `ISO ${tags.ISOSpeedRatings.description}` : '';
      const focalLength = tags.FocalLength?.description ? `${tags.FocalLength.description}` : '';
      
      // 설정 정보 결합
      const settings = [fNumber, exposureTime, iso, focalLength].filter(Boolean).join(', ');
      if (settings && cameraInfo) {
        cameraInfo += ` | ${settings}`;
      } else if (settings) {
        cameraInfo = settings;
      }
      
      // 전체 EXIF 데이터 저장
      exifData = sanitizeData(tags);
      
      console.log('카메라 정보 최종:', cameraInfo);
    } catch (exifError) {
      console.log('EXIF 데이터 추출 오류:', exifError);
    }
    
    // 결과값 반환
    return sanitizeData({
      dimensions: { width, height },
      format,
      colorSpace: space,
      channels,
      hasAlpha,
      hasProfile,
      orientation,
      exif: exifData,
      cameraInfo,
      cameraMake,  // 별도 필드로 제조사 저장
      cameraModel, // 별도 필드로 모델명 저장
      exifSummary: Object.keys(exifData).length > 0 ? "Present" : "Not present"
    });
    
  } catch (error: unknown) {
    console.error("Error extracting EXIF data:", error);
    return {};
  }
}
