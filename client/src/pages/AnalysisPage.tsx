import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPersonaDisplayInfo, getCharacterName } from "@/lib/personaUtils";
import { formatMarkdownEmphasis, createMarkup } from "@/lib/textUtils";
import { toast } from "@/hooks/use-toast";
import RadarChart from "@/components/RadarChart";
import Navigation from "@/components/Navigation";
import AnalysisSection from "@/components/AnalysisSection";
import { OpinionDialog } from "@/components/OpinionDialog";
import { useAuth } from "@/hooks/use-auth";
import {
  Camera,
  ChevronDown,
  Sparkles,
  Info,
  Download,
  Star,
  Share2,
} from "lucide-react";

interface AnalysisPageProps {}

const AnalysisPage: React.FC<AnalysisPageProps> = () => {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const [match, params] = useRoute("/analysis/:id");
  const [matchAlt, paramsAlt] = useRoute("/analyses/:id");
  const { isAuthenticated } = useAuth();
  
  // URL에서 분석 ID 가져오기
  const urlAnalysisId = match ? params?.id : matchAlt ? paramsAlt?.id : null;

  const [analysis, setAnalysis] = useState<any>(null);
  const [photo, setPhoto] = useState<any>(null);
  const [opinion, setOpinion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>(["overall"]);

  // -----------------------------
  // (1) 분석 데이터/사진 불러오기
  // -----------------------------
  const loadAnalysisData = async () => {
    setIsLoading(true);

    try {
      const analysisStr = sessionStorage.getItem("analysisResult");
      const lastAnalysisStr = sessionStorage.getItem("lastAnalysisData");

      if (analysisStr && lastAnalysisStr) {
        const parsedAnalysis = JSON.parse(lastAnalysisStr);
        const { photoId } = JSON.parse(analysisStr);

        const analysesRes = await apiRequest(
          `/api/analyses?photoId=${photoId}`,
          "GET",
        );
        if (analysesRes.success && analysesRes.analyses?.length) {
          parsedAnalysis.id = analysesRes.analyses[0].id;
        }
        setAnalysis(parsedAnalysis);

        const photoRes = await apiRequest(`/api/photos/${photoId}`, "GET");
        if (photoRes.success) setPhoto(photoRes.photo);

        if (analysesRes?.opinion) {
          setOpinion(analysesRes.opinion);
        }
        return;
      }

      if (analysisStr) {
        const { analysisId, photoId } = JSON.parse(analysisStr);
        if (!photoId) {
          throw new Error("유효하지 않은 세션 스토리지 데이터입니다.");
        }

        // 분석 ID가 없는 경우를 처리 (직접 분석 결과 사용)
        if (!analysisId) {
          // lastAnalysisData가 없다면 오류
          if (!sessionStorage.getItem("lastAnalysisData")) {
            throw new Error("분석 데이터를 찾을 수 없습니다.");
          }
          
          const parsedAnalysis = JSON.parse(sessionStorage.getItem("lastAnalysisData") || "{}");
          setAnalysis(parsedAnalysis);
          
          // 사진 정보 가져오기
          const photoRes = await apiRequest(`/api/photos/${photoId}`, "GET");
          if (photoRes.success) setPhoto(photoRes.photo);
          return;
        }

        const analysisRes = await apiRequest(`/api/analyses/${analysisId}`, "GET");
        if (!analysisRes.success || !analysisRes.analysis) {
          throw new Error("분석 데이터를 불러오지 못했습니다.");
        }
        setAnalysis(analysisRes.analysis);

        if (analysisRes.opinion) {
          setOpinion(analysisRes.opinion);
        }

        const photoRes = await apiRequest(`/api/photos/${photoId}`, "GET");
        if (!photoRes.success || !photoRes.photo) {
          throw new Error("사진 데이터를 불러오지 못했습니다.");
        }
        setPhoto(photoRes.photo);

        return;
      }

      const uploadedPhotoId = parseInt(
        sessionStorage.getItem("uploadedPhotoId") || "0",
        10,
      );
      if (uploadedPhotoId) {
        const analysesRes = await apiRequest(
          `/api/analyses?photoId=${uploadedPhotoId}`,
          "GET",
        );
        if (analysesRes.success && analysesRes.analyses?.length) {
          setAnalysis(analysesRes.analyses[0]);

          const photoRes = await apiRequest(
            `/api/photos/${uploadedPhotoId}`,
            "GET",
          );
          if (photoRes.success && photoRes.photo) {
            setPhoto(photoRes.photo);
            return;
          }
        }
      }
      navigate("/options");
    } catch (error) {
      console.error("분석 데이터 로딩 중 오류:", error);
      navigate("/options");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // URL에서 가져온 ID를 우선 사용
    if (urlAnalysisId) {
      loadAnalysisFromId(parseInt(urlAnalysisId, 10));
    } else {
      loadAnalysisData();
    }
  }, [navigate, urlAnalysisId]);
  
  // URL에서 얻은 분석 ID로 데이터 로드
  const loadAnalysisFromId = async (analysisId: number) => {
    setIsLoading(true);
    try {
      const analysisRes = await apiRequest(`/api/analyses/${analysisId}`, "GET");
      if (!analysisRes.success || !analysisRes.analysis) {
        throw new Error("분석 데이터를 불러오지 못했습니다.");
      }
      setAnalysis(analysisRes.analysis);
      
      if (analysisRes.opinion) {
        setOpinion(analysisRes.opinion);
      }
      
      // 분석에 연결된 사진 ID가 있다면 해당 사진 정보 로드
      if (analysisRes.analysis.photoId) {
        const photoRes = await apiRequest(`/api/photos/${analysisRes.analysis.photoId}`, "GET");
        if (photoRes.success && photoRes.photo) {
          setPhoto(photoRes.photo);
        } else {
          throw new Error("사진 데이터를 불러오지 못했습니다.");
        }
      }
    } catch (error) {
      console.error("분석 데이터 로딩 중 오류:", error);
      toast({
        title: "오류",
        description: "분석 데이터를 불러오는데 문제가 발생했습니다.",
        variant: "destructive"
      });
      navigate("/options");
    } finally {
      setIsLoading(false);
    }
  };

  // 의견 새로고침
  const refreshAnalysis = async () => {
    if (!analysis?.id) return;
    try {
      const analysisResponse = await apiRequest(
        `/api/analyses/${analysis.id}`,
        "GET",
      );
      if (analysisResponse.success && analysisResponse.opinion) {
        setOpinion(analysisResponse.opinion);
      }
    } catch (error) {
      console.error("재로딩 오류:", error);
    }
  };

  // 섹션 토글
  const toggleSection = (section: string) => {
    setExpanded((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  if (isLoading || !analysis || !photo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="py-16 text-center">
          <div className="animate-pulse">
            <div className="h-12 w-48 bg-slate-200 rounded-lg mx-auto mb-4"></div>
            <div className="h-6 w-64 bg-slate-200 rounded-lg mx-auto"></div>
            <div className="mt-8 text-slate-500">분석 데이터를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  // 페르소나
  const selectedPersona =
    analysis.persona ||
    analysis.options?.persona ||
    sessionStorage.getItem("selectedPersona") ||
    "supportive-friend";
  const personaInfo = getPersonaDisplayInfo(selectedPersona);
  const characterName = getCharacterName(selectedPersona);

  // 카메라 정보
  const getFormattedCameraInfo = () => {
    if (photo.exifData?.cameraMake && photo.exifData?.cameraModel) {
      const make = photo.exifData.cameraMake.trim();
      const model = photo.exifData.cameraModel.trim();
      if (model.includes(make)) return model;
      return `${make} ${model}`;
    }
    if (photo.exifData?.cameraInfo) {
      const info = photo.exifData.cameraInfo;
      if (info.includes("|")) {
        const [make, model] = info.split("|");
        if (model && model.includes(make.trim())) return model.trim();
        return `${make.trim()} ${model?.trim()}`;
      }
      return info;
    }
    if (photo.cameraInfo) return photo.cameraInfo;
    return "카메라 정보 없음";
  };

  const getPhotoUrl = () => {
    if (photo.firebaseDisplayUrl) return photo.firebaseDisplayUrl;
    if (photo.base64DisplayImage) return photo.base64DisplayImage;
    if (photo.displayImagePath) {
      if (photo.displayImagePath.startsWith("http")) {
        return photo.displayImagePath;
      }
      // 로컬 path
      return `${window.location.origin}${
        photo.displayImagePath.startsWith("/") ? "" : "/"
      }${photo.displayImagePath}`;
    }
    return "";
  };

  // -----------------------------
  // UI 반환
  // -----------------------------
  return (
    <div className="min-h-screen">
      {/* 1) 네비게이션 바 */}
      <Navigation isResultsPage={true} />

      {/* 
        2) 배경 그라데이션 & 파티클, 
           기존 코드에서 사용하셨다면 아래와 비슷한 구조를 꼭 포함해야 합니다.
           (bg-pattern-grid, animate-gradient-x 등은 기존 CSS/플러그인에 의존)
      */}
      <div className="min-h-screen relative pb-16">
        {/* 그라데이션 배경 */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 opacity-90 z-0 animate-gradient-x"></div>

        {/* 패턴/파티클 오버레이 */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-pattern-grid opacity-20"></div>
        </div>

        {/* 실제 콘텐츠를 가운데에 보이게 하는 래퍼(예: pt-32 pb-12) */}
        <div className="relative z-10 pt-32 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {/* 
              (a) 상단 사진 카드 
                  - 중앙 정렬을 위해 max-w-lg 에 mx-auto 
            */}
              <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-0">
                <Card
                  id="photo-card"
                  className="overflow-hidden shadow-2xl rounded-2xl border-0 animate-photo-card-reveal"
                >
                  {/* 이미지 및 점수 */}
                  <div className="relative overflow-hidden aspect-square sm:aspect-auto">
                    <img
                      src={getPhotoUrl()}
                      alt="Analyzed Photo"
                      className="w-full h-full max-h-full md:max-h-[500px] lg:max-h-[600px] object-cover"
                    />

                    {/* 점수 카드 */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 animate-fade-in">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-lg flex flex-col items-center">
                        <span className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                          {analysis.overallScore}
                        </span>
                        <div className="flex items-center mt-0.5 sm:mt-1">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const filled = i < Math.round((analysis.overallScore / 100) * 5);
                            return (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  filled ? "text-amber-500 fill-amber-500" : "text-slate-300"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 요약 & 태그 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:p-6 pb-6 sm:pb-8">
                      <h2 className="text-white text-xl sm:text-3xl font-bold line-clamp-2 mb-2 sm:mb-3 animate-fade-in-up">
                        {analysis.summary}
                      </h2>
                      <div
                        className="flex flex-wrap gap-2 mt-2 sm:mt-4 animate-fade-in-up"
                        style={{ animationDelay: '100ms' }}
                      >
                        {analysis.tags.slice(0, 4).map((tag: string, index: number) => (
                          <span
                            key={tag}
                            className="bg-white/25 backdrop-blur-sm text-white text-xs sm:text-sm px-2.5 py-1 rounded-full"
                            style={{ animationDelay: `${index * 50 + 200}ms` }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 평가 요약 - Strengths, Improvements 텍스트 제거 */}
                  <div className="px-4 sm:px-7 py-5 sm:py-6 bg-white space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 p-2 rounded-full mt-0.5">
                        <Star className="text-emerald-600 h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-slate-700 text-sm line-clamp-2">
                          {analysis.analysis.overall.strengths?.[0] || t("analysis.noStrengths")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-amber-50 p-2 rounded-full mt-0.5">
                        <Sparkles className="text-amber-600 h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-slate-700 text-sm line-clamp-2">
                          {analysis.analysis.overall.improvements?.[0] || t("analysis.noImprovements")}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-2 sm:my-3" />

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                      <Camera size={16} className="flex-shrink-0" />
                      <p className="truncate">{getFormattedCameraInfo()}</p>
                    </div>
                  </div>
                </Card>
              
              {/* 버튼 바 */}
              <div className="flex justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  className="text-slate-600 border-slate-300"
                  onClick={() => {
                    const cardElement = document.getElementById("photo-card");
                    if (!cardElement || !analysis || !photo) return;

                    import("@/utils/htmlToImage")
                      .then((htmlToImage) => {
                        htmlToImage
                          .downloadElementAsPNG(
                            cardElement,
                            `mirror_${analysis.detectedGenre}_${analysis.overallScore}.png`,
                            getPhotoUrl(),
                            {
                              title: analysis.summary,
                              tags: analysis.tags,
                              score: analysis.overallScore,
                              strengths: analysis.analysis?.overall?.strengths,
                              improvements: analysis.analysis?.overall?.improvements,
                              cameraInfo: getFormattedCameraInfo(),
                            }
                          )
                          .then(() => {
                            toast({
                              title: t("save.success"),
                              description: t("save.successDesc"),
                            });
                          })
                          .catch((error) => {
                            console.error(error);
                            fallbackDownload();
                          });
                      })
                      .catch((error) => {
                        console.error(error);
                        fallbackDownload();
                      });

                    function fallbackDownload() {
                      const imgUrl = getPhotoUrl();
                      const link = document.createElement("a");
                      link.href = imgUrl;
                      link.download = `${analysis.detectedGenre}_${analysis.overallScore}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast({
                        title: t("save.success"),
                        description: t("save.successDesc"),
                      });
                    }
                  }}
                >
                  <Download size={18} />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => {
                    // 공유할 이미지 URL 가져오기
                    const imageUrl = getPhotoUrl();
                    
                    // 공유 문구 구성: [mirror] + score + summary 문구 + by persona_name
                    const shareTitle = `[mirror] ${analysis.overallScore}점 - ${analysis.summary}`;
                    const shareText = `${analysis.summary}\n\n${analysis.overallScore}점 | by ${characterName}`;
                    
                    // 공유 링크: 현재 URL (분석 ID까지 포함)
                    const shareUrl = window.location.href;
                    
                    // Web Share API 지원 확인
                    if (navigator.share) {
                      // 이미지 공유 지원 확인
                      if (navigator.canShare && imageUrl && imageUrl.startsWith('http')) {
                        // 이미지 파일 가져오기
                        fetch(imageUrl)
                          .then(res => res.blob())
                          .then(blob => {
                            const file = new File([blob], `mirror_analysis_${analysis.id}.jpg`, { type: 'image/jpeg' });
                            
                            // 이미지를 포함한 공유 시도
                            const shareData = {
                              title: shareTitle,
                              text: shareText,
                              url: shareUrl,
                              files: [file]
                            };
                            
                            // 이미지 공유 가능 여부 확인
                            if (navigator.canShare(shareData)) {
                              navigator.share(shareData)
                                .then(() => {
                                  toast({
                                    title: t("share.success"),
                                    description: t("share.successDesc"),
                                  });
                                })
                                .catch((err) => {
                                  if (err.name !== "AbortError") {
                                    // 이미지 공유 실패 시 텍스트만 공유
                                    navigator.share({
                                      title: shareTitle,
                                      text: shareText,
                                      url: shareUrl,
                                    }).catch((err) => {
                                      if (err.name !== "AbortError") {
                                        toast({
                                          title: t("share.error"),
                                          description: t("share.errorDesc"),
                                          variant: "destructive",
                                        });
                                      }
                                    });
                                  }
                                });
                            } else {
                              // 이미지 공유 지원하지 않는 경우, 텍스트만 공유
                              navigator.share({
                                title: shareTitle,
                                text: shareText,
                                url: shareUrl,
                              });
                            }
                          })
                          .catch(() => {
                            // 이미지 가져오기 실패 시 텍스트만 공유
                            navigator.share({
                              title: shareTitle,
                              text: shareText,
                              url: shareUrl,
                            });
                          });
                      } else {
                        // 이미지 공유 미지원 시 텍스트만 공유
                        navigator.share({
                          title: shareTitle,
                          text: shareText,
                          url: shareUrl,
                        })
                        .then(() => {
                          toast({
                            title: t("share.success"),
                            description: t("share.successDesc"),
                          });
                        })
                        .catch((err) => {
                          if (err.name !== "AbortError") {
                            toast({
                              title: t("share.error"),
                              description: t("share.errorDesc"),
                              variant: "destructive",
                            });
                          }
                        });
                      }
                    } else {
                      // 공유 API 미지원 시 클립보드에 복사
                      const shareFallbackText = `${shareTitle}\n${shareText}\n${shareUrl}`;
                      navigator.clipboard
                        .writeText(shareFallbackText)
                        .then(() => {
                          toast({
                            title: t("share.copied"),
                            description: t("share.copiedDesc"),
                          });
                        })
                        .catch(() => {
                          toast({
                            title: t("share.error"),
                            description: t("share.errorDesc"),
                            variant: "destructive",
                          });
                        });
                    }
                  }}
                >
                  <Share2 size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* 
            (b) 페르소나 영역
            아래도 max-w-4xl 컨테이너를 써서 가운데 정렬 
          */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <Card className="border border-white/10 shadow-xl overflow-hidden mb-6 bg-white/5 backdrop-blur-sm rounded-t-xl">
              <div
                className={`${personaInfo.color} relative flex flex-col md:flex-row items-center md:items-stretch text-white overflow-hidden rounded-t-xl`}
              >
                <div className="w-full md:w-48 flex justify-center md:justify-start p-4 z-0">
                  <img
                    src={personaInfo.imagePath}
                    alt={`${characterName} 캐릭터`}
                    className="h-48 md:h-full object-contain"
                  />
                </div>
                <div className="w-full flex flex-col justify-center px-4 pb-4 md:px-6 md:pb-0 z-10 text-center md:text-left">
                  <h2 className="text-2xl font-bold flex flex-wrap items-center gap-2 justify-center md:justify-start">
                    {characterName}
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-xs font-medium">
                      <span>{personaInfo.emoji}</span>
                      <span>{personaInfo.name}</span>
                    </span>
                  </h2>
                  <p className="mt-2 text-white/90">
                    {personaInfo.description.ko || personaInfo.description.en}
                  </p>
                </div>
              </div>
              <div className="p-8 bg-white">
                <div className="mb-8">
                  <div
                    className="flex items-center justify-between mb-3 cursor-pointer"
                    onClick={() => toggleSection("overall")}
                  >
                    <h3 className="text-xl font-bold text-slate-800">
                      {t("analysis.overall.title") || "전체 평가"}
                    </h3>
                    <ChevronDown
                      size={20}
                      className={`text-slate-500 transition-transform ${
                        expanded.includes("overall") ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <p 
                    className="text-slate-600 mb-4 whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: formatMarkdownEmphasis(analysis.analysis.overall.text) }}
                  />
                  {expanded.includes("overall") && (
                    <div className="mt-4 space-y-4">
                      <AnalysisSection
                        title={t("analysis.strengths") || "장점"}
                        items={analysis.analysis.overall.strengths}
                        icon={<Star />}
                        color="green"
                        fallback={t("analysis.noStrengths") || "표시할 장점이 없어요."}
                        variant="list"
                      />
                      <AnalysisSection
                        title={t("analysis.improvements") || "개선점"}
                        items={analysis.analysis.overall.improvements}
                        icon={<Sparkles />}
                        color="amber"
                        fallback={
                          t("analysis.noImprovements") || "표시할 개선점이 없어요."
                        }
                        variant="list"
                      />
                      <AnalysisSection
                        title={t("analysis.modifications") || "수정 제안"}
                        items={analysis.analysis.overall.modifications}
                        icon={<Info />}
                        color="blue"
                        fallback=""
                        variant="list"
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-8" />

                <div className="w-full flex justify-center mb-8">
                  <RadarChart scores={analysis.categoryScores} size={300} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    {
                      key: "composition",
                      title: t("analysis.categories.composition") || "구도",
                      data: analysis.analysis.composition,
                    },
                    {
                      key: "lighting",
                      title: t("analysis.categories.lighting") || "조명",
                      data: analysis.analysis.lighting,
                    },
                    {
                      key: "color",
                      title: t("analysis.categories.color") || "색감",
                      data: analysis.analysis.color,
                    },
                    {
                      key: "focus",
                      title: t("analysis.categories.focus") || "초점",
                      data: analysis.analysis.focus,
                    },
                    {
                      key: "creativity",
                      title: t("analysis.categories.creativity") || "창의성",
                      data: analysis.analysis.creativity,
                    },
                  ].map((category) => (
                    <div key={category.key} className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                          {category.title}
                          {category.key !== "genreSpecific" && (
                            <span className="ml-3 bg-primary/10 text-primary text-sm py-1 px-2 rounded-md font-normal">
                              {
                                analysis.categoryScores[
                                  category.key as keyof typeof analysis.categoryScores
                                ]
                              }
                              점
                            </span>
                          )}
                        </h3>
                      </div>
                      <p 
                        className="text-slate-600 mb-2"
                        dangerouslySetInnerHTML={{ 
                          __html: formatMarkdownEmphasis(category.data?.text || "별도 설명 없음") 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="flex justify-center mt-6 space-x-4 flex-wrap">
              <OpinionDialog
                analysisId={analysis.id}
                existingOpinion={opinion}
                onOpinionSubmitted={refreshAnalysis}
              />
              <Button
                onClick={() => {
                  navigate("/upload");
                }}
                variant="outline"
                className="text-slate-600 border-slate-300"
              >
                {t("analysis.analyzeNewPhoto") || "다른 사진 분석하기"}
              </Button>
              {isAuthenticated && (
                <Button
                  onClick={() => {
                    navigate("/my");
                  }}
                  variant="outline"
                  className="text-slate-600 border-slate-300"
                >
                  {t("navigation.mypage") || "마이 페이지"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;