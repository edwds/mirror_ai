import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar';
import PhotoInfoCard from '@/components/PhotoInfoCard';
import PersonaCarouselSection from '@/components/PersonaCarouselSection';
import AnalyzeButton from '@/components/AnalyzeButton';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/PageTitle';
import { personaDisplayInfos } from '@/lib/personaUtils';

const OptionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const focusPoint = 'balanced';

  useEffect(() => {
    const storedPhoto = sessionStorage.getItem('uploadedPhoto');
    if (!storedPhoto) {
      toast({
        title: t('options.errors.noPhoto'),
        description: t('options.errors.pleaseUpload'),
        variant: 'destructive',
      });
      navigate('/upload');
      return;
    }
    setPhoto(JSON.parse(storedPhoto));
  }, [navigate, toast, t]);

  const handleAnalyzeClick = () => {
    if (!photo || !persona) return;
    setIsSubmitting(true);
    sessionStorage.setItem(
      'analysisOptions',
      JSON.stringify({
        persona,
        detailLevel: 'detailed',
        language: i18n.language,
        focusPoint,
      })
    );
    sessionStorage.setItem('uploadedPhotoId', photo.id.toString());
    sessionStorage.setItem('selectedPersona', persona);
    sessionStorage.setItem('selectedLanguage', i18n.language);
    navigate('/analyzing');
  };

  if (!photo) return <div>Loading...</div>;

  return (
    <section className="min-h-screen bg-white flex flex-col">
      <Navbar transparent={true} />

      {/* 📌 Title: 가운데 정렬 + 고정 폭 */}
      <div className="w-full max-w-3xl mx-auto mt-24 mb-8 px-4 text-center">
        <PageTitle
          title={t('options.title')}
          subtitle={t('options.subtitle')}
        />
      </div>

      {/* 📌 Content: 가로 최대한 활용하되 내부 여백 조정 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-full max-w-screen-xl">
          <PersonaCarouselSection
            selected={persona ?? ''}
            onSelect={setPersona}
            language={i18n.language}
            onNext={(selectedKey) => {
              const selectedPersonaObj = personaDisplayInfos.find(p => p.key === selectedKey);

              // ✅ 페르소나 저장
              if (selectedPersonaObj) {
                sessionStorage.setItem("selectedPersona", selectedPersonaObj.key);
                sessionStorage.setItem("selectedPersonaData", JSON.stringify(selectedPersonaObj));
              }

              // ✅ 사진 저장 (photo는 OptionsPage의 useState에 있음)
              if (photo) {
                sessionStorage.setItem("uploadedPhoto", JSON.stringify(photo));
                sessionStorage.setItem("uploadedPhotoId", photo.id.toString());
              }

              sessionStorage.setItem("selectedLanguage", i18n.language);
              sessionStorage.setItem("selectedGenre", 'general'); // 필요 시 설정
              navigate("/analyzing");
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default OptionsPage;