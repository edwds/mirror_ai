import fs from 'fs/promises';
import path from 'path';

// Replit의 영구 저장소 경로
const REPLIT_DATA_DIR = path.join(process.cwd(), '.replit', 'data');
const REPLIT_UPLOADS_DIR = path.join(REPLIT_DATA_DIR, 'uploads');

/**
 * Replit 영구 저장소 초기화
 */
export async function initReplitStorage(): Promise<void> {
  try {
    // .replit/data 디렉토리 생성
    await fs.mkdir(REPLIT_DATA_DIR, { recursive: true });
    
    // .replit/data/uploads 디렉토리 생성
    await fs.mkdir(REPLIT_UPLOADS_DIR, { recursive: true });
    
    console.log('Replit Storage initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Replit Storage:', error);
  }
}

/**
 * 이미지를 Replit 영구 저장소에 업로드
 * @param imageBuffer 이미지 버퍼
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로 (uploads 내부)
 * @returns 업로드된 이미지의 경로
 */
export async function uploadImageToReplitStorage(
  imageBuffer: Buffer,
  filename: string,
  folder: string = 'photos'
): Promise<string> {
  try {
    // 폴더 경로 생성
    const folderPath = path.join(REPLIT_UPLOADS_DIR, folder);
    await fs.mkdir(folderPath, { recursive: true });
    
    // 파일 저장
    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, imageBuffer);
    
    // 상대 경로 반환 (서버에서 접근 가능한 URL)
    return `/replit-data/uploads/${folder}/${filename}`;
  } catch (error) {
    console.error('Error saving to Replit Storage:', error);
    throw new Error('Failed to upload image to Replit Storage');
  }
}

/**
 * Base64 인코딩된 이미지를 Replit 영구 저장소에 업로드
 * @param base64Image base64 인코딩된 이미지 문자열
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로
 * @returns 업로드된 이미지의 경로
 */
export async function uploadBase64ImageToReplitStorage(
  base64Image: string,
  filename: string,
  folder: string = 'photos'
): Promise<string> {
  try {
    // base64 데이터 추출
    const matches = base64Image.match(/^data:(.+?);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 string');
    }
    
    const imageBuffer = Buffer.from(matches[2], 'base64');
    return await uploadImageToReplitStorage(imageBuffer, filename, folder);
  } catch (error) {
    console.error('Error in uploadBase64ImageToReplitStorage:', error);
    throw new Error('Failed to upload base64 image to Replit Storage');
  }
}

/**
 * Replit 영구 저장소에서 파일 삭제
 * @param filePath 파일 경로 (/replit-data/uploads/... 형식)
 */
export async function deleteFileFromReplitStorage(filePath: string): Promise<void> {
  try {
    // 경로가 /replit-data/uploads/로 시작하는지 확인
    if (filePath.startsWith('/replit-data/uploads/')) {
      // 실제 파일 시스템 경로로 변환
      const actualPath = path.join(
        process.cwd(),
        '.replit',
        'data',
        'uploads', 
        filePath.substring('/replit-data/uploads/'.length)
      );
      
      // 파일 삭제
      await fs.unlink(actualPath);
      console.log('File deleted from Replit Storage:', actualPath);
    }
  } catch (error) {
    console.error('Error deleting file from Replit Storage:', error);
    // 에러는 전파하지 않음 (Firebase와 동일한 동작)
  }
}

// 서버 시작 시 초기화
initReplitStorage().catch(console.error);