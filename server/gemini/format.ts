// format.ts - 포맷팅 및 프롬프트 생성 유틸리티

import { generatePersonaPrompt, type PersonaPrompt } from "./personas";
import {
  extractGenreKeyword,
  getGenreInfo,
  generateGenreEvaluationGuidance,
  generateModificationTemplate,
  getDetailedGenreInfo,
} from "./genres";
import { PhotoGenre } from "./types";
import { PhotoGenreDetectionResult } from "./types";

/**
 * 시스템 프롬프트 생성 함수 - 영어로 프롬프트 생성하고 결과만 원하는 언어로 받음
 */
export function createSystemPrompt(
  personaKey: string,
  genreSummary: string | null,
  language: string = "ko", // 기본값은 한국어
): string {
  // 페르소나 프롬프트 가져오기
  const persona = generatePersonaPrompt(personaKey);
  const voiceInstruction = persona.voice_sample
    ? `\n\n# Example of persona voice style\n"${persona.voice_sample}"`
    : "";

  // 장르 정보 및 가이드라인 가져오기
  const genreKey = extractGenreKeyword(genreSummary);
  const genreInfo = genreKey ? getGenreInfo(genreKey) : null;
  const genreGuidance = generateGenreEvaluationGuidance(genreSummary);

  // 점수 기준 정의
  const scoringGuidelines = `
    Scoring Guidelines:
    - 90-100: Professional quality, exceptional work
    - 80-89: Advanced amateur, very good work
    - 70-79: Skilled amateur, good work with some flaws
    - 60-69: Improving amateur, several issues to address
    - Below 60: Beginner, significant improvement needed
  `;

  // 장르별 점수 가중치 적용 안내
  const scoringWeights = genreInfo
    ? `
    Genre-specific scoring weights (higher number = more important):
    - Composition: ${genreInfo.scoringFocus.composition}/5
    - Lighting: ${genreInfo.scoringFocus.lighting}/5
    - Color: ${genreInfo.scoringFocus.color}/5
    - Focus: ${genreInfo.scoringFocus.focus}/5
    - Creativity: ${genreInfo.scoringFocus.creativity}/5
  `
    : "";

  // 장르별 수정 제안 템플릿
  const modificationTemplate = genreInfo
    ? generateModificationTemplate(genreSummary)
    : `["Specific camera settings or angles to improve the shot", "Precise editing steps with tool names and values", "Style development or artistic advice for long-term improvement"]`;

  // 강화된 시스템 프롬프트
  const systemPrompt = `
    You are ${persona.role} evaluating a photograph. ${persona.tone} ${persona.style} ${voiceInstruction}

    # Photo Genre Info
    ${genreSummary ? genreSummary : "Evaluate based on visual and stylistic characteristics."}
    
    # Genre-Specific Guidance
    ${genreGuidance}

    # Evaluation Parameters
    - Response Language: ${language}
    - Detail Level: High (comprehensive analysis)
    ${scoringGuidelines}
    ${scoringWeights}

    # Persona Guidance
    ${persona.guidance}

    # Response Format
    Respond ONLY with valid JSON as follows:
    {
      "detectedGenre": "Primary genre detected in the photo",
      "summary": "ULTRA-SHORT overall impression (MAX 10 words)",
      "overallScore": 0-100,
      "tags": ["relevant", "descriptive", "tags", ${genreInfo ? genreInfo.keyAesthetics.map((a) => `"${a}"`).join(", ") : ""} ],
      "categoryScores": {
        "composition": 0-100,
        "lighting": 0-100,
        "color": 0-100,
        "focus": 0-100,
        "creativity": 0-100
      },
      "analysis": {
        "overall": {
          "text": "Detailed overall analysis (4-5 full sentences)",
          "strengths": ["Overall strengths as a complete sentence", "Include specific elements from the photo", "Be detailed and specific"],
          "improvements": ["Overall improvements as a complete sentence", "Include actionable advice", "Be specific about what needs improvement"],
          "modifications": ${modificationTemplate}
        },
        "composition": { 
          "text": "Detailed analysis (4-5 full sentences covering framing, balance, etc.)"
        },
        "lighting": { 
          "text": "Detailed analysis (4-5 full sentences about light quality, direction, etc.)"
        },
        "color": { 
          "text": "Detailed analysis (4-5 full sentences about color harmony, palette, etc.)", 
        },
        "focus": { 
          "text": "Detailed analysis (4-5 full sentences about sharpness, depth of field, etc.)"
        },
        "creativity": { 
          "text": "Detailed analysis (4-5 full sentences about originality, uniqueness, etc.)", 
        }
        "genreSpecific": { 
          "text": "Detailed analysis focusing on genre-specific elements (4-5 full sentences)"
        }
      }
    }

    # Essential Guidelines
    - CRITICAL: All output MUST be in the specified language (${language})
    - Provide ONLY valid JSON without any preamble or explanation outside the JSON
    - Keep the summary EXTREMELY BRIEF (MAX 8 words only)
    - VERY IMPORTANT: Each "strengths" and "improvements" MUST be COMPLETE SENTENCES, not just keywords
    - Each strength and improvement should be at least 10-15 words, focusing on specific details in the photo
    - For strengths, explain WHY something is good and HOW it enhances the photo
    - For improvements, explain WHAT could be better and HOW to improve it
    - The modifications section **MUST** include how the persona would personally approach the image, e.g. "If I were the photographer..."
    - The modifications section must use the persona’s unique voice and style clearly and vividly.
    - Make each category analysis (composition, lighting, etc.) DETAILED with 2-3 sentences
    - Reference actual visual elements in the photo, not generic advice
    - Include specific editing steps with tool names, controls, actions and expected results
    - Maintain the persona's voice and perspective throughout
    - Align your feedback with the genre-specific evaluation criteria
    - Prioritize feedback categories based on the genre's scoring weights
    - Include specific editing tools and techniques relevant to this genre
  `;

  return systemPrompt;
}

/**
 * JSON 응답 추출 함수
 */
export function extractJson(text: string): string {
  try {
    // 1. 우선 전체 텍스트가 유효한 JSON인지 확인
    try {
      JSON.parse(text);
      return text.trim();
    } catch (e) {
      // JSON이 아닌 경우 계속 진행
    }

    // 2. JSON 코드 블록 찾기 (가장 일반적인 패턴)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      const jsonText = jsonMatch[1].trim();
      // 유효성 검사
      JSON.parse(jsonText);
      return jsonText;
    }

    // 3. 중괄호로 둘러싸인 텍스트 찾기
    const braceMatch = text.match(/(\{[\s\S]*\})/);
    if (braceMatch && braceMatch[1]) {
      const jsonText = braceMatch[1].trim();
      // 유효성 검사
      JSON.parse(jsonText);
      return jsonText;
    }

    // 모든 시도가 실패하면 원본 반환
    return text;
  } catch (error) {
    // 모든 파싱 시도가 실패한 경우
    console.error("JSON 파싱 실패:", error);
    return text;
  }
}

/**
 * 장르 정보 요약 함수
 */
export function summarizeGenre(
  info?: PhotoGenreDetectionResult | null,
): string | null {
  if (!info) return null;

  const primaryGenre =
    info.properties?.primaryGenre || info.detectedGenre || "Unknown";
  const secondaryGenre = info.properties?.secondaryGenre || "N/A";

  // 장르 신뢰도 점수 문자열로 변환 (가독성 위해)
  const confidence =
    typeof info.confidence === "number"
      ? `${Math.round(info.confidence * 100)}%`
      : info.confidence || "N/A";

  // 상세 장르 정보 가져오기 시도
  let detailedGenreInfo = null;
  try {
    detailedGenreInfo = getDetailedGenreInfo(primaryGenre, secondaryGenre);
  } catch (error) {
    console.log("상세 장르 정보 로드 실패, 기본 정보만 사용합니다", error);
  }

  // 상세 장르 정보가 있는 경우 추가
  const detailedInfo = detailedGenreInfo
    ? `
Detailed genre: ${detailedGenreInfo.genre} / ${detailedGenreInfo.sub_genre}
Description: ${detailedGenreInfo.description}
Key aesthetics: ${detailedGenreInfo.keyAesthetics}`
    : "";

  // 기술적 특성이 있는 경우 포함
  const technicalDetails = info.properties?.technicalAttributes
    ? `
Technical characteristics:
- Composition: ${info.properties.technicalAttributes.composition || "N/A"}
- Lighting: ${info.properties.technicalAttributes.lighting || "N/A"}
- Color: ${info.properties.technicalAttributes.color || "N/A"}
- Focus: ${info.properties.technicalAttributes.focus || "N/A"}`
    : "";

  // 키워드가 있는 경우 포함
  const keywords = info.properties?.keywords?.length
    ? `\nKeywords: ${info.properties.keywords.join(", ")}`
    : "";

  // 분석 이유가 있는 경우 포함
  const reason = info.reasonForClassification
    ? `\nClassification basis: ${info.reasonForClassification}`
    : "";

  // 최종 요약
  return `
Primary genre: ${primaryGenre}
Secondary genre: ${secondaryGenre}
Confidence: ${confidence}${keywords}${reason}${detailedInfo}${technicalDetails}
  `.trim();
}

/**
 * 장르 기반 조정된 점수 계산
 * @param scores 원래 카테고리별 점수
 * @param genreSummary 장르 요약 정보
 * @returns 장르 가중치가 적용된 점수
 */
export function calculateWeightedScores(
  scores: Record<string, number>,
  genreSummary: string | null,
): Record<string, number> {
  const genreKey = extractGenreKeyword(genreSummary);
  const genreInfo = genreKey ? getGenreInfo(genreKey) : null;

  // 장르 정보가 없으면 원래 점수 반환
  if (!genreInfo) return scores;

  const weightedScores: Record<string, number> = {};

  // 각 카테고리별 가중치 적용
  for (const [category, score] of Object.entries(scores)) {
    if (
      genreInfo.scoringFocus[category as keyof typeof genreInfo.scoringFocus]
    ) {
      const weight =
        genreInfo.scoringFocus[
          category as keyof typeof genreInfo.scoringFocus
        ] / 5;
      weightedScores[category] = Math.round(score * weight * 100) / 100;
    } else {
      weightedScores[category] = score;
    }
  }

  return weightedScores;
}

/**
 * 사진 평가 결과 포맷팅 함수
 * @param jsonResponse AI로부터 받은 JSON 응답
 * @param language 원하는 결과 언어
 * @param genreSummary 장르 요약 정보
 * @returns 포맷팅된 평가 결과
 */
export function formatEvaluationResult(
  jsonResponse: string,
  language: string = "ko",
  genreSummary: string | null = null,
): string {
  try {
    // JSON 파싱
    const data = JSON.parse(jsonResponse);

    // 장르 정보 가져오기
    const genreKey = extractGenreKeyword(genreSummary);
    const genreInfo = genreKey ? getGenreInfo(genreKey) : null;

    // 장르별 가중치 적용된 점수 계산
    const originalScores = data.categoryScores || {};
    const weightedScores = calculateWeightedScores(
      originalScores,
      genreSummary,
    );

    // 언어별 레이블 정의
    const labels = {
      ko: {
        title: "사진 평가 보고서",
        genre: "감지된 장르",
        summary: "요약",
        overallScore: "총점",
        tags: "태그",
        categoryScores: "카테고리별 점수",
        composition: "구도",
        lighting: "조명",
        color: "색상",
        focus: "초점",
        creativity: "창의성",
        analysis: "분석",
        overall: "전체 평가",
        strengths: "강점",
        improvements: "개선점",
        modifications: "수정 제안",
        suggestions: "제안",
        genreSpecific: "장르 특화 분석",
        techniqueSuggestions: "추천 기술",
      },
      en: {
        title: "Photo Evaluation Report",
        genre: "Detected Genre",
        summary: "Summary",
        overallScore: "Overall Score",
        tags: "Tags",
        categoryScores: "Category Scores",
        composition: "Composition",
        lighting: "Lighting",
        color: "Color",
        focus: "Focus",
        creativity: "Creativity",
        analysis: "Analysis",
        overall: "Overall Assessment",
        strengths: "Strengths",
        improvements: "Areas for Improvement",
        modifications: "Modification Suggestions",
        suggestions: "Suggestions",
        genreSpecific: "Genre-Specific Analysis",
        techniqueSuggestions: "Recommended Techniques",
      },
      // 추가 언어 지원 가능
    };

    // 기본 언어 설정
    const l = labels[language as keyof typeof labels] || labels.en;

    // 결과 포맷팅
    let result = `# ${l.title}: ${data.detectedGenre}\n\n`;

    // 요약 및 점수
    result += `## ${l.summary}\n${data.summary}\n\n`;
    result += `**${l.overallScore}:** ${data.overallScore}/100\n\n`;

    // 태그
    if (data.tags && data.tags.length) {
      result += `**${l.tags}:** ${data.tags.join(", ")}\n\n`;
    }

    // 카테고리별 점수 (가중치 적용)
    result += `## ${l.categoryScores}\n`;
    for (const [category, score] of Object.entries(weightedScores)) {
      const categoryLabel = l[category as keyof typeof l] || category;
      result += `- **${categoryLabel}:** ${score}/100\n`;
    }
    result += "\n";

    // 전체 분석
    result += `## ${l.overall}\n${data.analysis.overall.text}\n\n`;

    // 강점
    result += `### ${l.strengths}\n`;
    data.analysis.overall.strengths.forEach(
      (strength: string, index: number) => {
        result += `${index + 1}. ${strength}\n`;
      },
    );
    result += "\n";

    // 개선점
    result += `### ${l.improvements}\n`;
    data.analysis.overall.improvements.forEach(
      (improvement: string, index: number) => {
        result += `${index + 1}. ${improvement}\n`;
      },
    );
    result += "\n";

    // 수정 제안 (배열 확인 및 적절한 포맷팅)
    result += `### ${l.modifications}\n`;
    // modifications가 배열인 경우 번호가 매겨진 목록으로 표시
    if (Array.isArray(data.analysis.overall.modifications)) {
      data.analysis.overall.modifications.forEach(
        (modification: string, index: number) => {
          result += `${index + 1}. ${modification}\n`;
        },
      );
    } else {
      // 문자열인 경우 그대로 출력 (기존 데이터 호환성)
      result += `${data.analysis.overall.modifications}\n`;
    }
    result += "\n";

    // 상세 카테고리별 분석
    for (const category of [
      "composition",
      "lighting",
      "color",
      "focus",
      "creativity",
    ]) {
      if (data.analysis[category]) {
        const categoryLabel = l[category as keyof typeof l] || category;
        result += `## ${categoryLabel}\n${data.analysis[category].text}\n\n`;
        result += `**${l.suggestions}:** ${data.analysis[category].suggestions}\n\n`;
      }
    }

    // 장르별 특화 분석
    if (data.analysis.genreSpecific) {
      result += `## ${l.genreSpecific}\n${data.analysis.genreSpecific.text}\n\n`;
      result += `**${l.suggestions}:** ${data.analysis.genreSpecific.suggestions}\n\n`;
    }

    // 추천 기술
    if (data.techniqueSuggestions && data.techniqueSuggestions.length) {
      result += `## ${l.techniqueSuggestions}\n`;
      data.techniqueSuggestions.forEach((technique: string, index: number) => {
        result += `${index + 1}. ${technique}\n`;
      });
    }

    return result;
  } catch (error) {
    console.error("결과 포맷팅 오류:", error);
    return jsonResponse; // 오류 시 원본 반환
  }
}
