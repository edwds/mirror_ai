// Persona display information for UI consistency
export interface PersonaDisplayInfo {
  key: string;                 // backend key
  name: string;               // display name in English
  characterName: string;      // character display name
  emoji: string;              // emoji representation
  color: string;              // Tailwind gradient color
  imagePath: string;          // path to character image
  description: {
    en: string;
    ko: string;
  };
  loadingMessage: {
    en: string;
    ko: string;
  };
}

import { personaDialogues } from './PersonaDialogue';

export function getPersonaDialogue(personaKey: string, lang: 'ko' | 'en' | 'jp' = 'ko') {
  return personaDialogues[personaKey]?.[lang];
}

export function getRandomLoadingMessage(personaKey: string, lang: string = 'ko') {
  const dialogue = getPersonaDialogue(personaKey, lang as 'ko' | 'en' | 'jp');
  if (!dialogue) return 'Loading...';
  const messages = dialogue.loadingMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

// Persona data list
export const personaDisplayInfos: PersonaDisplayInfo[] = [
  {
    key: "brutal-critic",
    name: "Brutal Critic",
    characterName: "Viktor",
    emoji: "🪓",
    color: "bg-gradient-to-r from-red-700 to-gray-800",
    imagePath: "/images/viktor.png",
    description: {
      en: "Harsh, unforgiving evaluation with technical precision",
      ko: "냉정하고 기술적으로 정확한 평가",
    },
    loadingMessage: {
      en: "Viktor is preparing a ruthless evaluation...",
      ko: "Viktor가 나노 단위로 냉정한 평가 준비중...",
    },
  },
  {
    key: "film-bro",
    name: "Chill Film Bro",
    characterName: "Noel",
    emoji: "🎬",
    color: "bg-gradient-to-r from-purple-700 via-indigo-600 to-slate-500",
    imagePath: "/images/noel.png",
    description: {
      en: "Cinematic assessment with references to film techniques",
      ko: "영화적 기법을 참조한 평가",
    },
    loadingMessage: {
      en: "Noel is analyzing with cinematic perspective...",
      ko: "Noel이 영화적 감성으로 분석중...",
    },
  },
  {
    key: "supportive-friend",
    name: "Supportive Friend",
    characterName: "Sunny",
    emoji: "🫂",
    color: "bg-gradient-to-br from-yellow-300 to-pink-400",
    imagePath: "/images/sunny.png",
    description: {
      en: "Encouraging feedback with gentle suggestions",
      ko: "따뜻한 응원과 부드러운 조언",
    },
    loadingMessage: {
      en: "Sunny is offering supportive advice...",
      ko: "Sunny가 응원하며 조언할게요...",
    },
  },
  {
    key: "insta-snob",
    name: "Insta Snob",
    characterName: "Eva",
    emoji: "📸✨",
    color: "bg-gradient-to-tr from-amber-400 to-pink-500",
    imagePath: "/images/eva.png",
    description: {
      en: "Social media focused evaluation for maximum engagement",
      ko: "소셜 미디어 감성의 인스타그램 스타일 평가",
    },
    loadingMessage: {
      en: "Eva is evaluating with social media aesthetic...",
      ko: "Eva의 고감도 인스타 감성으로 평가중...",
    },
  },
  {
    key: "tiktok-chaos",
    name: "TikTok Chaos",
    characterName: "Momo",
    emoji: "🔥😭⚡",
    color: "bg-gradient-to-br from-pink-400 via-fuchsia-500 to-cyan-400",
    imagePath: "/images/momo.png",
    description: {
      en: "Chaotic, meme-fueled Gen Z feedback with ✨unhinged✨ energy.",
      ko: "혼돈과 밈으로 가득 찬 Z세대 하이텐션 피드백!",
    },
    loadingMessage: {
      en: "Momo is analyzing with MAXIMUM CHAOS!!!",
      ko: "Momo가 혼돈의 에너지로 분석 중입니다!!!",
    },
  },
  {
    key: "tech-nerd",
    name: "Tech Nerd",
    characterName: "Dex",
    emoji: "🔧📷",
    color: "bg-gradient-to-r from-emerald-600 to-lime-500",
    imagePath: "/images/dex.png",
    description: {
      en: "Technical evaluation focused on gear and settings",
      ko: "장비와 설정에 중점을 둔 기술적 평가",
    },
    loadingMessage: {
      en: "Dex is running technical analysis...",
      ko: "Dex가 픽셀 단위로 기술적 분석 수행중...",
    },
  },
  {
    key: "weeb-sensei",
    name: "Weeb Sensei",
    characterName: "Kyo",
    emoji: "🇯🇵",
    color: "bg-gradient-to-bl from-rose-500 to-zinc-500",
    imagePath: "/images/kyo.png",
    description: {
      en: "Japanese aesthetics enthusiast with anime references",
      ko: "일본 감성 집착형 사진가",
    },
    loadingMessage: {
      en: "Kyo is evaluating with Japanese aesthetics...",
      ko: "Kyo가 일본 미학으로 평가중...",
    },
  },
  {
    key: "art-school-dropout",
    name: "Art School Dropout",
    characterName: "Theo",
    emoji: "🧠",
    color: "bg-gradient-to-br from-violet-700 via-indigo-700 to-gray-700",
    imagePath: "/images/theo.png",
    description: {
      en: "Philosophical critic with art theory references",
      ko: "비평에 진심인 아트스쿨 출신의 철학적 사진가",
    },
    loadingMessage: {
      en: "Theo is conceptualizing the spatial dynamics...",
      ko: "Theo가 공간적 역학관계 개념화중...",
    },
  },
  {
    key: "landscape-maniac",
    name: "Landscape Maniac",
    characterName: "Sol",
    emoji: "🏔️✨",
    color: "bg-gradient-to-tr from-emerald-700 to-yellow-400",
    imagePath: "/images/sol.png",
    description: {
      en: "Obsessed with epic nature and golden hour perfection",
      ko: "대자연과 황금빛 조명에 집착하는 풍경사진가",
    },
    loadingMessage: {
      en: "Sol is waiting for the perfect light to analyze...",
      ko: "Sol이 완벽한 빛을 기다리며 분석중...",
    },
  },
];

// Utility functions to retrieve persona data
export function getPersonaDisplayInfo(personaKey: string): PersonaDisplayInfo {
  return personaDisplayInfos.find((p) => p.key === personaKey) || personaDisplayInfos[0];
}

export function getPersonaLoadingMessage(personaKey: string, language: 'en' | 'ko' = 'ko'): string {
  const persona = getPersonaDisplayInfo(personaKey);
  return language === 'en' ? persona.loadingMessage.en : persona.loadingMessage.ko;
}

export function getPersonaDisplayName(personaKey: string): string {
  return getPersonaDisplayInfo(personaKey).name;
}

export function getCharacterName(personaKey: string): string {
  return getPersonaDisplayInfo(personaKey).characterName;
}

export function getPersonaDescription(personaKey: string, language: 'en' | 'ko' = 'ko'): string {
  const persona = getPersonaDisplayInfo(personaKey);
  return language === 'en' ? persona.description.en : persona.description.ko;
}

export function getCharacterImagePath(personaKey: string): string {
  return getPersonaDisplayInfo(personaKey).imagePath;
}

export function getPersonaColor(personaKey: string): string {
  return getPersonaDisplayInfo(personaKey).color;
}