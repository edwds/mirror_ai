// photoDetection.ts
import { getGenerativeModel } from './client.js';
import { detectMimeType } from './mime.js';
import { extractJson } from './format.js';
import { PhotoGenreDetectionResult } from './types.js';

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
    const model = getGenerativeModel();

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

    // 영어 프롬프트 사용 (언어 설정만 응답에 반영)
    const prompt = `
You are an expert photo classification AI for mirror., an AI-based photo analysis service. You need to analyze images uploaded by users to determine photo genre, nature, and characteristics.

### Classification tasks:
1. Determine if the given image is a photo (taken with a real camera) or not (digital art, illustration, graphics, text image, screenshot, AI-generated image, etc.).
2. If it's a photo, determine if it's a famous work that can be easily found on the internet.
3. Identify the main genre and secondary genre of the image.
4. Extract up to 5 key keywords that describe the image.
5. Briefly describe the main technical characteristics (composition, lighting, color, focus) of the image.

### Response format:
Respond in JSON format as follows, with all text content in ${language} language:
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

    // Clean up the response JSON
    const cleanResponseText = extractJson(responseText);

    // Parse the JSON string into an object
    const detectionResult = JSON.parse(cleanResponseText) as PhotoGenreDetectionResult;
    
    // 분석 가능 여부 판단 - 실제 사진이어야 분석 가능
    // 유명 작품이라도 단순 랜드마크나 여행 사진은 분석 가능하도록 수정
    detectionResult.canBeAnalyzed = detectionResult.isRealPhoto;
    
    // 안전 검사: properties와 키워드가 제대로 있는지 확인
    const hasValidProperties = detectionResult.properties && 
                              Array.isArray(detectionResult.properties.keywords) && 
                              detectionResult.properties.keywords.length > 0;
    
    // 키워드 분석을 통해 실제 예술 작품인지 확인 (작가의 작품, 미술관 작품 등)
    const isArtworkOrPainting = hasValidProperties && detectionResult.properties ? 
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