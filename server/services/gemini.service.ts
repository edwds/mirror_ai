import { GoogleGenerativeAI } from "@google/generative-ai"; // Gemini SDK 사용 가정

// 환경 변수에서 API 키 가져오기
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️ Gemini API Key가 설정되지 않았습니다. 분석 기능이 제한될 수 있습니다.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
// "gemini-pro-vision"은 더 이상 사용되지 않으므로 "gemini-1.5-flash"로 업데이트
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 최신 Vision 모델 사용
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 텍스트 전용 모델 (옵션)

interface AnalysisOptions {
  persona: string;
  language: string;
  photoGenreInfo?: any; // 사진 장르 정보 (옵션)
  detailLevel?: 'standard' | 'detailed' | 'brief'; // 분석 상세 수준
}

// 분석 결과 타입 정의 (기존 analyzePhoto 반환 타입 참고)
export interface AnalysisResult {
  summary: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  tags: string[];
  analysis: Record<string, { text: string; suggestions?: string; strengths?: string[]; improvements?: string[]; modifications?: string }>;
  detectedGenre?: string;
  isNotEvaluable?: boolean;
  reason?: string;
  options?: AnalysisOptions; // 분석에 사용된 옵션 정보 포함
}

// 사진 장르 감지 결과 타입 (기존 detectPhotoGenreAndProperties 반환 타입 참고)
export interface PhotoGenreInfo {
  detectedGenre: string;
  confidence: number;
  isRealPhoto: boolean;
  isFamousArtwork: boolean;
  reasonForClassification: string;
  properties: any; // 세부 속성
  canBeAnalyzed: boolean;
}

class GeminiService {

  /**
   * Gemini Vision 모델을 사용하여 이미지 분석 수행
   * @param imageDataSource Base64 이미지 데이터 또는 이미지 URL
   * @param options 분석 옵션 (페르소나, 언어 등)
   * @returns 분석 결과 객체
   */
  async analyzePhoto(imageDataSource: string, options: AnalysisOptions): Promise<AnalysisResult> {
    if (!GEMINI_API_KEY) throw new Error("Gemini API Key is not configured.");
    console.log(`🤖 Gemini 분석 요청 시작: Persona=${options.persona}, Lang=${options.language}`);

    // 이미지 데이터 형식 확인 및 준비
    let imagePart;
    if (imageDataSource.startsWith('data:image')) {
       const match = imageDataSource.match(/^data:(image\/\w+);base64,(.*)$/);
       if (!match) throw new Error("Invalid base64 image format");
       imagePart = { inlineData: { data: match[2], mimeType: match[1] } };
       console.log(`   - 이미지 타입: Base64 (${match[1]})`);
    } else if (imageDataSource.startsWith('http') || imageDataSource.startsWith('/uploads')) {
        // URL인 경우 - gemini-1.5-flash 모델은 URL 직접 지원
        console.log(`   - 이미지 타입: URL (${imageDataSource.substring(0, 50)}...)`);
        
        // Gemini 1.5 모델은 URL을 직접 지원하므로 그대로 사용
        imagePart = {
          fileData: {
            mimeType: "image/jpeg", // 기본값, 실제 타입은 서버가 처리
            fileUri: imageDataSource
          }
        };
    } else {
        throw new Error("Invalid image data source provided.");
    }

    // Gemini API에 전달할 프롬프트 생성 (옵션 반영)
    // 이 프롬프트는 매우 중요하며, 결과물의 품질을 결정합니다.
    const prompt = this.buildAnalysisPrompt(options);

    try {
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      console.log("   - Gemini 응답 수신 (일부):", text.substring(0, 100) + "...");

      // Gemini 응답 텍스트 파싱 (JSON 형식으로 반환하도록 프롬프트 설계 권장)
      const parsedResult = this.parseAnalysisResponse(text, options);

      console.log(`   - 분석 완료: Score=${parsedResult.overallScore}, Genre=${parsedResult.detectedGenre}`);
      return parsedResult;

    } catch (error: any) {
      console.error("❌ Gemini API 호출 중 오류:", error);
      // Gemini API 에러 유형별 처리 (예: 할당량 초과, 안전 설정 위반 등)
      if (error.message.includes('SAFETY')) {
         console.warn("   - Gemini 안전 설정 위반 감지");
         // 안전 설정 위반 시 반환할 기본 응답 구조
         return {
            summary: "이미지 분석 불가 (안전 문제)",
            overallScore: 0,
            categoryScores: { composition: 0, lighting: 0, color: 0, focus: 0, creativity: 0 },
            tags: ["Analysis Failed", "Safety Violation"],
            analysis: { overall: { text: "Gemini의 안전 설정에 따라 이미지를 분석할 수 없습니다." } },
            isNotEvaluable: true,
            reason: "Content safety violation detected by Gemini.",
            options: options,
         };
      }
      throw new Error(`Failed to analyze photo with Gemini: ${error.message}`);
    }
  }

  /**
   * Gemini Vision 모델을 사용하여 사진 장르 및 속성 감지
   * @param imageDataSource Base64 이미지 데이터 또는 이미지 URL
   * @param language 응답 언어 ('ko', 'en' 등)
   * @returns 감지된 장르 및 속성 정보
   */
  async detectPhotoGenreAndProperties(imageDataSource: string, language: string = 'ko'): Promise<PhotoGenreInfo> {
    if (!GEMINI_API_KEY) throw new Error("Gemini API Key is not configured.");
    console.log(`🧬 Gemini 사진 장르 감지 요청 (Lang: ${language})`);

    // 이미지 준비 (analyzePhoto와 유사)
    let imagePart;
    if (imageDataSource.startsWith('data:image')) {
       const match = imageDataSource.match(/^data:(image\/\w+);base64,(.*)$/);
       if (!match) throw new Error("Invalid base64 image format");
       imagePart = { inlineData: { data: match[2], mimeType: match[1] } };
       console.log(`   - 이미지 타입: Base64 (${match[1]})`);
    } else if (imageDataSource.startsWith('http') || imageDataSource.startsWith('/uploads')) {
       // URL인 경우 - gemini-1.5-flash 모델은 URL 직접 지원
       console.log(`   - 이미지 타입: URL (${imageDataSource.substring(0, 50)}...)`);
       
       // Gemini 1.5 모델은 URL을 직접 지원하므로 그대로 사용
       imagePart = {
         fileData: {
           mimeType: "image/jpeg", // 기본값, 실제 타입은 서버가 처리
           fileUri: imageDataSource
         }
       };
    } else {
       throw new Error("Invalid image data source provided.");
    }

    // 장르 감지용 프롬프트
    const prompt = this.buildGenreDetectionPrompt(language);

    try {
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      console.log("   - Gemini 장르 감지 응답 (일부):", text.substring(0, 100) + "...");

      // 응답 파싱 (JSON 형식 권장)
      const parsedInfo = this.parseGenreResponse(text);
      console.log(`   - 장르 감지 완료: Genre=${parsedInfo.detectedGenre}, RealPhoto=${parsedInfo.isRealPhoto}`);
      return parsedInfo;

    } catch (error: any) {
      console.error("❌ Gemini 장르 감지 중 오류:", error);
       // 오류 시 기본값 반환
       return {
            detectedGenre: "Unknown",
            confidence: 0.5,
            isRealPhoto: true, // 기본적으로 사진으로 간주
            isFamousArtwork: false,
            reasonForClassification: "Failed to detect genre due to API error.",
            properties: {},
            canBeAnalyzed: true // 기본적으로 분석 가능으로 설정
       };
    }
  }

  // --- Helper Methods ---

  private buildAnalysisPrompt(options: AnalysisOptions): string {
    // TODO: 상세하고 구조화된 프롬프트 설계
    // - 역할 부여 (예: 당신은 전문 사진 비평가입니다...)
    // - 분석 기준 제시 (구성, 빛, 색상, 초점, 창의성 등)
    // - 점수 기준 제시 (예: 각 항목 0-10점, 총점 0-100점)
    // - 응답 형식 지정 (JSON 형식 강력 권장)
    // - 페르소나, 언어, 상세 수준 반영
    // - 사진 장르 정보가 있다면 프롬프트에 포함하여 분석 정확도 높이기
    // - 예시:
    return `
      Analyze the provided photograph based on the following criteria: Composition, Lighting, Color, Focus, and Creativity.
      You are a ${options.persona || 'helpful photo assistant'}. Provide the analysis in ${options.language || 'Korean'}.
      Output the result strictly in JSON format like this example:
      {
        "summary": "A brief overall summary of the photo (1-2 sentences).",
        "overallScore": 75, // An overall score from 0 to 100 based on all criteria.
        "categoryScores": { "composition": 8, "lighting": 7, "color": 8, "focus": 9, "creativity": 7 }, // Scores 0-10 for each category.
        "tags": ["tag1", "tag2", "relevant keywords"], // 3-5 relevant tags.
        "analysis": {
          "overall": { "text": "Detailed overall feedback.", "strengths": ["strength1", "strength2"], "improvements": ["improvement1", "improvement2"] },
          "composition": { "text": "Analysis of composition.", "suggestions": "Suggestion for composition." },
          "lighting": { "text": "Analysis of lighting.", "suggestions": "Suggestion for lighting." },
          "color": { "text": "Analysis of color.", "suggestions": "Suggestion for color." },
          "focus": { "text": "Analysis of focus.", "suggestions": "Suggestion for focus." },
          "creativity": { "text": "Analysis of creativity.", "suggestions": "Suggestion for creativity." }
        },
        "detectedGenre": "Portrait", // Best guess of the photo's genre.
        "isNotEvaluable": false, // Set to true if the image is inappropriate, not a photo, or cannot be evaluated.
        "reason": "" // If isNotEvaluable is true, provide a brief reason.
      }

      Consider the photo genre: ${options.photoGenreInfo?.detectedGenre || 'Not specified'}.
      Adjust the detail level of the 'text' fields based on: ${options.detailLevel || 'standard'}.
      Be objective and provide constructive feedback.
    `;
  }

  private parseAnalysisResponse(responseText: string, options: AnalysisOptions): AnalysisResult {
    try {
      // Gemini 응답에서 JSON 부분만 추출 (```json ... ``` 제거 등)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;

      const parsed = JSON.parse(jsonString);

       // 기본값 및 타입 보장
       const result: AnalysisResult = {
           summary: parsed.summary || "분석 요약을 생성하지 못했습니다.",
           overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 0,
           categoryScores: parsed.categoryScores || { composition: 0, lighting: 0, color: 0, focus: 0, creativity: 0 },
           tags: Array.isArray(parsed.tags) ? parsed.tags : [],
           analysis: parsed.analysis || { overall: { text: "상세 분석을 생성하지 못했습니다." } },
           detectedGenre: parsed.detectedGenre || "Unknown",
           isNotEvaluable: !!parsed.isNotEvaluable,
           reason: parsed.reason || "",
           options: options, // 분석 옵션 포함
       };

      return result;
    } catch (error) {
      console.error("❌ Gemini 분석 응답 파싱 오류:", error);
      console.error("   - 원본 응답:", responseText);
      // 파싱 실패 시 기본 구조 반환
      return {
        summary: "분석 결과를 파싱하는 중 오류가 발생했습니다.",
        overallScore: 0,
        categoryScores: { composition: 0, lighting: 0, color: 0, focus: 0, creativity: 0 },
        tags: ["Parsing Error"],
        analysis: { overall: { text: "분석 결과를 처리할 수 없습니다." } },
        isNotEvaluable: true,
        reason: "Failed to parse Gemini response.",
        options: options,
      };
    }
  }

   private buildGenreDetectionPrompt(language: string): string {
     // TODO: 장르 감지 및 속성 추출을 위한 프롬프트 설계 (JSON 형식 응답 유도)
     return `
       Analyze the provided image and determine its genre and properties.
       Respond in ${language || 'Korean'}.
       Output the result strictly in JSON format like this example:
       {
         "detectedGenre": "Landscape", // e.g., Portrait, Landscape, Street, Abstract, Food, etc.
         "confidence": 0.85, // Confidence score (0.0 to 1.0) for the detected genre.
         "isRealPhoto": true, // true if it looks like a real photograph, false if it looks like an illustration, drawing, 3D render, etc.
         "isFamousArtwork": false, // true if it's a well-known painting or artwork.
         "reasonForClassification": "Brief explanation for the classification.",
         "properties": {
           "primaryGenre": "Landscape",
           "secondaryGenre": "Nature", // Optional secondary genre
           "keywords": ["mountain", "sunset", "nature", "sky"], // 3-5 relevant keywords
           "technicalAttributes": { // Brief assessment
             "composition": "Rule of thirds",
             "lighting": "Golden hour",
             "color": "Warm tones",
             "focus": "Deep depth of field"
           }
         },
         "canBeAnalyzed": true // Set to false if the image content is unsuitable for photo critique (e.g., text document, blank image).
       }
     `;
   }

   private parseGenreResponse(responseText: string): PhotoGenreInfo {
     try {
       const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
       const jsonString = jsonMatch ? jsonMatch[1] : responseText;
       const parsed = JSON.parse(jsonString);

       // 기본값 및 타입 보장
       const info: PhotoGenreInfo = {
            detectedGenre: parsed.detectedGenre || "Unknown",
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            isRealPhoto: typeof parsed.isRealPhoto === 'boolean' ? parsed.isRealPhoto : true,
            isFamousArtwork: typeof parsed.isFamousArtwork === 'boolean' ? parsed.isFamousArtwork : false,
            reasonForClassification: parsed.reasonForClassification || "No reason provided.",
            properties: parsed.properties || {},
            canBeAnalyzed: typeof parsed.canBeAnalyzed === 'boolean' ? parsed.canBeAnalyzed : true,
       };

       return info;
     } catch (error) {
       console.error("❌ Gemini 장르 응답 파싱 오류:", error);
       console.error("   - 원본 응답:", responseText);
       return {
            detectedGenre: "Unknown",
            confidence: 0.5,
            isRealPhoto: true,
            isFamousArtwork: false,
            reasonForClassification: "Failed to parse Gemini response.",
            properties: {},
            canBeAnalyzed: true
       };
     }
   }

}

export const geminiService = new GeminiService();