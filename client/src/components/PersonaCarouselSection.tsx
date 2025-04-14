import React, { useCallback, useEffect } from 'react';
import { Shuffle } from 'lucide-react';
import PersonaCarousel from './PersonaCarousel';
import { personaDisplayInfos } from '@/lib/personaUtils';

interface Props {
  selected: string;
  onSelect: (key: string) => void;
  language: string;
  onNext: (selectedKey: string) => void;
}

const PersonaCarouselSection: React.FC<Props> = ({
  selected,
  onSelect,
  language,
  onNext,
}) => {
  // ✅ 최초 진입 시 무작위 페르소나 선택
  useEffect(() => {
    if (!selected) {
      const personas = personaDisplayInfos.map((p) => p.key);
      const randomKey = personas[Math.floor(Math.random() * personas.length)];
      onSelect(randomKey);
    }
  }, [selected, onSelect]);

  const handleRandomPersona = useCallback(() => {
    const personas = personaDisplayInfos.map((p) => p.key);
    const randomKey = personas[Math.floor(Math.random() * personas.length)];
    onSelect(randomKey);
  }, [onSelect]);

  // PersonaCarousel에 필요한 형태로 데이터 가공
  const personaInfos = personaDisplayInfos.map(p => ({
    key: p.key,
    name: p.name,
    characterName: p.characterName,
    imagePath: p.imagePath,
    emoji: p.emoji
  }));

  return (
    <div className="mb-8">
      {/* 캐러셀 */}
      <PersonaCarousel
        personaInfos={personaInfos}
        selectedPersona={selected}
        onSelectPersona={onSelect}
        language={language as "ko" | "en" | "jp"}
        onNext={onNext}
      />

      {/* 랜덤 버튼 */}
      <button
        type="button"
        onClick={handleRandomPersona}
        className="fixed bottom-4 right-4 z-50 bg-white border border-slate-300 shadow-md rounded-full w-12 h-12 flex items-center justify-center hover:bg-slate-100"
      >
        <Shuffle className="w-5 h-5 text-slate-600" />
      </button>
    </div>
  );
};

export default PersonaCarouselSection;