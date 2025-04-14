import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  isResultsPage?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  isResultsPage: isResultsPageProp,
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isResultsPage, setIsResultsPage] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [showNavBar, setShowNavBar] = useState(false);

  // Check if we're on the results page
  useEffect(() => {
    const path = window.location.pathname;
    const isResults =
      typeof isResultsPageProp !== "undefined"
        ? isResultsPageProp
        : path.includes("/results") || path.includes("/analyses");
    setIsResultsPage(isResults);

    if (!isResults) {
      setShowNavBar(true);
    }

    const handleLocationChange = () => {
      const newPath = window.location.pathname;
      const newIsResults =
        newPath.includes("/results") || newPath.includes("/analyses");
      setIsResultsPage(newIsResults);

      if (!newIsResults) {
        setShowNavBar(true);
      } else {
        const scrollPosition = window.scrollY;
        const heroHeight = window.innerHeight;
        setShowNavBar(scrollPosition > heroHeight * 0.3);
      }
    };

    window.addEventListener("popstate", handleLocationChange);

    // Monitor pushState
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };

    const handleScroll = () => {
      // Only check scroll position on results page
      if (isResults) {
        // Height of the hero section (viewport height)
        const heroHeight = window.innerHeight;
        const scrollPosition = window.scrollY;

        // Check if scrolled beyond the hero section threshold
        const isPastHero = scrollPosition > heroHeight * 0.8;
        setScrolledPastHero(isPastHero);

        // Only show navbar after some scrolling on results page
        setShowNavBar(scrollPosition > heroHeight * 0.3);
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Initialize scroll position check
    handleScroll();

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("scroll", handleScroll);
      window.history.pushState = originalPushState;
    };
  }, []);

  // Determine the background style for the navbar
  const getNavBarStyles = () => {
    if (!isResultsPage) {
      return 'bg-white shadow-sm';
    }

    if (scrolledPastHero) {
      return 'bg-white shadow-md transition-colors duration-300';
    }

    // ✅ 투명 배경 유지 + 부드러운 전환
    return 'bg-transparent shadow-none transition-colors duration-300';
  };


  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 ${getNavBarStyles()} transition-transform duration-300 ${showNavBar ? "translate-y-0" : "-translate-y-full"}`}
    >
      {/* Gradient background for results page hero section only (with increased opacity) */}
      {isResultsPage && !scrolledPastHero && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 opacity-95 z-0"></div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <h1
                className={`text-2xl font-bold ${isResultsPage && !scrolledPastHero ? "text-white" : "text-primary"}`}
              >
                mirror
                <span
                  className={
                    isResultsPage && !scrolledPastHero
                      ? "text-purple-300"
                      : "text-purple-600"
                  }
                >
                  .
                </span>
              </h1>
            </Link>
          </div>

          {/* Authentication and Language Selector */}
          <div className="flex items-center space-x-4">
            {/* Language Selector (moved before login button) */}
            <LanguageSelector
              isResultsPage={isResultsPage && !scrolledPastHero}
            />

            {/* Auth buttons (now rightmost) */}
            {isLoading ? (
              <div className="w-20 h-9 bg-gray-200 animate-pulse rounded-md"></div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/my")}
                  className={`flex items-center ${isResultsPage && !scrolledPastHero ? "text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50" : "bg-slate-50 hover:bg-slate-100"}`}
                >
                  {user?.displayName || t("common.account")}
                </Button>

                {/* 관리자 페이지 버튼 - 관리자인 경우만 표시 */}
                {user?.id === 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/admin")}
                    className={
                      isResultsPage && !scrolledPastHero
                        ? "text-white hover:bg-white/20"
                        : "text-slate-600 hover:bg-slate-100"
                    }
                    title="관리자 페이지"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-shield"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={login}
                className={
                  isResultsPage && !scrolledPastHero
                    ? "text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50"
                    : "bg-slate-100 hover:bg-slate-200"
                }
              >
                {t("common.login")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
