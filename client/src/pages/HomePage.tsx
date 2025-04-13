import React, { useRef, useEffect, useState, useContext } from "react";
import { Link, useLocation } from "wouter";
import {
  Camera,
  SlidersHorizontal,
  Star,
  Image,
  MessageSquare,
  Layout,
  Globe,
  SunMedium,
  CircleUser,
  ChevronRight,
  Sparkles,
  ArrowRight,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import RadarChart from "@/components/RadarChart";
import { LoginDialog } from "@/components/LoginDialog";

// 분석 예시 카드 컴포넌트
interface ExampleCardProps {
  imageSrc: string;
  title: string;
  score: number;
  category: string;
  tags: string[];
  strength?: string;
  improvement?: string;
}

const ExampleCard: React.FC<ExampleCardProps> = ({
  imageSrc,
  title,
  score,
  category,
  tags,
  strength,
  improvement,
}) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md h-full flex flex-col">
      {/* 1:1 이미지 컨테이너 */}
      <div className="relative overflow-hidden" style={{ paddingTop: "100%" }}>
        <img
          src={imageSrc}
          alt={title}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        {/* 개선된 점수 디스플레이 - 별점 추가 */}
        <div className="absolute top-3 right-3">
          <div className="bg-white/90 text-slate-900 font-bold rounded-xl shadow-md flex flex-col items-center p-2">
            <div className="text-2xl font-bold">{score}</div>
            <div className="flex items-center mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="relative">
                  {/* 빈 별 */}
                  <Star className="h-3 w-3 text-slate-300" fill="none" />
                  {/* 채워진 별 (점수 비율에 따라) */}
                  {i < Math.round((score / 100) * 5) && (
                    <Star
                      className="h-3 w-3 text-amber-500 absolute top-0 left-0"
                      fill="currentColor"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 그라데이션 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-white font-bold text-xl line-clamp-1 text-left">
              {title}
            </h3>

            {/* 태그 컨테이너 */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 카드 내용 - 텍스트 좌측 정렬 */}
      <div className="p-5 bg-white border-t border-slate-100 flex-grow">
        {strength && (
          <div className="flex items-start mb-3">
            <div className="flex-shrink-0 mt-1 mr-2.5 rounded-full bg-green-50 p-1 border border-green-100">
              <Star className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-sm text-slate-700 text-left">{strength}</p>
          </div>
        )}
        {improvement && (
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1 mr-2.5 rounded-full bg-blue-50 p-1 border border-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-sm text-slate-700 text-left">{improvement}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 메인 페이지 컴포넌트
const HomePage: React.FC = () => {
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 스크롤 위치 추적을 위한 상태
  const [scrollY, setScrollY] = useState(0);
  const [showNavbar, setShowNavbar] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // 스크롤 위치에 따라 내비바 표시 여부 결정
  useEffect(() => {
    const handleScrollPosition = () => {
      setScrollY(window.scrollY);

      // 히어로 섹션 높이 (뷰포트 높이의 90%)
      const heroHeight = window.innerHeight * 0.9;

      // 히어로 섹션을 넘어갔는지 확인
      setShowNavbar(window.scrollY > heroHeight);
    };

    // 스크롤 이벤트 리스너 추가
    window.addEventListener("scroll", handleScrollPosition);

    // 초기 스크롤 위치 확인
    handleScrollPosition();

    return () => {
      window.removeEventListener("scroll", handleScrollPosition);
    };
  }, []);

  // 컴포넌트가 마운트될 때와 비활성 시간 후 자동 스크롤 시작
  useEffect(() => {
    setIsAutoScrolling(true);

    // 일정 시간 동안 스크롤 없을 때 자동 스크롤 재개
    const handleInactivity = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsAutoScrolling(true);
      }, 1000); // 1초 동안 스크롤 없으면 자동 스크롤 시작
    };

    // 이벤트 리스너 등록
    window.addEventListener("load", handleInactivity);

    return () => {
      window.removeEventListener("load", handleInactivity);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 사용자 인터랙션에 따른 자동 스크롤 제어
  const handleMouseEnter = () => {
    setIsAutoScrolling(false);
  };

  const handleMouseLeave = () => {
    // 마우스가 떠나면 1초 후 자동 스크롤 재개
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
    }, 1000);
  };

  const handleScroll = () => {
    // 사용자가 스크롤하면 자동 스크롤 중지
    setIsAutoScrolling(false);

    // 스크롤 타임아웃 재설정
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
    }, 1000);
  };

  // 자동 스크롤 CSS 클래스 동적 적용
  useEffect(() => {
    if (!marqueeRef.current) return;

    if (isAutoScrolling) {
      marqueeRef.current.classList.add("auto-scroll");
      marqueeRef.current.classList.remove("paused");
    } else {
      marqueeRef.current.classList.add("paused");
      marqueeRef.current.classList.remove("auto-scroll");
    }
  }, [isAutoScrolling]);

  return (
    <main className="bg-slate-50 min-h-screen">
      {/* 스크롤 이후 표시되는 고정 내비바 */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="bg-white/95 backdrop-blur-sm shadow-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* 로고 */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <h1 className="text-2xl font-bold text-primary">
                    mirror<span className="text-purple-600">.</span>
                  </h1>
                </Link>
              </div>

              {/* 오른쪽 영역 - 언어 선택기 및 로그인 버튼 */}
              <div className="flex items-center space-x-4">
                <LanguageSelector isResultsPage={false} />
                {!user ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={login}
                    className="bg-slate-100 hover:bg-slate-200"
                  >
                    {t("common.login")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/my")}
                    className="bg-slate-50 hover:bg-slate-100 flex items-center"
                  >
                    {user.displayName || t("common.account")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Dynamic design with animated background */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 opacity-90 z-0 animate-gradient-x"></div>

        {/* Animated background particles */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-pattern-grid opacity-20"></div>
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="floating-element absolute top-[10%] left-[15%] w-24 h-24 rounded-full bg-purple-500/10 blur-xl"></div>
          <div className="floating-element-reverse absolute top-[20%] right-[20%] w-32 h-32 rounded-full bg-indigo-500/10 blur-xl"></div>
          <div className="floating-element absolute bottom-[15%] left-[25%] w-40 h-40 rounded-full bg-indigo-500/10 blur-xl"></div>
          <div className="floating-element-reverse absolute bottom-[30%] right-[10%] w-36 h-36 rounded-full bg-purple-500/10 blur-xl"></div>
        </div>

        {/* 상단 헤더에 로그인 버튼 추가 */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <h1 className="text-2xl font-bold text-white">
                    mirror<span className="text-purple-300">.</span>
                  </h1>
                </Link>
              </div>

              {/* 오른쪽 상단 영역 - 언어 선택기 및 로그인 버튼 */}
              <div className="flex items-center space-x-4">
                <LanguageSelector isResultsPage={true} />
                {!user ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={login}
                    className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50"
                  >
                    {t("common.login")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/my")}
                    className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 flex items-center"
                  >
                    {user.displayName || t("common.account")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full relative z-10">
          <div className="text-center text-white">
            {/* 1. 로고 - 호버 효과 제거 */}
            <div className="mb-8 pt-16">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight inline-block">
                <span className="logo-text relative">
                  mirror<span className="text-purple-300">.</span>
                  <div className="absolute -inset-1 border-2 border-purple-300/30 rounded-lg blur opacity-30"></div>
                </span>
              </h1>
            </div>

            {/* 2. 태그라인 - 모바일 환경을 위한 마진 추가 */}
            <p className="text-xl md:text-3xl font-light text-white/90 mb-8 animate-fade-in-up mx-4">
              Elevate your photography with AI-powered image analysis
            </p>

            {/* 3. Analyze Your Photo 버튼 - 그라데이션 애니메이션 추가 */}
            <div className="mb-12">
              {user ? (
                <Link href="/upload">
                  <Button
                    size="lg"
                    className="animate-gradient-button text-white text-lg px-10 py-7 text-xl font-medium border-none"
                  >
                    {t("common.startAnalyzing")}
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="animate-gradient-button text-white text-lg px-10 py-7 text-xl font-medium border-none"
                  onClick={() => setShowLoginDialog(true)}
                >
                  {t("common.startAnalyzing")}
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              )}
            </div>

            {/* 4. 샘플 평가 카드 - 사용자 요청에 따라 수정된 자동 스크롤 */}
            <div className="max-w-full overflow-hidden">
              <div className="marquee-container">
                <div
                  className={`flex gap-4 marquee ${isAutoScrolling ? "auto-scroll" : "paused"}`}
                  ref={marqueeRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onScroll={handleScroll}
                >
                  {/* 예시 카드 반복 */}
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
                      title="Mountain Sunset"
                      score={89}
                      category="Landscape"
                      tags={["mountains", "sunset", "nature"]}
                      strength="Excellent use of golden hour light and layered mountain silhouettes."
                      improvement="A little more space above the peaks would improve the composition."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
                      title="Vibrant Salad"
                      score={92}
                      category="Food"
                      tags={["culinary", "healthy", "colorful"]}
                      strength="Vibrant colors and perfect composition showcase freshness beautifully."
                      improvement="Add side lighting to enhance textures in the vegetables."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1494790108377-be9c29b29330"
                      title="Natural Portrait"
                      score={95}
                      category="Portrait"
                      tags={["portrait", "light", "expression"]}
                      strength="Soft natural light and authentic expression capture personality beautifully."
                      improvement="Slightly more background blur would increase subject isolation."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1447752875215-b2761acb3c5d"
                      title="Forest Light"
                      score={88}
                      category="Nature"
                      tags={["forest", "sunlight", "morning"]}
                      strength="Beautiful light rays create depth and atmosphere in the forest scene."
                      improvement="A stronger focal point would guide the viewer's eye better."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1542038784456-1ea8e935640e"
                      title="Cityscape Dusk"
                      score={91}
                      category="Urban"
                      tags={["cityscape", "dusk", "skyline"]}
                      strength="Excellent timing capturing the blue hour with balanced city lights."
                      improvement="A slight crop from the bottom would strengthen the composition."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1455156218388-5e61b526818b"
                      title="Snowy Mountains"
                      score={87}
                      category="Landscape"
                      tags={["winter", "mountains", "snow"]}
                      strength="Beautiful contrast between snow and sky creates a clean, minimal aesthetic."
                      improvement="Consider including a foreground element for added depth."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1551316679-9c6ae9dec224"
                      title="Street Portrait"
                      score={94}
                      category="Portrait"
                      tags={["street", "urban", "portrait"]}
                      strength="Excellent subject isolation with balanced natural lighting."
                      improvement="A slightly lower camera angle would create more impact."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1560759226-14da22a643ef"
                      title="Summer Cocktail"
                      score={90}
                      category="Food"
                      tags={["drink", "cocktail", "summer"]}
                      strength="Perfect lighting and styling creates an inviting, refreshing feel."
                      improvement="Slightly more separation between subject and background would help."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1502082553048-f009c37129b9"
                      title="Autumn Forest"
                      score={93}
                      category="Nature"
                      tags={["autumn", "forest", "foliage"]}
                      strength="Beautiful warm tones and excellent depth through the forest path."
                      improvement="Slight vignetting would enhance the magical atmosphere."
                    />
                  </div>

                  {/* 첫 번째 카드들 반복 추가 (무한 루프를 위한 복제) */}
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
                      title="Mountain Sunset"
                      score={89}
                      category="Landscape"
                      tags={["mountains", "sunset", "nature"]}
                      strength="Excellent use of golden hour light and layered mountain silhouettes."
                      improvement="A little more space above the peaks would improve the composition."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
                      title="Vibrant Salad"
                      score={92}
                      category="Food"
                      tags={["culinary", "healthy", "colorful"]}
                      strength="Vibrant colors and perfect composition showcase freshness beautifully."
                      improvement="Add side lighting to enhance textures in the vegetables."
                    />
                  </div>
                  <div className="w-64 flex-shrink-0">
                    <ExampleCard
                      imageSrc="https://images.unsplash.com/photo-1494790108377-be9c29b29330"
                      title="Natural Portrait"
                      score={95}
                      category="Portrait"
                      tags={["portrait", "light", "expression"]}
                      strength="Soft natural light and authentic expression capture personality beautifully."
                      improvement="Slightly more background blur would increase subject isolation."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. 설명 문구 - 모바일 환경을 위한 마진 추가 */}
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-white/80 mt-10 px-4">
              Composition, lighting, color, focus, and creativity - get
              professional analysis and improvement tips for every aspect of
              your photos
            </p>
          </div>
        </div>
      </section>

      {/* Persona Analysis Section */}
      <section className="py-16 bg-gradient-to-b from-purple-900 to-indigo-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Personalized Analysis Experience
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Choose your preferred feedback style from our unique AI personas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Viktor - Brutal Critic */}
            <div className="bg-gradient-to-r from-red-700 to-gray-800 rounded-xl p-6 shadow-xl transform transition hover:scale-105">
              <div className="flex flex-col items-center">
                <div className="h-32 w-32 mb-4 relative overflow-hidden">
                  <img 
                    src="/images/viktor-removebg.png" 
                    alt="Viktor" 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Viktor</h3>
                <p className="text-sm text-white/70 mb-4">The Brutal Critic</p>
                <p className="text-center text-sm">
                  Precise, technical evaluation with no sugarcoating. Viktor delivers hard truths for serious improvement.
                </p>
              </div>
            </div>

            {/* Eva - Insta Snob */}
            <div className="bg-gradient-to-tr from-amber-400 to-pink-500 rounded-xl p-6 shadow-xl transform transition hover:scale-105">
              <div className="flex flex-col items-center">
                <div className="h-32 w-32 mb-4 relative overflow-hidden">
                  <img 
                    src="/images/eva-removebg.png" 
                    alt="Eva" 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Eva</h3>
                <p className="text-sm text-white/70 mb-4">The Insta Snob</p>
                <p className="text-center text-sm">
                  Social media focused evaluation with trendy aesthetic guidelines for maximum engagement.
                </p>
              </div>
            </div>

            {/* Noel - Film Bro */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-slate-500 rounded-xl p-6 shadow-xl transform transition hover:scale-105">
              <div className="flex flex-col items-center">
                <div className="h-32 w-32 mb-4 relative overflow-hidden">
                  <img 
                    src="/images/noel-removebg.png" 
                    alt="Noel" 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Noel</h3>
                <p className="text-sm text-white/70 mb-4">The Film Enthusiast</p>
                <p className="text-center text-sm">
                  Cinematic perspective with references to film techniques and artistic composition.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-white/80 max-w-3xl mx-auto mb-6">
              And more personalities to discover! Each persona offers a unique perspective on your photos.
            </p>
            <Button 
              variant="outline" 
              size="lg"
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
              onClick={() => window.location.href='/upload'}
            >
              Try Persona Analysis
            </Button>
          </div>
        </div>
      </section>

      {/* Analysis Categories Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Comprehensive Photo Analysis
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We thoroughly analyze every element of your photo to provide
              specific, actionable feedback
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 sm:gap-x-4 md:gap-x-5 gap-y-6">
            {/* Category 1: Composition */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow card-float">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <Layout className="h-6 w-6 md:h-7 md:w-7 text-slate-700" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                Composition
              </h3>
              <p className="text-sm md:text-base text-slate-600">
                Evaluates framing, rule of thirds, balance, symmetry, leading
                lines, and overall visual structure.
              </p>
            </div>

            {/* Category 2: Lighting */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow card-float">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                <SunMedium className="h-6 w-6 md:h-7 md:w-7 text-amber-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                Lighting
              </h3>
              <p className="text-sm md:text-base text-slate-600">
                Assesses exposure, contrast, highlights, shadows, and overall
                lighting techniques.
              </p>
            </div>

            {/* Category 3: Color */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow card-float">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Image className="h-6 w-6 md:h-7 md:w-7 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                Color
              </h3>
              <p className="text-sm md:text-base text-slate-600">
                Evaluates color harmony, contrast, saturation, tone, and overall
                color composition.
              </p>
            </div>

            {/* Category 4: Focus/Sharpness */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow card-float">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                <SlidersHorizontal className="h-6 w-6 md:h-7 md:w-7 text-teal-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                Focus & Sharpness
              </h3>
              <p className="text-sm md:text-base text-slate-600">
                Evaluates focus points, depth of field, sharpness, noise levels,
                and camera settings.
              </p>
            </div>

            {/* Category 5: Creativity */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow card-float">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-violet-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                Creativity
              </h3>
              <p className="text-sm md:text-base text-slate-600">
                Evaluates originality, expressiveness, emotional impact,
                storytelling, and artistic merit.
              </p>
            </div>

            {/* Category 6: Multilingual Support */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow card-float">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 md:h-7 md:w-7 text-indigo-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                Multilingual
              </h3>
              <p className="text-sm md:text-base text-slate-600">
                Provides analysis results in 14 languages including English,
                Japanese, Korean, Chinese, and European languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Example Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Detailed Analysis Results
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Visual data and specific feedback help you improve your
              photography skills
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 max-w-5xl mx-auto">
            {/* Results Header - Simplified Design */}
            <div className="bg-slate-800 text-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Analysis Results</h3>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-xl font-bold">
                  89
                </div>
              </div>
            </div>

            {/* Radar Chart and Analysis Example */}
            <div className="flex flex-col md:flex-row">
              {/* Radar Chart (Visual Element) */}
              <div className="md:w-1/2 p-6 border-r border-slate-200">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Category Evaluation
                </h4>
                <div className="aspect-square max-w-xs mx-auto bg-slate-50 rounded-xl flex items-center justify-center p-4">
                  {/* Using the actual RadarChart component */}
                  <RadarChart
                    scores={{
                      composition: 85,
                      lighting: 92,
                      color: 88,
                      focus: 90,
                      creativity: 78,
                    }}
                    size={250}
                  />
                </div>
              </div>

              {/* Analysis Content */}
              <div className="md:w-1/2 p-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Strengths & Areas for Improvement
                </h4>

                {/* Strengths Section */}
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                      <Star className="h-4 w-4 text-green-600" />
                    </div>
                    <h5 className="font-medium text-slate-900">Strengths</h5>
                  </div>
                  <ul className="pl-8 list-disc text-slate-700 space-y-1">
                    <li>
                      Excellent use of natural light creates soft, flattering
                      illumination
                    </li>
                    <li>
                      Rich colors and harmonious tones enhance the visual appeal
                    </li>
                    <li>
                      Subject is sharply in focus with great clarity and
                      precision
                    </li>
                  </ul>
                </div>

                {/* Improvement Section */}
                <div>
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <h5 className="font-medium text-slate-900">
                      Areas for Improvement
                    </h5>
                  </div>
                  <ul className="pl-8 list-disc text-slate-700 space-y-1">
                    <li>
                      Add foreground elements to the composition to create more
                      depth
                    </li>
                    <li>
                      Slightly reduce exposure in the highlights to preserve
                      more detail
                    </li>
                    <li>
                      Consider adding subtle vignetting to draw more focus to
                      the subject
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Page Showcase - Portfolio & Archive Features */}
      <section className="py-20 bg-gradient-to-b from-slate-100 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Your Personal Photography Archive
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Track your progress and review all your analysis results in one place
            </p>
          </div>

          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Profile Page Preview */}
            <div className="p-6 md:p-10 flex flex-col lg:flex-row gap-8">
              {/* Left: Portfolio Description */}
              <div className="lg:w-1/2 flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Your Photography Analysis Archive</h3>
                
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1 mr-3 p-1 rounded-full bg-primary/10">
                      <Image className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-slate-700">View all your analyzed photos at a glance and track your improvement over time</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1 mr-3 p-1 rounded-full bg-primary/10">
                      <LineChart className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-slate-700">Access detailed category scores and image data whenever you need them</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1 mr-3 p-1 rounded-full bg-primary/10">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-slate-700">Gain insights into your strengths and areas for improvement to develop your photography style</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1 mr-3 p-1 rounded-full bg-primary/10">
                      <SlidersHorizontal className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-slate-700">Sort by date or score to view your analysis results the way you prefer</p>
                  </li>
                </ul>
                
                <div className="mt-8">
                  <Button 
                    onClick={() => user ? navigate("/my") : setShowLoginDialog(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    View My Portfolio
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Right: Portfolio Page Image */}
              <div className="lg:w-1/2">
                <div className="bg-slate-100 rounded-xl overflow-hidden shadow-md">
                  {/* Portfolio Page Preview - Card Grid */}
                  <div className="p-5 bg-white">
                    {/* Sample Profile Header */}
                    <div className="mb-6">
                      <h4 className="text-xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 text-transparent bg-clip-text">
                        Jane Smith <span className="text-slate-500 text-sm font-normal">Photographer</span>
                      </h4>
                    </div>
                    
                    {/* Sample Photo Analysis Card Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Analysis Card Example 1 */}
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
                        <div className="relative aspect-square bg-slate-100">
                          <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm px-2 py-1 text-xs font-bold">
                            91
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="h-1.5 w-20 bg-slate-200 rounded mb-1"></div>
                          <div className="h-1.5 w-14 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      
                      {/* Analysis Card Example 2 */}
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
                        <div className="relative aspect-square bg-slate-200">
                          <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm px-2 py-1 text-xs font-bold">
                            86
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="h-1.5 w-16 bg-slate-200 rounded mb-1"></div>
                          <div className="h-1.5 w-12 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      
                      {/* Analysis Card Example 3 */}
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
                        <div className="relative aspect-square bg-slate-300">
                          <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm px-2 py-1 text-xs font-bold">
                            94
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="h-1.5 w-20 bg-slate-200 rounded mb-1"></div>
                          <div className="h-1.5 w-10 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      
                      {/* Analysis Card Example 4 */}
                      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
                        <div className="relative aspect-square bg-slate-100">
                          <div className="absolute top-2 right-2 bg-white rounded-lg shadow-sm px-2 py-1 text-xs font-bold">
                            89
                          </div>
                        </div>
                        <div className="p-2">
                          <div className="h-1.5 w-16 bg-slate-200 rounded mb-1"></div>
                          <div className="h-1.5 w-12 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Button Mockup */}
                    <div className="flex justify-center mt-5">
                      <div className="bg-primary text-white py-2 px-4 rounded-full text-xs font-medium shadow-md">
                        New Photo Analysis +
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Vertical Stepper Design */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get professional photo feedback in three simple steps
            </p>
          </div>

          {/* Modern Vertical Stepper */}
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Vertical Line removed as requested */}

              <ol className="relative space-y-8">
                {/* Step 1 */}
                <li className="relative">
                  <div className="flex flex-col items-start">
                    {/* Step content - with gradient accent border */}
                    <div className="flex-1 w-full">
                      <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border-t-4 border-indigo-500">
                        <div className="flex flex-col">
                          <div className="mb-4">
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                              Upload Your Photo
                            </h3>
                          </div>
                          <p className="text-slate-600 text-base md:text-lg">
                            Select and upload any photo you want to be analyzed.
                            Our AI examines composition, lighting, technical
                            details, color, and creative aspects to provide a
                            comprehensive evaluation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

                {/* Step 2 */}
                <li className="relative">
                  <div className="flex flex-col items-start">
                    {/* Step content - with gradient accent border */}
                    <div className="flex-1 w-full">
                      <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border-t-4 border-purple-500">
                        <div className="flex flex-col">
                          <div className="mb-4">
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                              Choose Your Options
                            </h3>
                          </div>
                          <p className="text-slate-600 text-base md:text-lg">
                            Select your preferred interface language for the
                            application and feedback language for the analysis
                            results. Customize your analysis focus and detail
                            level to get the most valuable insights.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

                {/* Step 3 */}
                <li className="relative">
                  <div className="flex flex-col items-start">
                    {/* Step content - with gradient accent border */}
                    <div className="flex-1 w-full">
                      <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border-t-4 border-blue-500">
                        <div className="flex flex-col">
                          <div className="mb-4">
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                              Get Detailed Analysis
                            </h3>
                          </div>
                          <p className="text-slate-600 text-base md:text-lg">
                            Receive comprehensive visual and textual feedback on
                            your photo with category scores, specific strengths,
                            practical improvement suggestions, and technical
                            insights that help you improve your photography
                            skills.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Improve Your Photography?
          </h2>
          <p className="text-xl text-purple-100 mb-8 mx-auto max-w-3xl">
            Start now and see how AI can help enhance your photography skills.
          </p>
          {user ? (
            <Link href="/upload">
              <Button
                size="lg"
                className="bg-white text-indigo-600 hover:bg-slate-100 text-lg px-8 py-6"
              >
                Start Photo Analysis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="bg-white text-indigo-600 hover:bg-slate-100 text-lg px-8 py-6"
              onClick={() => setShowLoginDialog(true)}
            >
              Start Photo Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>
      
      {/* 로그인 다이얼로그 */}
      <LoginDialog 
        open={showLoginDialog} 
        onOpenChange={setShowLoginDialog} 
        redirectPath="/upload" 
      />
    </main>
  );
};

export default HomePage;
