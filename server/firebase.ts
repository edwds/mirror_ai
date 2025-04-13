import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";

// Firebase Admin SDK (동적 가져오기 시도)
let admin: any = null;
try {
  // Firebase Admin SDK가 설치되어 있는지 확인
  admin = require('firebase-admin');
  console.log("Firebase Admin SDK 모듈을 찾았습니다.");
} catch (error) {
  console.warn("Firebase Admin SDK를 가져올 수 없습니다. 클라이언트 SDK만 사용합니다.");
  console.warn("Firebase Admin SDK가 필요한 경우 'npm install firebase-admin'을 실행하세요.");
}

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Firebase 클라이언트 초기화
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

// Firebase Admin SDK 초기화
let adminStorage: any = null; // 타입 오류 방지를 위해 any 타입 사용
try {
  if (admin && process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    adminStorage = admin.storage();
    console.log("Firebase Admin SDK initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
}

// 개발 환경에서는 보안 규칙을 우회하는 방법 설정
const isDevEnv = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// 익명 인증을 사용하여 Firebase Storage에 접근 권한 얻기
async function ensureAuthenticated() {
  try {
    // 개발 환경인 경우 인증 건너뛰기 옵션
    if (isDevEnv && process.env.BYPASS_FIREBASE_AUTH === 'true') {
      console.log("Firebase: Dev environment - bypassing authentication");
      return true;
    }
    
    // 현재 사용자가 없다면 익명 로그인
    if (!auth.currentUser) {
      console.log("Firebase: No user logged in, signing in anonymously...");
      // 3번 시도
      let authAttempts = 0;
      const maxAttempts = 3;
      
      while (authAttempts < maxAttempts) {
        try {
          await signInAnonymously(auth);
          console.log("Firebase: Anonymous authentication successful");
          return true;
        } catch (authError) {
          authAttempts++;
          console.warn(`Firebase authentication attempt ${authAttempts}/${maxAttempts} failed:`, authError);
          // 마지막 시도가 아닌 경우 잠시 대기
          if (authAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      throw new Error(`Failed after ${maxAttempts} authentication attempts`);
    }
    
    return true;
  } catch (error) {
    console.error("Firebase authentication error:", error);
    
    // 개발 환경이고 인증 실패 시 Firebase Storage URL 대신 로컬 경로 사용 안내
    if (isDevEnv) {
      console.warn("Firebase authentication failed. In development environment, local file paths will be used.");
      console.warn("For production, ensure Firebase Authentication is properly configured.");
      console.warn("Consider setting BYPASS_FIREBASE_AUTH=true in .env for development purposes.");
    }
    
    return false;
  }
}

/**
 * Firebase Storage에 이미지 업로드
 * @param imageBuffer 이미지 버퍼
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로
 * @param localFilePath 로컬 파일 경로 (인증 실패 시 반환할 경로)
 * @returns 업로드된 이미지의 다운로드 URL 또는 로컬 경로
 */
export async function uploadImageToFirebase(
  imageBuffer: Buffer,
  filename: string,
  folder: string = "images",
  localFilePath?: string
): Promise<string> {
  try {
    // 인증 확인
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      // 개발 환경이고 로컬 파일 경로가 제공된 경우 Replit 도메인 기반 URL 반환
      if (isDevEnv && localFilePath) {
        console.warn("Firebase 인증 실패: 로컬 파일 경로를 URL로 변환하여 폴백");
        // 로컬 경로를 상대 URL로 변환
        const host = process.env.REPLIT_DEPLOYMENT_URL || 
                     process.env.REPL_SLUG && `https://${process.env.REPL_SLUG}.replit.dev` || 
                     'http://localhost:5000';
        return `${host}${localFilePath}`;
      }
      throw new Error("Firebase authentication failed");
    }
    
    // 파일 확장자 추출
    const fileExt = filename.split('.').pop() || 'jpg';
    
    // 고유한 파일명 생성
    const uniqueId = uuidv4();
    const cleanFilename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const storagePath = `${folder}/${cleanFilename}_${uniqueId}.${fileExt}`;
    
    // Firebase Storage 레퍼런스 생성
    const storageRef = ref(storage, storagePath);
    
    // 이미지 업로드
    const snapshot = await uploadBytes(storageRef, imageBuffer, {
      contentType: `image/${fileExt}`
    });
    
    // 업로드된 이미지의 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`Image uploaded to Firebase Storage: ${storagePath}`);
    
    return downloadURL;
  } catch (error) {
    console.error("Firebase Storage upload error:", error);
    
    // 개발 환경이고 로컬 파일 경로가 제공된 경우 Replit 도메인 기반 URL 반환
    if (isDevEnv && localFilePath) {
      console.warn("Firebase 업로드 실패: 로컬 파일 경로를 URL로 변환하여 폴백");
      // 로컬 경로를 상대 URL로 변환
      const host = process.env.REPLIT_DEPLOYMENT_URL || 
                   process.env.REPL_SLUG && `https://${process.env.REPL_SLUG}.replit.dev` || 
                   'http://localhost:5000';
      return `${host}${localFilePath}`;
    }
    
    throw new Error(`Failed to upload image to Firebase: ${(error as Error).message}`);
  }
}

/**
 * base64 인코딩된 이미지를 Firebase Storage에 업로드
 * @param base64Image base64 인코딩된 이미지 문자열
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로
 * @param localFilePath 로컬 파일 경로 (인증 실패 시 반환할 경로)
 * @returns 업로드된 이미지의 다운로드 URL 또는 로컬 경로 또는 base64 문자열 자체
 */
export async function uploadBase64ImageToFirebase(
  base64Image: string,
  filename: string,
  folder: string = "images",
  localFilePath?: string
): Promise<string> {
  try {
    // Admin SDK를 통한 인증이 있는지 먼저 확인
    if (adminStorage) {
      try {
        console.log("Firebase Admin SDK를 사용하여 이미지 업로드 시도...");
        return await uploadBase64ImageWithAdmin(base64Image, filename, folder);
      } catch (adminError) {
        console.error("Firebase Admin SDK 업로드 실패, 클라이언트 SDK로 시도합니다:", adminError);
        // Admin SDK 실패 시 일반 클라이언트 SDK로 시도
      }
    }
    
    // 인증 확인 (Admin SDK 없거나 실패한 경우)
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      // 개발 환경이고 로컬 파일 경로가 제공된 경우 Replit 도메인 기반 URL 반환
      if (isDevEnv && localFilePath) {
        console.warn("Firebase 인증 실패: 로컬 파일 경로를 URL로 변환하여 폴백");
        // 로컬 경로인 /uploads/filename.jpg를 https://도메인/uploads/filename.jpg 형태로 변환
        const host = process.env.REPLIT_DEPLOYMENT_URL || 
                     process.env.REPL_SLUG && `https://${process.env.REPL_SLUG}.replit.dev` || 
                     'http://localhost:5000';
        return `${host}${localFilePath}`;
      } else if (isDevEnv) {
        // 로컬 경로가 없으면 base64 문자열 자체를 반환하여 클라이언트에서 직접 표시
        console.warn("Firebase 인증 실패: base64 이미지 문자열로 폴백");
        return base64Image;
      }
      throw new Error("Firebase authentication failed");
    }
    
    // base64 데이터에서 MIME 타입 및 인코딩된 데이터 추출
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 image format");
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    // 파일 확장자 결정
    let fileExt = "jpg"; // 기본값
    if (contentType === "image/png") {
      fileExt = "png";
    } else if (contentType === "image/jpeg" || contentType === "image/jpg") {
      fileExt = "jpg";
    } else if (contentType === "image/webp") {
      fileExt = "webp";
    }
    
    // 고유한 파일명 생성
    const uniqueId = uuidv4();
    const cleanFilename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const storagePath = `${folder}/${cleanFilename}_${uniqueId}.${fileExt}`;
    
    // Firebase Storage 레퍼런스 생성
    const storageRef = ref(storage, storagePath);
    
    // 이미지 업로드
    const snapshot = await uploadBytes(storageRef, buffer, {
      contentType: contentType
    });
    
    // 업로드된 이미지의 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`Base64 image uploaded to Firebase Storage: ${storagePath}`);
    
    return downloadURL;
  } catch (error) {
    console.error("Firebase Storage upload error for base64 image:", error);
    
    // 개발 환경이고 로컬 파일 경로가 제공된 경우 Replit 도메인 기반 URL 반환
    if (isDevEnv && localFilePath) {
      console.warn("Firebase 업로드 실패: 로컬 파일 경로를 URL로 변환하여 폴백");
      // 로컬 경로를 상대 URL로 변환
      const host = process.env.REPLIT_DEPLOYMENT_URL || 
                   process.env.REPL_SLUG && `https://${process.env.REPL_SLUG}.replit.dev` || 
                   'http://localhost:5000';
      return `${host}${localFilePath}`;
    } else if (isDevEnv) {
      // 로컬 경로가 없으면 base64 문자열 자체를 반환하여 클라이언트에서 직접 표시
      console.warn("Firebase 업로드 실패: base64 이미지 문자열로 폴백");
      return base64Image;
    }
    
    throw new Error(`Failed to upload base64 image to Firebase: ${(error as Error).message}`);
  }
}

/**
 * Firebase Admin SDK를 사용하여 base64 이미지를 Firebase Storage에 업로드
 * @param base64Image base64 인코딩된 이미지 문자열
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로
 * @returns 업로드된 이미지의 다운로드 URL
 */
async function uploadBase64ImageWithAdmin(
  base64Image: string,
  filename: string,
  folder: string = "images"
): Promise<string> {
  if (!adminStorage) {
    throw new Error("Firebase Admin Storage not initialized");
  }

  // base64 데이터에서 MIME 타입 및 인코딩된 데이터 추출
  const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 image format");
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  
  // 파일 확장자 결정
  let fileExt = "jpg"; // 기본값
  if (contentType === "image/png") {
    fileExt = "png";
  } else if (contentType === "image/jpeg" || contentType === "image/jpg") {
    fileExt = "jpg";
  } else if (contentType === "image/webp") {
    fileExt = "webp";
  }
  
  // 고유한 파일명 생성
  const uniqueId = uuidv4();
  const cleanFilename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const storagePath = `${folder}/${cleanFilename}_${uniqueId}.${fileExt}`;
  
  // Admin SDK를 사용한 업로드
  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);
  
  // 메타데이터 설정
  const metadata = {
    contentType: contentType,
    cacheControl: 'public, max-age=31536000', // 1년 캐싱 (CDN 최적화)
  };
  
  // 파일 업로드
  await file.save(buffer, {
    metadata,
    gzip: true
  });
  
  // 파일을 공개적으로 액세스 가능하게 설정
  await file.makePublic();
  
  // 다운로드 URL 생성
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2500', // 매우 장기간 유효
  });
  
  console.log(`Base64 image uploaded to Firebase Storage using Admin SDK: ${storagePath}`);
  
  return url;
}

/**
 * Firebase Storage에서 파일 삭제
 * @param downloadURL 삭제할 파일의 다운로드 URL
 */
export async function deleteFileFromFirebase(downloadURL: string): Promise<void> {
  try {
    // 인증 확인
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      throw new Error("Firebase authentication failed");
    }
    
    // URL에서 파일 경로 추출
    const fileRef = ref(storage, downloadURL);
    
    // 파일 삭제
    await deleteObject(fileRef);
    console.log(`File deleted from Firebase Storage: ${downloadURL}`);
  } catch (error) {
    console.error("Firebase Storage delete error:", error);
    throw new Error(`Failed to delete file from Firebase: ${(error as Error).message}`);
  }
}

export { storage };