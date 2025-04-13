// mime.ts - MIME 타입 감지 유틸리티

/**
 * 바이너리 데이터에서 MIME 타입을 감지합니다
 * @param data 바이너리 데이터 (Uint8Array)
 * @returns 감지된 MIME 타입
 */
export function detectMimeType(data: Uint8Array): string {
  // 파일 시그니처 (매직 바이트)로 MIME 타입 감지
  // JPEG
  if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PNG
  else if (
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && 
    data[3] === 0x47 && data[4] === 0x0D && data[5] === 0x0A && 
    data[6] === 0x1A && data[7] === 0x0A
  ) {
    return 'image/png';
  }
  // GIF
  else if (
    data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 &&
    data[3] === 0x38 && (data[4] === 0x37 || data[4] === 0x39) && 
    data[5] === 0x61
  ) {
    return 'image/gif';
  }
  // WebP
  else if (
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && 
    data[3] === 0x46 && data[8] === 0x57 && data[9] === 0x45 && 
    data[10] === 0x42 && data[11] === 0x50
  ) {
    return 'image/webp';
  }
  // BMP
  else if (data[0] === 0x42 && data[1] === 0x4D) {
    return 'image/bmp';
  }
  // TIFF (Intel)
  else if (data[0] === 0x49 && data[1] === 0x49 && data[2] === 0x2A && data[3] === 0x0) {
    return 'image/tiff';
  }
  // TIFF (Motorola)
  else if (data[0] === 0x4D && data[1] === 0x4D && data[2] === 0x0 && data[3] === 0x2A) {
    return 'image/tiff';
  }
  // HEIC
  else if (
    data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && 
    data[7] === 0x70 && data[8] === 0x68 && data[9] === 0x65 && 
    data[10] === 0x69 && data[11] === 0x63
  ) {
    return 'image/heic';
  }
  // SVG 처리 (텍스트 기반 포맷이므로 시그니처 감지가 다름)
  else {
    // 기본값으로 JPEG 반환 (가장 일반적인 포맷)
    return 'image/jpeg';
  }
}