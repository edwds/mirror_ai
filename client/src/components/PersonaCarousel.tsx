import React, { useState, useEffect, useCallback, memo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import {
  getPersonaDescription,
  getPersonaDialogue,
  getPersonaDisplayInfo,
} from "@/lib/personaUtils";

interface PersonaInfo {
  key: string;
  name: string;
  characterName: string;
  imagePath: string;
  emoji: string;
}

interface PersonaCarouselProps {
  personaInfos: PersonaInfo[];
  selectedPersona: string | null;
  onSelectPersona: (persona: string | null) => void;
  language: "ko" | "en" | "jp";
  onNext?: (selectedKey: string) => void; // ✅ 여기 추가!
}

const PersonaCarousel: React.FC<PersonaCarouselProps> = memo(
  ({ personaInfos, selectedPersona, onSelectPersona, language, onNext }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
      loop: true,
      align: "center",
      containScroll: false,
    });

    const [selectedKey, setSelectedKey] = useState<string | null>(selectedPersona);
    const [centerIndex, setCenterIndex] = useState<number>(0);

    useEffect(() => {
      setSelectedKey(selectedPersona);
      if (selectedPersona && emblaApi) {
        const selectedIndex = personaInfos.findIndex((p) => p.key === selectedPersona);
        if (selectedIndex !== -1) {
          emblaApi.scrollTo(selectedIndex);
        }
      }
    }, [selectedPersona, emblaApi, personaInfos]);

    // 중심 카드 변경 시 자동 선택
    useEffect(() => {
      if (!emblaApi) return;

      const updateSelectedIndex = () => {
        const newIndex = emblaApi.selectedScrollSnap();
        setCenterIndex(newIndex);

        const newKey = personaInfos[newIndex]?.key;
        setSelectedKey(newKey);
        onSelectPersona(newKey);
      };

      emblaApi.on("select", updateSelectedIndex);
      updateSelectedIndex();

      return () => {
        emblaApi.off("select", updateSelectedIndex);
      };
    }, [emblaApi, personaInfos, onSelectPersona]);

    // resize 등에 대응해 재렌더링
    useEffect(() => {
      if (emblaApi) {
        const timer = setTimeout(() => {
          emblaApi.reInit();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [emblaApi]);

    // 카드 클릭 시: 해당 카드로 스크롤 + 선택
    const handleCardClick = useCallback(
      (personaKey: string, index: number) => {
        if (!emblaApi) return;
        emblaApi.scrollTo(index);
        setSelectedKey(personaKey);
        onSelectPersona(personaKey);
      },
      [emblaApi, onSelectPersona],
    );

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    return (
      <div className="relative w-full">
        {/* 말풍선 */}
        {selectedKey && personaInfos[centerIndex]?.key === selectedKey && (
          <div
            key={`${selectedKey}-${Date.now()}`} // 매번 새로운 key로 렌더
            className="absolute top-[-30px] left-0 right-0 z-20 flex justify-center opacity-0 translate-y-2 animate-tooltip-fade"
          >
            <div className="relative bg-white shadow-lg rounded-2xl text-sm text-gray-800 border border-slate-200 px-4 py-3 text-center leading-snug min-w-[180px] max-w-[60vw] sm:max-w-md">
              {getPersonaDialogue(selectedKey, language)?.onSelectMessage}
              <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
            </div>
          </div>
        )}
        {/* 좌우 버튼 */}
        <div className="absolute top-1/2 left-0 md:left-[-20px] -translate-y-1/2 z-30 hidden md:block">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={scrollPrev}
            disabled={!emblaApi?.canScrollPrev()}
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
        </div>
        <div className="absolute top-1/2 right-0 md:right-[-20px] -translate-y-1/2 z-30 hidden md:block">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={scrollNext}
            disabled={!emblaApi?.canScrollNext()}
          >
            <ChevronRight className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* ✅ 왼쪽 그라데이션 */}
        <div className="hidden md:block pointer-events-none absolute top-0 left-0 h-full w-28 z-10 bg-gradient-to-r from-white to-transparent" />

        {/* ✅ 오른쪽 그라데이션 */}
        <div className="hidden md:block pointer-events-none absolute top-0 right-0 h-full w-28 z-10 bg-gradient-to-l from-white to-transparent" />
        
        {/* 캐러셀 */}
        <div className="overflow-hidden pb-20 pt-12" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {personaInfos.map((persona, index) => {
              const isSelected = selectedKey === persona.key;
              const personaInfo = getPersonaDisplayInfo(persona.key);
              const dialogue = getPersonaDialogue(persona.key, language);
              const personaColor =
                personaInfo.color || "bg-gradient-to-r from-indigo-600 to-indigo-300";

              return (
                <div
                  key={`${persona.key}-${index}`}
                  className="px-2 flex-[0_0_auto] w-[280px] min-w-0"
                >
                  <div
                    className={clsx(
                      "rounded-2xl overflow-hidden shadow-md transition-all duration-300 cursor-pointer border w-full",
                      "flex flex-col items-center text-center px-5 py-5",isSelected ? "h-[400px] -translate-y-[30px]" : "h-[340px] translate-y-0",
                      {
                        [personaColor]: isSelected,
                        "text-white": isSelected,
                        "bg-white text-slate-800 border-slate-200 hover:shadow-lg": !isSelected,
                      },
                    )}
                    onClick={() => handleCardClick(persona.key, index)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Select ${persona.characterName}`}
                  >
                    {/* 타입 뱃지 */}
                    {!isSelected && (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 mb-3 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                        <span>{persona.emoji}</span>
                        <span>{persona.name}</span>
                      </div>
                    )}

                    {/* 이미지 */}
                      <div
                        className={clsx(
                          "mb-3 flex items-center justify-center",
                          isSelected
                            ? "w-44 h-44 mt-1"
                            : "w-36 h-36"
                        )}
                      >
                      <img
                        loading="lazy"
                        src={persona.imagePath}
                        alt={persona.characterName}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    {/* 이름 */}
                    <div className="font-extrabold text-2xl leading-tight mb-1">
                      {persona.characterName}
                    </div>

                    {/* 설명 */}
                    <div className="text-s leading-snug font-medium mb-5 opacity-50">
                      {dialogue?.introMessage}
                    </div>

                    {/* NEXT 버튼: 선택 + 중앙 위치일 때만 표시 */}
                    {isSelected && centerIndex === index && (
                      <div className="mt-auto mb-4">
                        <button
                          onClick={() => onNext?.(selectedKey)}
                          className="px-6 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-all shadow-md"
                        >
                          NEXT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
    );
  },
);

PersonaCarousel.displayName = "PersonaCarousel";

export default PersonaCarousel;