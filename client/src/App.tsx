import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, lazy, Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import { AuthProvider } from "./contexts/AuthContext";

// Import essential components
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import PageLoader from "./components/PageLoader";

// Import the HomePage directly since it's the entry point
import HomePage from "@/pages/HomePage";

// Lazy load all other pages for better performance
const UploadPage = lazy(() => import("@/pages/UploadPage"));
const OptionsPage = lazy(() => import("@/pages/OptionsPage"));
const LoadingPage = lazy(() => import("@/pages/LoadingPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));
const AnalysisPage = lazy(() => import("@/pages/AnalysisPage"));
const MyPage = lazy(() => import("@/pages/MyPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProfileEditPage = lazy(() => import("@/pages/ProfileEditPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const CameraPhotosPage = lazy(() => import("@/pages/CameraPhotosPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  // Use pathname to conditionally show the Footer only on homepage
  const [pathname, setPathname] = useState(window.location.pathname);
  
  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleLocationChange);
    
    // Observe route changes
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
    };
  }, []);
  
  // These pages should include their own navigation and footer
  const selfContainedPages = ['/terms', '/privacy', '/results', '/results/', '/my', '/analysis', '/analyses'];
  // Add logic to detect if URL starts with /results/ for shared results
  const isResultsPage = pathname.startsWith('/results/') || pathname === '/results';
  const isHomePage = pathname === '/';
  // 명시적으로 상단 내비게이션이 항상 표시되어야 하는 페이지들
  const pagesWithNavigation = ['/upload', '/options', '/analyzing', '/profile'];
  const shouldShowNavigation = pagesWithNavigation.some(page => pathname.startsWith(page));
  const isSelfContainedPage = selfContainedPages.includes(pathname) || isResultsPage;
  
  return (
    <>
      <ScrollToTop />
      {(!isHomePage && !isSelfContainedPage) || shouldShowNavigation ? <Navigation /> : null}
      
      <Switch>
        {/* Render HomePage directly without Suspense for initial performance */}
        <Route path="/" component={HomePage} />
        
        {/* Lazy load all other routes */}
        <Route path="/upload">
          <Suspense fallback={<PageLoader />}>
            <UploadPage />
          </Suspense>
        </Route>
        <Route path="/options">
          <Suspense fallback={<PageLoader />}>
            <OptionsPage />
          </Suspense>
        </Route>
        <Route path="/analyzing">
          <Suspense fallback={<PageLoader />}>
            <LoadingPage />
          </Suspense>
        </Route>
        <Route path="/results/:id?">
          <Suspense fallback={<PageLoader />}>
            <ResultsPage />
          </Suspense>
        </Route>
        <Route path="/analyses/:id?">
          <Suspense fallback={<PageLoader />}>
            <AnalysisPage />
          </Suspense>
        </Route>
        {/* 이전 경로도 지원하여 하위 호환성 유지 */}
        <Route path="/analysis/:id?">
          <Suspense fallback={<PageLoader />}>
            <AnalysisPage />
          </Suspense>
        </Route>
        <Route path="/my">
          <Suspense fallback={<PageLoader />}>
            <MyPage />
          </Suspense>
        </Route>
        <Route path="/profile/edit">
          <Suspense fallback={<PageLoader />}>
            <ProfileEditPage />
          </Suspense>
        </Route>
        <Route path="/profile/:id">
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        </Route>
        <Route path="/admin">
          <Suspense fallback={<PageLoader />}>
            <AdminPage />
          </Suspense>
        </Route>
        <Route path="/photos/camera/:cameraModel">
          <Suspense fallback={<PageLoader />}>
            <CameraPhotosPage />
          </Suspense>
        </Route>
        <Route path="/terms">
          <Suspense fallback={<PageLoader />}>
            <TermsPage />
          </Suspense>
        </Route>
        <Route path="/privacy">
          <Suspense fallback={<PageLoader />}>
            <PrivacyPage />
          </Suspense>
        </Route>
        <Route>
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
      
      {isHomePage && <Footer />}
    </>
  );
}

function App() {
  // Monitor user's UI language preference
  useEffect(() => {
    // Look for uiLanguage first (for UI language)
    const uiLang = localStorage.getItem("uiLanguage");
    // Fall back to preferredLanguage (for backward compatibility) or browser language
    const fallbackLang = localStorage.getItem("preferredLanguage") || navigator.language.split("-")[0];
    
    const languageToUse = uiLang || fallbackLang;
    
    if (languageToUse && i18n.languages.includes(languageToUse)) {
      i18n.changeLanguage(languageToUse);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export default App;
