import React, { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Icons } from '@/components/Icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AnalysisCard } from '@/hooks/usePhotoAnalyses';

// 스타 평점 계산 헬퍼 함수
const calculateStarRating = (score: number): { fullStars: number, hasHalfStar: boolean } => {
  let starRating = 0;
  
  if (score >= 95) starRating = 5.0;
  else if (score >= 90) starRating = 4.5;
  else if (score >= 85) starRating = 4.0;
  else if (score >= 80) starRating = 4.0;
  else if (score >= 75) starRating = 3.5;
  else if (score >= 70) starRating = 3.5;
  else if (score >= 65) starRating = 3.0;
  else if (score >= 60) starRating = 3.0;
  else if (score >= 55) starRating = 2.5;
  else if (score >= 50) starRating = 2.5;
  else if (score >= 45) starRating = 2.0;
  else if (score >= 40) starRating = 2.0;
  else if (score >= 35) starRating = 1.5;
  else if (score >= 30) starRating = 1.5;
  else if (score >= 20) starRating = 1.0;
  else if (score >= 10) starRating = 1.0;
  else starRating = 0.5;
  
  return {
    fullStars: Math.floor(starRating),
    hasHalfStar: (starRating % 1) !== 0
  };
};

// 컴포넌트 프롭스 정의
interface PhotoAnalysisCardProps {
  card: AnalysisCard;
  onToggleVisibility?: (id: number, isPublic: boolean) => void;
  onToggleHidden?: (id: number, isHidden: boolean) => void;
  onDelete?: (id: number) => void;
  editMode?: boolean;
  isPending?: boolean; // 업데이트 진행 중 상태
}

// 메인 PhotoAnalysisCard 컴포넌트 (메모이제이션 적용)
const PhotoAnalysisCard: React.FC<PhotoAnalysisCardProps> = React.memo(({
  card,
  onToggleVisibility,
  onToggleHidden,
  onDelete,
  editMode = false,
  isPending = false
}) => {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  
  // 날짜 포맷팅 (메모이제이션)
  const formattedDate = useMemo(() => {
    return new Date(card.createdAt).toLocaleDateString();
  }, [card.createdAt]);
  
  // 스타 평점 계산 (메모이제이션)
  const { fullStars, hasHalfStar } = useMemo(() => {
    return calculateStarRating(card.overallScore);
  }, [card.overallScore]);
  
  // 삭제 다이얼로그 열기
  const openDeleteDialog = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  }, []);
  
  // 삭제 다이얼로그 닫기
  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);
  
  // 삭제 확인
  const confirmDelete = useCallback(() => {
    if (onDelete) {
      onDelete(card.id);
    }
    setIsDeleteDialogOpen(false);
  }, [card.id, onDelete]);
  
  // 공개 상태 토글
  const toggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleVisibility) {
      onToggleVisibility(card.photoId, !card.isPublic);
    }
  }, [card.photoId, card.isPublic, onToggleVisibility]);
  
  // 숨김 상태 토글
  const toggleHidden = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleHidden) {
      onToggleHidden(card.id, !card.isHidden);
    }
  }, [card.id, card.isHidden, onToggleHidden]);
  
  // 분석 결과 페이지로 이동
  const goToAnalysis = useCallback(() => {
    console.log(`분석 페이지로 이동: ID ${card.id}`);
    // 직접적인 분석 페이지 경로로 이동
    window.location.href = `/analyses/${card.id}`;
  }, [card.id]);
  
  // 드롭다운 메뉴 열릴 때 이벤트 중지
  const handleDropdownOpen = useCallback((open: boolean) => {
    setIsActionOpen(open);
  }, []);
  
  // 이벤트 전파 방지 (드롭다운 메뉴 클릭시)
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
  
  // 메모이제이션된 이미지 URL - 사용 가능한 URL 중 우선순위 고려
  const imageUrl = useMemo(() => {
    // 각 URL이 실제로 존재하고 유효한지 확인
    if (card.base64DisplayImage && card.base64DisplayImage.startsWith('data:image')) {
      return card.base64DisplayImage;
    }
    if (card.firebaseDisplayUrl && card.firebaseDisplayUrl.startsWith('http')) {
      return card.firebaseDisplayUrl;
    }
    if (card.displayImagePath) {
      // 상대 경로인 경우 절대 경로로 변환
      if (!card.displayImagePath.startsWith('http') && !card.displayImagePath.startsWith('data:')) {
        return window.location.origin + card.displayImagePath;
      }
      return card.displayImagePath;
    }
    if (card.replitDisplayUrl && card.replitDisplayUrl.startsWith('http')) {
      return card.replitDisplayUrl;
    }
    if (card.s3DisplayUrl && card.s3DisplayUrl.startsWith('http')) {
      return card.s3DisplayUrl;
    }
    
    // 기본 플레이스홀더 이미지
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e2e8f0'/%3E%3Ctext x='50' y='50' font-family='sans-serif' font-size='12' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3EImage loading...%3C/text%3E%3C/svg%3E";
  }, [
    card.firebaseDisplayUrl,
    card.base64DisplayImage,
    card.displayImagePath,
    card.replitDisplayUrl,
    card.s3DisplayUrl
  ]);
  
  return (
    <>
      <div 
        className={`bg-white rounded-xl overflow-hidden shadow-md h-full flex flex-col
          ${card.isHidden && editMode ? 'opacity-50 ring-2 ring-primary/20' : ''}
          ${!isActionOpen ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
          ${isPending ? 'ring-2 ring-blue-300 relative' : ''}
        `}
        onClick={(e) => {
          if (!isActionOpen) {
            goToAnalysis();
          }
        }}
      >
        {/* 로딩 인디케이터 */}
        {isPending && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        {/* 이미지 썸네일 - PC에서는 원본 비율, 모바일에서는 1:1 정방형 */}
        <div className="relative overflow-hidden sm:aspect-auto" style={{ paddingTop: window.innerWidth < 640 ? "100%" : "100%" }}>
          <img 
            src={imageUrl}
            alt={card.title}
            className="absolute top-0 left-0 w-full h-full object-cover"
            loading="lazy" // 지연 로딩
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              
              // 첫 번째 이미지 URL이 실패하면 다음 URL로 전환하는 폴백 메커니즘
              if (target.src === card.firebaseDisplayUrl && card.base64DisplayImage) {
                target.src = card.base64DisplayImage;
              }
              else if ((target.src === card.firebaseDisplayUrl || target.src === card.base64DisplayImage) 
                      && card.displayImagePath) {
                target.src = card.displayImagePath;
              }
              else if ((target.src === card.firebaseDisplayUrl || target.src === card.base64DisplayImage 
                      || target.src === card.displayImagePath) && card.replitDisplayUrl) {
                target.src = card.replitDisplayUrl;
              }
              else if ((target.src === card.firebaseDisplayUrl || target.src === card.base64DisplayImage 
                      || target.src === card.displayImagePath || target.src === card.replitDisplayUrl) 
                      && card.s3DisplayUrl) {
                target.src = card.s3DisplayUrl;
              }
              else {
                // 모든 방법이 실패한 경우 플레이스홀더로
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e2e8f0'/%3E%3Ctext x='50' y='50' font-family='sans-serif' font-size='12' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E";
                target.classList.add("bg-slate-200");
              }
            }}
          />
          
          {/* 스코어 배지 */}
          <div className="absolute top-3 right-3">
            <div className={`bg-white/90 text-slate-900 font-bold rounded-xl shadow-md flex flex-col items-center p-2 ${card.isHidden ? 'opacity-70' : ''}`}>
              <div className="text-2xl font-bold">{card.overallScore}</div>
              <div className="flex items-center mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="relative">
                    {/* 빈 별 */}
                    <Icons.Star className="h-3 w-3 text-slate-300" fill="none" />
                    {/* 채워진 별 (점수 비율에 따라) */}
                    {i < fullStars && (
                      <Icons.Star
                        className="h-3 w-3 text-amber-500 absolute top-0 left-0"
                        fill="currentColor"
                      />
                    )}
                    {/* 반 별 */}
                    {hasHalfStar && i === fullStars && (
                      <span className="h-3 w-3 text-amber-500 absolute top-0 left-0">
                        <Icons.StarHalf size={12} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 편집 모드 배지 제거됨 */}
          
          {/* 그라데이션 오버레이와 제목 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5">
            <div className="flex flex-col gap-1">
              <h3 className={`text-white font-bold text-xl line-clamp-2 ${card.isHidden ? 'opacity-70' : ''}`}>
                {card.title}
              </h3>
              
              {/* 태그 컨테이너 - 한 줄로 제한 */}
              {card.tags && card.tags.length > 0 && (
                <div className="flex gap-1.5 mt-1 overflow-hidden whitespace-nowrap">
                  {card.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className={`px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90 inline-block ${card.isHidden ? 'opacity-70' : ''}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* 액션 버튼 - 편집 모드에서만 표시 */}
          {editMode && onDelete && (
            <div 
              className="absolute top-3 left-3 z-10"
              onClick={stopPropagation}
            >
              <DropdownMenu open={isActionOpen} onOpenChange={handleDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm"
                  >
                    <Icons.MoreVertical className="h-4 w-4 text-slate-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                  {/* 삭제 기능 */}
                  <DropdownMenuItem 
                    onClick={openDeleteDialog}
                    className="text-red-500 focus:bg-red-50 focus:text-red-500"
                  >
                    <Icons.Trash2 className="mr-2 h-4 w-4" />
                    <span>{t('myPage.delete')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {/* 카드 내용 */}
        <div className={`p-5 bg-white border-t border-slate-100 flex-grow flex flex-col ${card.isHidden ? 'opacity-70' : ''}`}>
          {/* 사용자 정보 (있는 경우에만 표시) - 닉네임만 표시 */}
          {card.user && (
            <div 
              className="flex items-center mb-4 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
                if (card.user?.id) {
                  window.location.href = `/profile/${card.user.id}`;
                }
              }}
            >
              <div className="flex-shrink-0 mr-2 text-slate-500">
                <Icons.User className="h-3 w-3" />
              </div>
              <p className="text-xs text-slate-600 font-medium truncate">
                {card.user.displayName || t('common.anonymousUser')}
              </p>
            </div>
          )}
          
          <div className="flex-grow">
            {/* 장점 */}
            {card.strengths && card.strengths.length > 0 && (
              <div className="flex items-start mb-3">
                <div className="flex-shrink-0 mr-2 text-green-600">
                  <Icons.ThumbsUp className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">
                  {card.strengths[0]}
                </p>
              </div>
            )}
            
            {/* 개선점 */}
            {card.improvements && card.improvements.length > 0 && (
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-2 text-amber-600">
                  <Icons.Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">
                  {card.improvements[0]}
                </p>
              </div>
            )}
          </div>
          
          {/* 카메라 정보 - 하단에 고정 - 클릭 시 같은 카메라로 찍은 사진 필터링 */}
          {card.cameraInfo && (
            <div className="flex items-center mt-4 pt-3 border-t border-slate-100 rounded p-1">
              <div className="flex-shrink-0 mr-2 text-slate-400">
                <Icons.Camera className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-500 truncate">{card.cameraInfo}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 삭제 확인 대화상자 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('myPage.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('myPage.deleteAnalysisConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

PhotoAnalysisCard.displayName = 'PhotoAnalysisCard';

export default PhotoAnalysisCard;