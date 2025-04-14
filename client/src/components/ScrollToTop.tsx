import { useEffect } from 'react';
import { useLocation } from 'wouter';

// 페이지 이동시 스크롤을 맨 위로 리셋하는 컴포넌트
const ScrollToTop: React.FC = () => {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
};

export default ScrollToTop;