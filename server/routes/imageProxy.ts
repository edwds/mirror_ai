import express from 'express';
import { URL } from 'url';
import sharp from 'sharp';
import https from 'https';
import http from 'http';

/**
 * 이미지 프록시 라우터
 * 외부 이미지 URL을 받아 CORS 헤더를 추가하여 제공합니다.
 */
export const imageProxyRouter = express.Router();

// 메모리 캐시 (간단한 구현)
const imageCache: Record<string, { data: Buffer; type: string; timestamp: number }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1시간 캐시

// 캐시 정리 함수 (오래된 항목 제거)
function cleanupCache() {
  const now = Date.now();
  Object.keys(imageCache).forEach(key => {
    if (now - imageCache[key].timestamp > CACHE_TTL) {
      delete imageCache[key];
    }
  });
}

// 주기적으로 캐시 정리 (1시간마다)
setInterval(cleanupCache, CACHE_TTL);

// URL이 유효한지 확인하는 함수
function isValidUrl(urlString: string): boolean {
  try {
    const parsedUrl = new URL(urlString);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * HTTP/HTTPS를 사용하여 이미지 가져오기
 * @param url 이미지 URL
 * @returns 이미지 데이터와 성공 여부
 */
function fetchImage(url: string): Promise<{
  success: boolean;
  buffer?: Buffer;
  contentType?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const httpModule = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000, // 10초 타임아웃
      };
      
      const req = httpModule.get(url, options, (response) => {
        // 리다이렉션 처리
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // 리다이렉션 URL로 다시 요청
            fetchImage(redirectUrl)
              .then(result => resolve(result))
              .catch(err => {
                resolve({
                  success: false,
                  error: `리다이렉션 오류: ${err.message}`
                });
              });
            return;
          }
        }
        
        // 성공 응답이 아닌 경우
        if (response.statusCode !== 200) {
          resolve({
            success: false,
            error: `HTTP 오류: ${response.statusCode}`
          });
          return;
        }
        
        // 콘텐츠 타입이 이미지가 아닌 경우
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          resolve({
            success: false,
            error: '이미지가 아닙니다.'
          });
          return;
        }
        
        // 응답 데이터 수집
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            success: true,
            buffer,
            contentType
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          success: false,
          error: `네트워크 오류: ${error.message}`
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: '요청 시간 초과'
        });
      });
    } catch (error: any) {
      resolve({
        success: false,
        error: `요청 생성 오류: ${error.message}`
      });
    }
  });
}

/**
 * 이미지 프록시 엔드포인트
 * 요청 형식: /api/image-proxy?url=URL_ENCODED_IMAGE_URL
 */
imageProxyRouter.get('/', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl || !isValidUrl(imageUrl)) {
      return res.status(400).send('유효하지 않은 이미지 URL입니다.');
    }
    
    // 캐시에서 이미지 확인
    if (imageCache[imageUrl]) {
      const { data, type } = imageCache[imageUrl];
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(data);
    }
    
    // 외부 이미지 가져오기
    const imageData = await fetchImage(imageUrl);
    if (!imageData.success) {
      return res.status(500).send(`이미지를 가져오는 중 오류가 발생했습니다: ${imageData.error}`);
    }
    
    const contentType = imageData.contentType;
    const isImage = contentType?.startsWith('image/');
    
    if (!isImage) {
      return res.status(400).send('요청한 URL은 이미지가 아닙니다.');
    }
    
    // 이미지 최적화 (옵션)
    const imageBuffer = imageData.buffer as Buffer;
    let processedImage: Buffer;
    
    try {
      // Sharp 라이브러리를 사용하여 이미지 최적화
      const sharpInstance = sharp(imageBuffer);
      const metadata = await sharpInstance.metadata();
      
      // 특정 크기 이상이면 리사이즈
      if (metadata.width && metadata.width > 1200) {
        processedImage = await sharpInstance.resize(1200).toBuffer();
      } else {
        processedImage = imageBuffer;
      }
    } catch (err) {
      console.error('이미지 처리 오류:', err);
      processedImage = imageBuffer; // 오류 시 원본 사용
    }
    
    // 캐시에 저장
    imageCache[imageUrl] = {
      data: processedImage,
      type: contentType || 'image/jpeg', // 기본값 제공
      timestamp: Date.now(),
    };
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', contentType ? contentType : 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(processedImage);
  } catch (error: any) {
    console.error('이미지 프록시 오류:', error.message);
    res.status(500).send('이미지를 가져오는 중 오류가 발생했습니다.');
  }
});

/**
 * Base64로 인코딩된 이미지를 변환하는 엔드포인트
 * 클라이언트에서 Base64로 인코딩된 이미지를 서버로 전송하면 
 * 서버에서 적절한 CORS 헤더를 붙여 이미지로 응답합니다.
 */
imageProxyRouter.post('/base64', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { base64Image } = req.body;
    
    if (!base64Image || typeof base64Image !== 'string') {
      return res.status(400).send('유효하지 않은 Base64 이미지입니다.');
    }
    
    // Base64 문자열 검증
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send('유효하지 않은 Base64 이미지 형식입니다.');
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', contentType ? contentType : 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(imageBuffer);
  } catch (error: any) {
    console.error('Base64 이미지 변환 오류:', error.message);
    res.status(500).send('이미지 처리 중 오류가 발생했습니다.');
  }
});