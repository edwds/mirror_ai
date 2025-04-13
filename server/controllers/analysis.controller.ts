import { Request, Response, NextFunction } from "express";
import { analysisRequestSchema } from "../shared/schema";
import { storage } from "../storage";
import { geminiService } from "../services/gemini.service"; // 서비스 계층 사용
import { analysisProcessor } from "../services/analysisProcessorService"; // 상태 관리 서비스
// import { detectPhotoGenreAndProperties } from "../services/gemini.service"; // 필요시

class AnalysisController {

  // 사진 분석 요청 핸들러 (기존 /api/photos/analyze 로직)
  async analyzePhotoHandler(req: Request, res: Response, next: NextFunction) {
    try {
      const result = analysisRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", details: result.error });
      }

      const { photoId, persona, language, genre, detailLevel, imageUrl, base64Image } = result.data;

      console.log("📩 분석 요청 수신:", { photoId, persona, language, genre, detailLevel, imageUrl: imageUrl?.substring(0, 30) + '...' });

      // 중복 분석 요청 방지
      if (analysisProcessor.isProcessing(photoId)) {
        console.log(`⚠️ 사진 ID ${photoId} 분석 이미 진행 중`);
        return res.status(409).json({ error: "Analysis is already in progress" });
      }

      // 분석 시작 표시
      analysisProcessor.startProcessing(photoId);
      console.log(`✅ 사진 ID ${photoId} 분석 처리 시작`);
      console.log(`📊 현재 처리 중:`, analysisProcessor.getProcessingList());


       // Get the photo from the database
       const photo = await storage.getPhoto(photoId);
       if (!photo) {
         analysisProcessor.endProcessing(photoId); // 처리 상태 제거
         return res.status(404).json({ error: "Photo not found" });
       }

       // 이미지 데이터 확인
       const imageDataSource = base64Image || imageUrl;
       if (!imageDataSource) {
        analysisProcessor.endProcessing(photoId); // 처리 상태 제거
         return res.status(400).json({ error: "Missing image data (base64Image or imageUrl required)" });
       }

       // TODO: 기존 분석 결과 확인 및 반환 로직 추가 (필요시)
       const existingAnalyses = await storage.getPhotoAnalyses(photoId);
       if (existingAnalyses && existingAnalyses.length > 0) {
           console.log(`이미 사진 ID ${photoId} 분석 ${existingAnalyses.length}개 존재. 최신 분석 반환.`);
           analysisProcessor.endProcessing(photoId);
           const latestAnalysis = existingAnalyses[0]; // 가장 최신 (날짜순 정렬 가정)
           return res.status(200).json({
               success: true,
               analysis: { /* ... 필요한 필드만 ... */ },
               analysisId: latestAnalysis.id,
               message: "Existing analysis found."
           });
       }

       // TODO: 유명 작품 확인 로직 (필요시 별도 함수/서비스로 분리)
       const isFamous = false; // checkFamousArtwork(photo.originalFilename);
       if (isFamous) {
         // 유명 작품 처리 로직...
         analysisProcessor.endProcessing(photoId);
         // const analysisRecord = await storage.createAnalysis({...});
         return res.status(200).json({ /* 유명 작품 응답 */ });
       }


       // Gemini 분석 호출 (서비스 계층 사용)
       console.log(`🚀 Gemini 분석 시작 (Photo ID: ${photoId})`);
       const analysisResult = await geminiService.analyzePhoto(imageDataSource, { persona, language }); // 옵션 전달

       // EXIF 데이터에서 카메라 정보 추출
       let cameraModel = null;
       let cameraManufacturer = null;
       
       if (photo.exifData) {
         try {
           const exifData = typeof photo.exifData === 'string' 
             ? JSON.parse(photo.exifData) 
             : photo.exifData;
           
           cameraModel = exifData?.cameraModel || null;
           cameraManufacturer = exifData?.cameraMake || null;
         } catch (error) {
           console.error('EXIF 데이터 파싱 오류:', error);
         }
       }
       
       // 분석 결과 저장 (사용자 ID와 카메라 정보 추가)
       console.log(`[분석생성] 사진 ID ${photoId}의 소유자 ID: ${photo.userId || 'null'}`);
       
       // 📌 우선순위: 사진 소유자 ID(photo.userId)를 먼저 사용
       let userId = photo.userId;
       
       // 세션 사용자 ID와 불일치하면 로깅 (보안 감사용)
       if (req.user && photo.userId !== (req.user as any).id) {
         console.warn(`⚠️ 세션 사용자 ID(${(req.user as any).id})와 사진 소유자 ID(${photo.userId}) 불일치`);
       }
       
       console.log(`[분석생성] 최종 사용할 userId: ${userId || 'null'}`);
       
       const analysisRecord = await storage.createAnalysis({
         photoId,
         userId, // 결정된 사용자 ID 사용
         summary: analysisResult.summary,
         overallScore: analysisResult.overallScore,
         tags: analysisResult.tags,
         categoryScores: analysisResult.categoryScores,
         analysis: analysisResult.analysis,
         persona,
         language,
         // 카메라 정보 추가
         cameraModel,
         cameraManufacturer,
         // 기본값 또는 감지된 값 설정
         focusPoint: "center",
         detailLevel: detailLevel || "standard",
         detectedGenre: analysisResult.detectedGenre || "Unknown",
       });
       console.log(`[분석생성] 생성된 분석 ID: ${analysisRecord.id}, userId: ${analysisRecord.userId || 'null'}`);
       console.log(`💾 분석 결과 저장 완료 (Analysis ID: ${analysisRecord.id})`);


       // 분석 완료 후 처리 상태 제거
       analysisProcessor.endProcessing(photoId);
       console.log(`✅ 사진 ID ${photoId} 분석 완료 - 처리 맵에서 제거`);


      // 간소화된 응답 반환
      const simplifiedAnalysisResponse = {
        success: true,
        analysis: {
          summary: analysisResult.summary,
          overallScore: analysisResult.overallScore,
          tags: analysisResult.tags,
          categoryScores: analysisResult.categoryScores,
          analysis: analysisResult.analysis, // 상세 분석 내용 포함 여부 결정
          detectedGenre: analysisResult.detectedGenre,
          isNotEvaluable: analysisResult.isNotEvaluable,
          reason: analysisResult.reason,
          persona: persona,
          language: language,
          options: analysisResult.options
        },
        analysisId: analysisRecord.id
      };

      return res.status(200).json(simplifiedAnalysisResponse);

    } catch (error) {
      // 오류 발생 시 처리 상태 제거
      const photoIdToClean = req.body?.photoId;
      if (photoIdToClean) {
        analysisProcessor.endProcessing(photoIdToClean);
        console.warn(`⚠️ 사진 ID ${photoIdToClean} 분석 오류 - 처리 맵에서 제거`);
      }
      next(error); // 중앙 에러 핸들러로 전달
    }
  }

  // 특정 분석 조회 핸들러
  async getAnalysisById(req: Request, res: Response, next: NextFunction) {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // req.isAuthenticated 함수가 없을 수 있으므로 안전하게 처리
      let userId: number | undefined = undefined;
      
      try {
        // req.user가 존재하면 인증된 것으로 간주
        if (req.user) {
          userId = (req.user as any).id;
        }
      } catch (authError) {
        console.warn('인증 확인 중 오류 발생:', authError);
        // 오류 발생 시 인증되지 않은 것으로 처리
        // 계속 진행하고 userId는 undefined로 유지
      }
      
      const opinion = await storage.getOpinionByAnalysisId(analysisId, userId);

      // JSON 변환 시 BigInt 오류 방지를 위해 필요시 커스텀 serializer 사용
      // const safeResponse = JSON.parse(JSON.stringify({ ... }, bigIntSerializer));
      return res.status(200).json({ success: true, analysis, opinion: opinion || null });

    } catch (error) {
      next(error);
    }
  }

  // 의견 제출 핸들러
  async submitOpinion(req: Request, res: Response, next: NextFunction) {
     try {
       const analysisId = parseInt(req.params.id);
       if (isNaN(analysisId)) return res.status(400).json({ error: "Invalid analysis ID" });

       const { isLiked, comment } = req.body;
       if (isLiked === undefined && comment === undefined) {
         return res.status(400).json({ error: "Either isLiked or comment is required" });
       }

       const analysis = await storage.getAnalysis(analysisId);
       if (!analysis) return res.status(404).json({ error: "Analysis not found" });

       // 사용자 인증 확인 (isAuthenticated 미들웨어가 적용되었지만 안전하게 처리)
       if (!req.user) {
         return res.status(401).json({ error: "인증이 필요합니다. 다시 로그인해주세요." });
       }
       const userId = (req.user as any).id;

       const existingOpinion = await storage.getOpinionByAnalysisId(analysisId, userId);

       let opinion;
       if (existingOpinion) {
         opinion = await storage.updateOpinion(existingOpinion.id, {
           isLiked: isLiked !== undefined ? isLiked : existingOpinion.isLiked,
           comment: comment !== undefined ? comment : existingOpinion.comment
         });
       } else {
         opinion = await storage.createOpinion({
           analysisId, userId, isLiked, comment
         });
       }

       return res.status(200).json({ success: true, opinion });
     } catch (error) {
       next(error);
     }
  }

  // 분석 삭제 (숨김 처리) 핸들러
  async deleteAnalysis(req: Request, res: Response, next: NextFunction) {
      try {
        const analysisId = parseInt(req.params.id);
        if (isNaN(analysisId)) return res.status(400).json({ error: "Invalid analysis ID" });

        const analysis = await storage.getAnalysis(analysisId);
        if (!analysis) return res.status(404).json({ error: "Analysis not found" });

        const photo = await storage.getPhoto(analysis.photoId);
        if (!photo) return res.status(404).json({ error: "Associated photo not found" });

        if (photo.userId !== (req.user as any).id) {
          return res.status(403).json({ error: "Permission denied" });
        }

        // 실제 삭제 처리
        await storage.deleteAnalysis(analysisId);
        console.log(`🗑️ Analysis ID ${analysisId} deleted.`);

        return res.status(200).json({ success: true, message: "Analysis deleted successfully" });
      } catch (error) {
        next(error);
      }
  }

    // 분석 가시성 업데이트 기능은 삭제됨
    // 대신, 필요한 경우 deleteAnalysis를 사용하세요.
    
  // 사진 정보와 함께 분석 데이터 조회
  async getAnalysesWithPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      let userId;
      let includeHidden = false;
      
      // 쿼리 파라미터로 사용자 ID가 넘어왔는지 확인
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID in query" });
        }
      } else {
        // 쿼리 파라미터가 없으면 현재 로그인된 사용자 ID 사용
        userId = req.isAuthenticated ? (req.user as any)?.id : undefined;
      }
      
      // includeHidden 매개변수 처리 (true일 때 숨겨진 항목도 포함)
      if (req.query.includeHidden === 'true') {
        // 인증된 사용자만 숨겨진 사진을 볼 수 있음
        if (req.isAuthenticated && userId === (req.user as any)?.id) {
          includeHidden = true;
        }
      }
      
      // 페이지네이션 파라미터
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      
      // 서버 측 페이지네이션을 적용하여 분석 데이터를 중심으로 가져오기
      const { photos: analysesWithPhotos, total: totalAnalyses } = await storage.getUserPhotosWithAnalyses(
        userId, 
        includeHidden,
        page,
        limit
      );
      
      // 응답 데이터 준비 - base64 이미지 데이터 제거
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
      
      // 응답 헤더에 캐시 제어 추가
      res.setHeader('Cache-Control', 'private, max-age=10');  // 10초 동안 캐싱
      
      return res.status(200).json(optimizedResponse);
    } catch (error: any) {
      console.error("Error retrieving photos with analyses:", error);
      next(error);
    }
  }
  
  // 특정 카메라 모델로 촬영된 사진과 분석 조회
  async getAnalysesByCameraModel(req: Request, res: Response, next: NextFunction) {
    try {
      const cameraModel = req.params.model;
      if (!cameraModel) {
        return res.status(400).json({ error: "Camera model is required" });
      }
      
      // EXIF 정보가 없는 경우 카메라 모델 페이지 처리
      if (cameraModel === 'undefined' || cameraModel === 'null' || cameraModel.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid camera model", 
          message: "EXIF 정보가 없는 사진입니다."
        });
      }
      
      // 쿼리 파라미터 처리
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      
      // 사용자 ID 처리 - 인증된 사용자인 경우
      let userId: number | undefined = undefined;
      
      // 인증 여부 확인 (안전하게 처리)
      const isAuthenticated = !!req.user;
      
      // 로그인하지 않은 사용자는 공개 사진만 볼 수 있음
      if (!isAuthenticated) {
        console.log('[API] 비로그인 사용자 - 공개 사진만 표시합니다.');
      } else {
        // 로그인한 사용자도 모든 공개 사진을 볼 수 있음 (userId를 설정하지 않음)
        console.log(`[API] 로그인 사용자(ID: ${(req.user as any).id}) - 모든 공개 사진 표시합니다.`);
      }
      
      // 숨겨진 항목 포함 여부 (인증된 사용자만)
      let includeHidden = false;
      if (isAuthenticated && req.query.includeHidden === 'true') {
        includeHidden = true;
      }
      
      // 저장소에서 최적화된 메서드로 데이터 조회
      if (!storage.getPhotosByModelDirect) {
        return res.status(500).json({ 
          error: "Method not implemented", 
          message: "getPhotosByModelDirect method is not available on the storage instance."
        });
      }
      
      const result = await storage.getPhotosByModelDirect(cameraModel, userId, includeHidden, page, limit);
      
      return res.status(200).json({
        success: true,
        photos: result.photos,
        total: result.total,
        page,
        limit,
        cameraModel
      });
    } catch (error: any) {
      console.error(`[API] 카메라 모델별 사진 조회 오류(분석 포함, 모델: ${req.params.model}):`, error);
      next(error);
    }
  }
  
  // photoId로 해당 사진의 모든 분석 조회
  async getAnalysesByPhotoId(req: Request, res: Response, next: NextFunction) {
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
      
      // base64 이미지 데이터 제거
      const cleanedAnalyses = analyses.map(analysis => {
        // base64Image 필드가 있는 경우 제거
        const { base64Image, ...rest } = analysis as any;
        return rest;
      });
      
      return res.status(200).json({
        success: true,
        analyses: cleanedAnalyses
      });
    } catch (error: any) {
      console.error("Error retrieving analyses:", error);
      next(error);
    }
  }
}

// 컨트롤러 인스턴스 생성 및 export
export const analysisController = new AnalysisController();