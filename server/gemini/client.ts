// client.ts - Gemini API 클라이언트

import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * Gemini API 클라이언트를 반환하는 함수
 * API 키는 환경 변수에서 가져옵니다.
 */
export function getGenerativeModel(): GenerativeModel {
  // API 키 가져오기
  const apiKey = process.env.GEMINI_API_KEY as string;
  
  // API 키가 없으면 오류 발생
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  
  // Google 생성형 AI 클라이언트 생성
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Gemini 모델 선택 (Gemini 1.5 Flash 사용 권장)
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.4,
      topP: 0.95,
      topK: 64,
    },
    // 안전 설정은 GoogleGenerativeAI 라이브러리에서 제공하는 enum 사용
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      }
    ]
  });
}