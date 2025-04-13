import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/Icons";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 외부로 분리한 컴포넌트 임포트
import PhotoAnalysisCard from "@/components/PhotoAnalysisCard";
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePhotoAnalyses } from '@/hooks/usePhotoAnalyses';

// 빈 상태 컴포넌트 - 메모이제이션 적용
const EmptyState = React.memo(({
  message,
  buttonText,
  action,
}: {
  message: string;
  buttonText: string;
  action: () => void;
}) => {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
      <Icons.Image className="h-20 w-20 text-slate-300 mb-6" />
      <h3 className="text-xl font-medium text-slate-900 mb-4">{message}</h3>
      <Button 
        onClick={action} 
        className="mt-6 bg-primary hover:bg-primary/90 text-white border-0 px-6 py-6 h-auto text-lg font-medium transition-all duration-300"
        size="lg"
      >
        <Icons.Plus className="h-5 w-5 mr-3" />
        {buttonText || "New Photo Analysis"}
      </Button>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// 웹사이트 URL 다이얼로그 컴포넌트 - 메모이제이션 적용
const WebsiteUrlsDialog = React.memo(({
  open,
  onOpenChange,
  websiteUrl1,
  websiteUrl2,
  websiteLabel1,
  websiteLabel2,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteUrl1?: string | null;
  websiteUrl2?: string | null;
  websiteLabel1?: string | null;
  websiteLabel2?: string | null;
  onSave: (data: { 
    websiteUrl1?: string, 
    websiteUrl2?: string,
    websiteLabel1?: string,
    websiteLabel2?: string 
  }) => void;
}) => {
  const { t } = useTranslation();
  const [url1, setUrl1] = useState(websiteUrl1 || '');
  const [url2, setUrl2] = useState(websiteUrl2 || '');
  const [label1, setLabel1] = useState(websiteLabel1 || '');
  const [label2, setLabel2] = useState(websiteLabel2 || '');
  
  // 다이얼로그가 열릴 때마다 초기값으로 설정
  useEffect(() => {
    if (open) {
      setUrl1(websiteUrl1 || '');
      setUrl2(websiteUrl2 || '');
      setLabel1(websiteLabel1 || '');
      setLabel2(websiteLabel2 || '');
    }
  }, [open, websiteUrl1, websiteUrl2, websiteLabel1, websiteLabel2]);
  
  // 저장 핸들러
  const handleSave = () => {
    onSave({
      websiteUrl1: url1.trim() || undefined,
      websiteUrl2: url2.trim() || undefined,
      websiteLabel1: label1.trim() || undefined,
      websiteLabel2: label2.trim() || undefined
    });
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profile.websiteUrls', 'Website URLs')}</DialogTitle>
          <DialogDescription>
            {t('profile.websiteUrlsDescription', 'You can add up to 2 website URLs.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('profile.website1', 'Website 1')}</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label1" className="text-right col-span-1">
                {t('profile.displayLabel', 'Display Name')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="label1"
                  value={label1}
                  onChange={(e) => setLabel1(e.target.value)}
                  placeholder={t('profile.labelExample', 'e.g. My Portfolio')}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url1" className="text-right col-span-1">
                URL
              </Label>
              <div className="col-span-3">
                <Input
                  id="url1"
                  value={url1}
                  onChange={(e) => setUrl1(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('profile.website2', 'Website 2')}</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label2" className="text-right col-span-1">
                {t('profile.displayLabel', 'Display Name')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="label2"
                  value={label2}
                  onChange={(e) => setLabel2(e.target.value)}
                  placeholder={t('profile.labelExample', 'e.g. My Instagram')}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url2" className="text-right col-span-1">
                URL
              </Label>
              <div className="col-span-3">
                <Input
                  id="url2"
                  value={url2}
                  onChange={(e) => setUrl2(e.target.value)}
                  placeholder="https://instagram.com/yourusername"
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

WebsiteUrlsDialog.displayName = 'WebsiteUrlsDialog';

// 메인 마이페이지 컴포넌트
const MyPage: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // 편집 모드 (숨김 기능)
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<"score" | "date">("date");
  
  // 웹사이트 URL 다이얼로그 상태
  const [isSocialLinksDialogOpen, setIsSocialLinksDialogOpen] = useState(false);
  
  // 캐싱 및 성능 최적화를 위한 커스텀 훅 사용
  const { 
    user: userProfile, 
    isLoading: profileLoading,
    updateProfile 
  } = useUserProfile();
  
  // 사진 및 분석 데이터를 위한 커스텀 훅 사용
  const {
    analysisCards,
    isLoading: photosLoading,
    hasMore,
    loadNextPage,
    togglePhotoVisibility,
    toggleAnalysisHidden,
    deleteAnalysis,
    resetData
  } = usePhotoAnalyses(undefined, isEditMode);
  
  // 로딩 상태 통합
  const isLoading = authLoading || profileLoading || photosLoading;
  
  // 사용자 프로필 정보 메모이제이션 - 필요할 때만 재계산
  const userInfo = useMemo(() => {
    if (!userProfile) return {
      displayName: '',
      bio: '',
      websiteUrl1: '',
      websiteUrl2: '',
      websiteLabel1: '',
      websiteLabel2: '',
      socialLinks: {}
    };
    
    return {
      displayName: userProfile.displayName || '',
      bio: userProfile.bio || '',
      websiteUrl1: userProfile.websiteUrl1 || '',
      websiteUrl2: userProfile.websiteUrl2 || '',
      websiteLabel1: userProfile.websiteLabel1 || '',
      websiteLabel2: userProfile.websiteLabel2 || '',
      socialLinks: {}
    };
  }, [userProfile]);
  
  // 무한 스크롤을 위한 Intersection Observer 설정
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // 무한 스크롤 로더 참조 콜백 - 메모이제이션 적용
  const loaderRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !hasMore) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadNextPage(); // 커스텀 훅의 함수 호출
      }
    }, { threshold: 0.1 });
    
    observerRef.current.observe(node);
  }, [hasMore, isLoading, loadNextPage]);
  
  // 편집 모드 변경 시 데이터 리셋 및 다시 로드
  useEffect(() => {
    resetData();
  }, [isEditMode, resetData]);
  
  // 비로그인 상태면 홈으로 리디렉션
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
      toast({
        title: t('common.loginRequired'),
        description: t('common.pleaseLoginToView'),
        variant: "destructive",
      });
    }
  }, [isLoading, isAuthenticated, navigate, toast, t]);
  
  // 새 분석 시작
  const startNewAnalysis = useCallback(() => {
    navigate("/upload");
  }, [navigate]);
  
  // 웹사이트 URL 업데이트
  const handleSaveSocialLinks = useCallback((data: {
    websiteUrl1?: string;
    websiteUrl2?: string;
    websiteLabel1?: string;
    websiteLabel2?: string;
  }) => {
    updateProfile({
      websiteUrl1: data.websiteUrl1 || null,
      websiteUrl2: data.websiteUrl2 || null,
      websiteLabel1: data.websiteLabel1 || null,
      websiteLabel2: data.websiteLabel2 || null
    });
  }, [updateProfile]);
  
  // 통계 데이터 계산 메모이제이션
  const stats = useMemo(() => {
    const totalPhotos = analysisCards.length;
    const average = totalPhotos > 0 
      ? (analysisCards.reduce((sum, card) => sum + card.overallScore, 0) / totalPhotos).toFixed(1) 
      : "0.0";
    
    // 카테고리별 점수 집계
    const categoryTotals: Record<string, number> = {};
    analysisCards.forEach(card => {
      Object.entries(card.categoryScores).forEach(([key, value]) => {
        if (!categoryTotals[key]) categoryTotals[key] = 0;
        categoryTotals[key] += value;
      });
    });
    
    // 가장 잘하는 카테고리 찾기
    const categoryEntries = Object.entries(categoryTotals);
    const bestCategory = categoryEntries.length > 0
      ? categoryEntries.sort((a, b) => b[1] - a[1])[0]?.[0]
      : "";
      
    // 개선이 필요한 카테고리 찾기
    const worstCategory = categoryEntries.length > 0
      ? categoryEntries.sort((a, b) => a[1] - b[1])[0]?.[0]
      : "";
      
    const categoryLabels: Record<string, string> = {
      composition: t('analysis.composition', '구도'),
      lighting: t('analysis.lighting', '조명'),
      color: t('analysis.color', '색감'),
      focus: t('analysis.focus', '초점'),
      creativity: t('analysis.creativity', '창의성')
    };
    
    return {
      totalPhotos,
      averageScore: average,
      bestCategory: categoryLabels[bestCategory] || "-",
      worstCategory: categoryLabels[worstCategory] || "-",
    };
  }, [analysisCards, t]);
  
  // 정렬된 분석 카드 메모이제이션
  const sortedAnalysisCards = useMemo(() => {
    return [...analysisCards].sort((a, b) => {
      if (sortOrder === "score") {
        return b.overallScore - a.overallScore;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [analysisCards, sortOrder]);
  
  if (isLoading || !isAuthenticated) {
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
          <div className="flex flex-col gap-4">
            {/* 프로필 정보 영역 */}
            <div className="flex justify-between items-start mb-1">
              <div className="space-y-1">
                <h1 className="text-4xl font-black leading-tight">
                  <span className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 text-transparent bg-clip-text bg-size-200 animate-gradient">{userInfo.displayName || t('profile.anonymous', 'User')}</span>
                </h1>
                
                {/* 자기소개 - 더 크게 표시하고 닉네임과 간격 줄임 */}
                <p className="text-slate-700 text-base max-w-xl leading-relaxed pt-1">
                  {userInfo.bio || t('profile.photographer', 'Photographer')}
                </p>
              </div>
              
              {/* 프로필 작업 버튼 - 레이블 없이 아이콘만 */}
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-9 h-9 text-slate-600"
                  onClick={() => { /* 프로필 공유 기능 */ }}
                >
                  <Icons.Share className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-9 h-9 text-slate-600"
                  onClick={() => navigate(`/profile/edit`)}
                >
                  <Icons.Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* 웹사이트 URL */}
            <div className="flex flex-wrap items-center gap-3">
              {(userInfo.websiteUrl1 || userInfo.websiteUrl2) ? (
                <>
                  {userInfo.websiteUrl1 && (
                    <a 
                      href={userInfo.websiteUrl1} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-slate-600 hover:text-primary transition-colors inline-flex items-center"
                    >
                      <Icons.Globe className="h-4 w-4 mr-1" />
                      <span className="text-sm truncate max-w-[200px]">
                        {userInfo.websiteLabel1 || userInfo.websiteUrl1.replace(/^https?:\/\//, '')}
                      </span>
                    </a>
                  )}
                  {userInfo.websiteUrl2 && (
                    <a 
                      href={userInfo.websiteUrl2} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-slate-600 hover:text-primary transition-colors inline-flex items-center"
                    >
                      <Icons.Globe className="h-4 w-4 mr-1" />
                      <span className="text-sm truncate max-w-[200px]">
                        {userInfo.websiteLabel2 || userInfo.websiteUrl2.replace(/^https?:\/\//, '')}
                      </span>
                    </a>
                  )}
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-500 hover:text-primary transition-colors"
                  onClick={() => setIsSocialLinksDialogOpen(true)}
                >
                  <Icons.Plus className="h-3 w-3 mr-1" />
                  {t('profile.addWebsite')}
                </Button>
              )}
              
              {(userInfo.websiteUrl1 || userInfo.websiteUrl2) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-500 hover:text-primary transition-colors"
                  onClick={() => setIsSocialLinksDialogOpen(true)}
                >
                  <Icons.Edit className="h-3 w-3 mr-1" />
                  {t('profile.editLinks')}
                </Button>
              )}
            </div>
          </div>
          
          {/* 통계 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-lg font-bold">{stats.totalPhotos}</div>
              <div className="text-sm text-slate-500">{t('myPage.totalPhotos')}</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-lg font-bold">{stats.averageScore}</div>
              <div className="text-sm text-slate-500">{t('myPage.averageScore')}</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-lg font-bold">{stats.bestCategory}</div>
              <div className="text-sm text-slate-500">{t('myPage.bestCategory')}</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-lg font-bold">{stats.worstCategory}</div>
              <div className="text-sm text-slate-500">{t('myPage.improveCategory')}</div>
            </div>
          </div>
        </div>
        
        {/* 사진 리스트 영역 */}
        <div className="mb-6">
          <div className="mb-6">
            {/* 사진 리스트 헤더 */}
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* 좌측: 정렬 옵션 */}
              <div className="flex items-center gap-2">
                <Select
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value as "score" | "date")}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('myPage.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">{t('myPage.sortByDate')}</SelectItem>
                    <SelectItem value="score">{t('myPage.sortByScore')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 우측: 작업 버튼 */}
              <div className="flex items-center gap-2">
                <Button 
                  variant={isEditMode ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="text-sm"
                >
                  {isEditMode ? (
                    <>
                      <Icons.Check className="h-4 w-4 mr-1" />
                      {t('myPage.doneEditing')}
                    </>
                  ) : (
                    <>
                      <Icons.Edit className="h-4 w-4 mr-1" />
                      {t('myPage.editVisibility')}
                    </>
                  )}
                </Button>
                <Button onClick={startNewAnalysis} size="sm" className="text-sm">
                  <Icons.Plus className="h-4 w-4 mr-1" />
                  {t('myPage.newAnalysis')}
                </Button>
              </div>
            </div>
            
            {/* Edit Mode Indicator */}
            {isEditMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-yellow-800 flex items-center">
                <Icons.AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">{t('myPage.editModeTitle')}</p>
                  <p className="text-sm">{t('myPage.editModeDescription')}</p>
                </div>
              </div>
            )}
            
            {/* 정렬된 분석 카드 목록 */}
            {sortedAnalysisCards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedAnalysisCards.map(card => (
                  <PhotoAnalysisCard
                    key={card.id}
                    card={card}
                    onToggleVisibility={togglePhotoVisibility}
                    onDelete={deleteAnalysis}
                    editMode={isEditMode}
                    onToggleHidden={toggleAnalysisHidden}
                  />
                ))}
                
                {/* 무한 스크롤 로딩 인디케이터 */}
                {hasMore && (
                  <div 
                    ref={loaderRef} 
                    className="col-span-full h-16 flex items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                message={t('myPage.noPhotosYet')}
                buttonText={t('myPage.startNewAnalysis')}
                action={startNewAnalysis}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* 웹사이트 URL 다이얼로그 */}
      <WebsiteUrlsDialog
        open={isSocialLinksDialogOpen}
        onOpenChange={setIsSocialLinksDialogOpen}
        websiteUrl1={userInfo.websiteUrl1}
        websiteUrl2={userInfo.websiteUrl2}
        websiteLabel1={userInfo.websiteLabel1}
        websiteLabel2={userInfo.websiteLabel2}
        onSave={handleSaveSocialLinks}
      />
    </div>
  );
};

export default MyPage;