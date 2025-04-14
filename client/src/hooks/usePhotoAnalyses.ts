import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

// 사용자 정보 타입 정의
export interface UserInfo {
  id: number;
  displayName: string | null;
  profilePicture: string | null;
}

// 분석 카드 타입 정의
export interface AnalysisCard {
  id: number;
  photoId: number;
  userId?: number; // 사진 소유자 ID
  user?: UserInfo | null; // 사용자 정보
  firebaseDisplayUrl?: string;
  firebaseAnalysisUrl?: string;
  createdAt: string;
  title: string;
  overallScore: number;
  isPublic: boolean;
  isHidden?: boolean;
  // 카테고리 스코어는 옵셔널로 변경 (마이페이지에서는 사용 안 함)
  categoryScores?: {
    composition: number;
    lighting: number;
    color: number;
    focus: number;
    creativity: number;
  };
  strengths: string[];
  improvements: string[];
  cameraInfo?: string;
  tags?: string[];
}

interface PhotosWithAnalysesResponse {
  success: boolean;
  photos: AnalysisCard[];
  total: number;
  totalPages: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * 사진 및 분석 데이터를 가져오는 커스텀 훅
 * - 데이터 캐싱 및 페이지네이션 지원
 * - 사용자 ID에 따라 다른 캐시 키 사용
 */
export function usePhotoAnalyses(userId?: number, includeHidden: boolean = false, pageSize: number = 12) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [analysisCards, setAnalysisCards] = useState<AnalysisCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  // 분석 데이터 가져오기 (성능 최적화)
  const fetchAnalyses = useCallback(async (pageNum: number) => {
    const startTime = performance.now(); // 성능 측정 시작
    
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      }
      
      // 사용자 ID 파라미터 구성 (본인 또는 다른 사용자의 데이터)
      const userIdParam = userId !== undefined ? `userId=${userId}` : '';
      const includeHiddenParam = includeHidden ? '&includeHidden=true' : '';
      
      // 페이지 크기 제한 - 성능 최적화 (첫 로드는 더 적게, 스크롤은 더 많이)
      const adjustedPageSize = pageNum === 1 ? Math.min(12, pageSize) : pageSize;
      
      // 데이터 요청 시작
      console.log(`Fetching analyses for page ${pageNum}, limit ${adjustedPageSize}`);
      
      // AbortController를 사용해 필요 시 요청 취소 가능하도록 함
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15초 타임아웃 설정
      
      const response = await fetch(
        `/api/analyses/with-photos?${userIdParam}${includeHiddenParam}&page=${pageNum}&limit=${adjustedPageSize}`, 
        {
          signal: abortController.signal,
          headers: {
            'Cache-Control': 'no-cache', // 캐시 사용 안함
            'Pragma': 'no-cache'
          }
        }
      );
      
      clearTimeout(timeoutId); // 타임아웃 클리어
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analyses: ${response.statusText}`);
      }
      
      console.log(`Response received in ${performance.now() - startTime}ms`);
      const data: PhotosWithAnalysesResponse = await response.json();
      console.log(`Response parsed in ${performance.now() - startTime}ms`);
      
      if (data.success) {
        // 서버에서 전체 데이터 받기 (원래 로직으로 복원)
        const newCards = data.photos.map((photo: any) => {
          // Parse categoryScores - handle both object and string formats
          let categoryScores = photo.categoryScores;
          if (typeof categoryScores === 'string') {
            try {
              categoryScores = JSON.parse(categoryScores);
            } catch (e) {
              console.warn('Failed to parse categoryScores string:', e);
              categoryScores = {
                composition: 0,
                lighting: 0,
                color: 0,
                focus: 0,
                creativity: 0
              };
            }
          }
          
          // 기본값으로 빈 배열 제공
          const strengths = Array.isArray(photo.strengths) ? photo.strengths : [];
          const improvements = Array.isArray(photo.improvements) ? photo.improvements : [];
          const tags = Array.isArray(photo.tags) ? photo.tags : [];
          
          return {
            id: photo.id,
            photoId: photo.photoId,
            userId: photo.userId,
            user: photo.user,
            firebaseDisplayUrl: photo.firebaseDisplayUrl,
            firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
            displayImagePath: photo.displayImagePath,
            createdAt: photo.createdAt,
            title: photo.title || t('myPage.untitledPhoto'),
            overallScore: photo.overallScore || 0,
            isPublic: photo.isPublic !== false,
            isHidden: photo.isHidden || false,
            categoryScores: categoryScores,
            strengths: strengths,
            improvements: improvements,
            tags: tags,
            cameraInfo: photo.cameraInfo || '',
            analysisId: photo.analysisId
          };
        });
        
        console.log(`Processed ${newCards.length} cards in ${performance.now() - startTime}ms`);
        
        // 함수형 업데이트 - 상태 업데이트 최적화
        setAnalysisCards(prevCards => {
          // 첫 페이지인 경우 목록 교체, 그 외에는 기존 목록에 추가
          return pageNum === 1 ? newCards : [...prevCards, ...newCards];
        });
        
        // 페이지네이션 정보 업데이트
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setHasMore(data.pagination.hasMore || false);
        } else {
          setTotalPages(data.totalPages || 1);
          
          // 더 로드할 데이터가 있는지 확인
          if (!data.photos || data.photos.length === 0 || data.photos.length < pageSize) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
        }
        
        setIsError(false);
        console.log(`Total fetch+render time: ${performance.now() - startTime}ms`);
      } else {
        console.error("Failed to load analyses:", data.error);
        setIsError(true);
        
        toast({
          title: t('profile.errorLoadingData'),
          description: data.error || t('profile.tryAgainLater'),
          variant: "destructive"
        });
        
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching analyses:", error);
      setIsError(true);
      
      toast({
        title: t('profile.errorLoadingData'),
        description: t('profile.tryAgainLater'),
        variant: "destructive"
      });
      
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, userId, includeHidden, pageSize]);
  
  // 다음 페이지 로드
  const loadNextPage = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoading]);
  
  // 사진 공개/비공개 설정 토글
  const togglePhotoVisibility = useCallback(async (id: number, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic }),
      });
      
      if (response.ok) {
        // 상태 업데이트
        setAnalysisCards(prevCards => 
          prevCards.map(card => 
            card.photoId === id ? { ...card, isPublic } : card
          )
        );
        
        toast({
          title: isPublic ? t('myPage.madePublic') : t('myPage.madePrivate'),
          description: isPublic ? t('myPage.othersCanView') : t('myPage.onlyYouCanView'),
        });
      } else {
        toast({
          title: t('profile.errorUpdating'),
          description: t('profile.tryAgainLater'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: t('profile.errorUpdating'),
        description: t('profile.tryAgainLater'),
        variant: "destructive"
      });
    }
  }, [t, toast]);
  
  // 분석 삭제
  const deleteAnalysis = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 상태에서 해당 분석 제거
        setAnalysisCards(prevCards => prevCards.filter(card => card.id !== id));
        
        toast({
          title: t('myPage.analysisDeleted'),
          description: t('myPage.analysisDeletedSuccess'),
        });
      } else {
        toast({
          title: t('profile.errorDeleting'),
          description: t('profile.tryAgainLater'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting analysis:", error);
      toast({
        title: t('profile.errorDeleting'),
        description: t('profile.tryAgainLater'),
        variant: "destructive"
      });
    }
  }, [t, toast]);
  
  // 분석 업데이트 진행 중인 항목 추적
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, boolean>>({});
  
  // 분석 숨김 토글 - 개선된 버전
  const toggleAnalysisHidden = useCallback(async (id: number, isHidden: boolean) => {
    console.log(`토글 요청: 분석 ID ${id}의 상태를 ${isHidden ? '숨김' : '표시'}으로 변경`);
    
    // 업데이트 진행 중 표시
    setPendingUpdates(prev => ({ ...prev, [id]: true }));
    
    try {
      const startTime = performance.now();
      
      const response = await fetch(`/api/analyses/${id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHidden }),
      });
      
      const endTime = performance.now();
      console.log(`API 응답 수신: ${Math.round(endTime - startTime)}ms, 상태 코드: ${response.status}`);
      
      if (response.ok) {
        // 응답 데이터 파싱
        try {
          const data = await response.json();
          console.log('서버 응답 데이터:', data);
          
          if (data.success) {
            // 서버에서 반환된 데이터로 상태 업데이트 (서버 상태 반영)
            const updatedIsHidden = data.analysis?.isHidden ?? isHidden;
            
            setAnalysisCards(prevCards => 
              prevCards.map(card => 
                card.id === id ? { ...card, isHidden: updatedIsHidden } : card
              )
            );
            
            // 페이지 캐시에서 현재 페이지만 유지하고 나머지는 무효화
            if (pagesFetched.current.size > 1) {
              console.log('상태 변경으로 인해 캐시된 페이지 일부 무효화');
              const currentPage = page;
              pagesFetched.current = new Set([currentPage]);
            }
            
            toast({
              title: updatedIsHidden ? t('myPage.analysisHidden') : t('myPage.analysisVisible'),
              description: updatedIsHidden ? t('myPage.analysisNowHidden') : t('myPage.analysisNowVisible'),
            });
          } else {
            throw new Error(data.error || '서버에서 업데이트 오류 반환');
          }
        } catch (parseError) {
          console.error('서버 응답 파싱 오류:', parseError);
          throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다');
        }
      } else {
        // 오류 응답 처리
        let errorMessage = `상태 코드 ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // 응답을 JSON으로 파싱할 수 없는 경우 기본 메시지 사용
        }
        
        console.error(`API 오류 응답: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("분석 가시성 토글 오류:", error, {
        analysisId: id, 
        requestedState: isHidden,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: t('profile.errorUpdating'),
        description: error instanceof Error ? error.message : t('profile.tryAgainLater'),
        variant: "destructive"
      });
    } finally {
      // 업데이트 진행 중 상태 제거
      setPendingUpdates(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  }, [t, toast, page]);
  
  // 데이터 초기화 및 첫 페이지부터 다시 로드
  const resetData = useCallback(() => {
    setPage(1);
    setAnalysisCards([]);
    setHasMore(true);
    setIsLoading(true);
    setIsError(false);
  }, []);
  
  // 페이지 로드와 관련된 상태 추적
  const pagesFetched = useRef<Set<number>>(new Set());
  const isInitialLoad = useRef(true);
  
  // 최초 로드 및 페이지 변경시 데이터 가져오기
  useEffect(() => {
    // 이미 해당 페이지를 가져왔는지 확인
    const alreadyFetched = pagesFetched.current.has(page);
    
    // 초기 로드 또는 아직 가져오지 않은 페이지인 경우에만 API 호출
    if (isInitialLoad.current || !alreadyFetched) {
      console.log(`Fetching page ${page} (initial load: ${isInitialLoad.current})`);
      fetchAnalyses(page);
      
      // 초기 로드 표시 업데이트
      isInitialLoad.current = false;
      
      // 페이지 캐싱
      pagesFetched.current.add(page);
    } else {
      console.log(`Page ${page} already fetched, using cached data`);
    }
  }, [page, fetchAnalyses]);
  
  // userId나 includeHidden이 변경되면 데이터 초기화
  useEffect(() => {
    if (!isInitialLoad.current) {
      console.log('User ID or visibility filter changed, resetting data');
      resetData();
      // 페이지 캐시 초기화
      pagesFetched.current = new Set();
    }
  }, [userId, includeHidden, resetData]);
  
  return {
    analysisCards,
    isLoading,
    isError,
    page,
    totalPages,
    hasMore,
    loadNextPage,
    togglePhotoVisibility,
    toggleAnalysisHidden,
    deleteAnalysis,
    resetData,
    pendingUpdates,  // 진행 중인 업데이트 상태 노출
  };
}