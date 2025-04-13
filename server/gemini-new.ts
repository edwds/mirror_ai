// Import from schema.ts directly
import { AnalysisResult } from "../shared/schema.js";

// Import the Google Generative AI library
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
} from "@google/generative-ai";

// 사진 장르 및 속성 감지 결과 인터페이스
export interface PhotoGenreDetectionResult {
  detectedGenre: string;
  confidence: number;
  isRealPhoto: boolean;
  isFamousArtwork: boolean;
  reasonForClassification: string;
  properties: {
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
  canBeAnalyzed?: boolean;
}

export interface AnalysisOptions {
  persona: string;
  language: string;
  photoGenreInfo?: PhotoGenreDetectionResult | null;
}

// Initialize the API client
// Check if API key and project ID are available
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required for Gemini API to work");
} else {
  console.log(
    "GEMINI_API_KEY is loaded successfully (length: " + apiKey.length + ")",
  );
}

// Initialize with API key (using actual Gemini API implementation)
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 페르소나별 프롬프트 생성 함수
 * @param persona 선택된 페르소나 (brutal-critic, film-bro, supportive-friend, insta-snob, tiktok-chaos, tech-nerd)
 * @param language 사용 언어
 * @returns 페르소나별 맞춤 프롬프트 스타일 지침
 */
export function generatePersonaPrompt(persona: string, language: string = "ko"): string {
  // 기본 가이드라인 템플릿 (페르소나가 없거나 매칭되지 않을 때 사용)
  let personaGuide = "전문적이고 균형 잡힌 어조로 분석을 제공하세요.";
  
  switch(persona) {
    case "brutal-critic":
      personaGuide = `당신은 냉혹하고 타협없는 사진 비평가입니다. 
세련된 미학적 감각과 매우 높은 기대치를 가지고 있으며, 잘못된 것을 볼 때 직설적으로 말합니다.
다음 지침을 따르세요:
- 가능한 한 솔직하고 냉정하게 평가하세요. 진실만이 중요합니다.
- 기술적 약점에 대해 직설적으로 지적하세요. 타협하지 마세요.
- 아마추어 실수를 발견하면 확실히 지적하세요.
- 높은 점수를 주기 전에 매우 까다롭게 판단하세요.
- 비평을 통해 배움을 이끌어내도록 하세요.
- 정확한 전문 용어를 사용하여 권위를 보여주세요.
- 높은 기준과 깊은 지식을 바탕으로 평가하세요.`;
      break;
      
    case "film-bro":
      personaGuide = `당신은 영화와 사진에 대한 열정적인 지식을 가진 '필름브로'입니다.
항상 영화적 참조와 클래식 사진작가들의 영향을 언급하며, 약간 과시적이고 열정적인 톤으로 이야기합니다.
다음 지침을 따르세요:
- 유명 영화 감독(쿠브릭, 타르코프스키, 고다르, 웨스 앤더슨 등)의 미학과 비교하세요.
- 영화적 용어와 비유를 자주 사용하세요 (시네마토그래피, 미장센, 톤 그레이딩 등).
- 고전 필름 사진 기술과 현대 디지털의 차이점을 언급하세요.
- "이건 정말 [유명 감독] 스타일이군요" 같은 레퍼런스를 포함하세요.
- 약간 독선적이지만 진정으로 영감을 주는 조언을 제공하세요.
- 영화 장면, 컬러 팔레트, 구도 등의 구체적인 참조를 포함하세요.
- 기술적 평가에도 항상 예술적/영화적 맥락을 더하세요.`;
      break;
      
    case "supportive-friend":
      personaGuide = `당신은 항상 격려하고 긍정적이며 지지해주는 사진사 친구입니다.
실수를 부드럽게 지적하면서도 항상 진심 어린 격려와 실용적인 조언을 제공합니다.
다음 지침을 따르세요:
- 항상 긍정적인 측면을 먼저 강조하고, 개선점은 기회로 표현하세요.
- 따뜻하고 친근한 톤으로 이야기하며, 개인적인 연결감을 만드세요.
- "우리가 함께 이걸 개선할 수 있어요"와 같은 포용적인 언어를 사용하세요.
- 구체적인 개선 방법을 친절하게 설명하세요.
- 작은 성공도 진심으로 축하하고 인정해 주세요.
- 비판보다는 건설적인 제안에 초점을 맞추세요.
- 실망감보다는 가능성과 잠재력을 강조하세요.`;
      break;
      
    case "insta-snob":
      personaGuide = `당신은 트렌디한 인스타그램 미학에 정통한 소셜 미디어 인플루언서입니다.
최신 필터, 트렌드, 인스타그램 미학에 대해 매우 구체적인 의견을 가지고 있습니다.
다음 지침을 따르세요:
- 소셜 미디어에서 '잘 될' 요소와 '좋아요'를 많이 받을 요소를 강조하세요.
- 인스타그램 해시태그, 필터 이름, 소셜 미디어 용어를 자주 사용하세요.
- 팔로워들의 반응을 항상 염두에 두고 조언하세요.
- 인스타그램 피드의 일관성과 미학적 조화에 대해 이야기하세요.
- 트렌드에 맞는 색상 팔레트와 구도를 추천하세요.
- 'instagrammable' 품질에 특히 중점을 두세요.
- 소셜 미디어 영향력과 브랜딩 관점에서 평가하세요.`;
      break;
      
    case "tiktok-chaos":
      personaGuide = `당신은 에너지 넘치고 혼돈스러운 TikTok/틱톡 창작자 스타일로 말합니다.
주의력이 짧고, 즐겁고, ADHD적이며, 무작위 대문자와 이모티콘을 사용합니다.
다음 지침을 따르세요:
- 짧고, 에너지 넘치는 문장을 사용하세요. 긴 설명은 NO!
- 무작위로 대문자를 사용하여 특정 단어나 구문을 강조하세요.
- 비형식적이고 구어체 스타일로 작성하세요.
- 현재 유행하는 틱톡 밈과 문구를 참조하세요.
- 짧은 문단과 단편적인 생각들로 작성하세요.
- 갑작스러운 화제 전환과 주제를 넘나드는 방식으로 이야기하세요.
- 극적인 반응과 과장된 표현을 사용하세요.
- 일관성보다는 재미와 개성을 우선시하세요.
- 진정한 창의성과 독특함은 높이 평가하세요.`;
      break;
    
    case "tech-nerd":
      personaGuide = `당신은 카메라 장비와 기술에 완전히 몰두한 기술 전문가입니다.
렌즈 사양, 센서 크기, 후처리 알고리즘 등 모든 기술적 세부 사항에 집착합니다.
다음 지침을 따르세요:
- 기술적인 세부 사항(렌즈 mm, f값, 노출, ISO, 센서 크기 등)에 집중하세요.
- 정확한 카메라 모델, 렌즈 유형, 기술 용어를 사용하세요.
- 이미지 품질, 노이즈 처리, 동적 범위와 같은 기술적 측면을 분석하세요.
- 예술적 측면보다 기술적 실행에 더 많은 가중치를 두고 평가하세요.
- 다양한 장비 옵션과 기술적 대안을 제안하세요.
- 후처리 워크플로우와 소프트웨어 도구에 대한 구체적인 조언을 제공하세요.
- 역사적 맥락과 카메라 기술의 발전에 관한 참고 사항을 포함하세요.`;
      break;
      
    default:
      // 기본 설정은 위에 정의된 대로 유지
      break;
  }
  
  // 언어별 조정 (필요시 추가 언어 지원 확장 가능)
  if (language !== "ko") {
    // 기타 언어 지원은 필요시 추가
  }
  
  return personaGuide;
}

/**
 * 이미지 데이터에서 MIME 타입을 감지하는 함수 
 * @param uint8Array 이미지 데이터의 Uint8Array
 * @returns 감지된 MIME 타입 또는 기본값으로 "image/jpeg"
 */
function detectMimeType(uint8Array: Uint8Array): string {
  if (uint8Array.length >= 2) {
    // JPEG
    if (uint8Array[0] === 0xff && uint8Array[1] === 0xd8) {
      return "image/jpeg";
    }

    // PNG
    if (
      uint8Array.length >= 8 &&
      uint8Array[0] === 0x89 &&
      uint8Array[1] === 0x50 &&
      uint8Array[2] === 0x4e &&
      uint8Array[3] === 0x47
    ) {
      return "image/png";
    }

    // GIF
    if (
      uint8Array.length >= 6 &&
      uint8Array[0] === 0x47 &&
      uint8Array[1] === 0x49 &&
      uint8Array[2] === 0x46
    ) {
      return "image/gif";
    }

    // WebP
    if (
      uint8Array.length >= 12 &&
      uint8Array[8] === 0x57 &&
      uint8Array[9] === 0x45 &&
      uint8Array[10] === 0x42 &&
      uint8Array[11] === 0x50
    ) {
      return "image/webp";
    }
    
    // BMP
    if (uint8Array[0] === 0x42 && uint8Array[1] === 0x4D) {
      return "image/bmp";
    }
  }

  // Default to JPEG if we can't detect
  return "image/jpeg";
}

/**
 * 사진의 장르와 속성을 감지하는 함수
 * @param imageUrl 이미지 URL 또는 base64 데이터
 * @param language 사용 언어
 * @returns 감지된 결과
 */
export async function detectPhotoGenreAndProperties(
  imageUrl: string,
  language: string = "ko", // 기본값은 한국어
): Promise<PhotoGenreDetectionResult> {
  try {
    console.log("※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※");
    console.log("Gemini API - 사진 장르 및 속성 감지 시작 (detectPhotoGenreAndProperties)");
    console.log("※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※");
    
    // Use Gemini 1.5 Flash model for image analysis
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // Fetch image data from the URL
    let imageData: string;

    // Check if the URL is a base64 data URL
    if (imageUrl.startsWith("data:")) {
      // Already a data URL, use it directly
      imageData = imageUrl;
    } else {
      // For other URLs, we'll need to fetch the image
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = Buffer.from(uint8Array).toString("base64");

      // Detect the mime type
      const mimeType = detectMimeType(uint8Array);
      imageData = `data:${mimeType};base64,${base64}`;
    }

    // 모든 언어에 대해 영어 프롬프트 사용
    const prompt = `
You are an expert photo classification AI for mirror., an AI-based photo analysis service. You need to analyze images uploaded by users to determine photo genre, nature, and characteristics.

### Classification tasks:
1. Determine if the given image is a photo (taken with a real camera) or not (digital art, illustration, graphics, text image, screenshot, AI-generated image, etc.).
2. If it's a photo, determine if it's a famous work that can be easily found on the internet.
3. Identify the main genre and secondary genre of the image.
4. Extract up to 5 key keywords that describe the image.
5. Briefly describe the main technical characteristics (composition, lighting, color, focus) of the image.

### Response format:
Respond in JSON format as follows:
{
  "detectedGenre": "detected main genre",
  "confidence": confidence level (0.1~1.0),
  "isRealPhoto": true/false,
  "isFamousArtwork": true/false,
  "reasonForClassification": "brief explanation of classification result",
  "properties": {
    "primaryGenre": "primary genre",
    "secondaryGenre": "secondary genre",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "technicalAttributes": {
      "composition": "brief description of composition characteristics",
      "lighting": "brief description of lighting characteristics",
      "color": "brief description of color characteristics",
      "focus": "brief description of focus characteristics"
    }
  }
}

Important notes:
1. Classify digital art, illustrations, AI-generated images, screenshots, and text-centric images as "isRealPhoto": false.
2. For "isFamousArtwork", only mark as TRUE if it's an actual artwork (paintings, professional photography in galleries/museums/exhibitions, famous historical photographs by known photographers). For common travel photos of landmarks (Eiffel Tower, Empire State Building, etc.) or tourist photos, even if they're of famous places, mark as FALSE unless they're published/exhibited artworks.
3. Express confidence in genre classification as a decimal between 0.1 and 1.0.
4. Use ${language} for your response language.
`;

    // Google Gemini requires image data as part of the content array
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageData.split(";")[0].split(":")[1] || "image/jpeg",
          data: imageData.split(",")[1],
        },
      },
    ]);

    // Parse the response text as JSON
    let responseText = result.response.text();
    console.log("※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※");
    console.log("Gemini API 응답 전체:", responseText);
    console.log("※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※※");

    // Sometimes AI models include markdown code blocks, so we need to clean that up
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0].trim();
    }

    // Parse the JSON string into an object
    const detectionResult = JSON.parse(responseText) as PhotoGenreDetectionResult;
    
    // 분석 가능 여부 판단 - 실제 사진이어야 분석 가능
    // 유명 작품이라도 단순 랜드마크나 여행 사진은 분석 가능하도록 수정
    detectionResult.canBeAnalyzed = detectionResult.isRealPhoto;
    
    // 안전 검사: properties와 키워드가 제대로 있는지 확인
    const hasValidProperties = detectionResult.properties && 
                              Array.isArray(detectionResult.properties.keywords) && 
                              detectionResult.properties.keywords.length > 0;
    
    // 키워드 분석을 통해 실제 예술 작품인지 확인 (작가의 작품, 미술관 작품 등)
    const isArtworkOrPainting = hasValidProperties ? 
      detectionResult.properties.keywords.some(keyword => 
        keyword.toLowerCase().includes('painting') || 
        keyword.toLowerCase().includes('artwork') || 
        keyword.toLowerCase().includes('masterpiece') ||
        keyword.toLowerCase().includes('museum') ||
        keyword.toLowerCase().includes('gallery') ||
        keyword.toLowerCase().includes('exhibit')
      ) : false;
    
    // 설명에 특정 키워드가 있는지 확인
    const descriptionIndicatesArtwork = detectionResult.reasonForClassification ? 
      (
        detectionResult.reasonForClassification.toLowerCase().includes('painting') ||
        detectionResult.reasonForClassification.toLowerCase().includes('artwork') ||
        detectionResult.reasonForClassification.toLowerCase().includes('museum piece') ||
        detectionResult.reasonForClassification.toLowerCase().includes('exhibition') ||
        detectionResult.reasonForClassification.toLowerCase().includes('artist')
      ) : false;
    
    // 유명 예술 작품인 경우에만 분석 제외 (단순 랜드마크는 허용)
    if (detectionResult.isFamousArtwork && (isArtworkOrPainting || descriptionIndicatesArtwork)) {
      detectionResult.canBeAnalyzed = false;
      console.log('분석 제외 이유: 유명 예술 작품으로 판단됨');
    }
    
    console.log(`Successfully detected photo genre: ${detectionResult.detectedGenre}`);
    console.log(`Photo validation results: {
  isRealPhoto: ${detectionResult.isRealPhoto},
  isFamousArtwork: ${detectionResult.isFamousArtwork},
  reasonForClassification: '${detectionResult.reasonForClassification}',
  canBeAnalyzed: ${detectionResult.canBeAnalyzed}
}`);

    return detectionResult;
  } catch (error) {
    console.error("Error detecting photo genre and properties with Gemini:", error);
    throw error;
  }
}

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

    // Gemini 모델 초기화 (1.5 Flash 사용)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

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

    // 사전 감지된 장르 정보 가공 (압축을 위해 한 줄 요약으로 변환)
    let photoGenreInfoSummary = "";
    if (photoGenreInfo && photoGenreInfo.detectedGenre) {
      photoGenreInfoSummary = `장르: ${photoGenreInfo.detectedGenre}, 주요특성: ${photoGenreInfo.properties?.primaryGenre || "Unknown"}, 보조: ${photoGenreInfo.properties?.secondaryGenre || "Unknown"}, 키워드: ${photoGenreInfo.properties?.keywords?.join(", ") || "없음"}`;
    }

    // 페르소나 스타일 지침 생성
    const personaInstructions = generatePersonaPrompt(persona, language);
    console.log(`선택된 페르소나: ${persona} - 스타일 지침 적용`);

    // 시스템 프롬프트 구성 (토큰 최적화) - 영어 프롬프트 사용
    const systemPrompt = `You are a professional photo evaluation AI for mirror., an AI-based photo analysis service. Your task is to analyze user-uploaded photos and provide professional, useful feedback.

### Analysis Options:
- Response language: ${language}
${photoGenreInfoSummary ? `- Pre-detected info: ${photoGenreInfoSummary}` : ''}

### Persona Style Guide:
${personaInstructions}

### Response Format:
Respond in JSON format as follows:
{
  "detectedGenre": "detected photo genre",
  "summary": "six-word summary highlighting strengths",
  "overallScore": (0-100 overall score), 
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "categoryScores": {
    "composition": (0-100 score),
    "lighting": (0-100 score),
    "color": (0-100 score),
    "focus": (0-100 score),
    "creativity": (0-100 score)
  },
  "analysis": {
    "overall": {
      "text": "comprehensive evaluation (mentioning genre characteristics)",
      "strengths": ["strength1", "strength2", "strength3"],
      "improvements": ["improvement1", "improvement2"],
      "modifications": "specific modification suggestions to improve the photo (considering genre)"
    },
    "composition": {
      "text": "composition evaluation (considering genre)",
      "suggestions": ""
    },
    "lighting": {
      "text": "lighting and exposure evaluation (considering genre)",
      "suggestions": ""
    },
    "color": {
      "text": "color and tone evaluation (considering genre)",
      "suggestions": ""
    },
    "focus": {
      "text": "focus and sharpness evaluation (considering genre)",
      "suggestions": ""
    },
    "creativity": {
      "text": "story and originality evaluation (considering genre)",
      "suggestions": ""
    },
    "genreSpecific": {
      "text": "additional evaluation specific to the genre",
      "suggestions": "genre-specific improvement suggestions"
    }
  }
}

Important: Provide your response in ${language} language.`;

    // 장르별 평가 가이드라인 (분리하여 토큰 최적화)
    const genreGuidePrompt = `
### Photo Genre Detection and Application:
Classify the photo into one of the following genres:
- Landscape Photography - Natural landscapes, scenery, mountains, sea, sky, etc.
- Portrait Photography - Single subject or small group portraits
- Street Photography - Urban life, street scenes, city culture
- Architectural Photography - Buildings, structures, interiors, design
- Macro/Close-up Photography - Extremely close-up view of small subjects
- Wildlife/Nature Photography - Animals, plants, natural ecosystems
- Product/Commercial Photography - Products, marketing, advertising
- Sports/Action Photography - Dynamic movement, sports activities
- Night/Astrophotography - Night sky, stars, galaxies, night scenes
- Black and White Photography - Grayscale rather than color images
- Documentary Photography - Social, cultural, historical documentation
- Abstract/Experimental Photography - Non-representational, conceptual, experimental approaches
- Fashion Photography - Clothing, accessories, style-related
- Food Photography - Culinary, food presentation, food-related
- Wedding/Event Photography - Special occasions, anniversaries, weddings
- Drone/Aerial Photography - Scenes shot from the air
- Cinematic Photography - Visual style reminiscent of film scenes
- Mobile Photography - Photos taken with smartphones with characteristic traits
- Other specialized genres (Minimalism, Underwater, Industrial, Conceptual, etc.)

Focus on analysis using appropriate evaluation criteria and technical elements for the genre.
Award scores strictly in the range of 0-100 points, considering genre-specific weighting of important elements.
Provide at least 5 specific strengths and areas for improvement.
Provide the response in ${language} language.
`;

    // 프롬프트 구성 (시스템 + 사용자 지침)
    console.log('Gemini API 요청 - 프롬프트 생성 및 요청 전송');
    const imageContent = {
      inlineData: {
        mimeType: imageData.split(";")[0].split(":")[1] || "image/jpeg",
        data: imageData.split(",")[1],
      },
    };

    // 최종 요청 전송 (시스템 프롬프트 + 이미지 + 장르 가이드)
    const result = await model.generateContent([
      systemPrompt,
      imageContent,
      genreGuidePrompt
    ]);

    // Parse the response text as JSON
    let analysisText = result.response.text();
    console.log(`Gemini API 응답 수신 완료: ${analysisText.length}자`);

    // Sometimes AI models include markdown code blocks, so we need to clean that up
    if (analysisText.includes("```json")) {
      analysisText = analysisText.split("```json")[1].split("```")[0].trim();
      console.log("JSON 코드 블록에서 응답 추출");
    } else if (analysisText.includes("```")) {
      analysisText = analysisText.split("```")[1].split("```")[0].trim();
      console.log("코드 블록에서 응답 추출");
    }

    // 로그 확인용 짧은 응답 샘플
    const responseSample = analysisText.length > 100 ? 
      `${analysisText.substring(0, 100)}...` : analysisText;
    console.log(`응답 분석 준비: ${responseSample}`);

    // Parse the JSON string into an object
    const analysisResult = JSON.parse(analysisText) as AnalysisResult;
    console.log(`페르소나 스타일 '${persona}'로 분석 완료: ${analysisResult.detectedGenre} (${analysisResult.overallScore}점)`);
    
    // 유명 작품으로 감지된 경우, 미리 정의된 피드백으로 대체
    if (analysisResult.isNotEvaluable) {
      // 미리 정의된 피드백 메시지
      const predefinedText = "현대 사진 예술의 중요한 작품으로, 예술사적 맥락과 기술적 특성이 독특한 작품입니다. 작가의 예술적 비전과 표현 방식에 주목해 보세요.";
      
      // 사용자가 이미 가지고 있는 피드백 구조를 유지하면서 내용만 교체
      analysisResult.analysis.overall.text = predefinedText;
      analysisResult.analysis.overall.strengths = [
        "역사적으로 중요한 작품입니다",
        "독특한 예술적 비전을 보여줍니다",
        "기술적 측면에서 혁신적인 특성을 갖고 있습니다",
        "예술 이론과 비평의 중요한 참고가 됩니다",
        "사진 예술의 발전에 영향을 미쳤습니다"
      ];
      analysisResult.analysis.overall.improvements = [
        "직접 작품을 관람하여 더 자세히 관찰해보세요",
        "작가에 대한 더 많은 자료를 찾아보는 것이 좋습니다",
        "유사한 시대나 스타일의 다른 작품과 비교해보세요",
        "작품의 제작 배경과 문화적 맥락을 조사해보세요",
        "작품에 대한 비평적 논의를 찾아 참고해보세요"
      ];
      analysisResult.analysis.overall.modifications = "유명 작품은 수정 제안이 적절하지 않습니다";
      
      // 섹션별 분석 내용도 단순화
      const sectionDefaultText = "이 작품은 예술사적 중요성을 가진 유명 작품으로, 기술적인 평가보다는 역사적 맥락에서 감상하는 것이 적절합니다.";
      analysisResult.analysis.composition.text = sectionDefaultText;
      analysisResult.analysis.lighting.text = sectionDefaultText;
      analysisResult.analysis.color.text = sectionDefaultText;
      analysisResult.analysis.focus.text = sectionDefaultText;
      analysisResult.analysis.creativity.text = sectionDefaultText;
      
      // 제안 섹션
      const sectionDefaultSuggestion = "작품의 예술사적 맥락과 작가의 의도를 조사해보세요.";
      analysisResult.analysis.composition.suggestions = sectionDefaultSuggestion;
      analysisResult.analysis.lighting.suggestions = sectionDefaultSuggestion;
      analysisResult.analysis.color.suggestions = sectionDefaultSuggestion;
      analysisResult.analysis.focus.suggestions = sectionDefaultSuggestion;
      analysisResult.analysis.creativity.suggestions = sectionDefaultSuggestion;
    }

    // Perform basic validation on the returned data
    if (
      !analysisResult.summary ||
      typeof analysisResult.overallScore !== "number"
    ) {
      throw new Error("Invalid response format from Gemini API");
    }

    return analysisResult;
  } catch (error) {
    console.error("Error analyzing photo with Gemini:", error);
    throw error;
  }
}