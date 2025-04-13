import { Router } from "express";
import { photoController } from "../controllers/photo.controller";
import { isAuthenticated } from '../middleware/auth.middleware';
// import { upload } from '../middleware/upload.middleware'; // 사진 업로드는 body로 base64 받으므로 multer 불필요

const router = Router();

// 사진 업로드 (Base64 방식)
router.post("/upload", photoController.uploadPhoto); // 인증 여부는 컨트롤러 내부에서 확인

// 사용자 사진 목록 조회 (분석 제외)
// GET /api/photos?userId=...&includeHidden=...
router.get("/", photoController.getUserPhotos);

// 사용자 사진 목록 조회 (최신 분석 포함, 페이지네이션)
// GET /api/photos/with-analyses?userId=...&includeHidden=...&page=...&limit=...
router.get("/with-analyses", photoController.getUserPhotosWithAnalyses);

// 카메라 모델별 사진 조회 (쿼리 파라미터 방식)
// GET /api/photos/by-camera?model=...&page=...&limit=...&userId=...&onlyMine=...&includeHidden=...
router.get("/by-camera", photoController.getPhotosByCamera);

// 카메라 모델별 사진 조회 (경로 파라미터 방식)
// GET /api/photos/by-camera/:model?page=...&limit=...&userId=...&onlyMine=...&includeHidden=...
router.get("/by-camera/:model", photoController.getPhotosByCamera);

// 카메라 모델별 사진 조회 (분석 포함, 최적화)
// GET /api/photos/by-camera/:model/with-analyses?page=...&limit=...
router.get("/by-camera/:model/with-analyses", photoController.getPhotosByCameraDirect);

// 특정 사진 조회
// GET /api/photos/:id
router.get("/:id", photoController.getPhotoById);

// 특정 사진의 모든 분석 조회
// GET /api/photos/:id/analyses
router.get("/:id/analyses", photoController.getPhotoAnalyses); // 접근 권한은 컨트롤러 내부에서 체크 가능

// 특정 사진의 최신 분석 조회
// GET /api/photos/:id/latest-analysis
router.get("/:id/latest-analysis", photoController.getLatestAnalysisForPhoto);

// 사진 가시성 업데이트
// PATCH /api/photos/:id
router.patch("/:id", isAuthenticated, photoController.updatePhotoVisibility); // 로그인 및 소유권 필요

export default router;