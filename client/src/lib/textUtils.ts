/**
 * 텍스트에서 마크다운 강조 구문(*text*)을 HTML 강조 태그로 변환합니다.
 * @param text 변환할 텍스트
 * @returns 변환된 텍스트
 */
export function formatMarkdownEmphasis(text: string): string {
  if (!text) return '';
  
  // 마크다운 구문의 앞뒤 공백 처리를 위한 정규식
  const emphasisRegex = /\*([^*]+)\*/g;
  
  // AI 페르소나의 "역할"에 맞는 스타일 강조를 위한 클래스 지정
  // text-primary: 기본 강조색
  // font-medium: 살짝 굵게
  // 현재 애플리케이션에서 사용 중인 강조 스타일과 일치시킴
  return text.replace(emphasisRegex, (match, content) => {
    // 문자열 앞뒤 공백 제거
    const trimmedContent = content.trim();
    
    // 기본 강조 스타일 적용
    return `<em class="font-medium text-primary relative whitespace-nowrap inline-block">
      ${trimmedContent}
      <span class="absolute bottom-0 left-0 w-full h-[2px] bg-primary/20"></span>
    </em>`;
  });
}

/**
 * HTML 문자열을 안전하게 React 컴포넌트에 삽입할 수 있도록 객체로 변환합니다.
 * @param html HTML 문자열
 * @returns dangerouslySetInnerHTML 객체
 */
export function createMarkup(html: string) {
  return { __dangerouslySetInnerHTML: { __html: html } };
}