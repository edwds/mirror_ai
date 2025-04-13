import { Router, Request, Response } from 'express';
import { storage } from "../storage";

// 분석 관련 라우트를 위한 라우터 생성
export const analysesRouter = Router();

// 중요: 구체적인 경로를 먼저 정의 (with-photos)
analysesRouter.get("/with-photos", async (req: Request, res: Response) => {
  console.log("📢 /api/analyses/with-photos 경로가 호출되었습니다!");
  try {
    let userId;
    let includeHidden = false;
    
    // 비동기 처리를 병렬로 시작하기 위한 캐싱
    const startTime = process.hrtime();
    
    // 쿼리 파라미터로 사용자 ID가 넘어왔는지 확인
    if (req.query.userId) {
      userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID in query" });
      }
    } else {
      // 쿼리 파라미터가 없으면 현재 로그인된 사용자 ID 사용
      userId = req.isAuthenticated() ? (req.user as any).id : undefined;
    }
    
    // includeHidden 매개변수 처리 (true일 때 숨겨진 항목도 포함)
    if (req.query.includeHidden === 'true') {
      // 인증된 사용자만 숨겨진 사진을 볼 수 있음
      if (req.isAuthenticated() && userId === (req.user as any).id) {
        includeHidden = true;
      }
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    
    // 서버 측 페이지네이션을 적용하여 분석 데이터를 중심으로 가져오기 (Analysis 중심)
    const { photos: analysesWithPhotos, total: totalAnalyses } = await storage.getUserPhotosWithAnalyses(
      userId, 
      includeHidden,
      page,
      limit
    );
    
    // 응답 데이터 준비 - base64 이미지 데이터를 완전히 제거하여 응답 크기 줄이기
    console.time('api-optimize-response');
    
    // 원래 응답 형식으로 복원
    const optimizedResponse = {
      success: true,
      photos: analysesWithPhotos.map((photo: any) => {
        // base64 이미지는 제거하되 원래 객체 구조 유지
        const { base64DisplayImage, base64AnalysisImage, ...photoWithoutBase64 } = photo;
        
        // 사용자 데이터에서 프로필 이미지 제거 (사용되지 않는 필드)
        let optimizedPhoto = { ...photoWithoutBase64 };
        if (optimizedPhoto.user) {
          const { profilePicture, ...userWithoutProfilePic } = optimizedPhoto.user;
          optimizedPhoto.user = userWithoutProfilePic;
        }
        
        // 분석 객체 유지하되 base64 이미지 제거
        if (optimizedPhoto.analyses && Array.isArray(optimizedPhoto.analyses)) {
          optimizedPhoto.analyses = optimizedPhoto.analyses.map((analysis: any) => {
            if (!analysis) return null;
            const { base64Image, ...rest } = analysis;
            return rest;
          });
        }
        
        return {
          ...optimizedPhoto,
          // Firebase URL이 없는 경우에만 base64 썸네일 유지
          base64DisplayImage: (!photo.firebaseDisplayUrl && !photo.displayImagePath) ? photo.base64DisplayImage : null,
        };
      }),
      totalPages: Math.ceil(totalAnalyses / limit),
      total: totalAnalyses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalAnalyses / limit),
        totalItems: totalAnalyses,
        hasMore: (page * limit) < totalAnalyses
      }
    };
    
    console.timeEnd('api-optimize-response');
    
    // 처리 시간 측정 및 로깅
    const endTime = process.hrtime(startTime);
    const responseTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    
    if (analysesWithPhotos.length > 0) {
      console.log(`/api/analyses/with-photos: ${analysesWithPhotos.length} results (p.${page}/${Math.ceil(totalAnalyses / limit)}) in ${responseTime}ms`);
    }
    
    // 응답 헤더에 캐시 제어 추가
    res.setHeader('Cache-Control', 'private, max-age=10');  // 10초 동안 캐싱
    
    return res.status(200).json(optimizedResponse);
  } catch (error: any) {
    console.error("Error retrieving photos with analyses:", error);
    return res.status(500).json({ error: "Failed to retrieve photos with analyses", details: error.message });
  }
});

// 두 번째: by-camera/:model 경로 정의
analysesRouter.get("/by-camera/:model", async (req: Request, res: Response) => {
  try {
    console.log("카메라 모델별 분석 데이터 조회 경로 처리 시작");
    return res.status(200).json({ success: true, message: "Route is working" });
  } catch (error: any) {
    console.error(`카메라 모델별 분석 데이터 조회 오류:`, error);
    return res.status(500).json({ error: "Failed to fetch analyses by camera model", details: error.message });
  }
});

// 세 번째: photoId 쿼리 파라미터로 분석 조회
analysesRouter.get("/", async (req: Request, res: Response) => {
  try {
    // photoId를 쿼리 파라미터에서 가져옵니다
    if (!req.query.photoId) {
      return res.status(400).json({ error: "photoId query parameter is required" });
    }
    
    const photoId = parseInt(req.query.photoId as string);
    if (isNaN(photoId)) {
      return res.status(400).json({ error: "Invalid photo ID" });
    }

    const photo = await storage.getPhoto(photoId);
    
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }
    
    const analyses = await storage.getPhotoAnalyses(photoId);
    
    // base64 이미지 데이터 제거, 필요한 데이터만 포함
    const cleanedAnalyses = analyses.map(analysis => {
      // base64Image 필드 제거
      const { base64Image, ...rest } = analysis;
      return rest;
    });
    
    const safeResponse = {
      success: true,
      analyses: cleanedAnalyses
    };
    
    return res.status(200).json(safeResponse);
  } catch (error: any) {
    console.error("Error retrieving analyses by photoId:", error);
    return res.status(500).json({ error: "Failed to retrieve analyses", details: error.message });
  }
});

// 마지막: ID로 특정 분석 조회 (동적 파라미터 있는 경로는 가장 마지막에 정의)
analysesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }

    const analysis = await storage.getAnalysis(analysisId);
    
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    
    // 사용자 ID 가져오기 (로그인한 경우에만)
    const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
    
    // 해당 분석에 대한 의견 가져오기
    const opinion = await storage.getOpinionByAnalysisId(analysisId, userId);
    
    // base64 이미지 데이터가 있다면 제거
    const cleanAnalysis = { ...analysis };
    if (cleanAnalysis.base64Image) {
      delete cleanAnalysis.base64Image;
    }
    
    const safeResponse = {
      success: true,
      analysis: cleanAnalysis,
      opinion: opinion || null
    };
    
    return res.status(200).json(safeResponse);
  } catch (error: any) {
    console.error("Error retrieving analysis:", error);
    return res.status(500).json({ error: "Failed to retrieve analysis", details: error.message });
  }
});

// 의견 추가 API
analysesRouter.post("/:id/opinions", async (req: Request, res: Response) => {
  try {
    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }
    
    // 요청 데이터 검증
    const { isLiked, comment } = req.body;
    if (isLiked === undefined && comment === undefined) {
      return res.status(400).json({ error: "Either isLiked or comment is required" });
    }
    
    // 분석 존재 여부 확인
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    
    // 사용자 ID 가져오기
    const userId = req.isAuthenticated() ? (req.user as any).id : null;
    
    // 기존 의견 확인
    const existingOpinion = await storage.getOpinionByAnalysisId(analysisId, userId);
    
    let opinion;
    if (existingOpinion) {
      // 기존 의견 업데이트
      opinion = await storage.updateOpinion(existingOpinion.id, {
        isLiked: isLiked !== undefined ? isLiked : existingOpinion.isLiked,
        comment: comment !== undefined ? comment : existingOpinion.comment
      });
    } else {
      // 새 의견 생성
      opinion = await storage.createOpinion({
        analysisId,
        userId,
        isLiked,
        comment
      });
    }
    
    return res.status(200).json({
      success: true,
      opinion
    });
  } catch (error: any) {
    console.error("Error submitting opinion:", error);
    return res.status(500).json({ error: "Failed to submit opinion", details: error.message });
  }
});

// 분석 가시성 업데이트
analysesRouter.patch("/:id/visibility", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }
    
    const { isHidden } = req.body;
    if (typeof isHidden !== 'boolean') {
      return res.status(400).json({ error: "isHidden must be a boolean value" });
    }
    
    // Get the analysis to check the associated photo and ownership
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    
    // Get the photo to check ownership
    const photo = await storage.getPhoto(analysis.photoId);
    if (!photo) {
      return res.status(404).json({ error: "Associated photo not found" });
    }
    
    // Check if the user owns the photo associated with this analysis
    if (photo.userId !== (req.user as any).id) {
      return res.status(403).json({ error: "You don't have permission to update this analysis" });
    }
    
    // Update the analysis visibility
    const updatedAnalysis = await storage.updateAnalysisVisibility(analysisId, isHidden);
    
    return res.status(200).json({
      success: true,
      analysis: updatedAnalysis
    });
  } catch (error: any) {
    console.error("Error updating analysis visibility:", error);
    return res.status(500).json({ error: "Failed to update analysis", details: error.message });
  }
});

// 분석 삭제
analysesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    // 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }
    
    // 분석 정보 가져오기
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    
    // 관련된 사진 정보 가져오기
    const photo = await storage.getPhoto(analysis.photoId);
    if (!photo) {
      return res.status(404).json({ error: "Associated photo not found" });
    }
    
    // 사용자 권한 확인 - 사진 소유자만 삭제 가능
    if (photo.userId !== (req.user as any).id) {
      return res.status(403).json({ error: "You don't have permission to delete this analysis" });
    }
    
    // 분석 완전히 삭제
    const deleted = await storage.deleteAnalysis(analysisId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete analysis" });
    }
    
    return res.status(200).json({
      success: true,
      message: "Analysis deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting analysis:", error);
    return res.status(500).json({ error: "Failed to delete analysis", details: error.message });
  }
});