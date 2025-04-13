// photoAnalysis.ts
import { getGenerativeModel } from './client.js';
import { detectMimeType } from './mime.js';
import { createSystemPrompt, extractJson, summarizeGenre } from './format.js';
import { AnalysisOptions } from './types.js';
import { AnalysisResult } from '../../shared/schema.js';

/**
 * 사진 분석 함수 - Gemini API를 사용하여 이미지 분석
 */
export async function analyzePhoto(
  imageUrl: string,
  options: AnalysisOptions,
): Promise<AnalysisResult> {
  try {
    const { persona, language, photoGenreInfo } = options;
    
    // 로깅: 요청 정보
    console.log(`사진 분석 요청 - 페르소나: ${persona}, 언어: ${language}`);
    
    // 장르 정보가 있으면 콘솔에 출력
    if (photoGenreInfo) {
      console.log("장르 정보를 기반으로 분석 진행:", photoGenreInfo.detectedGenre);
      console.log("장르 키워드:", photoGenreInfo.properties?.keywords?.join(", ") || "없음");
    } else {
      console.log("장르 정보 없음, 기본 분석 진행");
    }

    // Gemini 모델 초기화
    const model = getGenerativeModel();

    // 이미지 데이터 처리
    let imageData: string;

    // base64 데이터 URL인 경우 직접 사용
    if (imageUrl.startsWith("data:")) {
      imageData = imageUrl;
    } else {
      // URL에서 이미지 페치
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = Buffer.from(uint8Array).toString("base64");

      // MIME 타입 감지
      const mimeType = detectMimeType(uint8Array);
      imageData = `data:${mimeType};base64,${base64}`;
    }

    // 장르 정보 요약
    const genreSummary = summarizeGenre(photoGenreInfo);
    
    // 프롬프트 생성
    const systemPrompt = createSystemPrompt(
      persona,
      genreSummary,
      language
    );
    
    console.log(`선택된 페르소나: ${persona} - 스타일 지침 적용`);
    console.log("Gemini API 요청 - 프롬프트 생성 및 요청 전송");

    // Gemini API 요청
    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          mimeType: imageData.split(";")[0].split(":")[1] || "image/jpeg",
          data: imageData.split(",")[1],
        },
      },
    ]);

    // 응답 텍스트 추출
    const responseText = result.response.text();
    console.log(`Gemini API 응답 수신 완료: ${responseText.length}자`);
    
    // JSON 코드 블록에서 응답 추출
    console.log("JSON 코드 블록에서 응답 추출");
    const cleanResponseText = extractJson(responseText);
    
    // JSON 파싱
    const analysisResult = JSON.parse(cleanResponseText) as AnalysisResult;
    
    // overallScore를 정수로 변환 (소수점 값이 올 수 있음)
    if (typeof analysisResult.overallScore === 'number') {
      analysisResult.overallScore = Math.round(analysisResult.overallScore);
    } else if (typeof analysisResult.overallScore === 'string') {
      // 문자열로 온 경우 숫자로 변환 후 반올림
      analysisResult.overallScore = Math.round(parseFloat(analysisResult.overallScore));
    }
    
    console.log(`응답 분석 준비: ${JSON.stringify(analysisResult).substring(0, 100)}...`);
    
    // 결과 로깅
    console.log(`페르소나 스타일 '${persona}'로 분석 완료: ${analysisResult.detectedGenre} (${analysisResult.overallScore}점)`);
    
    // 옵션 정보를 결과에 추가
    analysisResult.options = {
      persona,
      language,
      focusPoint: options.focusPoint || "balanced",
      detailLevel: options.detailLevel || "detailed"
    };
    
    return analysisResult;
  } catch (error) {
    console.error("Error analyzing photo with Gemini:", error);
    throw error;
  }
}