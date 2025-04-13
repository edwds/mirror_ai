import OpenAI from "openai";
import { AnalysisResult } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AnalysisOptions {
  focusPoint: string;
  persona: string;
  detailLevel: string;
  language: string;
}

export async function analyzePhoto(
  imageUrl: string,
  options: AnalysisOptions,
): Promise<AnalysisResult> {
  try {
    const { focusPoint, persona, detailLevel, language } = options;

    const prompt = `
당신은 mirror.라는, AI 기반 사진 분석 서비스의 전문 사진 평가 AI입니다. 사용자가 업로드한 사진을 분석하여 전문적이고 유용한 피드백을 제공해야 합니다.

### 분석 옵션:
- 주요 분석 지점: ${focusPoint}
- 분석가 페르소나: ${persona}
- 분석 디테일 수준: ${detailLevel}
- 언어: ${language}

---

### 분석해야 할 사항:
1. 구도 (프레이밍, 삼분법, 균형, 대칭, 유도선, 전반적인 시각적 구조)
2. 조명과 노출 (노출, 대비, 하이라이트, 그림자, 전반적인 조명 기법)
3. 색감과 톤 (색상 조화, 색상 대비, 전체적인 감성)
4. 초점과 선명도 (초점, 피사계 심도, 선명도, 노이즈 레벨)
5. 이야기와 독창성 (창의성, 감정 전달, 이야기 요소)

---

### 점수 산정 기준:
- **전체 점수는 100점 만점으로, 매우 엄격하게 판단하되 0점부터 100점까지 전체 범위를 고르게 활용해야 합니다.**
- 실제 사진의 품질에 따라 매우 낮은 점수(30점 이하)나 매우 높은 점수(90점 이상)도 망설이지 말고 부여하세요.
- 장르별로 적절한 평가 기준을 적용하고, 해당 장르의 중요 요소에 더 높은 가중치를 두세요.
- 모든 카테고리(구도, 조명, 색감, 초점, 창의성)가 동일한 중요도를 갖지 않으며, 장르에 따라 중요도가 달라집니다.
- 아래 기준에 따라 종합 점수를 산정하고, 각 항목 점수도 이에 연동되도록 조정하세요.

- **0-10 (매우 낮은 품질)**  
  *사진 이미지의 경우: 구도, 조명, 기술적인 요소 모두 심각하게 부족한 아마추어의 스냅사진 수준의 이미지 예시.*  
  *비사진 이미지(디지털 아트, 일러스트, 그래픽 등)의 경우: 심각한 디자인 결함, 명확하지 않은 표현, 일관성 없는 구성, 전반적으로 시각적 완성도가 매우 낮은 이미지 예시.*

- **11-20 (형편없음)**  
  *예시 – 일반인이 찍은 사진으로 기술적인 오류가 많고, 구도의 판단이 부족하여 전반적으로 즉각적인 개선이 필요한 이미지.*

- **21-30 (나쁨)**  
  *예시 – 아마추어가 시도한 이미지로, 기본적인 구도나 노출은 있을 수 있으나 여러 기술적인 요소들이 부족한 상태.*

- **31-40 (평균 이하)**  
  *예시 – 일부 요소는 괜찮지만 전반적으로 기대치에는 못 미치는 아마추어 수준의 이미지.*

- **41-50 (평균의 하위권)**  
  *예시 – 아마추어가 무난하게 촬영한 사진으로 특별한 장점은 없지만 평균 수준에 근접한 이미지.*

- **51-60 (평균의 상위권)**  
  *예시 – 전반적으로 괜찮은 수준이며, 기술적 또는 예술적으로 가능성이 보이지만 여전히 개선의 여지가 있는 이미지.*

- **61-70 (좋음 – 하위권)**  
  *예시 – 국제 사진 공모전에 출품할 수 있을 정도의 작품으로, 기술적 숙련도와 창의성이 보이지만 약간의 다듬음이 필요한 이미지.*

- **71-80 (좋음 – 상위권)**  
  *예시 – 수상작에 가까운 수준으로 대부분의 측면에서 높은 완성도를 보여주는 이미지.*

- **81-90 (우수함)**  
  *예시 – 국제 사진 대회에서 상위권에 들 수 있는 수준의 이미지로, 거의 전문가 수준의 기술력과 창의성을 갖춘 작품.*

- **91-100 (탁월함)**  
  *예시 – 전문가가 작업한 작품으로 거의 흠잡을 데 없이 뛰어난 기술과 예술적 비전을 보여주는 이미지.*

- **주의사항: 점수를 40-80점 사이에만 집중시키지 말고, 실제 품질에 따라 전체 점수 범위(0-100)를 고르게 활용하세요.**
- **점수가 높을수록 반드시 해당 레벨에 걸맞는 근거를 피드백 본문에서 제시해야 하며, 점수와 설명이 일치해야 합니다.**

### 응답 형식:
다음 형식에 맞추어 JSON 형태로 응답하세요:

{
  "summary": "사진에 대한 한줄평",
  "overallScore": (0-100 overall score), 
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "categoryScores": {
    "composition": (0-100 score),
    "lighting": (0-100 score),
    "color": (0-100 score),
    "focus": (0-100 score),
    "creativity": (0-100 score)
  },
  "analysis": {
    "overall": {
      "text": "종합적인 평가 내용",
      "strengths": ["장점1", "장점2", "장점3"],
      "improvements": ["개선점1", "개선점2"],
      "modifications": "현재 사진을 개선하기 위한 구체적인 수정 제안"
    },
    "composition": {
      "text": "구도에 대한 평가",
      "suggestions": ""
    },
    "lighting": {
      "text": "조명과 노출에 대한 평가",
      "suggestions": ""
    },
    "color": {
      "text": "색감과 톤에 대한 평가",
      "suggestions": ""
    },
    "focus": {
      "text": "초점과 선명도에 대한 평가",
      "suggestions": ""
    },
    "creativity": {
      "text": "이야기와 독창성에 대한 평가",
      "suggestions": ""
    }
  }
}

중요한 점:
1. 선택된 분석가 페르소나에 맞는 톤과 스타일로 평가를 제공하세요.
2. 각 섹션에 대해 상세한 평가를 제공하세요 (6~15문장). 전문적인 분석과 구체적인 피드백을 포함해야 합니다.
3. 선택된 주요 분석 지점에 더 중점을 두고 평가하세요.
4. 전문적이고 구체적인 피드백을 제공하되, 해당 언어에 맞는 자연스러운 표현을 사용하세요.
5. 점수는 기술적 완성도와 창의성을 균형있게 고려하여 엄격하게 메겨줘.
6. 태그는 사진의 주요 특성, 스타일, 기술, 감정 등을 반영하는 짧은 단어나 구문이어야 합니다.
7. 기술적 용어와 구체적인 카메라 설정에 대한 조언을 반드시 포함하세요.
8. overall 섹션의 improvements는 모든 세부 항목(구도, 조명, 색감, 초점, 창의성)에서 개선할 수 있는 점들을 불릿 포인트로 통합하여 제공하세요. 최소 5개 이상의 개선점을 제공하세요.
9. overall 섹션의 strengths는 모든 세부 항목에서 잘된 점들을 불릿 포인트로 통합하여 제공하세요. 최소 5개 이상의 장점을 제공하세요.
10. overall 섹션의 modifications에는 현재 사진을 개선하기 위한 매우 구체적인 수정 방법을 단계별로 상세하게 설명하세요.
  - 현재 이미지의 구도 및 요소들의 변경
  - 이미지 편집 소프트웨어(예: Photoshop, Lightroom)에서 적용할 수 있는 밝기/색감의 실제 조정값과 설정
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0].message.content || "{}",
    ) as AnalysisResult;

    // Perform basic validation on the returned data
    if (!result.summary || typeof result.overallScore !== "number") {
      throw new Error("Invalid response format from OpenAI API");
    }

    return result;
  } catch (error) {
    console.error("Error analyzing photo with OpenAI:", error);
    throw error;
  }
}
