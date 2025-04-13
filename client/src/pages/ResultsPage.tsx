import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Share2, Share, Image, Upload, ThumbsUp, CircleDashed, Lightbulb, RefreshCw, Star, Sparkles, Camera, Home, Menu, X, CircleUser, Download, ArrowUp, Square } from 'lucide-react';
import { getPersonaDisplayName, getPersonaDisplayInfo, getCharacterName, getCharacterImagePath } from '@/lib/personaUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AnalysisResult } from '@shared/schema';
import PhotoResultCard from '@/components/PhotoResultCard';
import RadarChart from '@/components/RadarChart';
import AnalysisSection from '@/components/AnalysisSection';
import LanguageSelector from '@/components/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { downloadElementAsPNG, shareElementAsPNG, elementToDataURL } from '@/utils/htmlToImage';

// Helper function to calculate star rating based on score
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
  else if (score >= 25) starRating = 1.0;
  else if (score >= 20) starRating = 1.0;
  else if (score >= 15) starRating = 0.5;
  else starRating = 0;
  
  const fullStars = Math.floor(starRating);
  const hasHalfStar = starRating % 1 !== 0;
  
  return { fullStars, hasHalfStar };
};

const ResultsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  
  // Result & Photo data
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Persona & Character info
  const [personaKey, setPersonaKey] = useState<string>('supportive-friend');
  const [personaName, setPersonaName] = useState<string>('');
  const [characterName, setCharacterName] = useState<string>('');
  const [characterImagePath, setCharacterImagePath] = useState<string>('');
  const [shareProgress, setShareProgress] = useState<number>(0);
  
  // UI States
  const [showDownloadOptions, setShowDownloadOptions] = useState<boolean>(false);
  const [showShareOptions, setShowShareOptions] = useState<boolean>(false);
  const [showFullContent, setShowFullContent] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');
  const [sharedUrl, setSharedUrl] = useState<string>('');
  const [showSharedUrlCopy, setShowSharedUrlCopy] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  
  // Refs
  const resultCardRef = useRef<HTMLDivElement>(null);
  const fullResultRef = useRef<HTMLDivElement>(null);
  const photoCardRef = useRef<HTMLDivElement>(null);
  
  // Calculate star rating if analysis is available
  const starRating = analysis ? calculateStarRating(analysis.overallScore) : { fullStars: 0, hasHalfStar: false };
  
  // Detect if we're viewing a specific shared analysis (direct URL)
  const pathParts = location.split('/');
  const analysisId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;
  const isSharedResult = analysisId && analysisId !== 'results';

  // Function to ensure analysis object has correct structure
  const ensureAnalysisStructure = (analysis: any): AnalysisResult => {
    // Create a safe default structure that matches the schema
    const safeAnalysis: AnalysisResult = {
      summary: analysis?.summary || '',
      overallScore: analysis?.overallScore || 0,
      detectedGenre: analysis?.detectedGenre || 'Unknown',
      tags: analysis?.tags || [],
      categoryScores: {
        composition: analysis?.categoryScores?.composition || 0,
        lighting: analysis?.categoryScores?.lighting || 0,
        color: analysis?.categoryScores?.color || 0,
        focus: analysis?.categoryScores?.focus || 0,
        creativity: analysis?.categoryScores?.creativity || 0
      },
      analysis: {
        overall: {
          text: analysis?.analysis?.overall?.text || '',
          strengths: Array.isArray(analysis?.analysis?.overall?.strengths) 
            ? analysis.analysis.overall.strengths 
            : [],
          improvements: Array.isArray(analysis?.analysis?.overall?.improvements) 
            ? analysis.analysis.overall.improvements 
            : [],
          modifications: analysis?.analysis?.overall?.modifications || ''
        },
        composition: {
          text: analysis?.analysis?.composition?.text || '', 
          suggestions: analysis?.analysis?.composition?.suggestions || ''
        },
        lighting: {
          text: analysis?.analysis?.lighting?.text || '', 
          suggestions: analysis?.analysis?.lighting?.suggestions || ''
        },
        color: {
          text: analysis?.analysis?.color?.text || '', 
          suggestions: analysis?.analysis?.color?.suggestions || ''
        },
        focus: {
          text: analysis?.analysis?.focus?.text || '', 
          suggestions: analysis?.analysis?.focus?.suggestions || ''
        },
        creativity: {
          text: analysis?.analysis?.creativity?.text || '', 
          suggestions: analysis?.analysis?.creativity?.suggestions || ''
        },
        genreSpecific: analysis?.analysis?.genreSpecific ? {
          text: analysis.analysis.genreSpecific.text || '',
          suggestions: analysis.analysis.genreSpecific.suggestions || ''
        } : undefined
      }
    };

    return safeAnalysis;
  };

  // Function to fetch analysis by ID
  const fetchAnalysisById = async (id: string) => {
    console.log(`Fetching analysis with ID: ${id}`);
    setLoading(true);
    try {
      // 분석 데이터 가져오기
      const response = await fetch(`/api/analyses/${id}`);
      console.log(`Analysis API response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analysis: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Analysis API response data:', data);
      
      if (data.success && data.analysis) {
        console.log('Fetched analysis data:', data.analysis);
        
        // 분석 컨텐츠 처리
        let analysisResult;
        
        // 분석이 문자열(저장된 JSON)인지 객체인지 확인
        if (typeof data.analysis.analysis === 'string') {
          try {
            console.log('Parsing analysis string to JSON');
            // 너무 긴 문자열일 경우 로그를 축약해서 출력
            const displayContent = data.analysis.analysis.length > 200 
              ? data.analysis.analysis.substring(0, 200) + '...' 
              : data.analysis.analysis;
            console.log('Raw analysis content (truncated):', displayContent);
            
            analysisResult = JSON.parse(data.analysis.analysis);
          } catch (parseError) {
            console.error('Error parsing analysis JSON:', parseError);
            
            // 원본 데이터가 JSON이 아닌 경우 또는 구조가 다른 경우 처리
            console.log('Trying to use analysis as direct content...');
            
            // API 응답에서 직접 필요한 필드를 사용
            analysisResult = {
              summary: data.analysis.summary || '',
              overallScore: data.analysis.overallScore || 0,
              detectedGenre: data.analysis.detectedGenre || '',
              tags: data.analysis.tags || []
            };
          }
        } else {
          console.log('Using analysis content as object already');
          // 이미 객체인 경우 그대로 사용
          analysisResult = data.analysis.analysis;
        }
        
        // 구조적으로 안전한 분석 객체 생성
        const safeAnalysis = ensureAnalysisStructure({
          ...analysisResult,
          // 기본 분석 메타데이터 사용
          summary: data.analysis.summary || analysisResult.summary,
          overallScore: data.analysis.overallScore || analysisResult.overallScore,
          detectedGenre: data.analysis.detectedGenre || analysisResult.detectedGenre,
          tags: data.analysis.tags || analysisResult.tags
        });
        
        // 페르소나 정보 설정
        setPersonaKey(data.analysis.persona || 'supportive-friend');
        
        // 분석 결과 설정
        setAnalysis(safeAnalysis);
        
        // 사진 정보 가져오기
        if (data.analysis.photoId) {
          console.log(`Fetching photo data for ID: ${data.analysis.photoId}`);
          const photoResponse = await fetch(`/api/photos/${data.analysis.photoId}`);
          
          if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            console.log('Photo data:', photoData);
            if (photoData.success && photoData.photo) {
              setPhoto(photoData.photo);
            }
          } else {
            console.error(`Failed to fetch photo: HTTP ${photoResponse.status}`);
          }
        }
      } else {
        throw new Error(data.message || 'No analysis data returned from API');
      }
    } catch (error: any) {
      console.error('Error fetching analysis:', error);
      setError(error.message || 'Failed to load analysis results');
      toast({
        title: t('results.errors.loadFailed'),
        description: error.message || t('results.errors.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load analysis data from session storage or URL parameter
  useEffect(() => {
    console.log('ResultsPage mounting, checking for analysis data');
    
    const init = async () => {
      // 특정 분석 ID가 URL에 있는 경우 (공유된 링크)
      if (isSharedResult && analysisId) {
        console.log(`Loading shared analysis with ID: ${analysisId}`);
        await fetchAnalysisById(analysisId);
        return;
      }
      
      // 세션 스토리지에서 분석 결과 ID 확인
      const resultData = sessionStorage.getItem('analysisResult');
      if (!resultData) {
        console.log('No analysis data in session storage');
        setError(t('results.errors.noAnalysis'));
        setLoading(false);
        return;
      }
      
      try {
        const { analysisId, photoId } = JSON.parse(resultData);
        console.log(`Found analysis ID in session: ${analysisId}`);
        
        if (!analysisId) {
          throw new Error('No analysis ID available');
        }
        
        await fetchAnalysisById(analysisId);
      } catch (error: any) {
        console.error('Error loading analysis from session:', error);
        setError(error.message || t('results.errors.invalidData'));
        setLoading(false);
      }
    };
    
    init();
  }, [location]);
  
  // Update persona information when persona key changes
  useEffect(() => {
    if (personaKey) {
      // Use utility functions to get persona information
      setPersonaName(getPersonaDisplayName(personaKey));
      setCharacterName(getCharacterName(personaKey));
      setCharacterImagePath(getCharacterImagePath(personaKey));
    }
  }, [personaKey]);
  
  // Handle sharing result card as image
  const handleShare = async () => {
    if (!resultCardRef.current) return;
    setShowShareOptions(false);
    
    // Start progress animation
    setShareProgress(10);
    
    try {
      setShareProgress(30);
      
      // Convert element to data URL
      const dataUrl = await elementToDataURL(resultCardRef.current);
      setShareProgress(80);
      
      if (dataUrl) {
        // Share the image if platform supports it
        await shareElementAsPNG(dataUrl, 'lens-mirror-analysis.png', 'Photo Analysis');
        setShareProgress(100);
        
        setTimeout(() => {
          setShareProgress(0);
        }, 1000);
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      setShareProgress(0);
      toast({
        title: t('results.errors.shareFailed'),
        description: t('results.errors.tryAgain'),
        variant: 'destructive',
      });
    }
  };
  
  // Handle downloading result card as image
  const handleDownload = async (elementRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!elementRef.current) return;
    setShowDownloadOptions(false);
    
    try {
      await downloadElementAsPNG(elementRef.current, filename);
      toast({
        title: t('results.download.success'),
        description: t('results.download.saved'),
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: t('results.errors.downloadFailed'),
        description: t('results.errors.tryAgain'),
        variant: 'destructive',
      });
    }
  };
  
  // Return loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">{t('results.loading.title')}</h1>
            <p className="text-slate-500">{t('results.loading.description')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Return error state
  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">{t('results.errors.title')}</h1>
            <p className="text-slate-500 mb-6">{error || t('results.errors.noData')}</p>
            <Button 
              onClick={() => navigate('/options')}
              variant="outline"
              className="mx-auto"
            >
              {t('results.errors.tryAgain')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* Mobile Nav */}
      <div className="bg-white shadow-sm sticky top-0 z-50 lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <span className="font-semibold text-slate-900">Lens Mirror</span>
          </Link>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-md z-50 animate-in slide-in-from-top">
            <div className="container px-4 py-4 mx-auto">
              <div className="space-y-2">
                <Link href="/" className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md">
                  <Home className="h-5 w-5 text-slate-500" />
                  <span>{t('nav.home')}</span>
                </Link>
                
                <Link href="/upload" className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md">
                  <Upload className="h-5 w-5 text-slate-500" />
                  <span>{t('nav.upload')}</span>
                </Link>
                
                {isAuthenticated && (
                  <Link href="/profile" className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-md">
                    <CircleUser className="h-5 w-5 text-slate-500" />
                    <span>{t('nav.profile')}</span>
                  </Link>
                )}
                
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <LanguageSelector size="sm" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Desktop Nav */}
      <div className="hidden lg:block">
        <Navigation />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Results Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('results.title')}</h1>
            <p className="text-slate-600 max-w-2xl mx-auto">{t('results.subtitle')}</p>
          </div>
          
          {/* Character & Score Card */}
          <div className="mb-8">
            <div 
              ref={resultCardRef}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              {/* Character Header */}
              <div className="relative bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  {/* Character Avatar */}
                  <div className="w-20 h-20 rounded-full border-2 border-white overflow-hidden bg-white flex-shrink-0">
                    <img 
                      src={characterImagePath} 
                      alt={characterName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error("캐릭터 이미지 로드 실패:", target.src);
                        target.src = "/images/avatar-placeholder.png"; // Fallback image
                      }}
                    />
                  </div>
                  
                  {/* Character Details */}
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-1">{characterName}</h2>
                    <p className="text-white/80 text-sm mb-2 flex items-center justify-center md:justify-start">
                      <span className="mr-1.5">{getPersonaDisplayInfo(personaKey).emoji}</span>
                      {personaName}
                    </p>
                    <div className="flex items-center gap-1.5 text-amber-300 justify-center md:justify-start">
                      {/* Star Rating */}
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>
                          {i < starRating.fullStars ? (
                            <Star className="w-5 h-5 fill-current" />
                          ) : starRating.hasHalfStar && i === starRating.fullStars ? (
                            <Star className="w-5 h-5 fill-current opacity-60" />
                          ) : (
                            <Star className="w-5 h-5 stroke-current fill-transparent opacity-40" />
                          )}
                        </span>
                      ))}
                      <span className="ml-1 text-sm font-medium text-white/80">
                        {analysis.overallScore}/100
                      </span>
                    </div>
                  </div>
                  
                  {/* Overall Score Circle */}
                  <div className="md:ml-auto mt-3 md:mt-0 flex-shrink-0">
                    <div className="w-20 h-20 rounded-full border-4 border-primary-gradient flex items-center justify-center bg-primary-gradient text-white font-bold text-2xl">
                      {analysis.overallScore}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Analysis Summary */}
              <div className="p-6">
                {/* Photo preview & genre tags */}
                {photo && (
                  <div className="mb-6 flex flex-col sm:flex-row gap-6">
                    {/* Photo thumbnail */}
                    <div className="w-full sm:w-1/3 aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={
                          photo.firebaseDisplayUrl || 
                          photo.base64DisplayImage || 
                          (photo.displayImagePath ? 
                            photo.displayImagePath.startsWith('http') ? 
                              photo.displayImagePath : 
                              `${window.location.origin}${photo.displayImagePath.startsWith('/') ? '' : '/'}${photo.displayImagePath}` 
                            : undefined)
                        } 
                        alt={t('results.photoAnalyzed')} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/600x400/e2e8f0/64748b?text=Image+unavailable";
                        }}
                      />
                    </div>
                    
                    {/* Analysis meta info */}
                    <div className="flex flex-col flex-grow">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {analysis.summary}
                      </h3>
                      
                      {/* Genre & Tags */}
                      <div className="mt-2 mb-4">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/80 text-white">
                            {analysis.detectedGenre}
                          </span>
                          {analysis.tags.map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Scores Radar Chart */}
                      <div className="mt-auto">
                        <RadarChart 
                          data={{
                            composition: analysis.categoryScores.composition || 0,
                            lighting: analysis.categoryScores.lighting || 0,
                            color: analysis.categoryScores.color || 0,
                            focus: analysis.categoryScores.focus || 0,
                            creativity: analysis.categoryScores.creativity || 0,
                          }}
                          maxValue={100}
                          size={200}
                          labels={{
                            composition: t('categories.composition'),
                            lighting: t('categories.lighting'),
                            color: t('categories.color'),
                            focus: t('categories.focus'),
                            creativity: t('categories.creativity'),
                          }}
                          className="mx-auto"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Overall Analysis */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
                    <Lightbulb className="w-5 h-5 text-primary mr-2" />
                    {t('results.overallAnalysis')}
                  </h3>
                  <p className="text-slate-700 mb-4 whitespace-pre-line">
                    {analysis.analysis.overall.text}
                  </p>
                  
                  {/* Strengths & Areas for Improvement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Strengths */}
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <h4 className="font-medium text-emerald-700 mb-2">{t('results.strengths')}</h4>
                      <ul className="space-y-2">
                        {analysis.analysis.overall.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-emerald-500 mr-2">✓</span>
                            <span className="text-slate-700 text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Areas for Improvement */}
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h4 className="font-medium text-amber-700 mb-2">{t('results.improvements')}</h4>
                      <ul className="space-y-2">
                        {analysis.analysis.overall.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-amber-500 mr-2">→</span>
                            <span className="text-slate-700 text-sm">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Suggested Modifications */}
                {analysis.analysis.overall.modifications && (
                  <div className="mb-6 bg-slate-50 rounded-lg p-4">
                    <h3 className="text-md font-semibold text-slate-800 mb-2">
                      {t('results.modifications')}
                    </h3>
                    <div className="text-slate-700 text-sm whitespace-pre-line">
                      {analysis.analysis.overall.modifications.split(',').map((item, index) => (
                        <div key={index} className="flex items-start mt-1">
                          <span className="text-primary mr-2">•</span>
                          <span>{item.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mt-6">
                  {/* Download Button */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    >
                      <Download className="w-4 h-4" />
                      {t('results.download.button')}
                    </Button>
                    
                    {/* Download Options Dropdown */}
                    {showDownloadOptions && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => handleDownload(resultCardRef, 'lens-mirror-results.png')}
                        >
                          {t('results.download.summary')}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Share Button */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setShowShareOptions(!showShareOptions)}
                    >
                      <Share2 className="w-4 h-4" />
                      {t('results.share.button')}
                    </Button>
                    
                    {/* Share Options Dropdown */}
                    {showShareOptions && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          onClick={handleShare}
                        >
                          {t('results.share.asImage')}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Share Progress Indicator */}
                  {shareProgress > 0 && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-medium text-slate-900 mb-4">{t('results.share.preparing')}</h3>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${shareProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-slate-500 text-sm text-center">{t('results.share.pleaseWait')}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Analyze Another Button */}
                  <Button 
                    onClick={() => navigate('/upload')}
                    className="ml-auto flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('results.analyzeAnother')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Analysis Details Sections (Expandable) */}
          <div className="space-y-4">
            {/* Toggle button */}
            <div className="text-center">
              <Button
                variant="outline"
                className="flex items-center gap-2 mx-auto"
                onClick={() => setShowFullContent(!showFullContent)}
              >
                {showFullContent ? (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    {t('results.hideDetails')}
                  </>
                ) : (
                  <>
                    <CircleDashed className="w-4 h-4" />
                    {t('results.showDetails')}
                  </>
                )}
              </Button>
            </div>
            
            {/* Detailed Analysis Sections */}
            {showFullContent && (
              <div className="space-y-6 mt-4">
                {/* Composition */}
                <AnalysisSection
                  title={t('categories.composition')}
                  score={analysis.categoryScores.composition}
                  text={analysis.analysis.composition.text}
                  suggestions={analysis.analysis.composition.suggestions}
                />
                
                {/* Lighting */}
                <AnalysisSection
                  title={t('categories.lighting')}
                  score={analysis.categoryScores.lighting}
                  text={analysis.analysis.lighting.text}
                  suggestions={analysis.analysis.lighting.suggestions}
                />
                
                {/* Color */}
                <AnalysisSection
                  title={t('categories.color')}
                  score={analysis.categoryScores.color}
                  text={analysis.analysis.color.text}
                  suggestions={analysis.analysis.color.suggestions}
                />
                
                {/* Focus & Clarity */}
                <AnalysisSection
                  title={t('categories.focus')}
                  score={analysis.categoryScores.focus}
                  text={analysis.analysis.focus.text}
                  suggestions={analysis.analysis.focus.suggestions}
                />
                
                {/* Creativity */}
                <AnalysisSection
                  title={t('categories.creativity')}
                  score={analysis.categoryScores.creativity}
                  text={analysis.analysis.creativity.text}
                  suggestions={analysis.analysis.creativity.suggestions}
                />
                
                {/* Genre Specific Analysis */}
                {analysis.analysis.genreSpecific && (
                  <AnalysisSection
                    title={`${analysis.detectedGenre} ${t('categories.specific')}`}
                    text={analysis.analysis.genreSpecific.text}
                    suggestions={analysis.analysis.genreSpecific.suggestions}
                    isGenreSpecific
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Upload Another Photo CTA */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('results.readyForMore')}</h3>
            <p className="text-slate-600 mb-4">{t('results.uploadAnother')}</p>
            <Button
              onClick={() => navigate('/upload')}
              size="lg"
              className="flex items-center gap-2 mx-auto"
            >
              <Upload className="w-5 h-5" />
              {t('results.uploadNew')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;