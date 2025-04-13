import { Request, Response, NextFunction } from "express";
import { photoUploadSchema } from "../shared/schema";
import { storage } from "../storage";
import { imageService, ProcessedImagePaths } from "../services/image.service"; // 이미지 서비스 사용
import { geminiService, PhotoGenreInfo } from "../services/gemini.service"; // Gemini 서비스 사용
import { getPhotosByModelDirect } from '../photosByModelDirect'; // 직접 조회 함수

class PhotoController {

  // 사진 업로드 핸들러
  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const result = photoUploadSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", details: result.error });
      }

      const { image, originalFilename, language = 'ko' } = result.data; // Base64 이미지 데이터
      // 인증 체크 - 여러 방법으로 확인 (개선된 버전)
      let userId: number | undefined = undefined;
      try {
        console.log("인증 상태 디버깅 - 세션 객체:", req.session);
        console.log("인증 상태 디버깅 - 쿠키:", req.headers.cookie);
        console.log("인증 상태 디버깅 - passport 존재:", !!req.session?.passport);
        
        // 1. passport 세션에서 직접 확인 (가장 정확한 방법)
        if (req.session?.passport?.user) {
          userId = req.session.passport.user;
          console.log(`Photo upload - userId=${userId} passport 세션에서 가져옴`);
        } 
        // 2. req.user에서 확인 (일반적인 방법)
        else if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
          userId = (req.user as any).id;
          console.log(`Photo upload - userId=${userId} req.user에서 가져옴`);
        }
        // 3. req.session.userId에서 확인 (fallback)
        else if (req.session?.userId) {
          userId = req.session.userId;
          console.log(`Photo upload - userId=${userId} session.userId에서 가져옴`);
        }
        // 4. 디버깅용 헤더에서 확인 (테스트 환경에서만 사용)
        else if (process.env.NODE_ENV !== 'production' && req.headers['x-user-id']) {
          userId = parseInt(req.headers['x-user-id'] as string);
          console.log(`Photo upload - userId=${userId} x-user-id 헤더에서 가져옴 (테스트용)`);
        }
        else {
          console.log("Photo upload - 인증되지 않은 사용자 (userId 없음)");
          
          // 개발 환경에서 긴급 임시 조치: 테스트용 ID 사용
          if (process.env.NODE_ENV !== 'production') {
            userId = 1; // 기본 테스트 사용자 ID
            console.log(`Photo upload - 개발 모드에서 테스트 userId=${userId} 사용`);
          }
        }
        
        console.log("Photo upload - User authentication status:", { 
          hasSession: !!req.session, 
          hasUserId: !!userId,
          isAuthMethod: typeof req.isAuthenticated === 'function',
          sessionExists: !!req.session,
          passportInfo: req.session?.passport ? JSON.stringify(req.session.passport) : 'none',
          cookies: req.headers.cookie || 'none'
        });
      } catch (authError) {
        console.warn("Authentication check failed, proceeding as anonymous user", authError);
        
        // 개발 환경에서 긴급 임시 조치: 테스트용 ID 사용
        if (process.env.NODE_ENV !== 'production') {
          userId = 1; // 기본 테스트 사용자 ID
          console.log(`Photo upload - 오류 후 테스트 userId=${userId} 사용`);
        }
      }

      // 1. 이미지 처리 (리사이즈, 형식 변환, 경로/URL 생성) - 서비스 사용
      const processedImages: ProcessedImagePaths = await imageService.processUploadedImage(image, originalFilename);

      // 2. EXIF 데이터 추출 - 서비스 사용
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const exifData = await imageService.extractExifData(buffer);

      // 3. 사진 장르/속성 감지 (Gemini 사용) - 서비스 사용
      let photoGenreInfo: PhotoGenreInfo | null = null;
      // 분석용 이미지를 사용 (Base64 또는 URL)
      const analysisImageSource = processedImages.base64AnalysisImage || processedImages.firebaseAnalysisUrl /* || 다른 URL */;
      if (analysisImageSource) {
          try {
              photoGenreInfo = await geminiService.detectPhotoGenreAndProperties(analysisImageSource, language);
          } catch (genreError) {
              console.error("사진 장르 감지 실패:", genreError);
              // 실패 시 기본값 설정 (기존 로직과 유사하게)
              photoGenreInfo = { /* ... 기본값 ... */ } as PhotoGenreInfo;
          }
      } else {
          console.warn("분석용 이미지를 찾을 수 없어 장르 감지를 건너<0xEB><0x9B><0x8D>니다.");
          photoGenreInfo = { /* ... 기본값 ... */ } as PhotoGenreInfo;
      }


      // 4. 데이터베이스에 사진 정보 저장
      console.log(`Photo upload - 저장할 userId=${userId || 'null'}`);
      const photo = await storage.createPhoto({
        originalFilename,
        displayImagePath: processedImages.displayImagePath, // 로컬 경로 또는 대표 URL
        analysisImagePath: processedImages.analysisImagePath, // 로컬 경로 또는 대표 URL
        exifData: exifData, // 추출된 EXIF
        userId,
        firebaseDisplayUrl: processedImages.firebaseDisplayUrl,
        firebaseAnalysisUrl: processedImages.firebaseAnalysisUrl,
        s3DisplayUrl: processedImages.s3DisplayUrl,
        s3AnalysisUrl: processedImages.s3AnalysisUrl,
        replitDisplayUrl: processedImages.replitDisplayUrl,
        replitAnalysisUrl: processedImages.replitAnalysisUrl,
        // isHidden: false, // 기본값 설정
        // photoGenre: photoGenreInfo?.detectedGenre, // 감지된 장르 저장 (옵션)
        // photoProperties: photoGenreInfo?.properties // 감지된 속성 저장 (옵션)
      });
      console.log(`Photo upload - 생성된 photoId=${photo.id}, userId=${photo.userId || 'null'}`);
      

       // 5. 클라이언트에 응답 반환
       // Base64 데이터 포함 여부 결정 (예: Firebase URL 없을 때만 포함)
       const includeBase64 = !processedImages.firebaseAnalysisUrl;

       const simplifiedResponse = {
         success: true,
         photo: {
           id: photo.id,
           originalFilename: photo.originalFilename,
           displayImagePath: photo.displayImagePath, // 최종 경로/URL
           analysisImagePath: photo.analysisImagePath, // 최종 경로/URL
           createdAt: photo.createdAt,
           exifData: { // 필요한 EXIF 정보만 선택적으로 포함
             dimensions: exifData?.dimensions || {},
             cameraInfo: exifData?.cameraInfo || "N/A",
             exifSummary: exifData?.exifSummary || "Not available"
           },
           // 클라우드 URL 명시적으로 포함
           firebaseDisplayUrl: photo.firebaseDisplayUrl || undefined,
           firebaseAnalysisUrl: photo.firebaseAnalysisUrl || undefined,
           // ... 다른 스토리지 URL ...
         },
         photoGenreInfo: photoGenreInfo, // 장르 정보 포함
         ...(includeBase64 && { base64AnalysisImage: processedImages.base64AnalysisImage }), // 필요시 분석용 Base64 포함
         ...(includeBase64 && processedImages.base64DisplayImage && { base64DisplayImage: processedImages.base64DisplayImage }), // 필요시 표시용 Base64 포함
       };

      return res.status(200).json(simplifiedResponse);

    } catch (error) {
      next(error); // 중앙 에러 핸들러로 전달
    }
  }

  // 사용자 사진 목록 조회 (분석 제외)
  async getUserPhotos(req: Request, res: Response, next: NextFunction) {
      try {
          let userId: number | undefined;
          let includeHidden = false;

          // 사용자 ID 결정 (쿼리 파라미터 또는 로그인 사용자)
          if (req.query.userId) {
              userId = parseInt(req.query.userId as string);
              if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID in query" });
          } else {
              // 세션이 설정되어 있고 인증된 경우에만 userId 설정
              if (req.session && req.session.userId) {
                  userId = req.session.userId;
              } else if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
                  userId = (req.user as any).id;
              }
          }

          // 숨김 사진 포함 여부 (자신의 사진만 가능)
          const isUserAuthenticated = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || 
                                     (req.session && req.session.userId);
          const loggedInUserId = req.session?.userId || (req.user as any)?.id;
          
          if (req.query.includeHidden === 'true' && isUserAuthenticated && userId === loggedInUserId) {
              includeHidden = true;
          }

          const photos = await storage.getUserPhotos(userId, includeHidden);

          // BigInt 등 직렬화 문제 방지
          const safeResponse = JSON.parse(JSON.stringify({ success: true, photos }));
          return res.status(200).json(safeResponse);
      } catch (error) {
          next(error);
      }
  }

  // 사용자 사진 목록 조회 (최신 분석 포함)
  async getUserPhotosWithAnalyses(req: Request, res: Response, next: NextFunction) {
      try {
          let userId: number | undefined;
          let includeHidden = false;
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 12;
          const startTime = process.hrtime();

          // 사용자 ID 결정
          if (req.query.userId) {
              userId = parseInt(req.query.userId as string);
              if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID in query" });
              console.log(`getUserPhotosWithAnalyses: 쿼리 파라미터에서 userId=${userId} 가져옴`);
          } else {
              // 세션이 설정되어 있고 인증된 경우에만 userId 설정
              if (req.session && req.session.userId) {
                  userId = req.session.userId;
                  console.log(`getUserPhotosWithAnalyses: 세션에서 userId=${userId} 가져옴`);
              } else if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
                  userId = (req.user as any).id;
                  console.log(`getUserPhotosWithAnalyses: req.user에서 userId=${userId} 가져옴`);
              } else {
                  console.log(`getUserPhotosWithAnalyses: userId를 찾을 수 없음 (비로그인 상태)`);
              }
          }

          // 숨김 사진 포함 여부 (자신의 사진만 가능)
          const isUserAuthenticated = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || 
                                    (req.session && req.session.userId);
          const loggedInUserId = req.session?.userId || (req.user as any)?.id;
          
          if (req.query.includeHidden === 'true' && isUserAuthenticated && userId === loggedInUserId) {
              includeHidden = true;
          }

          console.log(`getUserPhotosWithAnalyses: storage.getUserPhotosWithAnalyses 호출 (userId=${userId}, includeHidden=${includeHidden})`);
          const { photos: analysesWithPhotos, total: totalAnalyses } = await storage.getUserPhotosWithAnalyses(
              userId, includeHidden, page, limit
          );
          console.log(`getUserPhotosWithAnalyses: 결과 개수=${analysesWithPhotos?.length || 0}, 총 항목=${totalAnalyses || 0}`);
          
          // 추가 디버깅: 첫 번째 항목의 userId 값 확인
          if (analysesWithPhotos && analysesWithPhotos.length > 0) {
              console.log(`getUserPhotosWithAnalyses: 첫 번째 항목의 userId=${analysesWithPhotos[0].userId}, photoId=${analysesWithPhotos[0].photoId}`);
          }

          // 응답 데이터 최적화 (큰 Base64 제거 등)
          const optimizedPhotos = analysesWithPhotos.map((p: any) => {
             // 상세 분석 내용 제거 (목록에서는 불필요)
             if (p.analysis?.analysis) delete p.analysis.analysis;
             // Base64 제거 (URL이 있으면)
             if (p.firebaseDisplayUrl || p.s3DisplayUrl || p.replitDisplayUrl) {
                 delete p.base64DisplayImage;
                 delete p.base64AnalysisImage;
             }
             return p;
          });

          const totalPages = Math.ceil(totalAnalyses / limit);
          const responseTime = process.hrtime(startTime);
          const responseTimeMs = (responseTime[0] * 1000 + responseTime[1] / 1000000).toFixed(2);
          console.log(`/api/photos/with-analyses: ${optimizedPhotos.length} results (p.${page}/${totalPages}) in ${responseTimeMs}ms`);

          res.setHeader('Cache-Control', 'private, max-age=10'); // 캐싱 설정
          return res.status(200).json({
              success: true,
              photos: optimizedPhotos,
              pagination: {
                  currentPage: page,
                  totalPages: totalPages,
                  totalItems: totalAnalyses,
                  hasMore: (page * limit) < totalAnalyses
              }
          });
      } catch (error) {
          next(error);
      }
  }

  // 특정 사진 조회
  async getPhotoById(req: Request, res: Response, next: NextFunction) {
    try {
        const photoId = parseInt(req.params.id);
        if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });

        const photo = await storage.getPhoto(photoId);
        if (!photo) return res.status(404).json({ error: "Photo not found" });

        // TODO: 사진 접근 권한 체크 (예: 숨겨진 사진은 소유자만)
        // if (photo.isHidden && (!req.isAuthenticated() || photo.userId !== (req.user as any).id)) {
        //    return res.status(404).json({ error: "Photo not found or access denied" });
        // }

        const safeResponse = JSON.parse(JSON.stringify({ success: true, photo }));
        return res.status(200).json(safeResponse);
    } catch (error) {
        next(error);
    }
  }

  // 특정 사진의 모든 분석 조회
  async getPhotoAnalyses(req: Request, res: Response, next: NextFunction) {
    try {
        const photoId = parseInt(req.params.id);
        if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });

        const photo = await storage.getPhoto(photoId);
        if (!photo) return res.status(404).json({ error: "Photo not found" });

        // TODO: 접근 권한 체크

        const analyses = await storage.getPhotoAnalyses(photoId);
        const safeResponse = JSON.parse(JSON.stringify({ success: true, analyses }));
        return res.status(200).json(safeResponse);
    } catch (error) {
        next(error);
    }
  }

  // 특정 사진의 최신 분석 조회
  async getLatestAnalysisForPhoto(req: Request, res: Response, next: NextFunction) {
    try {
        const photoId = parseInt(req.params.id);
        if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });

        const analyses = await storage.getPhotoAnalyses(photoId); // 최신순 정렬 가정

        if (!analyses || analyses.length === 0) {
            return res.status(200).json({ success: true, found: false, message: "No analysis found" });
        }

        const latestAnalysis = analyses[0];

        // TODO: 분석 접근 권한 체크

        return res.status(200).json({
            success: true,
            found: true,
            analysis: latestAnalysis, // 필요한 필드만 포함하도록 조정 가능
            analysisId: latestAnalysis.id
        });
    } catch (error) {
        next(error);
    }
  }

  // 사진 가시성 업데이트
  async updatePhotoVisibility(req: Request, res: Response, next: NextFunction) {
    try {
        const photoId = parseInt(req.params.id);
        if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });

        const { isHidden } = req.body;
        if (typeof isHidden !== 'boolean') {
            return res.status(400).json({ error: "isHidden must be a boolean value" });
        }

        const photo = await storage.getPhoto(photoId);
        if (!photo) return res.status(404).json({ error: "Photo not found" });

        // 인증 상태 확인
        const isUserAuthenticated = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || 
                                  (req.session && req.session.userId);
        const loggedInUserId = req.session?.userId || (req.user as any)?.id;
        
        // 소유권 확인
        if (!isUserAuthenticated || photo.userId !== loggedInUserId) {
            return res.status(403).json({ error: "Permission denied" });
        }

        const updatedPhoto = await storage.updatePhotoVisibility(photoId, isHidden);
        console.log(`👁️ Photo ID ${photoId} visibility updated to ${isHidden ? 'hidden' : 'visible'}.`);

        return res.status(200).json({ success: true, photo: updatedPhoto });
    } catch (error) {
        next(error);
    }
  }

   // 카메라 모델별 사진 조회 (쿼리 파라미터 또는 경로 파라미터 사용)
   async getPhotosByCamera(req: Request, res: Response, next: NextFunction) {
     try {
         const cameraModel = (req.params.model || req.query.cameraModel) as string;
         if (!cameraModel || cameraModel === 'undefined' || cameraModel === 'null' || cameraModel.trim() === '') {
             return res.status(400).json({ error: "Valid camera model is required" });
         }

         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 12;
         let userId: number | undefined = undefined; // 기본적으로 모든 사용자 사진 (공개된 것)
         let includeHidden = false;

         // 인증 상태 확인
         const isUserAuthenticated = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || 
                                   (req.session && req.session.userId);
         const loggedInUserId = req.session?.userId || (req.user as any)?.id;
         
         // 특정 사용자 필터링 (쿼리 파라미터)
         if (req.query.userId) {
             userId = parseInt(req.query.userId as string);
             if (isNaN(userId)) userId = undefined;
         } else {
             // 세션이 설정되어 있고 인증된 경우에만 userId 설정
             if (isUserAuthenticated && req.query.onlyMine === 'true' && loggedInUserId) {
                 userId = loggedInUserId; // 자신의 사진만
             }
         }

         // 숨김 사진 포함 (로그인 사용자 본인 + includeHidden=true)
         
         if (isUserAuthenticated && req.query.includeHidden === 'true' && userId === loggedInUserId) {
             includeHidden = true;
         }
         // 관리자는 모든 숨김 사진 볼 수 있게 하려면 추가 로직 필요 (checkAdminAccess 활용 등)

         const result = await storage.getPhotosByCamera(cameraModel, userId, includeHidden, page, limit);

         return res.status(200).json({
             success: true,
             photos: result.photos,
             total: result.total,
             page,
             limit,
             cameraModel,
             pagination: {
                 totalPages: Math.ceil(result.total / limit),
                 totalItems: result.total,
                 currentPage: page
             }
         });
     } catch (error) {
         next(error);
     }
   }

   // 카메라 모델별 사진 조회 (분석 포함, 최적화된 방식)
   async getPhotosByCameraDirect(req: Request, res: Response, next: NextFunction) {
      try {
          const cameraModel = req.params.model as string;
          if (!cameraModel || cameraModel === 'undefined' || cameraModel === 'null' || cameraModel.trim() === '') {
              return res.status(400).json({ error: "Valid camera model is required" });
          }

          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 12;
          let userId: number | undefined = undefined; // 기본 공개
          let includeHidden = false; // 기본 숨김 제외

          // 인증 상태 확인
          const isUserAuthenticated = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || 
                                    (req.session && req.session.userId);
          const loggedInUserId = req.session?.userId || (req.user as any)?.id;
          
          // 특정 사용자 필터링 (쿼리 파라미터)
          if (req.query.userId) {
              userId = parseInt(req.query.userId as string);
              if (isNaN(userId)) userId = undefined;
          } else {
              // 세션이 설정되어 있고 인증된 경우에만 userId 설정
              if (isUserAuthenticated && req.query.onlyMine === 'true' && loggedInUserId) {
                  userId = loggedInUserId; // 자신의 사진만
              }
          }

          // 숨김 사진 포함 (로그인 사용자 본인 + includeHidden=true)
          if (isUserAuthenticated && req.query.includeHidden === 'true' && userId === loggedInUserId) {
              includeHidden = true;
          }

          console.log(`[API] 최적화된 카메라 모델(${cameraModel}) 조회 (getPhotosByModelDirect)`);
          const result = await getPhotosByModelDirect(cameraModel, userId, includeHidden, page, limit);

          // 분석 목록이므로 응답 최적화 (상세 분석 제거 등)
          const optimizedPhotos = result.photos.map((p: any) => {
             if (p.analysis?.analysis) delete p.analysis.analysis; // 상세 분석 내용 제거
             // Base64 제거 등 추가 최적화 가능
             return p;
          });

          return res.status(200).json({
              success: true,
              photos: optimizedPhotos,
              total: result.total,
              page,
              limit,
              cameraModel,
              pagination: {
                 totalPages: Math.ceil(result.total / limit),
                 totalItems: result.total,
                 currentPage: page
             }
          });
      } catch (error) {
          next(error);
      }
   }

}

export const photoController = new PhotoController();