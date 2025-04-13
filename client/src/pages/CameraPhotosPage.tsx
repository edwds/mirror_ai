import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import PhotoAnalysisCard from '@/components/PhotoAnalysisCard';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AnalysisCard } from '@/hooks/usePhotoAnalyses';

// 서버 응답 타입 정의
interface PhotoWithAnalysis {
  id: number;
  photoId: number;
  userId?: number;
  user?: {
    id: number;
    displayName: string | null;
    profilePicture: string | null;
  } | null;
  displayImagePath: string;
  firebaseDisplayUrl?: string | null;
  firebaseAnalysisUrl?: string | null;
  s3DisplayUrl?: string | null;
  s3AnalysisUrl?: string | null;
  replitDisplayUrl?: string | null;
  replitAnalysisUrl?: string | null;
  createdAt: string;
  title?: string;
  overallScore?: number;
  isPublic?: boolean;
  isHidden?: boolean;
  categoryScores?: {
    composition: number;
    lighting: number;
    color: number;
    focus: number;
    creativity: number;
  };
  strengths?: string[];
  improvements?: string[];
  cameraInfo?: string;
  tags?: string[];
}

// 빈 상태 컴포넌트
const EmptyStateComponent = ({ message }: { message: string }) => {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
        <Camera className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-slate-600 mb-4 max-w-md mx-auto">{message}</p>
    </div>
  );
};

const CameraPhotosPage: React.FC = () => {
  const { cameraModel } = useParams<{ cameraModel: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // 상태 관리
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [analysisCards, setAnalysisCards] = useState<AnalysisCard[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);
  const decodedCameraModel = decodeURIComponent(cameraModel);
  
  // 카메라별 사진 쿼리 - 분석 결과 포함 (with-analyses 엔드포인트 사용)
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    // 페이지를 포함한 고유한 쿼리키 (주의: 특수문자 등은 제거 또는 인코딩)
    queryKey: ['camera-photos', decodedCameraModel, page],
    queryFn: async () => {
      console.log(`📡 API 호출: 카메라 모델 '${decodedCameraModel}' 사진 및 분석 데이터 조회 중... (페이지: ${page})`);
      // URL 인코딩으로 안전하게 API 엔드포인트 구성
      const encodedModel = encodeURIComponent(decodedCameraModel);
      const url = `/api/analyses/by-camera/${encodedModel}?page=${page}&limit=12`;
      
      try {
        const result = await apiRequest(url, 'GET');
        console.log(`✅ API 응답 성공 (페이지 ${page}) - 받은 항목: ${result.photos?.length || 0}, 총 항목: ${result.total || 0}`);
        return result;
      } catch (error) {
        console.error(`❌ API 호출 실패 (페이지 ${page}):`, error);
        throw error;
      }
    },
    enabled: !!decodedCameraModel,
    staleTime: 10 * 1000, // 10초 동안 캐시 데이터 유지 (짧게 조정)
    retry: 1, // 실패 시 1번만 재시도 (부하 감소)
    retryDelay: 1000, // 재시도 간격 1초
  });
  
  // 데이터 처리 - 함수형 업데이트 사용 및 의존성 최적화
  useEffect(() => {
    if (data?.success && data.photos) {
      console.log(`데이터 수신 - 페이지 ${page}, 결과 ${data.photos.length}개, 총 ${data.total}개`);
      
      if (data.photos.length > 0) {
        console.log(`첫 번째 항목 데이터:`, data.photos[0]);
      }
      
      // 데이터를 PhotoAnalysisCard 컴포넌트에 맞는 형식으로 변환
      const formattedPhotos = data.photos.map((photo: PhotoWithAnalysis) => {
        return {
          id: photo.id,
          photoId: photo.photoId,
          userId: photo.userId,
          user: photo.user,
          displayImagePath: photo.displayImagePath,
          firebaseDisplayUrl: photo.firebaseDisplayUrl,
          firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
          s3DisplayUrl: photo.s3DisplayUrl,
          s3AnalysisUrl: photo.s3AnalysisUrl,
          replitDisplayUrl: photo.replitDisplayUrl, 
          replitAnalysisUrl: photo.replitAnalysisUrl,
          createdAt: photo.createdAt,
          title: photo.title || "Untitled Photo",
          overallScore: photo.overallScore || 0,
          isPublic: photo.isPublic !== false,
          isHidden: !!photo.isHidden,
          categoryScores: photo.categoryScores || {
            composition: 0,
            lighting: 0,
            color: 0,
            focus: 0,
            creativity: 0
          },
          strengths: photo.strengths || [],
          improvements: photo.improvements || [],
          cameraInfo: photo.cameraInfo || "Unknown Camera",
          tags: photo.tags || []
        };
      });
      
      // 새 페이지 데이터 처리 - 함수형 업데이트로 최신 상태 참조
      setAnalysisCards(prevCards => {
        if (page === 1) {
          // 페이지 1은 항상 새로 시작
          return formattedPhotos;
        } else {
          // 기존 카드와 새 카드 병합 (중복 제거)
          const existingIds = new Set(prevCards.map(card => card.id));
          const newPhotos = formattedPhotos.filter((photo: AnalysisCard) => !existingIds.has(photo.id));
          
          if (newPhotos.length > 0) {
            console.log(`새로운 데이터 ${newPhotos.length}개 추가`);
            return [...prevCards, ...newPhotos];
          } else {
            console.log('중복 없는 새 데이터 없음');
            return prevCards;
          }
        }
      });
      
      // 마지막 페이지 확인 (더 정확한 체크 방법)
      const hasMoreData = page * 12 < data.total;
      console.log(`추가 데이터 여부: ${hasMoreData} (현재: ${page * 12}/${data.total})`);
      setHasMore(hasMoreData);
    }
  }, [data, page]); // analysisCards 의존성 제거 (함수형 업데이트 사용으로 필요 없음)
  
  // 에러 처리
  useEffect(() => {
    if (error) {
      toast({
        title: t('error.failed'),
        description: t('error.loadingFailed'),
        variant: 'destructive',
      });
      console.error('Error fetching camera photos:', error);
    }
  }, [error, t, toast]);
  
  // 페이지 변경 시 쿼리 다시 실행
  // 페이지가 queryKey에 포함되어 있으므로 자동으로 실행됨
  useEffect(() => {
    console.log(`페이지 변경됨: ${page}`);
    // TanStack Query v5에서는 queryKey의 변경으로 자동 refetch 수행
    // 명시적 refetch 호출 제거 (필요한 경우 refetch는 TanStack Query에 의해 자동으로 실행됨)
  }, [page]);

  // 단순화된 무한 스크롤 구현 - 완전히 새로 작성
  useEffect(() => {
    // 스크롤을 감지하는 함수
    function handleScroll() {
      // 화면 끝에서 200px 전에 추가 로드 시작
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
        hasMore && 
        !isFetching
      ) {
        console.log(`스크롤 감지: 다음 페이지(${page + 1}) 로드 시작`);
        setPage(prevPage => prevPage + 1);
      }
    }

    // 스크롤 이벤트 등록
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, isFetching, page]);
  
  // 자동 로드 - 페이지 내용이 충분하지 않을 때 자동으로 추가 로드
  useEffect(() => {
    // 페이지 내용이 화면을 채우지 못하면 자동으로 추가 로드
    if (
      !isFetching && 
      hasMore && 
      document.body.offsetHeight < window.innerHeight && 
      analysisCards.length > 0
    ) {
      console.log('화면이 충분히 채워지지 않아 추가 데이터 자동 로드');
      setPage(prevPage => prevPage + 1);
    }
  }, [hasMore, isFetching, analysisCards.length]);
  
  // 디버깅용 로깅
  useEffect(() => {
    console.log(`페이지 상태: ${page}, 추가 데이터 여부: ${hasMore}, 로딩 중: ${isFetching}`);
  }, [page, hasMore, isFetching]);
  
  // 사진 공개/비공개 토글
  const togglePhotoVisibility = useCallback(async (photoId: number, isPublic: boolean) => {
    try {
      const response = await apiRequest(`/api/photos/${photoId}`, 'PATCH', {
        isHidden: !isPublic,
      });
      
      if (response.success) {
        setAnalysisCards(prev => 
          prev.map(card => 
            card.photoId === photoId 
              ? { ...card, isPublic: !card.isPublic } 
              : card
          )
        );
        
        toast({
          title: t('myPage.visibilityChanged'),
          description: isPublic 
            ? t('myPage.photoHidden') 
            : t('myPage.photoPublic'),
        });
      }
    } catch (error) {
      console.error('Error toggling photo visibility:', error);
      toast({
        title: t('error.failed'),
        description: t('error.updateFailed'),
        variant: 'destructive',
      });
    }
  }, [t, toast]);
  
  // 분석 숨김/표시 토글
  const toggleAnalysisHidden = useCallback(async (analysisId: number, isHidden: boolean) => {
    try {
      const response = await apiRequest(`/api/analyses/${analysisId}/visibility`, 'PATCH', {
        isHidden,
      });
      
      if (response.success) {
        setAnalysisCards(prev => 
          prev.map(card => 
            card.id === analysisId 
              ? { ...card, isHidden } 
              : card
          )
        );
        
        toast({
          title: t('myPage.visibilityChanged'),
          description: isHidden 
            ? t('myPage.analysisHidden') 
            : t('myPage.analysisVisible'),
        });
      }
    } catch (error) {
      console.error('Error toggling analysis visibility:', error);
      toast({
        title: t('error.failed'),
        description: t('error.updateFailed'),
        variant: 'destructive',
      });
    }
  }, [t, toast]);
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Navigation />
      
      <div className="container px-4 pt-20 pb-8 mx-auto max-w-6xl mt-5"> {/* 상단 패딩 추가 증가 및 마진톱 추가로 내비바 겹침 해결 */}
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
          {/* 백버튼 - 히스토리 백으로 작동 */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
            className="mb-2 sm:mb-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">
              {t('photos.cameraFilterTitle', { camera: decodedCameraModel })}
            </h1>
            <p className="text-slate-500 mt-1">
              {data?.total 
                ? t('photos.cameraFilterDescription', { count: data.total }) 
                : t('photos.loading')}
            </p>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* 분석 그리드 */}
        {isLoading && page === 1 ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : analysisCards.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {analysisCards.map(card => (
                <PhotoAnalysisCard
                  key={card.id}
                  card={card}
                  onToggleVisibility={togglePhotoVisibility}
                  onToggleHidden={toggleAnalysisHidden}
                  editMode={false}
                />
              ))}
            </div>
            
            {/* 페이지 정보 표시 */}
            <div className="text-center text-sm text-slate-500 mt-4 mb-4">
              <span>{page} 페이지 / {Math.ceil((data?.total || 0) / 12)} 페이지 중</span>
              {hasMore && (
                <span className="ml-2 text-primary">↓ 스크롤하여 더 보기</span>
              )}
            </div>
            
            {/* 무한 스크롤 트리거 + 수동 로드 버튼 추가 */}
            <div 
              ref={loaderRef} 
              className="w-full flex flex-col justify-center items-center mt-6 mb-10"
            >
              {isFetching ? (
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
              ) : hasMore ? (
                <div className="flex flex-col items-center">
                  <div className="py-2 px-4 rounded-full bg-gray-100 text-sm text-gray-500 mb-4">
                    스크롤하여 자동으로 더 불러오는 중...
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setPage(prevPage => prevPage + 1)}
                    disabled={isFetching}
                    className="mt-2"
                  >
                    {isFetching ? '로딩 중...' : '더 보기 (+12)'}
                  </Button>
                </div>
              ) : (
                <div className="py-2 px-4 rounded-full bg-gray-100 text-sm text-gray-500">
                  모든 사진을 불러왔습니다 (총 {data?.total || 0}개)
                </div>
              )}
            </div>
          </>
        ) : (
          // 결과 없음 상태
          <div className="bg-white rounded-xl shadow p-6">
            <EmptyStateComponent 
              message={t('photos.noCameraPhotos', { camera: decodedCameraModel })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPhotosPage;