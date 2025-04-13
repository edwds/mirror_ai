import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowLeft, Info, RefreshCw, CheckCircle2, Database, ClipboardList, BarChart, PieChart } from 'lucide-react';

// 점수 분포 차트와 장르 분포 차트 컴포넌트 임포트
import ScoreDistributionChart from '@/components/ScoreDistributionChart';
import GenreDistributionChart from '@/components/GenreDistributionChart';
import GenreScoreChart from '@/components/GenreScoreChart';
import CategoryScoreRadar from '@/components/CategoryScoreRadar';

interface AnalyticsStats {
  totalPhotos: number;
  totalAnalyses: number;
  duplicateAnalysesCount: number;
  photosWith: {
    multipleAnalyses: number;
    singleAnalysis: number;
  }
}

interface ScoreDistribution {
  overallScores: { score: number; count: number }[];
  categoryScores: {
    composition: { score: number; count: number }[];
    lighting: { score: number; count: number }[];
    color: { score: number; count: number }[];
    focus: { score: number; count: number }[];
    creativity: { score: number; count: number }[];
  };
}

interface GenreDistribution {
  genres: { name: string; count: number }[];
  averageScoresByGenre: { genre: string; averageScore: number }[];
}

const AdminPage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution | null>(null);
  const [genreDistribution, setGenreDistribution] = useState<GenreDistribution | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingScoreData, setIsLoadingScoreData] = useState(false);
  const [isLoadingGenreData, setIsLoadingGenreData] = useState(false);
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    deletedCount: number;
    success: boolean;
    message?: string;
  } | null>(null);

  // 권한 체크: 비로그인 상태이면 홈으로 리디렉션
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

  // 통계 데이터 가져오기
  const fetchAnalyticsStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/admin/analytics');
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        throw new Error('통계 데이터 형식이 올바르지 않습니다');
      }
    } catch (error) {
      console.error('통계 데이터 가져오기 실패:', error);
      toast({
        title: '통계 데이터 가져오기 실패',
        description: '서버에서 데이터를 가져오는 중 오류가 발생했습니다. 다시 시도해 주세요.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 중복 분석 정리 요청
  const handleCleanupDuplicates = async () => {
    if (!confirm('정말로 중복된 분석 데이터를 정리하시겠습니까?\n이 작업은 되돌릴 수 없으며, 각 사진별로 가장 최신 분석만 남깁니다.')) {
      return;
    }
    
    try {
      setIsCleaningData(true);
      setCleanupResult(null);
      
      const response = await fetch('/api/admin/cleanup-analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const data = await response.json();
      
      setCleanupResult({
        deletedCount: data.deletedCount || 0,
        success: true,
        message: data.message || `${data.deletedCount}개의 중복 분석이 정리되었습니다.`
      });
      
      // 성공 토스트 메시지
      toast({
        title: '중복 분석 정리 완료',
        description: `${data.deletedCount}개의 중복 분석이 성공적으로 정리되었습니다.`,
        variant: 'default'
      });
      
      // 통계 새로고침
      fetchAnalyticsStats();
    } catch (error) {
      console.error('중복 분석 정리 실패:', error);
      
      setCleanupResult({
        deletedCount: 0,
        success: false,
        message: '중복 분석 정리 중 오류가 발생했습니다.'
      });
      
      toast({
        title: '중복 분석 정리 실패',
        description: '서버에서 오류가 발생했습니다. 다시 시도해 주세요.',
        variant: 'destructive'
      });
    } finally {
      setIsCleaningData(false);
    }
  };

  // 점수 분포 데이터 가져오기
  const fetchScoreDistribution = async () => {
    try {
      setIsLoadingScoreData(true);
      const response = await fetch('/api/admin/score-distribution');
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.distribution) {
        setScoreDistribution(data.distribution);
      } else {
        throw new Error('점수 분포 데이터 형식이 올바르지 않습니다');
      }
    } catch (error) {
      console.error('점수 분포 데이터 가져오기 실패:', error);
      toast({
        title: '점수 분포 데이터 가져오기 실패',
        description: '서버에서 데이터를 가져오는 중 오류가 발생했습니다. 다시 시도해 주세요.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingScoreData(false);
    }
  };
  
  // 장르 분포 데이터 가져오기
  const fetchGenreDistribution = async () => {
    try {
      setIsLoadingGenreData(true);
      const response = await fetch('/api/admin/genre-distribution');
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.genreData) {
        setGenreDistribution(data.genreData);
      } else {
        throw new Error('장르 분포 데이터 형식이 올바르지 않습니다');
      }
    } catch (error) {
      console.error('장르 분포 데이터 가져오기 실패:', error);
      toast({
        title: '장르 분포 데이터 가져오기 실패',
        description: '서버에서 데이터를 가져오는 중 오류가 발생했습니다. 다시 시도해 주세요.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingGenreData(false);
    }
  };
  
  // 초기 통계 정보 가져오기
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsStats();
      fetchScoreDistribution();
      fetchGenreDistribution();
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </div>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">관리자 도구</h1>
          <p className="text-slate-600 mb-8">
            이 페이지에서는 관리자만 접근할 수 있는 시스템 관리 기능을 제공합니다.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* 데이터베이스 통계 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5 text-primary" />
                  데이터베이스 통계
                </CardTitle>
                <CardDescription>사진 및 분석 데이터의 현재 상태</CardDescription>
              </CardHeader>
              
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin text-primary" />
                    <span>통계 정보를 불러오는 중...</span>
                  </div>
                ) : stats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-100 p-4 rounded-lg">
                        <div className="text-sm text-slate-500">전체 사진 수</div>
                        <div className="text-2xl font-semibold">{stats.totalPhotos}</div>
                      </div>
                      <div className="bg-slate-100 p-4 rounded-lg">
                        <div className="text-sm text-slate-500">전체 분석 수</div>
                        <div className="text-2xl font-semibold">{stats.totalAnalyses}</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">분석 상태</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>단일 분석이 있는 사진</span>
                          <span className="font-semibold">{stats.photosWith.singleAnalysis}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>여러 분석이 있는 사진</span>
                          <span className="font-semibold">{stats.photosWith.multipleAnalyses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>중복 분석 수</span>
                          <span className="font-semibold text-amber-600">{stats.duplicateAnalysesCount}</span>
                        </div>
                      </div>
                    </div>
                    
                    {stats.duplicateAnalysesCount > 0 && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">중복 분석 발견</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          {stats.duplicateAnalysesCount}개의 중복 분석이 발견되었습니다. '중복 분석 정리' 버튼을 클릭하여 정리할 수 있습니다.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    통계 정보를 불러올 수 없습니다. 새로고침을 시도해 주세요.
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={fetchAnalyticsStats}
                  disabled={isLoadingStats}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              </CardFooter>
            </Card>
            
            {/* 데이터베이스 관리 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                  데이터베이스 관리
                </CardTitle>
                <CardDescription>데이터베이스 유지 관리 작업</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mr-2 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-800 mb-1">중복 분석 정리</h3>
                      <p className="text-sm text-blue-700">
                        이 작업은 각 사진에 대해 가장 최신 분석만 유지하고 나머지 분석을 삭제합니다.
                        삭제된 데이터는 복구할 수 없으므로 주의하세요.
                      </p>
                    </div>
                  </div>
                </div>
                
                {cleanupResult && (
                  <Alert className={cleanupResult.success ? 'bg-green-50 border-green-200' : ''}>
                    {cleanupResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>{cleanupResult.success ? '정리 완료' : '정리 실패'}</AlertTitle>
                    <AlertDescription>
                      {cleanupResult.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="pt-4">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleCleanupDuplicates}
                    disabled={isCleaningData || (stats?.duplicateAnalysesCount === 0)}
                  >
                    {isCleaningData ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      '중복 분석 정리'
                    )}
                  </Button>
                </div>
              </CardContent>
              
              <CardFooter className="text-xs text-slate-500">
                이 작업은 데이터베이스에 직접적인 변경을 가합니다. 필요한 경우에만 실행하세요.
              </CardFooter>
            </Card>
          </div>
          
          {/* 분석 대시보드 섹션 */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">AI 분석 데이터 대시보드</h2>
            <p className="text-slate-600 mb-8">
              분석 점수 분포 및 장르별 통계를 확인할 수 있습니다. 이 데이터는 AI 분석 성능 개선에 활용됩니다.
            </p>
            
            <Tabs defaultValue="scores" className="mb-8">
              <TabsList>
                <TabsTrigger value="scores" className="flex items-center">
                  <BarChart className="h-4 w-4 mr-2" />
                  점수 분포
                </TabsTrigger>
                <TabsTrigger value="genres" className="flex items-center">
                  <PieChart className="h-4 w-4 mr-2" />
                  장르별 통계
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="scores" className="mt-6">
                {/* 점수 분포 차트 */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">점수 분포 분석</h3>
                    <Button 
                      variant="outline" 
                      onClick={fetchScoreDistribution}
                      disabled={isLoadingScoreData}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingScoreData ? 'animate-spin' : ''}`} />
                      데이터 새로고침
                    </Button>
                  </div>
                  
                  {scoreDistribution ? (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <ScoreDistributionChart
                          data={scoreDistribution.overallScores}
                          title="종합 점수 분포"
                          color="#4f46e5"
                          loading={isLoadingScoreData}
                        />
                        
                        <CategoryScoreRadar
                          data={scoreDistribution.categoryScores}
                          title="카테고리별 평균 점수"
                          loading={isLoadingScoreData}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ScoreDistributionChart
                          data={scoreDistribution.categoryScores.composition}
                          title="구도 점수 분포"
                          color="#3b82f6"
                          loading={isLoadingScoreData}
                        />
                        
                        <ScoreDistributionChart
                          data={scoreDistribution.categoryScores.lighting}
                          title="조명 점수 분포"
                          color="#f59e0b"
                          loading={isLoadingScoreData}
                        />
                        
                        <ScoreDistributionChart
                          data={scoreDistribution.categoryScores.color}
                          title="색상 점수 분포"
                          color="#10b981"
                          loading={isLoadingScoreData}
                        />
                        
                        <ScoreDistributionChart
                          data={scoreDistribution.categoryScores.focus}
                          title="초점 점수 분포"
                          color="#6366f1"
                          loading={isLoadingScoreData}
                        />
                        
                        <ScoreDistributionChart
                          data={scoreDistribution.categoryScores.creativity}
                          title="창의성 점수 분포"
                          color="#ec4899"
                          loading={isLoadingScoreData}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16 bg-gray-50 rounded-lg">
                      {isLoadingScoreData ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                          <p>점수 분포 데이터를 불러오는 중...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-slate-500 mb-4">점수 분포 데이터가 없습니다.</p>
                          <Button variant="outline" onClick={fetchScoreDistribution}>
                            데이터 불러오기
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="genres" className="mt-6">
                {/* 장르별 통계 차트 */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">장르별 통계 분석</h3>
                    <Button 
                      variant="outline" 
                      onClick={fetchGenreDistribution}
                      disabled={isLoadingGenreData}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingGenreData ? 'animate-spin' : ''}`} />
                      데이터 새로고침
                    </Button>
                  </div>
                  
                  {genreDistribution ? (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <GenreDistributionChart
                          data={genreDistribution.genres}
                          title="장르별 분석 개수"
                          loading={isLoadingGenreData}
                        />
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">장르별 통계 요약</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {isLoadingGenreData ? (
                              <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">가장 많이 분석된 장르</h4>
                                  <div className="space-y-2">
                                    {genreDistribution.genres.slice(0, 5).map((genre, index) => (
                                      <div key={index} className="flex justify-between items-center">
                                        <span>{genre.name}</span>
                                        <span className="font-semibold">{genre.count}개</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div>
                                  <h4 className="font-medium mb-2">평균 점수가 높은 장르</h4>
                                  <div className="space-y-2">
                                    {genreDistribution.averageScoresByGenre.slice(0, 5).map((genre, index) => (
                                      <div key={index} className="flex justify-between items-center">
                                        <span>{genre.genre}</span>
                                        <span className="font-semibold">{Math.round(genre.averageScore)}점</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                      
                      <GenreScoreChart
                        data={genreDistribution.averageScoresByGenre}
                        title="장르별 평균 점수"
                        loading={isLoadingGenreData}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16 bg-gray-50 rounded-lg">
                      {isLoadingGenreData ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                          <p>장르 분포 데이터를 불러오는 중...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-slate-500 mb-4">장르 분포 데이터가 없습니다.</p>
                          <Button variant="outline" onClick={fetchGenreDistribution}>
                            데이터 불러오기
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;