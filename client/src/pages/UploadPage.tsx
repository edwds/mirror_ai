import React, { useState, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { convertToBase64 } from '@/lib/uploadUtils';
import { apiRequest } from '@/lib/queryClient';
import { AdSense } from '@/components/AdSense';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const UploadPage: React.FC = () => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFileChange = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('upload.errors.invalidType'),
        description: t('upload.errors.mustBeImage'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t('upload.errors.fileTooLarge'),
        description: t('upload.errors.maxSize', { size: '25MB' }),
        variant: 'destructive',
      });
      return;
    }

    // Set the file and generate preview
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [t, toast]);

  // Handle drop event
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }

    if (dropzoneRef.current) {
      dropzoneRef.current.classList.remove('border-primary');
    }
  }, [handleFileChange]);

  // Handle drag events for visual feedback
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.add('border-primary');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.remove('border-primary');
    }
  }, []);

  // Handle file selection from browse button
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle input onChange
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  }, [handleFileChange]);

  // Handle clicking "Change photo" button
  const handleChangePhoto = useCallback(() => {
    setImageFile(null);
    setPreview(null);
  }, []);

  // Handle continue to options
  const handleContinue = useCallback(async () => {
    if (!imageFile || !preview) return;

    try {
      setIsUploading(true);

      // Convert image to base64
      const base64Image = await convertToBase64(imageFile);

      // 현재 언어 정보 가져오기
      const currentLanguage = localStorage.getItem('uiLanguage') || 'ko';

      // Upload to backend with language information
      const data = await apiRequest('/api/photos/upload', 'POST', {
        image: base64Image,
        originalFilename: imageFile.name,
        language: currentLanguage
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Store relevant data in session storage for the next steps
      // 옵션 페이지에서 직접 사용할 수 있도록 필요한 데이터만 저장
      const sanitizedData = {
        id: data.photo.id,
        originalFilename: data.photo.originalFilename,
        displayImagePath: data.photo.displayImagePath,
        base64DisplayImage: data.photo.base64DisplayImage || data.base64Image, // 원본 이미지 사용
        base64AnalysisImage: data.base64AnalysisImage,
        firebaseDisplayUrl: data.photo.firebaseDisplayUrl,
        exifData: data.photo.exifData,
        photoGenreInfo: data.photoGenreInfo // 이미지 장르 및 분석 가능 여부 정보
      };

      try {
        // Use a try-catch to handle any JSON serialization errors
        const jsonString = JSON.stringify(sanitizedData);
        sessionStorage.setItem('uploadedPhoto', jsonString);
      } catch (jsonError) {
        console.error('Error storing data in session storage:', jsonError);
        // Try with a simpler object, excluding the EXIF data which may be problematic
        const fallbackData = {
          id: data.photo.id,
          originalFilename: data.photo.originalFilename,
          displayImagePath: data.photo.displayImagePath,
          base64DisplayImage: data.photo.base64DisplayImage || data.base64Image, // 원본 이미지 사용
          base64AnalysisImage: data.base64AnalysisImage,
          firebaseDisplayUrl: data.photo.firebaseDisplayUrl,
          // Include minimal EXIF data
          exifData: { 
            cameraInfo: data.photo.exifData?.cameraInfo || '', 
            dimensions: data.photo.exifData?.dimensions || {} 
          },
          photoGenreInfo: data.photoGenreInfo // 이미지 장르 및 분석 가능 여부 정보
        };
        sessionStorage.setItem('uploadedPhoto', JSON.stringify(fallbackData));

        toast({
          title: t('upload.warnings.exifDataIssue'),
          description: t('upload.warnings.limitedExifData'),
        });
      }

      // Navigate to options page
      navigate('/options');
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('upload.errors.tryAgain');
      toast({
        title: t('upload.errors.uploadFailed'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [imageFile, preview, navigate, toast, t]);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          {/* 뒤로가기 버튼 삭제됨 */}
          <h2 className="text-3xl font-bold text-slate-900 text-center">{t('upload.title')}</h2>

          <div className="mt-8 w-full max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              {/* 이미지 영역: 고정된 크기로 유지 - aspect-square 사용 */}
              <div 
                className="relative w-full aspect-square border-b border-slate-100"
              >
                {!preview ? (
                  // Upload Area - Empty State
                  <div 
                    ref={dropzoneRef}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 cursor-pointer transition-colors p-6"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleBrowseClick}
                  >
                    <div className="space-y-4 text-center">
                      <Upload className="mx-auto h-16 w-16 text-slate-400" />
                      <p className="text-slate-600">{t('upload.dragDrop')}</p>
                      <p className="text-slate-400 text-sm">{t('upload.or')}</p>
                      <div className="flex justify-center w-full">
                        <Button type="button" className="px-4 py-2">
                          {t('upload.browse')}
                        </Button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/jpeg,image/png" 
                        onChange={handleInputChange}
                      />
                      <p className="text-slate-400 text-xs">{t('upload.supportedFormats', 'Supported formats: JPG, PNG (max 25MB)')}</p>
                    </div>
                  </div>
                ) : (
                  // Preview Area - 같은 컨테이너에 이미지로 채움
                  <>
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                    
                    {/* 그라데이션 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-white font-bold text-xl line-clamp-1">{t('upload.preview')}</h3>
                        <p className="text-white/80 text-sm">{imageFile?.name || t('upload.readyToAnalyze')}</p>
                      </div>
                    </div>
                    
                    {/* 변경 버튼 오버레이 */}
                    <button 
                      onClick={handleChangePhoto}
                      className="absolute top-3 right-3 bg-white/90 text-slate-800 hover:bg-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                    >
                      {t('upload.changePhoto')}
                    </button>
                  </>
                )}
              </div>
              
              {/* 하단 액션 영역 */}
              <div className="p-5">
                {preview ? (
                  <Button 
                    onClick={handleContinue}
                    className="w-full py-6 text-lg"
                    disabled={isUploading}
                    size="lg"
                  >
                    {isUploading ? t('upload.uploading') : t('upload.continue')}
                  </Button>
                ) : (
                  <p className="text-center text-slate-500">{t('upload.selectPhoto', '사진을 선택하세요')}</p>
                )}
              </div>
            </div>
            
            {/* AdSense 컴포넌트 */}
            <div className="mt-6 text-center">
              <AdSense slot="XXXXXXXXXX" /> {/* Placeholder AdSense component */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UploadPage;