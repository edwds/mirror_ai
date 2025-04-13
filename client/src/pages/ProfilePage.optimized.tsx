import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/Icons";
import { Separator } from "@/components/ui/separator";
import { UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PhotoAnalysisCard from "@/components/PhotoAnalysisCard";
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePhotoAnalyses } from '@/hooks/usePhotoAnalyses';

// 빈 상태 컴포넌트 (메모이제이션 적용)
const EmptyState = React.memo(({ message }: { message: string }) => {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
        <UserIcon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-slate-600 mb-4 max-w-md mx-auto">{message}</p>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// Main component
const ProfilePage: React.FC = () => {
  const params = useParams();
  const userId = params.id ? parseInt(params.id) : 0;
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // 커스텀 훅을 통한 사용자 정보 로드
  const {
    user,
    isLoading: userLoading,
    error: userError
  } = useUserProfile(userId);
  
  // 커스텀 훅을 통한 사진/분석 데이터 로드
  const {
    analysisCards,
    isLoading: photosLoading,
    isError,
    hasMore,
    loadNextPage,
    page,
    totalPages,
    togglePhotoVisibility,
    toggleAnalysisHidden,
    deleteAnalysis,
  } = usePhotoAnalyses(userId);
  
  // 로딩 상태 통합
  const isLoading = userLoading || photosLoading;
  
  // 무한 스크롤 관련 설정
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  
  // 메모이제이션 적용된 로더 콜백
  const loaderRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !hasMore) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadNextPage();
      }
    }, { threshold: 0.1 });
    
    observerRef.current.observe(node);
  }, [hasMore, isLoading, loadNextPage]);
  
  // 웹사이트 URL 메모이제이션
  const websites = useMemo(() => {
    if (!user) return [];
    
    const links = [];
    
    if (user.websiteUrl1) {
      links.push({
        url: user.websiteUrl1,
        label: user.websiteLabel1 || user.websiteUrl1.replace(/^https?:\/\//, '')
      });
    }
    
    if (user.websiteUrl2) {
      links.push({
        url: user.websiteUrl2,
        label: user.websiteLabel2 || user.websiteUrl2.replace(/^https?:\/\//, '')
      });
    }
    
    return links;
  }, [user]);
  
  // 에러 처리
  if (!isLoading && !userId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <EmptyState message={t('profile.userNotFound')} />
        </div>
      </div>
    );
  }
  
  if (!isLoading && userError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <EmptyState message={t('profile.errorLoading')} />
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* 프로필 영역 */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* 프로필 이미지 */}
            <div className="flex-shrink-0">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-md">
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user?.displayName || t('profile.user')} 
                    className="w-full h-full object-cover"
                    loading="lazy" // 이미지 지연 로딩 적용
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <Icons.User className="h-12 w-12 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
            
            {/* 프로필 정보 */}
            <div className="flex-grow space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {user?.displayName || t('profile.anonymous')}
              </h1>
              
              {user?.bio && (
                <p className="text-slate-600 max-w-2xl">
                  {user.bio}
                </p>
              )}
              
              {/* 웹사이트 URL */}
              {websites.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {websites.map((site, index) => (
                    <a 
                      key={index}
                      href={site.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-slate-600 hover:text-primary transition-colors inline-flex items-center"
                    >
                      <Icons.Globe className="h-4 w-4 mr-1" />
                      <span className="text-sm">{site.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* 갤러리 타이틀 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {t('profile.gallery')}
          </h2>
          <p className="text-slate-500">
            {t('profile.galleryDescription', {
              count: analysisCards.length,
              name: user?.displayName || t('profile.thisUser')
            })}
          </p>
        </div>
        
        {/* 분석 그리드 */}
        {analysisCards.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {analysisCards.map(card => (
                <PhotoAnalysisCard
                  key={card.id}
                  card={card}
                  onToggleVisibility={togglePhotoVisibility}
                  onDelete={deleteAnalysis}
                  onToggleHidden={toggleAnalysisHidden}
                />
              ))}
            </div>
            
            {/* 무한 스크롤 로딩 상태 */}
            {hasMore && (
              <div 
                ref={loaderRef} 
                className="w-full p-4 flex justify-center"
              >
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              </div>
            )}
            
            {/* 페이지네이션 정보 */}
            <div className="text-center text-sm text-slate-500 mt-2 mb-8">
              {t('common.page')} {page} / {totalPages || 1}
            </div>
          </>
        ) : (
          // 빈 상태
          <div className="bg-white rounded-xl shadow p-6">
            <EmptyState 
              message={
                isError 
                  ? t('profile.errorLoadingPhotos')
                  : t('profile.noPhotos', { 
                      name: user?.displayName || t('profile.thisUser')
                    })
              } 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;