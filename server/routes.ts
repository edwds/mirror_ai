import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { photoUploadSchema, analysisRequestSchema, type InsertOpinion } from "./shared/schema";
import { processUploadedImage, extractExifData } from "./imageProcessor";
import { analyzePhoto, detectPhotoGenreAndProperties } from "./gemini/index.js";
import { uploadImageToFirebase, uploadBase64ImageToFirebase } from "./firebase";
import { imageProxyRouter } from "./imageProxy";
import { getPhotosByModelDirect } from './photosByModelDirect';
// 분석 라우터는 server/index.ts에서 직접 등록하므로 여기서는 사용하지 않습니다.
// import { analysesRouter } from "./routes/analyses.routes";
// import { analyzePhotoHandler } from '../controllers/analysisController'; // 이 부분은 사용하지 않음

// router가 정의되지 않았으므로 아래 라인 주석 처리
// router.post('/api/photos/analyze', analyzePhotoHandler);


import path from "path";
import fs from "fs";
import { cleanupDuplicateAnalyses, getAnalyticsStats } from './adminTools';

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve public files (favicon.ico, ogimage.png, etc.)
  const publicDir = path.join(process.cwd(), "public");
  app.use(express.static(publicDir));
  
  // Serve uploaded files
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));
  
  // 이미지 프록시 라우터 등록
  app.use("/api/image-proxy", imageProxyRouter);
  
  // 분석 관련 라우터는 server/index.ts에서 직접 등록하므로 여기서는 사용하지 않습니다.
  // app.use("/api/analyses", analysesRouter);
  
  // 현재 로그인한 사용자의 프로필 정보 가져오기 API (먼저 등록해야 함)
  app.get("/api/user/profile", async (req: Request, res: Response) => {
    try {
      // 세션에서 현재 로그인한 사용자 확인
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const userId = (req.user as any).id;
      console.log("Deserializing user ID:", userId);
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("User not found:", userId);
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log("User found:", user.id, "name:", user.displayName);
      
      // 민감한 정보는 제외하고 반환 - profilePicture 필드 완전히 제거
      const { profilePicture, ...userWithoutProfilePic } = user;
      const safeUser = {
        ...userWithoutProfilePic,
        // 추가 민감 정보 필터링이 필요하다면 여기서 처리
      };
      
      return res.json({ success: true, user: safeUser });
    } catch (error) {
      console.error('사용자 프로필 가져오기 오류:', error);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  
  // 특정 사용자 정보 가져오기 API
  app.get("/api/user/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // 민감한 정보는 제외하고 반환 - profilePicture 필드 완전히 제거
      const { profilePicture, ...userWithoutProfilePic } = user;
      const safeUser = {
        ...userWithoutProfilePic,
        // 추가 민감 정보 필터링이 필요하다면 여기서 처리
      };
      
      return res.json({ success: true, user: safeUser });
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
      return res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  
  // 사용자 프로필 업데이트 API
  app.patch("/api/user/:id", upload.single('profileImage'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // 세션에서 현재 로그인한 사용자 확인
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not logged in" });
      }
      
      const sessionUser = req.user as any;
      if (!sessionUser || sessionUser.id !== userId) {
        return res.status(403).json({ error: "Not authorized to update this user" });
      }
      
      // 업데이트 가능한 필드만 추출
      const { displayName, bio, socialLinks, websiteUrl1, websiteLabel1, websiteUrl2, websiteLabel2 } = req.body;
      const updates: any = {};
      
      if (displayName !== undefined) updates.displayName = displayName;
      if (bio !== undefined) updates.bio = bio;
      if (websiteUrl1 !== undefined) updates.websiteUrl1 = websiteUrl1;
      if (websiteLabel1 !== undefined) updates.websiteLabel1 = websiteLabel1;
      if (websiteUrl2 !== undefined) updates.websiteUrl2 = websiteUrl2;
      if (websiteLabel2 !== undefined) updates.websiteLabel2 = websiteLabel2;
      
      // 소셜 링크 처리
      if (socialLinks) {
        try {
          const parsedSocialLinks = JSON.parse(socialLinks);
          updates.socialLinks = parsedSocialLinks;
        } catch (e) {
          console.error("Invalid social links format:", e);
        }
      }
      
      // 프로필 이미지 처리
      if (req.file) {
        try {
          // 배포 환경 여부 확인
          const isDeployedEnvironment = process.env.REPLIT_DEPLOYMENT_URL !== undefined;
          console.log("Profile Image Upload - Environment check:", { isDeployedEnvironment });
          
          // Firebase 환경 변수 확인
          const firebaseConfigAvailable = process.env.FIREBASE_API_KEY && 
                                        process.env.FIREBASE_STORAGE_BUCKET;
          
          if (firebaseConfigAvailable) {
            console.log("Firebase 이미지 업로드를 시도합니다.");
            try {
              // Firebase에 이미지 업로드
              const profileImageUrl = await uploadImageToFirebase(
                req.file.buffer,
                req.file.originalname || 'profile',
                'profiles'
              );
              
              console.log("프로필 이미지가 Firebase에 업로드되었습니다:", profileImageUrl.substring(0, 60) + "...");
              
              // 업로드된 URL을 profilePicture 필드에 저장
              updates.profilePicture = profileImageUrl;
            } catch (firebaseError) {
              console.error("Firebase 프로필 이미지 업로드 실패:", firebaseError);
              
              // Firebase 업로드 실패 시 base64로 폴백
              console.log("Base64 이미지로 대체합니다.");
              const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
              updates.profilePicture = imageBase64;
            }
          } else {
            // Firebase 설정이 없는 경우 기존 방식 사용
            console.log("Firebase 환경 변수가 설정되지 않아 base64 이미지를 사용합니다.");
            const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            updates.profilePicture = imageBase64;
          }
        } catch (imageProcessError) {
          console.error("프로필 이미지 처리 중 오류 발생:", imageProcessError);
          
          // 기본 방식으로 폴백
          const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          updates.profilePicture = imageBase64;
        }
      } else if (req.body.profilePicture) {
        // base64 데이터가 직접 전송된 경우
        // 만약 이미 URL 형태라면 그대로 사용하고, base64 형태라면 Firebase에 업로드 시도
        const profilePicture = req.body.profilePicture;
        
        if (profilePicture.startsWith('http')) {
          // 이미 URL 형태라면 그대로 사용
          updates.profilePicture = profilePicture;
        } else if (profilePicture.startsWith('data:')) {
          // base64 데이터인 경우 Firebase 업로드 시도
          try {
            const firebaseConfigAvailable = process.env.FIREBASE_API_KEY && 
                                          process.env.FIREBASE_STORAGE_BUCKET;
            
            if (firebaseConfigAvailable) {
              // Firebase에 업로드
              const profileImageUrl = await uploadBase64ImageToFirebase(
                profilePicture,
                'profile_' + Date.now(),
                'profiles'
              );
              
              updates.profilePicture = profileImageUrl;
            } else {
              // Firebase 설정이 없으면 base64 그대로 사용
              updates.profilePicture = profilePicture;
            }
          } catch (error) {
            console.error("Base64 이미지의 Firebase 업로드 실패:", error);
            updates.profilePicture = profilePicture;
          }
        }
      }
      
      // 사용자 정보 업데이트
      const updatedUser = await storage.updateUser(userId, updates);
      
      // 응답에서 profilePicture 필드 제거
      const { profilePicture, ...userWithoutProfilePic } = updatedUser;
      
      return res.status(200).json({ success: true, user: userWithoutProfilePic });
    } catch (error: any) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: "Failed to update user", details: error.message });
    }
  });

  // API Routes
  app.post("/api/photos/upload", async (req: Request, res: Response) => {
    try {
      console.log("Photo upload request received");
      console.log("Request body properties:", Object.keys(req.body));
      console.log("Request content-type:", req.headers['content-type']);
      
      // 인증 상태 디버깅
      console.log("Upload route - Session exists:", !!req.session);
      console.log("Upload route - Cookies:", req.headers.cookie);
      console.log("Upload route - IsAuthenticated:", req.isAuthenticated ? req.isAuthenticated() : 'function not available');
      console.log("Upload route - User:", req.user ? `ID: ${(req.user as any).id}` : 'Not logged in');
      console.log("Upload route - Session user ID:", req.session?.userId);
      
      // 요청 검증
      const result = photoUploadSchema.safeParse(req.body);
      
      if (!result.success) {
        console.error("Validation failed:", result.error);
        console.log("Error issues:", result.error.issues);
        return res.status(400).json({ error: "Invalid request data", details: result.error });
      }
      
      console.log("Validation successful, processing request data");
      
      // 현재 요청에서 필요한 데이터 추출 (image, originalFilename)
      const { image, originalFilename } = result.data;
      console.log("Image data length:", image ? image.substring(0, 30) + "..." : "missing");
      console.log("Original filename:", originalFilename);
      
      // 요청에서 language 정보 가져오기 (없으면 기본값: 'ko')
      const language = result.data.language || 'ko';
      console.log("Language:", language);
      
      // 배포 환경 확인
      const isDeployedEnvironment = process.env.REPLIT_DEPLOYMENT_URL !== undefined;
      console.log("Photo Upload - Deployment environment check:", { isDeployedEnvironment, url: process.env.REPLIT_DEPLOYMENT_URL });
      
      // Process the uploaded image
      let processedImages;
      try {
        processedImages = await processUploadedImage(image, originalFilename);
        console.log("Image processing successful:", { 
          displayPath: processedImages.displayImagePath,
          analysisPath: processedImages.analysisImagePath,
          base64Length: processedImages.base64AnalysisImage?.length || 0
        });
      } catch (error) {
        const processError = error as Error;
        console.error("Image processing error:", processError);
        
        // 배포 환경에서 파일 저장 오류가 발생한 경우
        if (isDeployedEnvironment) {
          // 기본 경로 설정 - 실제 파일은 저장되지 않더라도 데이터베이스 레코드를 위한 경로
          const uniqueId = Date.now().toString();
          const fileExt = originalFilename.split('.').pop() || 'jpg';
          const cleanFilename = originalFilename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
          const displayImagePath = `/uploads/${cleanFilename}_${uniqueId}_display.${fileExt}`;
          const analysisImagePath = `/uploads/${cleanFilename}_${uniqueId}_analysis.${fileExt}`;
          
          // base64Image 직접 생성 - 원본 이미지 사용
          const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          
          // 파일 저장 없이 버퍼에서 직접 처리
          processedImages = {
            displayImagePath,
            analysisImagePath,
            base64AnalysisImage: image
          };
          
          console.log("Created backup image paths for deployment environment");
        } else {
          // 개발 환경에서는 오류를 그대로 반환
          return res.status(500).json({ error: "Failed to process image", details: processError.message });
        }
      }
      
      // Extract EXIF data from the image
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      // Use try-catch around EXIF extraction to handle potential errors
      let exifData;
      try {
        exifData = await extractExifData(buffer);
        
        // Additional safety: Remove any complete EXIF data that might cause issues
        if (exifData && exifData.exif) {
          delete exifData.exif;
        }
        
        // Ensure the camera info is properly sanitized
        if (exifData && exifData.cameraInfo) {
          exifData.cameraInfo = exifData.cameraInfo.replace(/[^\x20-\x7E]/g, '');
        }
      } catch (exifError) {
        console.error("EXIF extraction error:", exifError);
        exifData = {
          dimensions: {},
          cameraInfo: "No camera info available",
          exifSummary: "Not available"
        };
      }
      
      // Get user ID from session if authenticated
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Gemini로 사진 장르와 속성 감지
      console.log("Detecting photo genre and properties with Gemini API...");
      let photoGenreInfo;
      try {
        // 분석용 이미지로 장르 감지
        const imageUrl = processedImages.base64AnalysisImage || 
                        processedImages.firebaseAnalysisUrl || 
                        processedImages.s3AnalysisUrl || 
                        processedImages.analysisImagePath;
                        
        // 요청에서 선택된 언어 정보 가져오기 (없으면 기본값: 'ko')
        const selectedLanguage = req.body.language || 'ko';
        photoGenreInfo = await detectPhotoGenreAndProperties(imageUrl, selectedLanguage);
      } catch (genreError) {
        console.error("Failed to detect photo genre:", genreError);
        photoGenreInfo = {
          detectedGenre: "Unknown",
          confidence: 0.5,
          isRealPhoto: true, // 기본적으로 사진으로 간주
          isFamousArtwork: false,
          reasonForClassification: "Failed to detect genre",
          properties: {
            primaryGenre: "Unknown",
            secondaryGenre: "Unknown",
            keywords: ["Unknown"],
            technicalAttributes: {
              composition: "",
              lighting: "",
              color: "",
              focus: ""
            }
          },
          canBeAnalyzed: true // 기본적으로 분석 가능으로 설정
        };
      }
      
      // Store the photo information in the database
      const photo = await storage.createPhoto({
        originalFilename,
        displayImagePath: processedImages.displayImagePath,
        analysisImagePath: processedImages.analysisImagePath,
        exifData,
        userId,
        firebaseDisplayUrl: processedImages.firebaseDisplayUrl,
        firebaseAnalysisUrl: processedImages.firebaseAnalysisUrl,
        s3DisplayUrl: processedImages.s3DisplayUrl,
        s3AnalysisUrl: processedImages.s3AnalysisUrl,
        replitDisplayUrl: processedImages.replitDisplayUrl,
        replitAnalysisUrl: processedImages.replitAnalysisUrl
      });
      
      // Return the photo info and base64 of the analysis image
      // Create a simplified response with only necessary data to avoid serialization issues
      // 추가 처리된 이미지 데이터 저장
      let extraData: any = {
        // 장르 및 사진 속성 정보 추가
        photoGenreInfo
      };
      
      // 배포 환경에서는 base64 데이터도 함께 저장
      if (isDeployedEnvironment) {
        extraData = {
          photoGenreInfo,
          base64DisplayImage: processedImages.base64DisplayImage,
          base64AnalysisImage: processedImages.base64AnalysisImage
        };
        
        // 콘솔에 디버그 정보 기록
        console.log("Deployment environment: Adding base64 image data", { 
          hasDisplayImage: !!processedImages.base64DisplayImage,
          displayImageLength: processedImages.base64DisplayImage?.length || 0,
          hasAnalysisImage: !!processedImages.base64AnalysisImage,
          analysisImageLength: processedImages.base64AnalysisImage?.length || 0
        });
      } else {
        extraData = {
          photoGenreInfo,
          base64AnalysisImage: processedImages.base64AnalysisImage
        };
      }
      
      const simplifiedResponse = {
        success: true,
        photo: {
          id: photo.id,
          originalFilename: photo.originalFilename,
          displayImagePath: photo.displayImagePath,
          analysisImagePath: photo.analysisImagePath,
          createdAt: photo.createdAt,
          // Include only necessary EXIF data
          exifData: {
            dimensions: exifData?.dimensions || {},
            colorSpace: exifData?.colorSpace || null,
            cameraInfo: exifData?.cameraInfo || "No camera info available",
            exifSummary: exifData?.exifSummary || "Not available"
          },
          // 클라우드 스토리지 URL 추가
          firebaseDisplayUrl: photo.firebaseDisplayUrl || '',
          firebaseAnalysisUrl: photo.firebaseAnalysisUrl || '',
          // S3 URL 추가
          s3DisplayUrl: photo.s3DisplayUrl || '',
          s3AnalysisUrl: photo.s3AnalysisUrl || '',
          // Replit Object Storage URL 추가
          replitDisplayUrl: photo.replitDisplayUrl || '',
          replitAnalysisUrl: photo.replitAnalysisUrl || ''
        },
        ...extraData
      };
      
      return res.status(200).json(simplifiedResponse);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      return res.status(500).json({ error: "Failed to upload photo", details: error.message });
    }
  });



  // 분석 프로세스 중인 사진 ID를 저장하는 Map
  const processingPhotoMap = new Map<number, boolean>();
  
  // 서버 시작 시 처리 맵 초기화 - 이전에 남아있던 상태 정리
  console.log("🚀 서버 시작: 분석 처리 맵 초기화");
  processingPhotoMap.clear();
  
      app.post("/api/photos/analyze", async (req: Request, res: Response) => {
        let requestData;
        try {
          const result = analysisRequestSchema.safeParse(req.body);
          if (!result.success) {
            return res.status(400).json({ error: "Invalid request data", details: result.error });
          }

          const { photoId, persona, language, genre, detailLevel, imageUrl } = result.data;

          // ✅ 여기 추가하면 됨
          console.log("📩 분석 요청 수신:");
          console.log("  - photoId:", photoId);
          console.log("  - persona:", persona);
          console.log("  - language:", language);
          console.log("  - genre:", genre || 'undefined');
          console.log("  - detailLevel:", detailLevel || 'undefined');
          console.log("  - imageUrl:", imageUrl?.substring(0, 30) + "..." || "undefined");
          
          if (!imageUrl) {
            console.error("❌ imageUrl이 요청에 포함되지 않았습니다.");
            return res.status(400).json({ error: "Missing imageUrl" });
          }
          
          // 디버깅을 위해 현재 처리 중인 분석 목록 출력
          console.log(`📊 현재 처리 중인 분석 목록:`, 
            Array.from(processingPhotoMap.entries()).map(([id, val]) => `ID: ${id}`));
          
          // 현재 이 사진이 이미 분석 처리 중인지 확인
          if (processingPhotoMap.get(photoId)) {
            console.log(`⚠️ 사진 ID ${photoId}에 대한 분석이 이미 진행 중입니다. 중복 요청 방지`);
            return res.status(409).json({ 
              error: "Analysis is already in progress", 
              message: "Analysis is already in progress for this photo. Please try again later."
            });
          }
          
          // 이전 분석 맵에서 초기화 (혹시 남아있을 수 있는 상태를 제거)
          processingPhotoMap.delete(photoId);
          
          // 분석 처리 시작 표시
          processingPhotoMap.set(photoId, true);
          console.log(`✅ 사진 ID ${photoId} 분석 처리 시작 표시 완료`);
          
          // 데이터베이스에서 사진 조회
          const photo = await storage.getPhoto(photoId);
          
          if (!photo) {
            console.error("❌ photoId로 사진을 찾지 못했습니다:", photoId);
            processingPhotoMap.delete(photoId);
            return res.status(404).json({ error: "Photo not found" });
          }
      
      // 이미 이 사진에 대한 분석이 있는지 확인
      const existingAnalyses = await storage.getPhotoAnalyses(photoId);
      
      // 이미 동일한 설정으로 분석된 결과가 있다면 그것을 반환
      if (existingAnalyses.length > 0) {
        console.log(`이미 사진 ID ${photoId}에 대한 분석이 ${existingAnalyses.length}개 존재합니다. 첫 번째 분석 반환.`);
        processingPhotoMap.delete(photoId); // 처리 상태 제거
        
        const latestAnalysis = existingAnalyses[0]; // 가장 최신 분석 (이미 날짜순 정렬됨)
        
        // 클라이언트 응답 형식에 맞춰서 반환
        return res.status(200).json({
          success: true,
          analysis: {
            id: latestAnalysis.id,
            summary: latestAnalysis.summary,
            overallScore: latestAnalysis.overallScore,
            categoryScores: latestAnalysis.categoryScores,
            tags: latestAnalysis.tags,
            analysis: latestAnalysis.analysis,
            persona: latestAnalysis.persona,
            language: latestAnalysis.language
          },
          analysisId: latestAnalysis.id
        });
      }
      
      // 기존 분석이 없는 경우 계속 진행
      console.log(`사진 ID ${photoId}에 대한 기존 분석 없음. 새 분석 시작.`);
      
      // Get base64 image
          const base64Image = req.body.base64Image;
          // 이미 상위 스코프에서 imageUrl이 선언되어 있으므로 중복 선언하지 않음
          // 필요한 경우 기존 imageUrl 변수 사용

          if (!base64Image && !imageUrl) {
            return res.status(400).json({ error: "Missing image data (base64Image or imageUrl required)" });
          }
      
      // 유명 예술 작품을 판단하는 간단한 검사 - 파일명이나 설명 등에 특정 키워드 포함시 유명 작품으로 간주
      // 이 부분은 실제로는 더 복잡한 이미지 인식 로직이 필요할 수 있음
      const originalFilename = photo.originalFilename.toLowerCase();
      const famousArtKeywords = ['mona', 'lisa', 'picasso', 'van gogh', 'vangogh', 'monet', 'davinci', 
                                'starry night', 'scream', 'dali', 'rembrandt', 'michelangelo', 'renoir', 
                                'cezanne', 'matisse', 'klimt', 'famous', 'masterpiece', 'museum', 
                                'gallery', 'exhibit', 'artwork', 'painting', 'oil on canvas'];
      
      const isFamousArtwork = famousArtKeywords.some(keyword => originalFilename.includes(keyword.toLowerCase()));
      
      // 유명 작품으로 판단된 경우
      if (isFamousArtwork) {
        // 유명 작품용 미리 정의된 응답 생성
        const predefinedFamousResponse = {
          detectedGenre: "Famous Work",
          summary: "유명 작품: " + photo.originalFilename.replace(/\.[^/.]+$/, ""),
          overallScore: 0,
          isNotEvaluable: true,
          reason: "이미 알려진 작품으로 보입니다. 직접 촬영한 사진만 평가합니다.",
          tags: ["Masterpiece", "Famous", "Art"],
          categoryScores: {
            composition: 0,
            lighting: 0,
            color: 0,
            focus: 0,
            creativity: 0
          },
          analysis: {
            overall: {
              text: "현대 사진 예술의 중요한 작품으로, 예술사적 맥락과 기술적 특성이 독특한 작품입니다. 작가의 예술적 비전과 표현 방식에 주목해 보세요.",
              strengths: [
                "역사적으로 중요한 작품입니다",
                "독특한 예술적 비전을 보여줍니다",
                "기술적 측면에서 혁신적인 특성을 갖고 있습니다",
                "예술 이론과 비평의 중요한 참고가 됩니다",
                "사진 예술의 발전에 영향을 미쳤습니다"
              ],
              improvements: [
                "직접 작품을 관람하여 더 자세히 관찰해보세요",
                "작가에 대한 더 많은 자료를 찾아보는 것이 좋습니다",
                "유사한 시대나 스타일의 다른 작품과 비교해보세요",
                "작품의 제작 배경과 문화적 맥락을 조사해보세요",
                "작품에 대한 비평적 논의를 찾아 참고해보세요"
              ],
              modifications: "유명 작품은 수정 제안이 적절하지 않습니다"
            },
            composition: {
              text: "이 작품은 예술사적 중요성을 가진 유명 작품으로, 기술적인 평가보다는 역사적 맥락에서 감상하는 것이 적절합니다.",
              suggestions: "작품의 예술사적 맥락과 작가의 의도를 조사해보세요."
            },
            lighting: {
              text: "이 작품은 예술사적 중요성을 가진 유명 작품으로, 기술적인 평가보다는 역사적 맥락에서 감상하는 것이 적절합니다.",
              suggestions: "작품의 예술사적 맥락과 작가의 의도를 조사해보세요."
            },
            color: {
              text: "이 작품은 예술사적 중요성을 가진 유명 작품으로, 기술적인 평가보다는 역사적 맥락에서 감상하는 것이 적절합니다.",
              suggestions: "작품의 예술사적 맥락과 작가의 의도를 조사해보세요."
            },
            focus: {
              text: "이 작품은 예술사적 중요성을 가진 유명 작품으로, 기술적인 평가보다는 역사적 맥락에서 감상하는 것이 적절합니다.",
              suggestions: "작품의 예술사적 맥락과 작가의 의도를 조사해보세요."
            },
            creativity: {
              text: "이 작품은 예술사적 중요성을 가진 유명 작품으로, 기술적인 평가보다는 역사적 맥락에서 감상하는 것이 적절합니다.",
              suggestions: "작품의 예술사적 맥락과 작가의 의도를 조사해보세요."
            }
          }
        };
        
        // userId 확인 및 설정
        console.log(`[분석생성-유명작품] 사진 ID ${photoId}의 소유자 ID: ${photo.userId || 'null'}`);
      
        // 📌 항상 사진 소유자 ID를 분석 userId로 사용
        let userId = photo.userId;
        
        // 로그인한 사용자와 사진 소유자가 다를 경우 보안 경고 기록 (감사 추적용)
        if (req.user && (req.user as any).id !== photo.userId) {
          console.warn(`⚠️ 세션 사용자 ID(${(req.user as any).id})와 사진 소유자 ID(${photo.userId}) 불일치`);
        }
        
        console.log(`[분석생성-유명작품] 최종 사용할 userId: ${userId || 'null'}`);
        
        // 유명 작품 분석 결과 저장
        const analysisRecord = await storage.createAnalysis({
          photoId,
          userId, // 사진 소유자 ID를 분석 데이터에 포함
          summary: predefinedFamousResponse.summary,
          overallScore: 0,
          tags: predefinedFamousResponse.tags,
          categoryScores: predefinedFamousResponse.categoryScores,
          analysis: predefinedFamousResponse.analysis,
          persona,
          language,
          detectedGenre: "Famous Work"
        });
        
        // 간소화된 응답 반환
        const simplifiedAnalysisResponse = {
          success: true,
          analysis: predefinedFamousResponse,
          analysisId: analysisRecord.id
        };
        
        return res.status(200).json(simplifiedAnalysisResponse);
      }
      
      // 분석에 필요한 추가 정보 설정
      let photoGenreInfo = null;
      console.log("사진에 장르 정보 없음, 기본 설정으로 분석 진행");
      
      // 일반 사진인 경우 Gemini로 분석 진행
      const analysisResult = await analyzePhoto(base64Image || imageUrl, {
        persona,
        language,
        photoGenreInfo
      });
      
      // 참고: 옵션 정보는 이제 photoAnalysis.ts에서 자동으로 추가됩니다
      
      // Store analysis result in the database
      console.log(`[분석생성] 사진 ID ${photoId}의 소유자 ID: ${photo.userId || 'null'}`);
      
      // 📌 항상 사진 소유자 ID를 분석 userId로 사용
      let userId = photo.userId;
      
      // 로그인한 사용자와 사진 소유자가 다를 경우 보안 경고 기록 (감사 추적용)
      if (req.user && (req.user as any).id !== photo.userId) {
        console.warn(`⚠️ 세션 사용자 ID(${(req.user as any).id})와 사진 소유자 ID(${photo.userId}) 불일치`);
      }
      
      console.log(`[분석생성] 최종 사용할 userId: ${userId || 'null'}`);
      
      const analysisRecord = await storage.createAnalysis({
        photoId,
        userId, // 사진 소유자 ID를 분석 데이터에 포함
        summary: analysisResult.summary,
        overallScore: analysisResult.overallScore,
        tags: analysisResult.tags,
        categoryScores: analysisResult.categoryScores,
        analysis: analysisResult.analysis,
        persona,
        language,
        focusPoint: "center", // 기본값 추가
        detailLevel: "standard", // 기본값 추가
        detectedGenre: analysisResult.detectedGenre || "Unknown",
      });
      console.log(`[분석생성] 생성된 분석 ID: ${analysisRecord.id}, userId: ${analysisRecord.userId || 'null'}`);
      
      // Create simplified response with minimal data
      const simplifiedAnalysisResponse = {
        success: true,
        analysis: {
          summary: analysisResult.summary,
          overallScore: analysisResult.overallScore,
          tags: analysisResult.tags,
          categoryScores: analysisResult.categoryScores,
          analysis: analysisResult.analysis,
          detectedGenre: analysisResult.detectedGenre,
          isNotEvaluable: analysisResult.isNotEvaluable,
          reason: analysisResult.reason,
          persona: persona, // 명시적으로 선택된 페르소나 전달
          language: language, // 선택된 언어도 함께 전달
          options: analysisResult.options // Include options in the response
        },
        analysisId: analysisRecord.id
      };
      
      // 분석 완료 후 처리 상태 제거
      const photoIdToClean = photoId;
      if (photoIdToClean) {
        console.log(`✅ 사진 ID ${photoIdToClean} 분석 완료 - 처리 맵에서 제거`);
        processingPhotoMap.delete(photoIdToClean);
      } else {
        console.warn(`⚠️ 분석 완료 후 처리 맵 정리 실패 - photoId를 찾을 수 없음`);
      }
      return res.status(200).json(simplifiedAnalysisResponse);
    } catch (error: any) {
      console.error("Error analyzing photo:", error);
      // 오류 발생 시 처리 상태 제거
      const photoIdToClean = req.body?.photoId;
      if (photoIdToClean) {
        console.log(`⚠️ 사진 ID ${photoIdToClean} 분석 오류 발생 - 처리 맵에서 제거`);
        processingPhotoMap.delete(photoIdToClean);
      } else {
        console.warn(`⚠️ 분석 오류 발생 후 처리 맵 정리 실패 - photoId를 찾을 수 없음`);
      }
      return res.status(500).json({ error: "Failed to analyze photo", details: error.message });
    }
  });

  // Get all photos (without analysis data)
  app.get("/api/photos", async (req: Request, res: Response) => {
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
        userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      }
      
      // includeHidden 매개변수 처리
      if (req.query.includeHidden === 'true') {
        // 인증된 사용자만 숨겨진 사진을 볼 수 있음
        if (req.isAuthenticated() && userId === (req.user as any).id) {
          includeHidden = true;
        }
      }
      
      const photos = await storage.getUserPhotos(userId, includeHidden);
      const safeResponse = JSON.parse(JSON.stringify({
        success: true,
        photos
      }));
      
      return res.status(200).json(safeResponse);
    } catch (error: any) {
      console.error("Error retrieving photos:", error);
      return res.status(500).json({ error: "Failed to retrieve photos", details: error.message });
    }
  });
  
  // Get photos by camera model (GET 방식)
  app.get("/api/photos/by-camera", async (req: Request, res: Response) => {
    try {
      // 카메라 모델 파라미터 확인
      const cameraModel = req.query.cameraModel as string;
      if (!cameraModel) {
        return res.status(400).json({ error: "Camera model parameter is required" });
      }
      
      // 페이지네이션 매개변수
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
      
      // 사용자 ID 매개변수 (선택적)
      let userId: number | undefined;
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID in query" });
        }
      } else if (req.isAuthenticated()) {
        // 로그인한 경우 현재 사용자 ID를 기본값으로 설정
        userId = (req.user as any).id;
      }
      
      // 숨김 사진 포함 여부
      let includeHidden = false;
      if (req.query.includeHidden === 'true') {
        if (req.isAuthenticated() && userId === (req.user as any).id) {
          includeHidden = true;
        }
      }
      
      // 카메라 모델로 사진 검색
      const result = await storage.getPhotosByCamera(
        cameraModel,
        userId, 
        includeHidden,
        page,
        limit
      );
      
      return res.status(200).json({
        success: true,
        photos: result.photos,
        total: result.total,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      console.error("Error retrieving photos by camera:", error);
      return res.status(500).json({ 
        error: "Failed to retrieve photos by camera", 
        details: error.message 
      });
    }
  });
  
  // Get photos by camera model (POST 방식)
  app.post("/api/photos/by-camera", async (req: Request, res: Response) => {
    try {
      // 카메라 모델 파라미터 확인
      const { cameraModel, page: pageParam = 1, limit: limitParam = 12 } = req.body;
      if (!cameraModel) {
        return res.status(400).json({ error: "Camera model parameter is required" });
      }
      
      // 페이지네이션 매개변수
      const page = typeof pageParam === 'number' ? pageParam : 1;
      const limit = typeof limitParam === 'number' ? limitParam : 12;
      
      // 사용자 ID 매개변수 (선택적)
      let userId: number | undefined;
      if (req.body.userId) {
        userId = parseInt(req.body.userId);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID in body" });
        }
      } else if (req.isAuthenticated()) {
        // 로그인한 경우 현재 사용자 ID를 기본값으로 설정
        userId = (req.user as any).id;
      }
      
      // 숨김 사진 포함 여부
      let includeHidden = false;
      if (req.body.includeHidden === true) {
        if (req.isAuthenticated() && userId === (req.user as any).id) {
          includeHidden = true;
        }
      }
      
      // 카메라 모델로 사진 검색
      const result = await storage.getPhotosByCamera(
        cameraModel,
        userId, 
        includeHidden,
        page,
        limit
      );
      
      return res.status(200).json({
        success: true,
        photos: result.photos,
        total: result.total,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error: any) {
      console.error("Error retrieving photos by camera (POST):", error);
      return res.status(500).json({ 
        error: "Failed to retrieve photos by camera", 
        details: error.message 
      });
    }
  });
  
  // Get all photos with their latest analysis data (combined endpoint)
  // 서버 업로드 디렉토리 상태 확인 엔드포인트 (관리자용)
  app.get("/api/system/uploads-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "인증이 필요합니다" });
      }
      
      const path = require('path');
      const fs = require('fs').promises;
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      const uploadsDir = path.join(process.cwd(), "uploads");
      let stats;
      let permissions;
      let files;
      
      try {
        stats = await fs.stat(uploadsDir);
        const { stdout } = await execPromise(`ls -la ${uploadsDir} | head -n 20`);
        permissions = stdout;
        
        files = await fs.readdir(uploadsDir);
        files = files.slice(0, 20); // 최대 20개 파일만 표시
      } catch (error) {
        return res.status(500).json({
          error: "디렉토리 정보 조회 실패",
          details: error instanceof Error ? error.message : String(error)
        });
      }
      
      return res.status(200).json({
        success: true,
        directoryExists: !!stats,
        isDirectory: stats?.isDirectory(),
        permissions,
        fileCount: files?.length || 0,
        files,
        cwd: process.cwd(),
        fullPath: uploadsDir
      });
    } catch (error) {
      console.error("서버 상태 확인 중 오류:", error);
      return res.status(500).json({
        error: "서버 상태 확인 실패",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // 관리자용 API - 중복 분석 정리
  
  // 분석 통계 정보 조회
  // 관리자 권한 체크 미들웨어
  const checkAdminAccess = (req: Request, res: Response, next: NextFunction) => {
    try {
      // 테스트를 위해 임시로 모든 사용자에게 권한 부여
      console.log('[Admin Access] 임시 테스트 모드: 모든 사용자에게 어드민 대시보드 접근 허용');
      next();
      return;
      
      /*
      // 아래 코드는 실제 배포 시 다시 활성화해야 함
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          success: false, 
          message: '인증이 필요합니다' 
        });
      }
      
      const userId = (req.user as any).id;
      
      console.log(`[Admin Access] 사용자 ID: ${userId}, 관리자 여부: ${userId === 1}`);
      
      // userId가 1인 경우만 관리자로 간주합니다
      if (userId !== 1) {
        return res.status(403).json({ 
          success: false, 
          message: '관리자 권한이 필요합니다' 
        });
      }
      
      next();
      */
    } catch (error) {
      console.error('[Admin Access] 권한 검사 중 오류:', error);
      return res.status(500).json({
        success: false,
        message: '권한 검사 중 오류가 발생했습니다'
      });
    }
  };

  app.get("/api/admin/analytics", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      console.log('[Admin API] 분석 통계 정보 조회 시작 - 요청자:', (req.user as any)?.id);
      
      const stats = await getAnalyticsStats();
      
      console.log('[Admin API] 분석 통계 정보 조회 완료:', stats);
      
      return res.status(200).json({
        success: true,
        stats
      });
    } catch (error) {
      console.error("[Admin API] 분석 통계 정보 조회 중 오류:", error);
      
      // 오류 세부 정보 로깅
      if (error instanceof Error) {
        console.error('[Admin API] 오류 메시지:', error.message);
        console.error('[Admin API] 오류 스택:', error.stack);
      }
      
      return res.status(500).json({
        success: false,
        error: "분석 통계 정보 조회 실패",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // 점수 분포 데이터 API
  app.get("/api/admin/score-distribution", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      console.log('[Admin API] 점수 분포 분석 시작 - 요청자:', (req.user as any)?.id);
      
      // 직접 임포트하는 방식으로 변경
      const { getScoreDistribution } = await import('./adminTools');
      const distributionData = await getScoreDistribution();
      
      console.log('[Admin API] 점수 분포 분석 완료');
      
      return res.status(200).json({
        success: true,
        distribution: distributionData
      });
    } catch (error) {
      console.error("[Admin API] 점수 분포 분석 중 오류:", error);
      
      // 보다 상세한 오류 정보 제공
      if (error instanceof Error) {
        console.error("[Admin API] 오류 상세:", error.stack);
      }
      
      return res.status(500).json({
        success: false,
        error: "점수 분포 분석 실패",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // 장르 분포 데이터 API
  app.get("/api/admin/genre-distribution", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      console.log('[Admin API] 장르 분포 분석 시작 - 요청자:', (req.user as any)?.id);
      
      // 직접 임포트하는 방식으로 변경
      const { getGenreDistribution } = await import('./adminTools');
      const genreData = await getGenreDistribution();
      
      console.log('[Admin API] 장르 분포 분석 완료');
      
      return res.status(200).json({
        success: true,
        genreData
      });
    } catch (error) {
      console.error("[Admin API] 장르 분포 분석 중 오류:", error);
      
      // 보다 상세한 오류 정보 제공
      if (error instanceof Error) {
        console.error("[Admin API] 오류 상세:", error.stack);
      }
      
      return res.status(500).json({
        success: false,
        error: "장르 분포 분석 실패",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // 중복 분석 정리 엔드포인트
  app.post("/api/admin/cleanup-analyses", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      console.log('[Admin API] 중복 분석 정리 시작 - 요청자:', (req.user as any)?.id);
      
      const result = await cleanupDuplicateAnalyses();
      
      console.log('[Admin API] 중복 분석 정리 완료:', result);
      
      return res.status(200).json({
        success: true,
        message: `중복 분석 ${result.deletedCount}개가 성공적으로 삭제되었습니다. (${result.keptCount}개 유지)`,
        ...result
      });
    } catch (error) {
      console.error("[Admin API] 중복 분석 정리 중 오류:", error);
      
      // 오류 세부 정보 로깅
      if (error instanceof Error) {
        console.error('[Admin API] 오류 메시지:', error.message);
        console.error('[Admin API] 오류 스택:', error.stack);
      }
      
      return res.status(500).json({
        success: false,
        error: "중복 분석 정리 실패",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // 카메라 모델 관련 API 엔드포인트
  // 1. 모든 카메라 모델 조회
  app.get("/api/admin/camera-models", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      console.log('[Admin API] 카메라 모델 목록 조회 시작 - 요청자:', (req.user as any)?.id);
      
      // 페이지네이션 파라미터 (쿼리 파라미터에서 가져옴)
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // 검색어가 있으면 검색 실행, 없으면 전체 목록 조회
      const searchTerm = req.query.q as string;
      
      let result;
      if (searchTerm) {
        result = await storage.searchCameraModels(searchTerm, page, limit);
      } else {
        result = await storage.getAllCameraModels(page, limit);
      }
      
      return res.status(200).json({
        success: true,
        models: result.models,
        total: result.total,
        page,
        limit
      });
    } catch (error: any) {
      console.error("[Admin API] 카메라 모델 목록 조회 오류:", error);
      return res.status(500).json({ error: "Failed to fetch camera models", details: error.message });
    }
  });
  
  // 2. 특정 카메라 모델 조회
  app.get("/api/admin/camera-models/:id", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      const modelId = parseInt(req.params.id);
      if (isNaN(modelId)) {
        return res.status(400).json({ error: "Invalid camera model ID" });
      }
      
      console.log(`[Admin API] 카메라 모델(ID: ${modelId}) 상세 조회 시작 - 요청자:`, (req.user as any)?.id);
      
      const cameraModel = await storage.getCameraModel(modelId);
      if (!cameraModel) {
        return res.status(404).json({ error: "Camera model not found" });
      }
      
      return res.status(200).json({
        success: true,
        model: cameraModel
      });
    } catch (error: any) {
      console.error(`[Admin API] 카메라 모델 상세 조회 오류(ID: ${req.params.id}):`, error);
      return res.status(500).json({ error: "Failed to fetch camera model", details: error.message });
    }
  });
  
  // 3. 새 카메라 모델 생성
  app.post("/api/admin/camera-models", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      console.log('[Admin API] 새 카메라 모델 생성 시작 - 요청자:', (req.user as any)?.id);
      console.log('Request body:', req.body);
      
      // 필수 필드 검증
      if (!req.body.model) {
        return res.status(400).json({ error: "Model name is required" });
      }
      
      // 이미 존재하는 모델인지 확인
      const existingModel = await storage.getCameraModelByName(req.body.model);
      if (existingModel) {
        return res.status(409).json({ error: "Camera model with this name already exists" });
      }
      
      // 카메라 모델 생성에 필요한 데이터 추출
      const {
        model,
        manufacturer,
        type,
        releaseYear,
        sensorSize,
        megapixels,
        description
      } = req.body;
      
      // 숫자 필드 변환
      const parsedReleaseYear = releaseYear ? parseInt(releaseYear) : undefined;
      const parsedMegapixels = megapixels ? parseFloat(megapixels) : undefined;
      
      // 타입 정의를 준수하도록 확실한 타입 변환 진행
      const modelData = {
        model,
        manufacturer: manufacturer || undefined,
        type: type || undefined,
        releaseYear: isNaN(parsedReleaseYear as number) ? undefined : (parsedReleaseYear as number),
        sensorSize: sensorSize || undefined,
        megapixels: isNaN(parsedMegapixels as number) ? undefined : (parsedMegapixels as number),
        description: description || undefined
      };
      
      const createdModel = await storage.createCameraModel(modelData);
      
      return res.status(201).json({
        success: true,
        model: createdModel
      });
    } catch (error: any) {
      console.error("[Admin API] 카메라 모델 생성 오류:", error);
      return res.status(500).json({ error: "Failed to create camera model", details: error.message });
    }
  });
  
  // 4. 카메라 모델 업데이트
  app.put("/api/admin/camera-models/:id", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      const modelId = parseInt(req.params.id);
      if (isNaN(modelId)) {
        return res.status(400).json({ error: "Invalid camera model ID" });
      }
      
      console.log(`[Admin API] 카메라 모델 업데이트(ID: ${modelId}) 시작 - 요청자:`, (req.user as any)?.id);
      
      // 존재하는 모델인지 확인
      const existingModel = await storage.getCameraModel(modelId);
      if (!existingModel) {
        return res.status(404).json({ error: "Camera model not found" });
      }
      
      // 카메라 모델 업데이트에 필요한 데이터 추출
      const {
        model,
        manufacturer,
        type,
        releaseYear,
        sensorSize,
        megapixels,
        description
      } = req.body;
      
      // 업데이트할 필드만 포함
      const updates: any = {};
      if (model !== undefined) updates.model = model;
      if (manufacturer !== undefined) updates.manufacturer = manufacturer;
      if (type !== undefined) updates.type = type;
      if (releaseYear !== undefined) {
        const parsedReleaseYear = parseInt(releaseYear);
        updates.releaseYear = isNaN(parsedReleaseYear) ? null : parsedReleaseYear;
      }
      if (sensorSize !== undefined) updates.sensorSize = sensorSize;
      if (megapixels !== undefined) {
        const parsedMegapixels = parseFloat(megapixels);
        updates.megapixels = isNaN(parsedMegapixels) ? null : parsedMegapixels;
      }
      if (description !== undefined) updates.description = description;
      
      // 업데이트 실행
      const updatedModel = await storage.updateCameraModel(modelId, updates);
      
      return res.status(200).json({
        success: true,
        model: updatedModel
      });
    } catch (error: any) {
      console.error(`[Admin API] 카메라 모델 업데이트 오류(ID: ${req.params.id}):`, error);
      return res.status(500).json({ error: "Failed to update camera model", details: error.message });
    }
  });
  
  // 5. 카메라 모델 삭제
  app.delete("/api/admin/camera-models/:id", checkAdminAccess, async (req: Request, res: Response) => {
    try {
      const modelId = parseInt(req.params.id);
      if (isNaN(modelId)) {
        return res.status(400).json({ error: "Invalid camera model ID" });
      }
      
      console.log(`[Admin API] 카메라 모델 삭제(ID: ${modelId}) 시작 - 요청자:`, (req.user as any)?.id);
      
      // 삭제 전에 존재하는지 확인
      const existingModel = await storage.getCameraModel(modelId);
      if (!existingModel) {
        return res.status(404).json({ error: "Camera model not found" });
      }
      
      // 삭제 실행
      const result = await storage.deleteCameraModel(modelId);
      
      if (result) {
        return res.status(200).json({
          success: true,
          message: `Camera model with ID ${modelId} has been successfully deleted.`
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Failed to delete camera model"
        });
      }
    } catch (error: any) {
      console.error(`[Admin API] 카메라 모델 삭제 오류(ID: ${req.params.id}):`, error);
      return res.status(500).json({ error: "Failed to delete camera model", details: error.message });
    }
  });
  
  // 카메라 모델별 사진 조회 API (일반 사용자도 접근 가능)
  app.get("/api/photos/by-camera/:model", async (req: Request, res: Response) => {
    try {
      const cameraModel = req.params.model;
      if (!cameraModel) {
        return res.status(400).json({ error: "Camera model is required" });
      }
      
      // 쿼리 파라미터에서 필터링 및 페이지네이션 옵션 추출
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      
      // 사용자 ID (인증된 사용자이거나 쿼리 파라미터로 지정된 경우)
      // 카메라 모델 페이지 - 모든 공개 사진 표시를 위해 기본적으로 userId 필터링 없음
      let userId: number | undefined = undefined;
      
      // userId가 쿼리 파라미터로 명시적으로 제공된 경우에만 필터링
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) userId = undefined;
        console.log(`[API] 요청한 사용자 ID(${userId})의 사진만 필터링합니다.`);
      } else if (req.isAuthenticated() && req.query.onlyMine === 'true') {
        // onlyMine 쿼리 파라미터가 true인 경우에만 자신의 사진만 표시
        userId = (req.user as any).id;
        console.log(`[API] 'onlyMine' 쿼리 파라미터로 로그인 사용자(${userId})의 사진만 필터링합니다.`);
      } else {
        console.log('[API] 모든 공개 사진을 표시합니다.');
      }
      
      // 숨겨진 사진 표시 여부 (관리자만 가능)
      let includeHidden = false;
      if (req.isAuthenticated() && req.query.includeHidden === 'true') {
        // 여기에 관리자 확인 로직을 추가할 수 있음
        // 현재는 인증된 사용자 모두에게 허용
        includeHidden = true;
      }
      
      // 분석 정보 포함 여부 (기본값: false - 이 API는 기본적으로 사진 정보만 반환)
      const includeAnalyses = req.query.includeAnalyses === 'true';
      
      console.log(`[API] ${cameraModel} 카메라로 촬영한 사진 조회 - 요청자:`, req.isAuthenticated() ? (req.user as any).id : 'anonymous', `(분석 포함: ${includeAnalyses})`);
      
      // 저장소에서 특정 카메라 모델의 사진 조회 (분석 정보를 포함할지 여부에 따라 메소드 분기)
      let result;
      if (includeAnalyses) {
        // 최적화된 직접 조회 메서드 사용 - 분석 테이블에서 camera_model로 직접 조회
        console.log('[API] 최적화된 카메라 모델 조회 메서드 사용 (getPhotosByModelDirect)');
        result = await getPhotosByModelDirect(cameraModel, userId, includeHidden, page, limit);
      } else {
        result = await storage.getPhotosByCamera(cameraModel, userId, includeHidden, page, limit);
      }
      
      return res.status(200).json({
        success: true,
        photos: result.photos,
        total: result.total,
        page,
        limit,
        cameraModel,
        includeAnalyses
      });
    } catch (error: any) {
      console.error(`[API] 카메라 모델별 사진 조회 오류(모델: ${req.params.model}):`, error);
      return res.status(500).json({ error: "Failed to fetch photos by camera model", details: error.message });
    }
  });
  
  // 카메라 모델별 사진 조회 API - 분석 결과 포함 (분석 특화 버전)
  // 이전 API 엔드포인트 (하위 호환성 유지)
  app.get("/api/photos/by-camera/:model/with-analyses", async (req: Request, res: Response) => {
    // 새 엔드포인트로 리디렉션
    return res.redirect(307, `/api/analyses/by-camera/${req.params.model}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  });
  
  /* 아래 경로는 라우터로 분리되어 /api/analyses 라우터에서 처리됩니다.
  // 새로운 API 엔드포인트 - 카메라 모델별 분석 데이터 조회
  app.get("/api/analyses/by-camera/:model", async (req: Request, res: Response) => {
    try {
      const cameraModel = req.params.model;
      if (!cameraModel) {
        return res.status(400).json({ error: "Camera model is required" });
      }
      
      // EXIF 정보가 없는 경우 카메라 모델 페이지를 생성하지 않음
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
      
      // 사용자 ID 처리 - 로그인한 사용자의 분석만 표시
      let userId: number | undefined = undefined;
      
      // 카메라 모델 페이지 - 모든 사용자가 공개 사진을 볼 수 있도록 수정
      if (!req.isAuthenticated()) {
        // 로그인하지 않은 사용자는 공개 사진만 볼 수 있음
        console.log('[API] 비로그인 사용자 - 공개 사진만 표시합니다.');
      } else {
        // 로그인한 사용자도 모든 공개 사진을 볼 수 있음 (userId를 설정하지 않음)
        console.log(`[API] 로그인 사용자(ID: ${(req.user as any).id}) - 모든 공개 사진 표시합니다.`);
        // userId = (req.user as any).id; // 사용자 자신의 사진만 필터링하는 코드 제거
      }
      
      // 숨겨진 항목 포함 여부 (인증된 사용자만)
      let includeHidden = false;
      if (req.isAuthenticated() && req.query.includeHidden === 'true') {
        includeHidden = true;
      }
      
      console.log(`[API] ${cameraModel} 카메라로 촬영한 사진 조회 (분석 포함) - 요청자:`, req.isAuthenticated() ? (req.user as any).id : 'anonymous');
      
      // 저장소에서 분석이 포함된 사진 조회 (최적화된 메서드 사용)
      console.log('[API] 최적화된 카메라 모델 조회 메서드 사용 (getPhotosByModelDirect) - 전용 엔드포인트');
      const result = await getPhotosByModelDirect(cameraModel, userId, includeHidden, page, limit);
      
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
      return res.status(500).json({ error: "Failed to fetch photos with analyses by camera model", details: error.message });
    }
  });
  
  // 이전 API 엔드포인트 (하위 호환성 유지)
  app.get("/api/photos/with-analyses", async (req: Request, res: Response) => {
    // 새로운 엔드포인트(/api/analyses/with-photos)로 리디렉션
    return res.redirect(307, `/api/analyses/with-photos${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  });
  
  /* 아래 경로는 라우터로 분리되어 /api/analyses 라우터에서 처리됩니다.
  // 새로운 API 엔드포인트
  app.get("/api/analyses/with-photos", async (req: Request, res: Response) => {
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
        console.log(`/api/photos/with-analyses: ${analysesWithPhotos.length} results (p.${page}/${Math.ceil(totalAnalyses / limit)}) in ${responseTime}ms`);
      }
      
      // 응답 헤더에 캐시 제어 추가
      res.setHeader('Cache-Control', 'private, max-age=10');  // 10초 동안 캐싱
      
      return res.status(200).json(optimizedResponse);
    } catch (error: any) {
      console.error("Error retrieving photos with analyses:", error);
      return res.status(500).json({ error: "Failed to retrieve photos with analyses", details: error.message });
    }
  });

  // Update a photo's visibility
  app.patch("/api/photos/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const photoId = parseInt(req.params.id);
      if (isNaN(photoId)) {
        return res.status(400).json({ error: "Invalid photo ID" });
      }
      
      const { isHidden } = req.body;
      if (typeof isHidden !== 'boolean') {
        return res.status(400).json({ error: "isHidden must be a boolean value" });
      }
      
      // Get the photo to check ownership
      const photo = await storage.getPhoto(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // Check if the user owns this photo
      if (photo.userId !== (req.user as any).id) {
        return res.status(403).json({ error: "You don't have permission to update this photo" });
      }
      
      // Update the photo's visibility
      const updatedPhoto = await storage.updatePhotoVisibility(photoId, isHidden);
      
      return res.status(200).json({
        success: true,
        photo: updatedPhoto
      });
    } catch (error: any) {
      console.error("Error updating photo visibility:", error);
      return res.status(500).json({ error: "Failed to update photo", details: error.message });
    }
  });
  
  // Update an analysis' visibility (새 엔드포인트)
  app.patch("/api/analyses/:id/visibility", async (req: Request, res: Response) => {
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

  // Get a specific photo by ID
  app.get("/api/photos/:id", async (req: Request, res: Response) => {
    try {
      const photoId = parseInt(req.params.id);
      if (isNaN(photoId)) {
        return res.status(400).json({ error: "Invalid photo ID" });
      }

      const photo = await storage.getPhoto(photoId);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // base64 이미지 데이터 제거
      const { base64DisplayImage, base64AnalysisImage, ...photoWithoutBase64 } = photo;
      
      // Firebase/리플릿 URL이 있으면 base64 데이터는 완전히 제거
      const safeResponse = {
        success: true,
        photo: {
          ...photoWithoutBase64,
          // URL이 전혀 없는 경우만 base64 데이터 유지
          base64DisplayImage: (!photo.firebaseDisplayUrl && !photo.displayImagePath) ? photo.base64DisplayImage : null,
        }
      };
      
      return res.status(200).json(safeResponse);
    } catch (error: any) {
      console.error("Error retrieving photo:", error);
      return res.status(500).json({ error: "Failed to retrieve photo", details: error.message });
    }
  });

  // 특정 사진의 최신 분석 조회 API
  app.get("/api/photos/:id/latest-analysis", async (req: Request, res: Response) => {
    try {
      const photoId = parseInt(req.params.id);
      
      if (isNaN(photoId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid photo ID" 
        });
      }
      
      // 사진 ID로 모든 분석 가져오기 (최신순)
      const analyses = await storage.getPhotoAnalyses(photoId);
      
      if (!analyses || analyses.length === 0) {
        return res.status(200).json({ 
          success: true,
          found: false,
          message: "No analysis found for this photo" 
        });
      }
      
      // 가장 최신 분석 반환
      const latestAnalysis = analyses[0];
      
      return res.status(200).json({
        success: true,
        found: true,
        analysisId: latestAnalysis.id,
        analysis: {
          id: latestAnalysis.id,
          photoId: latestAnalysis.photoId,
          summary: latestAnalysis.summary,
          overallScore: latestAnalysis.overallScore,
          categoryScores: latestAnalysis.categoryScores,
          tags: latestAnalysis.tags,
          analysis: latestAnalysis.analysis,
          persona: latestAnalysis.persona,
          language: latestAnalysis.language,
          createdAt: latestAnalysis.createdAt
        }
      });
    } catch (error: any) {
      console.error("Error fetching latest analysis:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch latest analysis", 
        details: error.message 
      });
    }
  });

  // Get all analyses for a specific photo
  // 이전 API 엔드포인트 (하위 호환성 유지)
  app.get("/api/photos/:id/analyses", async (req: Request, res: Response) => {
    // 새 엔드포인트로 리디렉션
    return res.redirect(307, `/api/analyses?photoId=${req.params.id}`);
  });
  
  /* 아래 경로는 라우터로 분리되어 /api/analyses 라우터에서 처리됩니다.
  // 새로운 API 엔드포인트 - photoId로 분석 데이터 조회
  app.get("/api/analyses", async (req: Request, res: Response) => {
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
      console.error("Error retrieving analyses:", error);
      return res.status(500).json({ error: "Failed to retrieve analyses", details: error.message });
    }
  });

  // 구체적인 경로를 항상 동적 매개변수 경로보다 먼저 선언해야 함
  
  /* 아래 경로는 라우터로 분리되어 /api/analyses 라우터에서 처리됩니다.
  // Get a specific analysis by ID (동적 매개변수는 항상 구체적인 경로 뒤에 선언)
  app.get("/api/analyses/:id", async (req: Request, res: Response) => {
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
  
  // 분석에 대한 의견(opinion) 추가 또는 업데이트
  app.post("/api/analyses/:id/opinions", async (req: Request, res: Response) => {
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
  
  // Delete a specific analysis by ID
  app.delete("/api/analyses/:id", async (req: Request, res: Response) => {
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
      
      // 분석 삭제 로직
      // 스토리지 인터페이스에 deleteAnalysis 메서드가 없어 추가해야 하지만,
      // 우선 스토리지 인터페이스를 수정하지 않고 임시로 구현
      // 분석을 숨김 처리해 삭제한 것처럼 동작하게 함
      await storage.updateAnalysisVisibility(analysisId, true);
      
      return res.status(200).json({
        success: true,
        message: "Analysis deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting analysis:", error);
      return res.status(500).json({ error: "Failed to delete analysis", details: error.message });
    }
  });

  */
  // 아래 주석 처리된 API 엔드포인트 관련 코드는 분리된 라우터로 이동했습니다.
  
  const httpServer = createServer(app);
  return httpServer;
}

// Express is already imported at the top
