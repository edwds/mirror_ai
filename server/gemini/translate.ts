// translate.ts - Gemini 기반 분석 결과 번역 유틸리티

import _ from "lodash";
import { getGenerativeModel } from "./client";
import { personas, PersonaKey } from "./personas";
import { PersonaPrompt } from "./types";
import { generateTranslationPrompt } from "./personaPromptTemplate";

// 번역 대상 필드 목록
const translationFields = [
  "summary",
  "analysis.overall.text",
  "analysis.overall.strengths",
  "analysis.overall.improvements",
  "analysis.overall.modifications",
  "analysis.composition.text",
  "analysis.lighting.text",
  "analysis.color.text",
  "analysis.focus.text",
  "analysis.creativity.text",
  "analysis.personalTake.text",
];

// 추가로 각 카테고리별 suggestions 필드 추가
const categoryFields = ["composition", "lighting", "color", "focus", "creativity"];
for (const category of categoryFields) {
  translationFields.push(`analysis.${category}.suggestions`);
}

/**
 * 입력 텍스트가 어떤 유형의 필드인지 감지하는 유틸리티 함수
 * @param text 분석할 텍스트
 * @param phrasingTips 페르소나의 문구 예시
 * @returns 필드 유형 (strengths, improvements, modifications) 또는 null
 */
function determineFieldType(text: string, phrasingTips?: any): string | null {
  if (!phrasingTips) return null;
  
  // 짧은 텍스트(12단어 미만)만 분석
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 12) return null;
  
  // strengths, improvements, modifications 샘플들과 비교
  const similarities: Record<string, number> = {
    'strengths': 0,
    'improvements': 0,
    'modifications': 0
  };
  
  // 각 필드 유형별 유사도 점수 계산
  Object.keys(similarities).forEach(field => {
    if (phrasingTips[field] && Array.isArray(phrasingTips[field])) {
      // 필드 유형의 특성 단어 추출
      const sampleWords = phrasingTips[field].join(' ').toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3);
      
      // 텍스트에 해당 특성 단어가 얼마나 포함되어 있는지 계산
      const textLower = text.toLowerCase();
      sampleWords.forEach((word: string) => {
        if (textLower.includes(word)) {
          similarities[field] += 1;
        }
      });
      
      // 짧은 문장 패턴 감지 (strengths와 improvements는 대체로 짧은 문장)
      if ((field === 'strengths' || field === 'improvements') && wordCount < 8) {
        similarities[field] += 1;
      }
      
      // 수정 제안 패턴 감지 (try, consider, might, could 등의 단어)
      if (field === 'modifications' && 
          /\b(try|consider|might|could|would|adjust|change|modify)\b/i.test(text)) {
        similarities[field] += 2;
      }
    }
  });
  
  // 가장 높은 유사도 점수를 가진 필드 반환
  const bestMatch = Object.entries(similarities)
    .sort((a, b) => b[1] - a[1])[0];
    
  // 유사도 점수가 일정 임계값을 넘는 경우에만 필드 유형 반환
  return bestMatch[1] > 0 ? bestMatch[0] : null;
}

/**
 * Gemini를 이용한 단일 텍스트 번역 함수
 * @param text 원본 텍스트
 * @param targetLang 대상 언어 (예: 'ko', 'en', 'ja')
 * @returns 번역된 텍스트
 */
export async function translateWithGemini(text: string, targetLang: string): Promise<string> {
  const model = getGenerativeModel();
  const prompt = `Translate the following text to ${targetLang}. Preserve the tone and style:\n\n"${text}"`;

  const result = await model.generateContent(prompt);
  const translated = result.response.text().trim();

  // 따옴표 제거 (Gemini는 종종 전체를 "로 감쌈)
  return translated.replace(/^"|"$/g, "");
}

/**
 * 페르소나 키가 유효한지 확인하는 타입 가드 함수
 * @param key 확인할 페르소나 키
 * @returns 유효한 PersonaKey인지 여부
 */
function isValidPersonaKey(key: string): key is PersonaKey {
  return Object.keys(personas).includes(key);
}

/**
 * 페르소나 키를 기반으로 상세 설명을 생성
 * @param personaKey 페르소나 키
 * @returns 페르소나 설명 문자열과 페르소나 객체
 */
function getPersonaDescription(personaKey: string): { description: string, persona: PersonaPrompt | null } {
  // 기본 설명 템플릿
  const basicDescription = `Character: "${personaKey}"`;
  
  // 유효한 PersonaKey인지 확인
  if (isValidPersonaKey(personaKey)) {
    try {
      const persona = personas[personaKey];
      
      // phrasingTips가 있는 경우 예시 문장 추가
      let phrasingSamples = "";
      if (persona.phrasingTips) {
        const tips = persona.phrasingTips;
        
        // 강점, 개선점, 수정사항 예시 추가
        if (tips.strengths && tips.strengths.length > 0) {
          phrasingSamples += `\nStrength examples:\n- ${tips.strengths.slice(0, 2).join('\n- ')}`;
        }
        
        if (tips.improvements && tips.improvements.length > 0) {
          phrasingSamples += `\nImprovement examples:\n- ${tips.improvements.slice(0, 2).join('\n- ')}`;
        }
        
        if (tips.modifications && tips.modifications.length > 0) {
          phrasingSamples += `\nModification examples:\n- ${tips.modifications.slice(0, 2).join('\n- ')}`;
        }
      }
      
      const description = `
Character: "${personaKey}"
Role: ${persona.meta.role}
Tone: ${persona.meta.tone}
Style: ${persona.meta.style}${phrasingSamples}
      `.trim();
      
      return { description, persona };
    } catch (error) {
      console.warn(`페르소나 정보를 가져오는데 실패했습니다: ${personaKey}`, error);
      return { description: basicDescription, persona: null };
    }
  }
  
  console.warn(`유효하지 않은 페르소나 키입니다: ${personaKey}`);
  return { description: basicDescription, persona: null };
}

/**
 * 번역 결과에서 로마자 발음 표기 제거 (괄호 안에 있는 로마자)
 * @param text 번역된 텍스트
 * @returns 정제된 텍스트
 */
function removeRomanization(text: string): string {
  // 괄호 안에 로마자로 된 발음 표기 패턴 제거 - (영문, 숫자, 공백, 특수문자 패턴)
  return text.replace(/\([a-zA-Z0-9\s\-\.,!?;:'"\(\)]+\)/g, "");
}

/**
 * 입력 언어가 무엇이든 먼저 영어로 번역한 다음, 목표 언어로 다시 번역하는 2단계 번역 함수
 * @param text 원본 텍스트 (언어 무관)
 * @param targetLang 최종 목표 언어 (예: 'ko', 'ja', ...)
 * @param personaKey 페르소나 키 (톤과 스타일 유지를 위해)
 * @returns 영어를 거쳐 최종 목표 언어로 번역된 텍스트
 */
export async function forceEnglishThenTranslate(
  text: string,
  targetLang: string,
  personaKey: string
): Promise<string> {
  // 페르소나 정보 가져오기
  const { description: personaDescription, persona } = getPersonaDescription(personaKey);
  
  // 페르소나가 없는 경우 경고
  if (!persona) {
    console.warn(`유효하지 않은 페르소나 키입니다: ${personaKey}. 기본 설명으로 번역을 진행합니다.`);
  }
  
  // 언어 코드 명확화 - 일관된 코드 사용
  const normalizedTargetLang = normalizeLanguageCode(targetLang);
  
  // 로그 추가 (디버깅 목적)
  console.log(`번역 요청: 원본 언어 -> ${normalizedTargetLang}, 페르소나: ${personaKey}`);

  // 페르소나 특성 정보 추출 (있는 경우)
  const personaStyle = persona ? `
Persona Role: ${persona.meta.role}
Tone: ${persona.meta.tone}
Style: ${persona.meta.style}
Guidance: ${persona.meta.guidance || "No specific guidance"}
` : "";

  // 영어가 목표 언어인 경우 추가 번역 없이 영어로만 번역
  if (normalizedTargetLang === 'en') {
    // 영어로 번역
    const model = getGenerativeModel();
    const toEnglishPrompt = `
Translate the following text to English, preserving the unique tone and style of the character described below:

${personaDescription}
${personaStyle}

Original text:
"""
${text}
"""

Guidelines:
1. Maintain the persona's unique voice and personality
2. Keep the same emotion, slang, and expressiveness 
3. Preserve any specialized terminology
4. Keep emojis and special characters intact
5. Output in ENGLISH ONLY
6. DO NOT add romanized pronunciations in parentheses
`;

    const result = await model.generateContent(toEnglishPrompt);
    const translated = result.response.text().trim();
    return removeRomanization(translated.replace(/^"|"$/g, ""));
  }

  // 1단계: 먼저 영어로 번역
  const model = getGenerativeModel();
  const toEnglishPrompt = `
Translate the following text to English, preserving the unique tone and style of the character described below:

${personaDescription}
${personaStyle}

Original text:
"""
${text}
"""

Guidelines:
1. Maintain the persona's unique voice and personality
2. Keep the same emotion, slang, and expressiveness 
3. Preserve any specialized terminology
4. Keep emojis and special characters intact
5. Output in ENGLISH ONLY - translate everything to English
6. DO NOT add romanized pronunciations in parentheses
`;

  console.log(`1단계: 영어로 번역 요청 중`);
  const englishResult = await model.generateContent(toEnglishPrompt);
  const englishText = removeRomanization(englishResult.response.text().trim().replace(/^"|"$/g, ""));
  console.log(`영어 번역 결과 (일부): ${englishText.substring(0, 50)}...`);

  // 목표 언어가 영어면 첫 번째 번역 결과 반환
  if (normalizedTargetLang === 'en') {
    return englishText;
  }

  // 2단계: 영어에서 목표 언어로 명확하게 번역
  const languageNames: Record<string, string> = {
    'ko': 'Korean',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German'
  };
  
  // 언어 이름이 없을 경우 기본값으로 원본 코드 사용
  const languageName = normalizedTargetLang in languageNames 
    ? languageNames[normalizedTargetLang] 
    : normalizedTargetLang;
  
  // 페르소나 예시 문구 추가 (있는 경우)
  let phrasingSamples = "";
  if (persona?.phrasingTips) {
    const tips = persona.phrasingTips;
    
    if (tips.strengths && tips.strengths.length > 0) {
      phrasingSamples += `\nStrength Examples (how this persona gives praise):\n- ${tips.strengths.slice(0, 2).join('\n- ')}`;
    }
    
    if (tips.improvements && tips.improvements.length > 0) {
      phrasingSamples += `\nImprovement Examples (how this persona points out issues):\n- ${tips.improvements.slice(0, 2).join('\n- ')}`;
    }
    
    if (tips.modifications && tips.modifications.length > 0) {
      phrasingSamples += `\nModification Examples (how this persona suggests edits):\n- ${tips.modifications.slice(0, 2).join('\n- ')}`;
    }
  }
  
  const toTargetPrompt = `
Translate the following English text to ${languageName} (${normalizedTargetLang}), while preserving the unique tone and style of the character described below:

${personaDescription}
${personaStyle}
${phrasingSamples}

English text:
"""
${englishText}
"""

Guidelines:
1. Maintain the persona's unique voice and personality 
2. Keep the same emotion, slang, and expressiveness
3. Use culturally appropriate phrases in ${languageName}
4. Preserve any specialized terminology
5. Keep emojis and special characters intact
6. DO NOT add romanized pronunciations in parentheses
7. IMPORTANT: The output MUST be in ${languageName} language only
8. MAKE SURE to maintain ${personaKey}'s unique style in the translation
`;

  console.log(`2단계: ${languageName}(${normalizedTargetLang})로 번역 요청 중 (${personaKey} 스타일 유지)`);
  const targetResult = await model.generateContent(toTargetPrompt);
  const finalTranslated = targetResult.response.text().trim();
  
  // 따옴표 제거하고 로마자 발음 제거 후 반환
  const result = removeRomanization(finalTranslated.replace(/^"|"$/g, ""));
  console.log(`최종 번역 결과 (일부): ${result.substring(0, 50)}...`);
  
  return result;
}

/**
 * 언어 코드 정규화 함수
 * @param langCode 언어 코드 또는 언어 이름
 * @returns 정규화된 언어 코드
 */
function normalizeLanguageCode(langCode: string): string {
  const code = langCode.toLowerCase().trim();
  
  // 언어 이름으로부터 코드 변환
  const nameToCode: Record<string, string> = {
    'english': 'en',
    'korean': 'ko',
    'japanese': 'ja', 
    'chinese': 'zh',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de'
  };
  
  if (nameToCode[code]) {
    return nameToCode[code];
  }
  
  // 이미 코드 형태인 경우 (최대 5자리 가정)
  if (code.length <= 5) {
    // 일반적인 2자리 코드
    if (['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'].includes(code)) {
      return code;
    }
    
    // 하이픈이 있는 경우 (e.g., 'ko-kr')
    if (code.includes('-')) {
      return code.split('-')[0];
    }
    
    // 언더스코어가 있는 경우 (e.g., 'ko_kr')
    if (code.includes('_')) {
      return code.split('_')[0];
    }
  }
  
  // 기본값 반환 (알 수 없는 경우)
  console.warn(`알 수 없는 언어 코드: ${langCode}, 기본값 'en' 사용`);
  return 'en';
}

/**
 * 전체 JSON 분석 결과를 하나의 번역 요청으로 처리하는 함수
 * @param jsonResponse 영어로 된 JSON 응답
 * @param targetLanguage 대상 언어
 * @param personaKey 페르소나 키
 */
export async function translateAnalysisAsWholeJson(
  jsonResponse: string,
  targetLanguage: string,
  personaKey: string
): Promise<string> {
  try {
    // JSON 파싱
    const data = JSON.parse(jsonResponse);
    
    // 이미 번역되어 있거나 대상 언어가 영어인 경우 번역하지 않음
    if (
      (data.metadata && data.metadata.translated) || 
      targetLanguage.toLowerCase() === 'en' ||
      targetLanguage.toLowerCase() === 'english'
    ) {
      return jsonResponse;
    }
    
    // 페르소나 정보 가져오기
    const { description: personaDescription, persona } = getPersonaDescription(personaKey);
    
    // 페르소나 고유의 문구 스타일 샘플 구성
    let phrasingSamples = "";
    if (persona?.phrasingTips) {
      const tips = persona.phrasingTips;
      
      if (tips.strengths && tips.strengths.length > 0) {
        phrasingSamples += `\n## Strength Phrases (HOW THIS PERSONA GIVES PRAISE - MUST MAINTAIN THIS STYLE):\n${tips.strengths.slice(0, 3).map(s => `"${s}"`).join("\n")}`;
      }
      
      if (tips.improvements && tips.improvements.length > 0) {
        phrasingSamples += `\n## Improvement Phrases (HOW THIS PERSONA CRITIQUES - MUST MAINTAIN THIS STYLE):\n${tips.improvements.slice(0, 3).map(s => `"${s}"`).join("\n")}`;
      }
      
      if (tips.modifications && tips.modifications.length > 0) {
        phrasingSamples += `\n## Modification Phrases (HOW THIS PERSONA SUGGESTS CHANGES - MUST MAINTAIN THIS STYLE):\n${tips.modifications.slice(0, 3).map(s => `"${s}"`).join("\n")}`;
      }
    }
    
    // 페르소나의 핵심 어조 특성 구성
    const personaStyle = persona ? `
# ${personaKey.toUpperCase()} PERSONA DEFINITION
- Role: ${persona.meta.role}
- Tone: ${persona.meta.tone}
- Style: ${persona.meta.style}
- Guidance: ${persona.meta.guidance || "No specific guidance"}
- Voice Sample: ${persona.meta.voice_sample || "N/A"}
` : `# CHARACTER: "${personaKey}"`;

    const model = getGenerativeModel();
    
    // 전체 JSON을 하나의 프롬프트로 번역 요청
    const translationPrompt = `
TRANSLATION TASK: Translate this ENTIRE photo analysis JSON from English to ${targetLanguage}

${personaStyle}
${phrasingSamples}

# CRITICAL TRANSLATION RULES
1. MAINTAIN THE EXACT PERSONA VOICE of "${personaKey}" throughout EVERY text field
2. Keep the unique writing style, slang, idioms, and expressions of ${personaKey}
3. The persona's personality must be CONSISTENTLY PRESERVED in every field
4. DO NOT sanitize or standardize the persona's unique tone
5. Keep emojis, punctuation style, and capitalization patterns intact
6. Translate meaning while preserving persona writing quirks
7. For "strengths", "improvements", and "modifications" fields: Translate while STRICTLY maintaining the persona's style of praise, critique, and suggestions
8. NEVER use generic professional tone - ALWAYS use persona voice
9. All translated fields must SOUND LIKE THE SAME CHARACTER
10. STRICT WORD COUNT LIMITATIONS:
   - summary field: MAXIMUM 8 WORDS in translated version
   - strengths/improvements/modifications: each item MAXIMUM 8 WORDS

# Input JSON (in English):
\`\`\`json
${jsonResponse}
\`\`\`

# Output Format
Return ONLY the complete translated JSON, maintaining the exact same structure but with all text fields translated to ${targetLanguage} while preserving the ${personaKey} persona's unique voice and style.
`;

    const result = await model.generateContent(translationPrompt);
    let translatedJson = result.response.text().trim();
    
    // JSON 코드 블록이 있으면 추출
    const jsonMatch = translatedJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      translatedJson = jsonMatch[1].trim();
    }
    
    // 번역된 JSON의 구조 검증
    try {
      const translatedData = JSON.parse(translatedJson);
      
      // 메타데이터 확인 및 수정
      translatedData.metadata = {
        originalLanguage: "en",
        targetLanguage: targetLanguage,
        translated: true
      };
      
      return JSON.stringify(translatedData, null, 2);
    } catch (error) {
      console.error("번역된 JSON 파싱 실패:", error);
      // 파싱 실패 시 원본 반환
      return jsonResponse;
    }
  } catch (error) {
    console.error("전체 JSON 번역 오류:", error);
    return jsonResponse;
  }
}

/**
 * 분석 결과에서 번역 대상 항목만 추출하여 2단계 번역(영어 경유) 후, 원본 객체에 덮어쓰기
 * @param analysis 원본 분석 JSON (언어 무관)
 * @param targetLang 대상 언어 (예: 'ko', 'ja', ...)
 * @param persona 페르소나 키 (톤 유지를 위함)
 * @returns 번역된 분석 JSON
 */
export async function applyTranslationToAnalysis(
  analysis: any,
  targetLang: string,
  persona: string
): Promise<any> {
  console.log(`2단계 번역 처리 시작: 모든 텍스트를 영어로 변환 후 ${targetLang}로 번역`);
  const updated = _.cloneDeep(analysis);

  // 카테고리별 필드들이 존재하는지 확인하고, 없으면 생성
  for (const category of categoryFields) {
    if (!_.get(updated, `analysis.${category}`)) {
      _.set(updated, `analysis.${category}`, {});
    }
  }

  // 모든 필드 순회하며 2단계 번역 적용
  for (const field of translationFields) {
    const value = _.get(updated, field);
    
    // 필드가 undefined거나 null이면 스킵
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "string" && value.trim() !== "") {
      console.log(`필드 번역 중: ${field}`);
      const translated = await forceEnglishThenTranslate(value, targetLang, persona);
      _.set(updated, field, translated);
    } else if (Array.isArray(value) && value.length > 0) {
      console.log(`배열 필드 번역 중: ${field} (항목 ${value.length}개)`);
      const translatedArray = await Promise.all(
        value.map((item) => 
          typeof item === "string" && item.trim() !== "" 
            ? forceEnglishThenTranslate(item, targetLang, persona) 
            : item
        )
      );
      _.set(updated, field, translatedArray);
    }
  }

  // 번역 메타 정보 추가
  updated.metadata = {
    originalLanguage: "en",
    targetLanguage: targetLang,
    translated: true
  };

  console.log(`2단계 번역 완료: ${targetLang}`);
  return updated;
}