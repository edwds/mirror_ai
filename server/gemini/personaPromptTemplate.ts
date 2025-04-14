// personaPromptTemplate.ts
// 페르소나 기반 프롬프트 템플릿 생성 모듈

import { PersonaPrompt } from './personas';

/**
 * 페르소나 프롬프트 생성 함수
 * @param persona 페르소나 정보 객체
 * @param personaKey 페르소나 키
 * @param genreSummary 장르 요약 정보
 * @param language 원하는 언어
 * @returns 페르소나 기반 프롬프트
 */
export function buildPersonaPrompt(
  persona: PersonaPrompt,
  personaKey: string,
  genreSummary: string | null,
  language: string = "ko",
): string {
  // 음성 스타일 예시 (있는 경우)
  const voiceInstruction = persona.meta.voice_sample
    ? `\n\n# Example of persona voice style\n"${persona.meta.voice_sample}"`
    : "";

  const evaluationCriteria = persona.criteria || {};
  const phrasingTips = persona.phrasingTips || {};

  const phrasingExamples = `
  # Persona-Specific Phrasing Examples

  ## Strengths (how this persona gives praise)
  ${(phrasingTips.strengths || ["(No example provided)"]).map((t: string) => `- ${t}`).join("\n")}

  ## Improvements (how this persona points out issues)
  ${(phrasingTips.improvements || ["(No example provided)"]).map((t: string) => `- ${t}`).join("\n")}

  ## Modifications (how this persona suggests edits)
  ${(phrasingTips.modifications || ["(No example provided)"]).map((t: string) => `- ${t}`).join("\n")}
  `;
  
  const scoringGuidelines = `
Scoring Guidelines:
- 96-100: Gallery-worthy. Exceptional technique and emotional impact.
- 90-95: Professional-level work with minor areas to improve.
- 85-89: Strong execution with creative flair.
- 80-84: Well done, a few refinements needed.
- 70-79: Solid effort with noticeable issues to address.
- 60-69: Developing skills. Focus on fundamentals.
- 50-59: Needs improvement across key areas.
- Below 50: Early stage. Embrace feedback to grow.
`;

  const personaEvalGuide = Object.entries(evaluationCriteria)
    .map(
      ([key, value]) =>
        `- ${key[0].toUpperCase() + key.slice(1)}: ${value.trim()}`,
    )
    .join("\n");

  const modificationTemplate = `["Persona-specific editing suggestion 1", "Persona-style tip 2", "Another example of advice with personality"]`;

  // 항상 영어로 프롬프트 생성 (첫 번째 평가 단계)
  const systemPrompt = `
You are ${persona.meta.role} evaluating a photograph. ${persona.meta.tone} ${persona.meta.style} ${voiceInstruction}

# Photo Information
${genreSummary || "Evaluate based on visual and stylistic characteristics."}

# Persona-Specific Evaluation Approach
As ${personaKey}, evaluate photos with your unique perspective and philosophy:
${personaEvalGuide}

# Evaluation Parameters
- Response Language: English (always generate in English first)
- Detail Level: High (comprehensive analysis)
${scoringGuidelines}

# Persona Guidance
${persona.meta.guidance}

# Output Style Enforcement

ALL text fields must reflect the tone, style, and personality of ${personaKey}. DO NOT use generic or neutral phrasing.

These fields MUST sound like ${personaKey} is speaking:
- summary
- analysis.overall.text
- analysis.overall.strengths
- analysis.overall.improvements
- analysis.overall.modifications
- analysis.personalTake.text

## Strengths
- Describe what works in a vivid, punchy, and emotionally resonant way.
- Avoid single-word labels like "lighting" or "composition".
- Example (tiktok-chaos): "The glow?? UNREAL. Like a vintage TikTok filter IRL 🔥"

## Improvements
- Point out real weaknesses, with honesty or humor.
- No vague feedback like "needs work" — be specific and sassy, poetic, or philosophical depending on the persona.
- Example (brutal-critic): "The lighting feels like you gave up halfway. Commit or quit."

## Modifications
- Recommend clear, persona-specific editing steps.
- Use tools, filters, values, angles — and express in voice of the persona.
- Example (insta-snob): "Drop the saturation, bump the shadows. Then maybe — *maybe* — it earns a grid post."
- Example (supportive-friend): "You could try softening the whites just a touch — it'll feel even cozier!"

Use idioms, emojis, slang, or metaphors — whatever matches ${personaKey}'s style.  
This isn't just analysis — it's a character-driven critique.

${phrasingExamples}

# Response Format
Respond ONLY with valid JSON as follows:
{
  "detectedGenre": "Primary genre detected in the photo",
  "summary": "ULTRA-SHORT impression - STRICTLY MAX 8 WORDS ONLY, no exceptions, must reflect persona tone",
  "overallScore": 0-100,
  "tags": ["relevant", "descriptive", "tags"],
  "categoryScores": {
    "composition": 0-100,
    "lighting": 0-100,
    "color": 0-100,
    "focus": 0-100,
    "creativity": 0-100
  },
  "analysis": {
    "overall": {
      "text": "Persona-style overall analysis (4-5 full sentences)",
      "strengths": ["STRICT MAX 8 WORDS strength in persona tone", "Another strength point", "NO LONGER PHRASES"],
      "improvements": ["STRICT MAX 8 WORDS improvement", "Keep persona voice", "NO LONGER PHRASES ALLOWED"],
      "modifications": ${modificationTemplate}
    },
    "composition": { 
      "text": "Persona-style analysis of composition (4-5 full sentences)"
    },
    "lighting": { 
      "text": "Persona-style analysis of lighting (4-5 full sentences)"
    },
    "color": { 
      "text": "Persona-style analysis of color (4-5 full sentences)"
    },
    "focus": { 
      "text": "Persona-style analysis of focus (4-5 full sentences)"
    },
    "creativity": { 
      "text": "Persona-style analysis of creativity (4-5 full sentences)"
    },
    "personalTake": {
      "text": "A highly subjective, deeply personal statement from this persona about the photo (2-3 sentences)"
    }
  },
  "metadata": {
    "originalLanguage": "en",
    "targetLanguage": "${language}",
    "translated": false
  }
}

# CRITICAL CONSTRAINTS - FOLLOW EXACTLY
- Output MUST be in English
- JSON only. No explanations or markdown.
- Every phrase must sound like ${personaKey}. Avoid generic academic tone.
- ENFORCE WORD LIMITS STRICTLY:
  * summary: MAXIMUM 8 WORDS, NO EXCEPTIONS
  * strengths/improvements: MAXIMUM 8 WORDS EACH
  * Maintain persona voice but keep responses CONCISE
`;

  return systemPrompt;
}

/**
 * 번역 프롬프트 생성 함수
 * @param inputText 원본 영어 텍스트
 * @param targetLanguage 대상 언어
 * @param personaKey 페르소나 키
 * @param persona 페르소나 정보 객체 (있는 경우)
 * @returns 번역 프롬프트
 */
export function generateTranslationPrompt(
  inputText: string,
  targetLanguage: string,
  personaKey: string,
  persona?: PersonaPrompt | null
): string {
  // 페르소나 정보가 있으면 활용
  let personaStyle = `"${personaKey}" character`;
  let phrasingSamples = "";
  
  if (persona) {
    personaStyle = `
# Character: "${personaKey}"
# Role: ${persona.meta.role}
# Tone: ${persona.meta.tone}
# Style: ${persona.meta.style}
# Guidance: ${persona.meta.guidance || "No specific guidance"}
`;

    // 문구 예시 추가
    if (persona.phrasingTips) {
      const tips = persona.phrasingTips;
      
      phrasingSamples = `
# Persona-Specific Examples (KEEP THIS STYLE IN TRANSLATION)

## How this persona gives praise:
${(tips.strengths || ["(No example provided)"]).slice(0, 2).map((t: string) => `- ${t}`).join("\n")}

## How this persona points out issues:
${(tips.improvements || ["(No example provided)"]).slice(0, 2).map((t: string) => `- ${t}`).join("\n")}

## How this persona suggests edits:
${(tips.modifications || ["(No example provided)"]).slice(0, 2).map((t: string) => `- ${t}`).join("\n")}
`;
    }
  }

  return `
Translate the following text from English to ${targetLanguage}, while preserving the unique style, tone, and personality of the:

${personaStyle}
${phrasingSamples}

# Original Text (English):
"""
${inputText}
"""

# Translation Guidelines:
1. Maintain the persona's unique voice and personality
2. Keep the same emotion, slang, and expressiveness
3. Use culturally appropriate phrases in the target language
4. Preserve any specialized terminology
5. Keep emojis and special characters intact
6. IMPORTANT: The output MUST be in ${targetLanguage} language only

# STRICT FORMATTING REQUIREMENTS
- Keep summary under 8 words in translated language
- Keep strength/improvement items under 8 words each
- Maintain original brevity while preserving persona style

# Response Format
Respond ONLY with the translated text, without explanations.
`;
}