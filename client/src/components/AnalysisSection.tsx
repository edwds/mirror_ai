import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnalysisText, GenreSpecific } from '@shared/schema';
import { formatMarkdownEmphasis, createMarkup } from '@/lib/textUtils';
import { 
  ThumbsUp, 
  CircleDashed, 
  Lightbulb,
  Layout,
  Camera,
  SlidersHorizontal, 
  Palette, 
  SunMedium,
  Image,
  Sparkles,
  Info,
  Star
} from 'lucide-react';

interface AnalysisSectionProps {
  title: string;
  items: string[] | string | undefined;
  icon: React.ReactNode;
  color: string;
  fallback: string;
  variant?: 'list' | 'paragraph';
}

/**
 * 범용적인 분석 섹션 컴포넌트 - Edwards가 제안한 개선안 기반
 * 다양한 타입의 데이터(배열, 문자열, undefined)를 일관된 방식으로 처리
 */
const AnalysisSection: React.FC<AnalysisSectionProps> = ({ 
  title, 
  items, 
  icon, 
  color, 
  fallback,
  variant = 'list' 
}) => {
  let list: string[] = [];

  // 다양한 데이터 타입 통합 처리
  if (Array.isArray(items)) {
    list = items;
  } else if (typeof items === "string" && items.trim()) {
    // variant가 list인 경우에만 콤마로 분할, paragraph는 원본 텍스트 유지
    if (variant === 'list') {
      // 문자열이 있는 경우 콤마로 구분된 목록이라고 가정하고 분할
      list = items.split("*").map((s) => s.trim()).filter(Boolean);
      
      // 콤마로 분할했을 때 항목이 하나뿐이라면 원본 문자열 사용
      if (list.length <= 1) {
        list = [items.trim()];
      }
    } else {
      // paragraph 타입에서는 원본 텍스트를 그대로 유지
      list = [items.trim()];
    }
  } else if (items) {
    // 다른 타입의 데이터(숫자 등)가 있는 경우 문자열로 변환
    list = [String(items)];
  } else {
    // 데이터가 없는 경우 fallback 메시지 사용
    list = fallback ? [fallback] : [];
  }

  // 내용이 없는 경우 빈 섹션 반환 (선택적: 필요에 따라 주석 해제)
  // if (list.length === 0) return null;

  // 배경색과 텍스트색 CSS 클래스 생성
  const bgClass = `bg-${color}-50`;
  const textClass = `text-${color}-700`;
  const iconColorClass = `text-${color}-600`;

  return (
    <div className={`${bgClass} p-4 rounded-lg`}>
      <h4 className={`${textClass} font-medium mb-2`}>{title}</h4>
      
      {variant === 'list' ? (
        <ul className="space-y-2">
          {list.map((item, index) => (
            <li key={index} className="flex items-start">
              {React.cloneElement(icon as React.ReactElement, {
                size: 16,
                className: `${iconColorClass} mr-2 mt-1 flex-shrink-0`,
              })}
              <span 
                className="text-slate-700" 
                dangerouslySetInnerHTML={{ __html: formatMarkdownEmphasis(item) }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div 
          className="text-slate-700 whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: formatMarkdownEmphasis(list.join('\n\n')) }}
        />
      )}
    </div>
  );
};

/**
 * 기존 AnalysisSection 컴포넌트와의 호환성을 위한 래퍼
 * 기존 코드를 점진적으로 마이그레이션하기 위해 사용
 */
export const LegacyAnalysisSection: React.FC<{
  title: string;
  analysis: AnalysisText | GenreSpecific;
  icon?: 'strengths' | 'improvements' | 'suggestions' | 'composition' | 'technical' | 'color' | 'lighting' | 'genre';
}> = ({ title, analysis, icon }) => {
  const { t } = useTranslation();
  
  // Choose icon based on the section type
  const getIcon = () => {
    switch(icon) {
      case 'strengths':
        return <Star className="h-5 w-5 text-green-600" fill="currentColor" />;
      case 'improvements':
        return <Sparkles className="h-5 w-5 text-amber-600" />;
      case 'suggestions':
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
      case 'composition':
        return <Layout className="h-5 w-5 text-indigo-600" />;
      case 'technical':
        return <SlidersHorizontal className="h-5 w-5 text-slate-600" />;
      case 'color':
        return <Palette className="h-5 w-5 text-purple-600" />;
      case 'lighting':
        return <SunMedium className="h-5 w-5 text-yellow-600" />;
      case 'genre':
        return <Image className="h-5 w-5 text-cyan-600" />;
      default:
        return <Camera className="h-5 w-5 text-primary" />;
    }
  };
  
  // Handle case where analysis might be undefined or missing text
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center mb-4">
          <div className="mr-2 flex-shrink-0 flex items-center justify-center">{getIcon()}</div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <div>
          <p className="text-slate-500 italic">{t('results.noDataAvailable')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-slide-up">
      <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="mr-2 flex-shrink-0 flex items-center justify-center">{getIcon()}</div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">
        {analysis.text ? (
          <div className="prose prose-slate max-w-none">
            <p dangerouslySetInnerHTML={{ __html: formatMarkdownEmphasis(analysis.text) }} />
          </div>
        ) : (
          <p className="text-slate-500 italic">{t('results.noAnalysisText')}</p>
        )}
      </div>
    </div>
  );
};

export default AnalysisSection;
