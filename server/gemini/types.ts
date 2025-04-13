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