import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
// import * as serviceAccount from '../../path/to/your/firebase-service-account-key.json'; // 서비스 계정 키 경로

// Firebase Admin SDK 초기화 (이미 초기화되지 않았다면)
// 주의: 서비스 계정 키 파일 경로는 실제 프로젝트에 맞게 수정해야 합니다.
// Replit 등 환경에서는 환경 변수를 통해 설정하는 것이 안전합니다.
if (!getApps().length) {
  try {
      // 환경 변수에서 서비스 계정 정보 읽기 (JSON 문자열 형태 권장)
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountJson) {
          console.warn("⚠️ Firebase 서비스 계정 정보가 환경 변수(FIREBASE_SERVICE_ACCOUNT)에 설정되지 않았습니다. Firebase 기능이 비활성화될 수 있습니다.");
      } else {
          const serviceAccount = JSON.parse(serviceAccountJson);
          initializeApp({
              credential: cert(serviceAccount),
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET // 환경 변수에서 버킷 이름 가져오기
          });
          console.log("🔥 Firebase Admin SDK 초기화 완료");
      }
  } catch (error) {
      console.error("❌ Firebase Admin SDK 초기화 실패:", error);
      console.error("   - 서비스 계정 키 또는 Storage Bucket 이름 설정을 확인하세요.");
  }
}


class FirebaseService {
    private storage;

    constructor() {
        try {
            // Firebase 초기화 후에 스토리지 인스턴스 가져오기
             if (getApps().length > 0) { // 초기화 확인
                this.storage = getStorage().bucket(); // 기본 버킷 사용
                console.log(`   - Firebase Storage 버킷 연결됨: ${this.storage.name}`);
            } else {
                 console.warn("   - Firebase가 초기화되지 않아 Storage 서비스를 사용할 수 없습니다.");
            }
        } catch (error) {
            console.error("❌ Firebase Storage 연결 중 오류:", error);
            // this.storage = null; // 또는 에러 처리
        }
    }

    /**
     * 이미지 버퍼를 Firebase Storage에 업로드합니다.
     * @param buffer 이미지 데이터 버퍼
     * @param filename 저장될 파일 이름
     * @param destinationPath 저장될 경로 (예: 'profiles/', 'photos/')
     * @param contentType MIME 타입 (예: 'image/jpeg', 'image/png')
     * @returns 업로드된 파일의 공개 URL
     */
    async uploadImageToFirebase(buffer: Buffer, filename: string, destinationPath: string = '', contentType: string = 'image/jpeg'): Promise<string> {
        if (!this.storage) throw new Error("Firebase Storage is not initialized.");

        const filePath = `${destinationPath}${filename}`;
        const file = this.storage.file(filePath);

        console.log(`   ☁️ Firebase 업로드 중: ${filePath} (Type: ${contentType})`);

        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                cacheControl: 'public, max-age=31536000', // 1년 캐시 설정 (예시)
            },
            public: true, // 파일을 공개적으로 접근 가능하게 설정
        });

        // 공개 URL 생성 방식 확인 필요 (getSignedUrl 또는 publicUrl)
        // public: true 로 설정했으므로 publicUrl 사용 가능
        const publicUrl = file.publicUrl();
        console.log(`   ☁️ Firebase 업로드 성공: ${publicUrl}`);
        return publicUrl;

        /* getSignedUrl 방식 (만료 시간 설정 필요)
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // 매우 긴 만료 시간 (예시)
        });
        console.log(`   ☁️ Firebase 업로드 성공 (Signed URL): ${url}`);
        return url;
        */
    }

    /**
     * Base64 인코딩된 이미지를 Firebase Storage에 업로드합니다.
     * @param base64Image Base64 데이터 (data:image/...)
     * @param filename 저장될 파일 이름
     * @param destinationPath 저장될 경로
     * @returns 업로드된 파일의 공개 URL
     */
    async uploadBase64ImageToFirebase(base64Image: string, filename: string, destinationPath: string = ''): Promise<string> {
        if (!this.storage) throw new Error("Firebase Storage is not initialized.");

        const match = base64Image.match(/^data:(image\/\w+);base64,(.*)$/);
        if (!match) throw new Error("Invalid base64 image format");

        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        return this.uploadImageToFirebase(buffer, filename, destinationPath, contentType);
    }

    // TODO: 파일 삭제 함수 등 필요에 따라 추가
    async deleteFileFromFirebase(filePath: string): Promise<void> {
         if (!this.storage) throw new Error("Firebase Storage is not initialized.");
         try {
             console.log(`   🗑️ Firebase 파일 삭제 시도: ${filePath}`);
             await this.storage.file(filePath).delete();
             console.log(`   🗑️ Firebase 파일 삭제 완료: ${filePath}`);
         } catch (error: any) {
             // 파일이 이미 없거나 권한 문제 등 다양한 에러 처리
             if (error.code === 404) {
                 console.warn(`   ⚠️ Firebase 파일 삭제 실패: 파일을 찾을 수 없습니다 (${filePath})`);
             } else {
                 console.error(`❌ Firebase 파일 삭제 중 오류 (${filePath}):`, error);
                 // 필요시 에러를 다시 던지거나 로깅 강화
                 // throw error;
             }
         }
    }
}

export const firebaseService = new FirebaseService();