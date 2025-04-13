import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getPersonaDisplayInfo, getCharacterName, getRandomLoadingMessage } from '@/lib/personaUtils';

const apiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
};

const LoadingPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const persona = sessionStorage.getItem('selectedPersona') || 'supportive-friend';
  const language = sessionStorage.getItem('selectedLanguage') || 'ko';
  const genre = sessionStorage.getItem('selectedGenre') || 'general';
  const photoId = parseInt(sessionStorage.getItem('uploadedPhotoId') || '0', 10);

  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const characterInfo = getPersonaDisplayInfo(persona);
  const characterName = getCharacterName(persona);
  const characterImage = characterInfo.imagePath.replace(/\.png|\.jpg/, '-removebg.png');

  // 로딩 메시지 교체
  useEffect(() => {
    setMessage(getRandomLoadingMessage(persona, language));
    const interval = setInterval(() => {
      setMessage(getRandomLoadingMessage(persona, language));
    }, 3000);
    return () => clearInterval(interval);
  }, [persona, language]);

  // 진행률 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + (prev > 80 ? 1 : prev > 60 ? 2 : prev > 30 ? 3 : 5);
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // 분석 요청
  useEffect(() => {
    const startAnalysis = async () => {
      try {
        const photoRes = await apiRequest(`/api/photos/${photoId}`);

        const imageUrl =
          photoRes?.photo?.firebaseAnalysisUrl ||  // ✅ 분석용 이미지
          photoRes?.photo?.firebaseDisplayUrl ||   // ✅ 표시용 이미지 (fallback)
          photoRes?.photo?.displayImagePath;       // ✅ 로컬 경로 fallback

        if (!imageUrl) throw new Error('No image URL found');

        const response = await apiRequest('/api/photos/analyze', {
          method: 'POST',
          body: JSON.stringify({
            photoId,
            persona,
            language,
            genre,
            detailLevel: 'detailed',
            imageUrl,
          }),
        });

        if (!response?.success || !response?.analysis) {
          throw new Error(response?.message || t('loading.errors.analysisFailed'));
        }

        // 응답에서 ID가 있으면 사용하고 없으면 임시 ID 생성
        const analysisId = response.analysis.id || Date.now();
        
        sessionStorage.setItem('analysisResult', JSON.stringify({
          analysisId: analysisId,
          photoId,
          timestamp: new Date().toISOString(),
        }));
        sessionStorage.setItem('lastAnalysisData', JSON.stringify(response.analysis));

        setProgress(100);
        // 서버에서 분석 ID를 받았으면 ID와 함께 이동, 아니면 그냥 이동
        setTimeout(() => {
          if (response.analysis && response.analysis.id) {
            navigate(`/analysis/${response.analysis.id}`);
          } else {
            navigate('/analysis');
          }
        }, 500);
      } catch (err: any) {
        toast({
          title: t('loading.errors.analysisFailed'),
          description: err.message || t('loading.errors.tryAgain'),
          variant: 'destructive',
        });
        navigate('/options');
      }
    };

    setTimeout(startAnalysis, 800); // 진입 후 약간의 딜레이
  }, [photoId, persona, language, genre, navigate, toast, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg">
          <div className={`relative h-36 ${characterInfo.color}`}>
            <div className="absolute inset-0 flex items-center p-6">
              <div className="flex items-center">
                <div className="h-20 w-20 mr-4">
                  <img
                    src={characterImage}
                    alt={characterName}
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-bold">{characterName}</h2>
                  <p className="text-sm font-medium opacity-90 inline-flex items-center">
                    <span className="mr-1.5">{characterInfo.emoji}</span>
                    {characterInfo.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <div className="flex justify-between mb-1 text-sm font-medium text-slate-700">
                <span>AI 분석 중...</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4 shadow-inner">
              <p className="text-slate-700 animate-pulse font-medium">{message}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-500 hover:text-slate-700"
              onClick={() => navigate('/options')}
              disabled={progress > 80}
            >
              {progress > 80 ? t('loading.almostDone') : t('loading.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;