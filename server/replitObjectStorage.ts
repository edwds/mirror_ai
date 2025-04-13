import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// Replit Object Storage 버킷 ID
const BUCKET_ID = 'replit-objstore-4f5bf60e-ff41-43ab-a2ed-8f0c442a7aac';

// 버킷 ID가 유효한지 확인
const isBucketValid = (bucketId: string): boolean => {
  return bucketId.startsWith('replit-objstore-') && bucketId.length > 20;
};

// Replit CLI 사용 가능 여부 확인
export function isReplitObjectStorageAvailable(): boolean {
  try {
    // Replit CLI가 있는지 확인
    execSync('which replit', { stdio: 'ignore' });
    return isBucketValid(BUCKET_ID);
  } catch (error) {
    console.warn('Replit CLI not available, Object Storage cannot be used');
    return false;
  }
}

/**
 * 이미지를 Replit Object Storage에 업로드
 * @param imageBuffer 이미지 버퍼
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로 (기본값: 'photos')
 * @returns 업로드된 이미지 URL
 */
export async function uploadToReplitObjectStorage(
  imageBuffer: Buffer,
  filename: string,
  folder: string = 'photos'
): Promise<string> {
  if (!isReplitObjectStorageAvailable()) {
    throw new Error('Replit Object Storage is not available');
  }

  try {
    // 임시 파일 생성
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, filename);
    await fs.writeFile(tempFilePath, imageBuffer);
    
    // Object Storage 경로 구성
    const objectPath = `${folder}/${filename}`;
    
    // Replit CLI를 사용하여 업로드
    execSync(`replit objectstore write --bucket ${BUCKET_ID} --key ${objectPath} --file ${tempFilePath}`, {
      stdio: 'pipe'
    });
    
    // 임시 파일 삭제
    await fs.unlink(tempFilePath);
    
    // 생성된 URL 반환
    return `https://${BUCKET_ID}.id.replit.com/${objectPath}`;
  } catch (error) {
    console.error('Error uploading to Replit Object Storage:', error);
    throw new Error('Failed to upload to Replit Object Storage');
  }
}

/**
 * base64 인코딩된 이미지를 Replit Object Storage에 업로드
 * @param base64Image base64 인코딩된 이미지 문자열
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로 (기본값: 'photos')
 * @returns 업로드된 이미지 URL
 */
export async function uploadBase64ToReplitObjectStorage(
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
    return await uploadToReplitObjectStorage(imageBuffer, filename, folder);
  } catch (error) {
    console.error('Error uploading base64 to Replit Object Storage:', error);
    throw new Error('Failed to upload base64 image to Replit Object Storage');
  }
}

/**
 * Replit Object Storage에서 파일 삭제
 * @param objectUrl 삭제할 객체의 URL
 */
export async function deleteFromReplitObjectStorage(objectUrl: string): Promise<void> {
  if (!isReplitObjectStorageAvailable()) {
    throw new Error('Replit Object Storage is not available');
  }

  try {
    // URL에서 객체 경로 추출
    const urlPattern = new RegExp(`https://${BUCKET_ID}.id.replit.com/(.+)`);
    const matches = objectUrl.match(urlPattern);
    
    if (!matches || !matches[1]) {
      throw new Error('Invalid object URL');
    }
    
    const objectPath = matches[1];
    
    // Replit CLI를 사용하여 삭제
    execSync(`replit objectstore delete --bucket ${BUCKET_ID} --key ${objectPath}`, {
      stdio: 'pipe'
    });
    
    console.log('Object deleted from Replit Object Storage:', objectPath);
  } catch (error) {
    console.error('Error deleting from Replit Object Storage:', error);
    // 에러는 전파하지 않음 (Firebase와 동일한 동작을 위해)
  }
}

// 파일 경로 API를 위한 임시 디렉토리
export async function ensureTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// 고유한 파일 이름 생성
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalFilename);
  const sanitizedName = path.basename(originalFilename, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  
  return `${sanitizedName}_${timestamp}_${random}${extension}`;
}