// genres.ts - 장르 정보 및 가이드라인
import fs from 'fs';
import path from 'path';
import { PhotoGenre } from "./types";

// 장르별 정보 인터페이스
export interface GenreInfo {
  name: string;
  description: string;
  scoringFocus: {
    composition: number;
    lighting: number;
    color: number;
    focus: number;
    creativity: number;
  };
  keyAesthetics: string[];
  commonTechniques: string[];
  exampleEditingTools?: Record<string, string[]>;
  subGenre?: string;
}

// 상세 장르 인터페이스 (genre.json 파일 구조)
export interface DetailedGenreInfo {
  id: number;
  genre: string;
  sub_genre: string;
  description: string;
  scoringFocus: {
    composition: number;
    lighting: number;
    color: number;
    focus: number;
    creativity: number;
  };
  keyAesthetics: string;
  commonTechniques: string;
  editing_Lightroom: string;
  editing_Photoshop: string;
  editing_Mobile: string;
}

// 상세 장르 정보 배열
let detailedGenreInfoArray: DetailedGenreInfo[] = [];

// 상세 장르 정보 로드 함수
function loadDetailedGenreInfo(): DetailedGenreInfo[] {
  try {
    const genreJsonPath = path.join(process.cwd(), 'attached_assets', 'genre.json');
    if (fs.existsSync(genreJsonPath)) {
      const genreData = fs.readFileSync(genreJsonPath, 'utf8');
      return JSON.parse(genreData) as DetailedGenreInfo[];
    } else {
      console.warn('genre.json 파일을 찾을 수 없습니다. 기본 장르 정보만 사용합니다.');
      return [];
    }
  } catch (error) {
    console.error('장르 정보 로드 중 오류:', error);
    return [];
  }
}

// 앱 시작 시 상세 장르 정보 로드
try {
  detailedGenreInfoArray = loadDetailedGenreInfo();
  console.log(`상세 장르 정보 ${detailedGenreInfoArray.length}개 로드 완료`);
} catch (error) {
  console.error('상세 장르 정보 로드 실패:', error);
}

// 상세 장르 정보 가져오기
export function getDetailedGenreInfo(genreName: string, subGenreName?: string): DetailedGenreInfo | null {
  if (!detailedGenreInfoArray.length) {
    return null;
  }
  
  // 장르와 서브장르가 모두 있는 경우 정확히 매칭
  if (subGenreName) {
    const exactMatch = detailedGenreInfoArray.find(
      g => g.genre.toLowerCase() === genreName.toLowerCase() && 
           g.sub_genre.toLowerCase() === subGenreName.toLowerCase()
    );
    if (exactMatch) return exactMatch;
  }
  
  // 장르만 있는 경우 첫 번째 매칭 항목 반환
  const genreMatch = detailedGenreInfoArray.find(
    g => g.genre.toLowerCase() === genreName.toLowerCase()
  );
  
  return genreMatch || null;
}

// 주요 사진 장르 정보
const genreInfoMap: Record<PhotoGenre, GenreInfo> = {
  'Landscape': {
    name: '풍경 사진',
    description: '자연과 풍경을 주제로 한 사진',
    scoringFocus: {
      composition: 5,
      lighting: 4,
      color: 4,
      focus: 3,
      creativity: 2
    },
    keyAesthetics: ['Rule of thirds', 'Golden hour', 'Leading lines', 'Panoramic view'],
    commonTechniques: [
      'Use of polarizing filter',
      'Wide angle lens',
      'Long exposure for water/clouds',
      'Focus stacking for depth',
      'HDR for high contrast scenes'
    ],
    exampleEditingTools: {
      'Lightroom': ['Graduated filter', 'Clarity', 'Dehaze', 'HSL panel'],
      'Photoshop': ['Layer masks', 'Orton effect', 'Sky replacement', 'Luminosity masking'],
      'Mobile': ['Snapseed\'s "Details" tool', 'Adobe Lightroom Mobile gradients']
    }
  },
  'Portrait': {
    name: '인물 사진',
    description: '인물을 주제로 한 사진',
    scoringFocus: {
      composition: 3,
      lighting: 5,
      color: 3,
      focus: 5,
      creativity: 2
    },
    keyAesthetics: ['Bokeh', 'Eye contact', 'Emotion', 'Subject isolation'],
    commonTechniques: [
      'Catchlights in eyes',
      'Shallow depth of field',
      'Golden ratio face positioning',
      'Rembrandt lighting',
      'Using reflectors for fill light'
    ],
    exampleEditingTools: {
      'Lightroom': ['Skin smoothing', 'Teeth whitening', 'Radial filter', 'Local adjustments'],
      'Photoshop': ['Frequency separation', 'Dodge and burn', 'Color grading'],
      'Mobile': ['Portrait mode', 'Facetune features', 'Lightroom face-aware editing']
    }
  },
  'Street': {
    name: '거리 사진',
    description: '도시 생활과 사람들의 일상을 담은 사진',
    scoringFocus: {
      composition: 4,
      lighting: 3,
      color: 3,
      focus: 3,
      creativity: 5
    },
    keyAesthetics: ['Decisive moment', 'Urban geometry', 'Human element', 'Storytelling'],
    commonTechniques: [
      'Zone focusing',
      'High ISO shooting',
      'Juxtaposition',
      'Framing with architecture',
      'Candid approach'
    ],
    exampleEditingTools: {
      'Lightroom': ['Grain addition', 'Contrast boost', 'Split toning', 'Perspective correction'],
      'Photoshop': ['Black and white conversion', 'Film emulation', 'Selective color adjustments'],
      'Mobile': ['VSCO street presets', 'RNI Films app', 'High contrast B&W filters']
    }
  },
  'Wildlife': {
    name: '야생동물 사진',
    description: '자연 속 동물을 담은 사진',
    scoringFocus: {
      composition: 3,
      lighting: 3,
      color: 2,
      focus: 5,
      creativity: 2
    },
    keyAesthetics: ['Eye contact', 'Natural behavior', 'Background separation', 'Environmental context'],
    commonTechniques: [
      'Fast shutter speeds',
      'Long telephoto lenses',
      'Bird\'s eye level shooting',
      'Burst mode',
      'Use of blinds/hides'
    ],
    exampleEditingTools: {
      'Lightroom': ['Noise reduction', 'Sharpening', 'Vibrance', 'Texture'],
      'Photoshop': ['Content-aware fill', 'Selective sharpening', 'Background blur enhancement'],
      'Mobile': ['Detail enhancement tools', 'Selective adjustments', 'Wildlife-specific presets']
    }
  },
  'Travel': {
    name: '여행 사진',
    description: '다양한 장소와 문화를 담은 여행 관련 사진',
    scoringFocus: {
      composition: 4,
      lighting: 3,
      color: 4,
      focus: 3,
      creativity: 4
    },
    keyAesthetics: ['Sense of place', 'Cultural elements', 'Personal perspective', 'Storytelling'],
    commonTechniques: [
      'Environmental portraits',
      'Iconic landmarks with unique angles',
      'Local interaction',
      'Blue hour shooting',
      'Wide to telephoto lens range'
    ],
    exampleEditingTools: {
      'Lightroom': ['Preset application', 'Geo-tagging', 'Vibrance', 'Graduated filters'],
      'Photoshop': ['Composite techniques', 'Tourist removal', 'Atmosphere enhancement'],
      'Mobile': ['VSCO travel presets', 'Instagram filters', 'Perspective correction tools']
    }
  },
  'Macro': {
    name: '매크로 사진',
    description: '작은 피사체를 확대하여 촬영한 사진',
    scoringFocus: {
      composition: 3,
      lighting: 4,
      color: 3,
      focus: 5,
      creativity: 3
    },
    keyAesthetics: ['Extreme detail', 'Abstract quality', 'Patterns and textures', 'Shallow DOF'],
    commonTechniques: [
      'Focus stacking',
      'Ring flash or diffused lighting',
      'Use of tripod',
      'Extension tubes',
      'High f-stop for depth of field'
    ],
    exampleEditingTools: {
      'Lightroom': ['Detail enhancement', 'Clarity', 'Sharpening', 'Noise reduction'],
      'Photoshop': ['Focus stacking automation', 'Selective sharpening', 'Clone stamp for dust removal'],
      'Mobile': ['Detail enhancer tools', 'Macro-specific presets', 'Manual adjustments']
    }
  },
  'Architecture': {
    name: '건축 사진',
    description: '건물과 구조물을 담은 사진',
    scoringFocus: {
      composition: 5,
      lighting: 4,
      color: 3,
      focus: 4,
      creativity: 2
    },
    keyAesthetics: ['Leading lines', 'Symmetry', 'Geometric patterns', 'Perspective'],
    commonTechniques: [
      'Tilt-shift lens usage',
      'Blue hour shooting',
      'Vertical correction',
      'Wide angle lens',
      'Bracketing for interiors'
    ],
    exampleEditingTools: {
      'Lightroom': ['Perspective correction', 'Lens profile corrections', 'Geometry panel', 'Transform panel'],
      'Photoshop': ['Perspective warp', 'HDR merging', 'Sky replacement', 'Precise straightening'],
      'Mobile': ['Perspective correction tools', 'Architectural presets', 'Geometry adjustments']
    }
  },
  'Sports': {
    name: '스포츠 사진',
    description: '스포츠 경기와 운동을 담은 사진',
    scoringFocus: {
      composition: 3,
      lighting: 2,
      color: 2,
      focus: 5,
      creativity: 3
    },
    keyAesthetics: ['Peak action', 'Emotion', 'Movement', 'Storytelling'],
    commonTechniques: [
      'Fast shutter speeds',
      'Continuous autofocus',
      'Anticipation of action',
      'Long telephoto lenses',
      'High-speed burst mode'
    ],
    exampleEditingTools: {
      'Lightroom': ['Clarity', 'Noise reduction', 'Sharpening', 'Vibrance boost'],
      'Photoshop': ['Background blur enhancement', 'Selective sharpening', 'Dramatic lighting effects'],
      'Mobile': ['Action-enhancing presets', 'Contrast adjustments', 'Subject isolation tools']
    }
  },
  'Urban': {
    name: '도시 사진',
    description: '도시 환경과 도시 생활을 담은 사진',
    scoringFocus: {
      composition: 4,
      lighting: 4,
      color: 4,
      focus: 3,
      creativity: 3
    },
    keyAesthetics: ['Geometry', 'Urban texture', 'City mood', 'Scale contrast'],
    commonTechniques: [
      'Blue/golden hour shooting',
      'Reflection utilization',
      'Long exposures for car trails',
      'Rooftop perspectives',
      'City light bokeh'
    ],
    exampleEditingTools: {
      'Lightroom': ['Dehaze', 'Graduated filters', 'Split toning', 'Perspective correction'],
      'Photoshop': ['Sky replacement', 'Light enhancement', 'Neon effect boost', 'Selective color'],
      'Mobile': ['Urban aesthetic presets', 'City vibe filters', 'Contrast and structure tools']
    }
  },
  'Night': {
    name: '야간 사진',
    description: '밤이나 저조도 환경에서 촬영한 사진',
    scoringFocus: {
      composition: 3,
      lighting: 5,
      color: 4,
      focus: 3,
      creativity: 3
    },
    keyAesthetics: ['Light trails', 'Stars/milky way', 'City lights', 'Light painting'],
    commonTechniques: [
      'Long exposure',
      'Tripod stability',
      'Remote trigger',
      'Wide aperture',
      'High ISO capability'
    ],
    exampleEditingTools: {
      'Lightroom': ['Noise reduction', 'Clarity', 'Dehaze for stars', 'HSL adjustments'],
      'Photoshop': ['Star stacking', 'Light enhancement', 'Glow effects', 'Noise filtering'],
      'Mobile': ['Night mode', 'Long exposure apps', 'Low-light enhancement features']
    }
  },
  'Unknown': {
    name: '알 수 없음',
    description: '분류되지 않은 장르',
    scoringFocus: {
      composition: 3,
      lighting: 3,
      color: 3,
      focus: 3,
      creativity: 3
    },
    keyAesthetics: ['Balance', 'Interest', 'Technical quality', 'Engagement'],
    commonTechniques: [
      'General photography principles',
      'Subject emphasis',
      'Technical proficiency',
      'Creative expression',
      'Effective storytelling'
    ],
    exampleEditingTools: {
      'Lightroom': ['Basic adjustments', 'Preset application', 'Clarity', 'Vibrance'],
      'Photoshop': ['Layer adjustments', 'Object removal', 'Color grading', 'General enhancements'],
      'Mobile': ['Auto-enhance features', 'Basic filters', 'Standard presets']
    }
  }
};

/**
 * 장르 텍스트에서 주요 키워드 추출
 * @param genreSummary 장르 요약 텍스트
 * @returns 장르 키워드 또는 null
 */
export function extractGenreKeyword(genreSummary: string | null): PhotoGenre | null {
  if (!genreSummary) return null;
  
  const lowered = genreSummary.toLowerCase();
  
  // 각 장르 키워드 확인
  if (lowered.includes('landscape')) return 'Landscape';
  if (lowered.includes('portrait')) return 'Portrait';
  if (lowered.includes('street')) return 'Street';
  if (lowered.includes('wildlife')) return 'Wildlife';
  if (lowered.includes('travel')) return 'Travel';
  if (lowered.includes('macro')) return 'Macro';
  if (lowered.includes('architecture')) return 'Architecture';
  if (lowered.includes('sports')) return 'Sports';
  if (lowered.includes('urban')) return 'Urban';
  if (lowered.includes('night')) return 'Night';
  
  return null;
}

/**
 * 장르 정보 가져오기
 * @param genre 가져올 장르 키워드
 * @returns 장르 정보 또는 기본값
 */
export function getGenreInfo(genre: PhotoGenre): GenreInfo {
  return genreInfoMap[genre] || genreInfoMap['Unknown'];
}

/**
 * 장르 기반 평가 가이드라인 생성
 * @param genreSummary 장르 요약 텍스트
 * @returns 장르별 평가 가이드라인
 */
export function generateGenreEvaluationGuidance(genreSummary: string | null): string {
  // 기본 장르 정보 추출
  const genreKey = extractGenreKeyword(genreSummary);
  if (!genreKey) return "Evaluate based on general photography principles.";
  
  const genreInfo = getGenreInfo(genreKey);
  
  // 상세 장르 정보 찾기 시도
  let detailedInfo = null;
  if (genreSummary) {
    const primaryGenre = genreSummary.match(/Primary genre: ([a-zA-Z\s]+)/i)?.[1];
    const secondaryGenre = genreSummary.match(/Secondary genre: ([a-zA-Z\s]+)/i)?.[1];
    
    if (primaryGenre && primaryGenre !== 'N/A') {
      detailedInfo = getDetailedGenreInfo(primaryGenre, secondaryGenre);
    }
  }
  
  // 상세 장르 정보가 있는 경우 이를 활용
  if (detailedInfo) {
    // 키 심미 요소와 기술 추출
    const keyAesthetics = detailedInfo.keyAesthetics.split(', ');
    const commonTechniques = detailedInfo.commonTechniques.split(', ');
    
    return `
Evaluate this image as a ${detailedInfo.sub_genre} (${detailedInfo.genre} Photography).

Description: ${detailedInfo.description}

Key aesthetics to consider:
- ${keyAesthetics.join('\n- ')}

Common techniques in this genre:
- ${commonTechniques.join('\n- ')}

Editing approaches for this genre typically include:
- Lightroom: ${detailedInfo.editing_Lightroom}
- Photoshop: ${detailedInfo.editing_Photoshop}
- Mobile: ${detailedInfo.editing_Mobile}
    `.trim();
  }
  
  // 상세 정보가 없는 경우 기본 정보 사용
  return `
Evaluate this image as ${genreInfo.name} (${genreKey} Photography).

Key elements to consider:
- ${genreInfo.keyAesthetics.join(', ')}

Common techniques in this genre:
- ${genreInfo.commonTechniques.slice(0, 3).join('\n- ')}
  `.trim();
}

/**
 * 장르별 수정 제안 템플릿 생성
 * @param genreSummary 장르 요약 텍스트
 * @returns 수정 제안 템플릿
 */
export function generateModificationTemplate(genreSummary: string | null): string {
  const genreKey = extractGenreKeyword(genreSummary);
  if (!genreKey) return "Provide step-by-step editing suggestions with specific tools and values";
  
  const genreInfo = getGenreInfo(genreKey);
  
  // 상세 장르 정보 찾기 시도
  let detailedInfo = null;
  if (genreSummary) {
    const primaryGenre = genreSummary.match(/Primary genre: ([a-zA-Z\s]+)/i)?.[1];
    const secondaryGenre = genreSummary.match(/Secondary genre: ([a-zA-Z\s]+)/i)?.[1];
    
    if (primaryGenre && primaryGenre !== 'N/A') {
      detailedInfo = getDetailedGenreInfo(primaryGenre, secondaryGenre);
    }
  }
  
  // 상세 장르 정보를 활용한 수정 제안
  if (detailedInfo) {
    return `
For ${detailedInfo.genre} photography (${detailedInfo.sub_genre}), provide these specific edits:

1. [Primary Edit]: Describe main adjustment based on this genre's key aspects.
   Lightroom suggestion: ${detailedInfo.editing_Lightroom}
   
2. [Secondary Edit]: Another key adjustment specific to ${detailedInfo.sub_genre}.
   Photoshop suggestion: ${detailedInfo.editing_Photoshop}
   
3. [Detail Enhancement]: How to improve fine details in this ${detailedInfo.sub_genre} photo.
   Mobile editing suggestion: ${detailedInfo.editing_Mobile}
   
Prioritize these aspects based on scoring weights: 
Composition (${detailedInfo.scoringFocus.composition}/5), 
Lighting (${detailedInfo.scoringFocus.lighting}/5), 
Color (${detailedInfo.scoringFocus.color}/5), 
Focus (${detailedInfo.scoringFocus.focus}/5), 
Creativity (${detailedInfo.scoringFocus.creativity}/5)
    `.trim();
  }
  
  // 기본 장르 정보 사용
  // 장르별 편집 도구 제안
  let editingTools = '';
  if (genreInfo.exampleEditingTools) {
    const tools = Object.entries(genreInfo.exampleEditingTools)
      .map(([app, features]) => `${app}: ${features.slice(0, 2).join(', ')}`)
      .join('; ');
    editingTools = `Consider these tools: ${tools}`;
  }
  
  return `
For ${genreKey} photography, provide these edits:
1. [Primary Edit]: Describe main adjustment with specific tool and amount
2. [Secondary Edit]: Another key adjustment with specific technique
3. [Detail Enhancement]: How to improve fine details
${editingTools}
  `.trim();
}