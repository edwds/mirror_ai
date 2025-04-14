// gemini/index.ts
// 모든 기능을 한 곳에서 내보내는 인덱스 파일

// 클라이언트
export { getGenerativeModel } from './client';

// 유틸리티
export { detectMimeType } from './mime';
export { 
  createSystemPrompt, 
  extractJson, 
  summarizeGenre, 
  formatEvaluationResult
} from './format';

// 번역 유틸리티
export {
  translateWithGemini,
  forceEnglishThenTranslate,
  applyTranslationToAnalysis
} from './translate';

// 프롬프트 템플릿
export { 
  buildPersonaPrompt, 
  generateTranslationPrompt 
} from './personaPromptTemplate';

// 페르소나
export { generatePersonaPrompt, personas, type PersonaKey, type PersonaPrompt } from './personas';
// 타입
export { 
  type PhotoGenreDetectionResult, 
  type AnalysisOptions,
  type AnalysisResult 
} from './types';

// 메인 기능
export { detectPhotoGenreAndProperties } from './photoDetection';
export { analyzePhoto } from './photoAnalysis';