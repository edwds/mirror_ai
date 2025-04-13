/**
 * MemStorage 클래스에 getPhotosByModelDirect 메서드 추가
 * 
 * 이 함수는 메모리 저장소에서 카메라 모델을 통한 사진 검색을 처리합니다.
 * 실제 구현은 기존 getPhotosByCamera 메서드와 유사하지만, 최적화를 위해 
 * analyses 테이블의 camera_model 필드를 활용합니다.
 */

import { MemStorage } from "./storage";
import { Analysis, Photo } from "../shared/schema";

/**
 * 메모리 스토리지에서 카메라 모델 기반으로 사진 검색 구현 (최적화)
 */
MemStorage.prototype.getPhotosByModelDirect = async function(
  cameraModel: string,
  userId?: number,
  includeHidden: boolean = false,
  page: number = 1,
  limit: number = 12
): Promise<{ photos: any[], total: number }> {
  try {
    console.log(`[MemStorage.getPhotosByModelDirect] 카메라 모델 "${cameraModel}"로 검색 중...`);
    
    // 1. 매치되는 분석 찾기
    const matchingAnalysisIds = new Set<number>();
    const matchingPhotoIds = new Set<number>();
    const analysisMap = new Map<number, Analysis>();
    
    // analyses 배열 직접 순회
    this.analyses.forEach((analysis: Analysis) => {
      // 카메라 모델 필드 기반 필터링 (대소문자 구분 없이)
      if (analysis.cameraModel?.toLowerCase() === cameraModel.toLowerCase()) {
        // 사용자 ID 필터
        if (userId !== undefined) {
          const photo = this.photos.get(analysis.photoId);
          if (photo && photo.userId === userId) {
            if (includeHidden || !analysis.isHidden) {
              matchingAnalysisIds.add(analysis.id);
              matchingPhotoIds.add(analysis.photoId);
              analysisMap.set(analysis.id, analysis);
            }
          }
        } else {
          // 사용자 ID 필터 미적용
          if (includeHidden || !analysis.isHidden) {
            matchingAnalysisIds.add(analysis.id);
            matchingPhotoIds.add(analysis.photoId);
            analysisMap.set(analysis.id, analysis);
          }
        }
      }
    });
    
    const total = matchingAnalysisIds.size;
    console.log(`[MemStorage.getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 검색 결과: ${total}개 항목 찾음`);
    
    if (total === 0) {
      return { photos: [], total: 0 };
    }
    
    // 2. 결과 변환
    const analysisDetails: Analysis[] = Array.from(matchingAnalysisIds).map(id => analysisMap.get(id)!);
    
    // 3. 정렬 및 페이지네이션
    analysisDetails.sort((a, b) => {
      // 생성일 기준 내림차순 정렬 (최신순)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // 페이지네이션 적용
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAnalyses = analysisDetails.slice(startIndex, endIndex);
    
    // 4. 결과 포맷팅 - 사진 정보 포함
    const photosWithAnalyses = await Promise.all(paginatedAnalyses.map(async (analysis) => {
      // 사진 정보 가져오기
      const photo = this.photos.get(analysis.photoId);
      
      if (!photo) {
        console.error(`[MemStorage.getPhotosByModelDirect] 분석 ID ${analysis.id}에 해당하는 사진 ID ${analysis.photoId}를 찾을 수 없습니다.`);
        return null;
      }
      
      // 강점 및 개선점 추출
      let analysisContent = null;
      let strengths: string[] = [];
      let improvements: string[] = [];
      
      try {
        // 분석 데이터가 문자열인 경우 JSON으로 파싱
        analysisContent = typeof analysis.analysis === 'string'
          ? JSON.parse(analysis.analysis)
          : analysis.analysis;
        
        // 강점 및 개선점 추출
        if (analysisContent && typeof analysisContent === 'object') {
          // overall 객체 내부에서 데이터 추출
          if (analysisContent.overall) {
            // 강점 추출
            if (analysisContent.overall.strengths && Array.isArray(analysisContent.overall.strengths)) {
              strengths = analysisContent.overall.strengths;
            }
            
            // 개선점 추출
            if (analysisContent.overall.improvements && Array.isArray(analysisContent.overall.improvements)) {
              improvements = analysisContent.overall.improvements;
            }
            
            // 둘 다 없을 경우 overview.pros/cons에서 추출 시도
            if ((!strengths || strengths.length === 0) && analysisContent.overall.overview) {
              if (analysisContent.overall.overview.pros && Array.isArray(analysisContent.overall.overview.pros)) {
                strengths = analysisContent.overall.overview.pros;
              }
              
              if (analysisContent.overall.overview.cons && Array.isArray(analysisContent.overall.overview.cons)) {
                improvements = analysisContent.overall.overview.cons;
              }
            }
          }
          
          // analysisContent.analysis.overall 구조에서도 확인
          if ((!strengths || !strengths.length) && analysisContent.analysis && analysisContent.analysis.overall) {
            if (analysisContent.analysis.overall.strengths && Array.isArray(analysisContent.analysis.overall.strengths)) {
              strengths = analysisContent.analysis.overall.strengths;
            }
            
            if (analysisContent.analysis.overall.improvements && Array.isArray(analysisContent.analysis.overall.improvements)) {
              improvements = analysisContent.analysis.overall.improvements;
            }
          }
        }
      } catch (error) {
        console.error(`[MemStorage.getPhotosByModelDirect] 분석 데이터 파싱 오류 (분석 ID: ${analysis.id}):`, error);
      }
      
      // 카메라 정보 포맷팅
      let cameraInfo = analysis.cameraModel || null; // 기본값으로 camera_model 필드 사용
      if (photo.exifData) {
        if (typeof photo.exifData === 'string') {
          try {
            const exifData = JSON.parse(photo.exifData);
            if (exifData.cameraMake && exifData.cameraModel) {
              cameraInfo = `${exifData.cameraMake} | ${exifData.cameraModel}`;
            } else if (exifData.cameraInfo) {
              cameraInfo = exifData.cameraInfo;
            }
          } catch (e) {
            console.error(`[MemStorage.getPhotosByModelDirect] EXIF 데이터 파싱 오류 (사진 ID: ${photo.id}):`, e);
          }
        } else if (typeof photo.exifData === 'object') {
          const exifData = photo.exifData as Record<string, any>;
          if (exifData?.cameraMake && exifData?.cameraModel) {
            cameraInfo = `${exifData.cameraMake} | ${exifData.cameraModel}`;
          } else if (exifData?.cameraInfo) {
            cameraInfo = exifData.cameraInfo;
          }
        }
      }
      
      // 필요한 정보만 포함하여 반환
      return {
        id: analysis.id,
        photoId: photo.id,
        firebaseDisplayUrl: photo.firebaseDisplayUrl,
        firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
        s3DisplayUrl: photo.s3DisplayUrl,
        s3AnalysisUrl: photo.s3AnalysisUrl,
        replitDisplayUrl: photo.replitDisplayUrl,
        replitAnalysisUrl: photo.replitAnalysisUrl,
        displayImagePath: photo.displayImagePath,
        createdAt: analysis.createdAt,
        title: analysis.summary || "Untitled Photo",
        overallScore: analysis.overallScore,
        isPublic: !analysis.isHidden,
        isHidden: analysis.isHidden || false,
        categoryScores: analysis.categoryScores || {
          composition: 0,
          lighting: 0,
          color: 0,
          focus: 0,
          creativity: 0
        },
        strengths: strengths.length ? strengths : ["훌륭한 구도와 균형잡힌 프레임 구성", "자연스러운 색상 표현과 조화", "적절한 피사체 강조와 배경 처리"],
        improvements: improvements.length ? improvements : ["조금 더 선명한 초점 처리 필요", "전경과 배경의 대비 강화 고려", "노출 밸런스 일부 조정으로 디테일 강화"],
        cameraInfo: cameraInfo,
        tags: analysis.tags || [],
        focusPoint: analysis.focusPoint,
        persona: analysis.persona,
        detailLevel: analysis.detailLevel,
        language: analysis.language,
        hasAnalysis: true
      };
    }));
    
    // 5. null 값 필터링
    const validResults = photosWithAnalyses.filter(item => item !== null) as any[];
    
    console.log(`[MemStorage.getPhotosByModelDirect] ${validResults.length}개 결과 반환 (총 ${total}개 중, 페이지 ${page}, 제한 ${limit})`);
    
    return { photos: validResults, total };
  } catch (error) {
    console.error(`[MemStorage.getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 검색 중 오류 발생:`, error);
    return { photos: [], total: 0 };
  }
};