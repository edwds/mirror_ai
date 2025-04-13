// server/storageExtension.ts
// DatabaseStorage 클래스에 getPhotosByModelDirect 메서드 추가

import { DatabaseStorage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * 최적화된 카메라 모델별 사진 검색 메서드 구현
 * DatabaseStorage 클래스의 프로토타입을 확장
 */
DatabaseStorage.prototype.getPhotosByModelDirect = async function(
  cameraModel: string, 
  userId?: number, 
  includeHidden: boolean = false, 
  page: number = 1, 
  limit: number = 12
): Promise<{ photos: any[]; total: number }> {
  try {
    console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}"로 사진 및 분석 데이터 조회 중...`);
    
    // SQL 조건 구성
    let whereCondition = sql`a.camera_model = ${cameraModel}`; // 기본 카메라 모델 조건
    
    // 사용자 ID 조건 (선택적)
    if (userId !== undefined) {
      whereCondition = sql`${whereCondition} AND p.user_id = ${userId}`;
    }
    
    // 숨김 항목 필터링 조건 (선택적)
    if (!includeHidden) {
      whereCondition = sql`${whereCondition} AND a.is_hidden = false`;
    }
    
    // 1. 총 개수 계산
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as total
          FROM "analyses" a
          INNER JOIN "photos" p ON a."photo_id" = p.id
          WHERE ${whereCondition}`
    );
    
    // 총 개수 추출
    const countResultArray = countResult as unknown as Array<{total: number | string}>;
    const totalCount = countResultArray[0]?.total;
    const total = typeof totalCount === 'number' ? totalCount : Number(totalCount || 0);
    
    if (total === 0) {
      console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}"로 찾은 사진이 없습니다.`);
      return { photos: [], total: 0 };
    }
    
    // 2. 페이지네이션 적용된 쿼리 - 명시적으로 각 테이블의 모든 컬럼 지정
    const result = await db.execute(
      sql`SELECT 
          a.id as analysis_id, 
          a.photo_id,
          a.detected_genre,
          a.summary,
          a.overall_score,
          a.category_scores,
          a.analysis,
          a.focus_point,
          a.persona,
          a.detail_level,
          a.language,
          a.tags,
          a.camera_model,
          a.created_at as analysis_created_at,
          a.is_hidden as analysis_is_hidden,
          
          p.id as photo_id,
          p.user_id,
          p.original_filename,
          p.display_image_path,
          p.analysis_image_path,
          p.firebase_display_url,
          p.firebase_analysis_url,
          p.s3_display_url,
          p.s3_analysis_url,
          p.replit_display_url,
          p.replit_analysis_url,
          p.exif_data,
          p.created_at as photo_created_at,
          p.is_hidden as photo_is_hidden
          
          FROM "analyses" a
          INNER JOIN "photos" p ON a.photo_id = p.id
          WHERE ${whereCondition}
          ORDER BY a.created_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}`
    );
    
    // 3. 결과 처리
    const resultArray = result as unknown as Array<Record<string, any>>;
    
    if (resultArray.length === 0) {
      console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 쿼리 결과가 없습니다 (페이지: ${page}, 제한: ${limit}).`);
      return { photos: [], total };
    }
    
    // 4. 결과 변환 및 포맷팅
    const photosWithAnalyses = await Promise.all(resultArray.map(async (row: Record<string, any>) => {
      // 필드 추출
      const analysis = {
        id: row.analysis_id,
        photoId: row.photo_id,
        detectedGenre: row.detected_genre,
        summary: row.summary,
        overallScore: row.overall_score,
        categoryScores: row.category_scores,
        analysis: row.analysis,
        focusPoint: row.focus_point,
        persona: row.persona,
        detailLevel: row.detail_level,
        language: row.language,
        tags: row.tags || [],
        cameraModel: row.camera_model,
        createdAt: row.analysis_created_at,
        isHidden: row.analysis_is_hidden
      };
      
      const photo = {
        id: row.photo_id,
        userId: row.user_id,
        originalFilename: row.original_filename,
        displayImagePath: row.display_image_path,
        analysisImagePath: row.analysis_image_path,
        firebaseDisplayUrl: row.firebase_display_url,
        firebaseAnalysisUrl: row.firebase_analysis_url,
        s3DisplayUrl: row.s3_display_url,
        s3AnalysisUrl: row.s3_analysis_url,
        replitDisplayUrl: row.replit_display_url,
        replitAnalysisUrl: row.replit_analysis_url,
        exifData: row.exif_data,
        isHidden: row.photo_is_hidden,
        createdAt: row.photo_created_at
      };
      
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
        console.error(`[getPhotosByModelDirect] 분석 데이터 파싱 오류 (분석 ID: ${analysis.id}):`, error);
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
            console.error(`[getPhotosByModelDirect] EXIF 데이터 파싱 오류 (사진 ID: ${photo.id}):`, e);
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
    
    console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 검색 결과: ${photosWithAnalyses.length}개 결과 반환 (총 ${total}개 중)`);
    
    return { photos: photosWithAnalyses, total };
  } catch (error) {
    console.error(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 검색 오류:`, error);
    return { photos: [], total: 0 };
  }
};