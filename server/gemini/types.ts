// types.ts - 공통 타입 정의

// 사진 장르 타입
export type PhotoGenre = 
  | 'Landscape'
  | 'Portrait'
  | 'Street'
  | 'Wildlife'
  | 'Travel'
  | 'Macro'
  | 'Architecture'
  | 'Sports'
  | 'Urban'
  | 'Night'
  | 'Unknown';

// 페르소나 프롬프트 타입
export interface PersonaPrompt {
  meta: {
    role: string;
    tone: string;
    style: string;
    guidance: string;
    voice_sample?: string;
  };
  criteria: {
    composition?: string;
    lighting?: string;
    color?: string;
    focus?: string;
    creativity?: string;
  };
  phrasingTips?: {
    strengths?: string[];
    improvements?: string[];
    modifications?: string[];
  };
}

// 사진 장르 감지 결과 타입
export interface PhotoGenreDetectionResult {
  detectedGenre: string;
  confidence: number;
  isRealPhoto: boolean;
  isFamousArtwork: boolean;
  reasonForClassification: string;
  canBeAnalyzed?: boolean; // 분석 가능 여부
  properties?: {
    primaryGenre: string;
    secondaryGenre: string;
    keywords: string[];
    technicalAttributes: {
      composition: string;
      lighting: string;
      color: string;
      focus: string;
    };
  };
}

// 사진 분석 옵션 타입
export interface AnalysisOptions {
  persona: string;
  language: string;
  photoGenreInfo?: PhotoGenreDetectionResult | null;
  focusPoint?: string;
  detailLevel?: string;
}

// 사진 분석 결과 타입
export interface AnalysisResult {
  detectedGenre: string;
  summary: string;
  overallScore: number;
  tags: string[];
  categoryScores: {
    composition: number;
    lighting: number;
    color: number;
    focus: number;
    creativity: number;
  };
  analysis: {
    overall: {
      text: string;
      strengths: string[];
      improvements: string[];
      modifications: string[];
    };
    composition?: {
      text: string;
      suggestions?: string;
    };
    lighting?: {
      text: string;
      suggestions?: string;
    };
    color?: {
      text: string;
      suggestions?: string;
    };
    focus?: {
      text: string;
      suggestions?: string;
    };
    creativity?: {
      text: string;
      suggestions?: string;
    };
    personalTake?: {
      text: string;
    };
  };
  techniqueSuggestions?: string[];
  options?: {
    persona: string;
    language: string;
    focusPoint?: string;
    detailLevel?: string;
  };
  metadata?: {
    originalLanguage: string;
    targetLanguage: string;
    translated: boolean;
  };
}