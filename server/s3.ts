import fs from 'fs/promises';
import path from 'path';

// S3 클라이언트 설정 (AWS SDK 패키지를 설치한 후에 주석 해제)
/*
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// S3 클라이언트 설정 - 환경 변수가 설정된 경우에만 활성화
let s3Client: S3Client | null = null;
let bucketName: string = '';

// 환경 변수가 있는 경우에만 S3 클라이언트 초기화
if (process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_REGION && 
    process.env.AWS_S3_BUCKET) {
    
    s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
    
    bucketName = process.env.AWS_S3_BUCKET;
    console.log(`S3 client initialized with bucket: ${bucketName} in region: ${process.env.AWS_REGION}`);
} else {
    console.log('AWS S3 environment variables not found. S3 functionality will be disabled.');
}
*/

// S3 환경이 구성되어 있는지 확인하는 함수
export function isS3Available(): boolean {
    const s3ConfigAvailable = process.env.AWS_ACCESS_KEY_ID && 
                            process.env.AWS_SECRET_ACCESS_KEY &&
                            process.env.AWS_REGION &&
                            process.env.AWS_S3_BUCKET;
    
    // AWS SDK 패키지가 아직 설치되지 않아 항상 false 반환
    // 패키지 설치 후 주석 해제 필요
    /*
    const sdkAvailable = typeof S3Client !== 'undefined';
    return !!(s3ConfigAvailable && sdkAvailable && s3Client);
    */
    
    // 환경 변수는 있지만 SDK 미설치로 false 반환
    if (s3ConfigAvailable) {
        console.log('AWS S3 환경 변수는 구성되었지만 SDK가 설치되지 않았습니다. 로컬 저장소를 사용합니다.');
    }
    return false;
}

/**
 * S3에 이미지 업로드 (AWS SDK 설치 후 구현)
 * @param imageBuffer 이미지 버퍼
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로
 * @returns 업로드된 이미지의 다운로드 URL
 */
export async function uploadImageToS3(
  imageBuffer: Buffer,
  filename: string,
  folder: string = 'uploads'
): Promise<string> {
  // S3 사용 가능한지 확인
  if (isS3Available()) {
    // AWS SDK 설치 후 구현 예정
    /*
    try {
      const key = `${folder}/${filename}`;
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg', // 또는 다른 적절한 타입
      };
  
      // 업로드 구현
      const upload = new Upload({
        client: s3Client,
        params: uploadParams,
      });
  
      await upload.done();
      
      // S3 URL 생성 및 반환
      return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
    */
  }
  
  // S3 사용 불가능하면 로컬 저장 구현
  console.log('S3 not available, using local storage for upload');
  try {
    const dir = path.join(process.cwd(), 'uploads', folder);
    await fs.mkdir(dir, { recursive: true });
    
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, imageBuffer);
    
    // 임시 URL 형식으로 반환 (추후 S3 URL로 변경)
    return `/uploads/${folder}/${filename}`;
  } catch (error) {
    console.error('Error in temporary uploadImageToS3:', error);
    throw new Error('Failed to upload image to temporary storage');
  }
}

/**
 * base64 인코딩된 이미지를 S3에 업로드 (AWS SDK 설치 후 구현)
 * @param base64Image base64 인코딩된 이미지 문자열
 * @param filename 파일 이름
 * @param folder 저장할 폴더 경로
 * @returns 업로드된 이미지의 다운로드 URL
 */
export async function uploadBase64ImageToS3(
  base64Image: string,
  filename: string,
  folder: string = 'uploads'
): Promise<string> {
  try {
    // base64 데이터 추출 (data:image/jpeg;base64, 등의 접두사 제거)
    const matches = base64Image.match(/^data:(.+?);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 string');
    }
    
    const imageBuffer = Buffer.from(matches[2], 'base64');
    return await uploadImageToS3(imageBuffer, filename, folder);
  } catch (error) {
    console.error('Error in uploadBase64ImageToS3:', error);
    throw new Error('Failed to upload base64 image to storage');
  }
}

/**
 * S3에서 파일 삭제 (AWS SDK 설치 후 구현)
 * @param downloadURL 삭제할 파일의 다운로드 URL
 */
export async function deleteFileFromS3(downloadURL: string): Promise<void> {
  // S3 URL인지 확인하고 사용 가능하면 S3에서 삭제
  if (isS3Available() && downloadURL.includes('s3.amazonaws.com')) {
    // AWS SDK 설치 후 구현 예정
    /*
    try {
      // URL에서 S3 키 추출
      const urlObject = new URL(downloadURL);
      const key = urlObject.pathname.substring(1); // 앞의 '/' 제거

      const deleteParams = {
        Bucket: bucketName,
        Key: key,
      };

      await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // 실패해도 에러 전파하지 않음
    }
    */
    console.log('S3 deletion for URL would be performed here:', downloadURL);
    return;
  }
  
  // 로컬 파일 삭제
  try {
    // URL에서 로컬 파일 경로 추출
    if (downloadURL.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), downloadURL);
      await fs.unlink(filePath);
      console.log('Local file deleted:', filePath);
    }
  } catch (error) {
    console.error('Error in deleteFileFromS3 (local):', error);
    // 실패해도 에러 전파하지 않음 (Firebase와 동일한 동작)
  }
}