// gemini/index.ts
// 모든 기능을 한 곳에서 내보내는 인덱스 파일

// 클라이언트
export { getGenerativeModel } from './client.js';

// 유틸리티
export { detectMimeType } from './mime.js';
export { createSystemPrompt, extractJson, summarizeGenre } from './format.js';

// 페르소나
export { generatePersonaPrompt, personas, type PersonaKey, type PersonaPrompt } from './personas.js';

// 타입
export { type PhotoGenreDetectionResult, type AnalysisOptions } from './types.js';

// 메인 기능
export { detectPhotoGenreAndProperties } from './photoDetection.js';
export { analyzePhoto } from './photoAnalysis.js';