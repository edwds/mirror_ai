// gemini.ts
// 이 파일은 기존 코드와의 호환성을 위해 새로운 모듈화된 Gemini 코드를 내보냅니다.

// 새 모듈화된 구현 가져오기
import {
  analyzePhoto,
  detectPhotoGenreAndProperties,
  type AnalysisOptions,
  type PhotoGenreDetectionResult
} from './gemini/index.js';

// 이전 코드와의 호환성을 위해 내보내기
export {
  analyzePhoto,
  detectPhotoGenreAndProperties,
  type AnalysisOptions,
  type PhotoGenreDetectionResult
};