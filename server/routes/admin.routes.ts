import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { cameraController } from "../controllers/camera.controller";
import { checkAdminAccess } from '../middleware/auth.middleware';

const router = Router();

// 모든 관리자 API 경로에 checkAdminAccess 미들웨어 적용
router.use(checkAdminAccess);

// --- 시스템 관련 ---
// GET /api/admin/system/uploads-status
router.get("/system/uploads-status", adminController.getUploadsStatus);

// --- 분석 통계 관련 ---
// GET /api/admin/analytics
router.get("/analytics", adminController.getAnalyticsStats);
// GET /api/admin/score-distribution
router.get("/score-distribution", adminController.getScoreDistribution);
// GET /api/admin/genre-distribution
router.get("/genre-distribution", adminController.getGenreDistribution);
// POST /api/admin/cleanup-analyses
router.post("/cleanup-analyses", adminController.cleanupAnalyses);

// --- 카메라 모델 관리 (서브 라우터 사용 가능) ---
const cameraRouter = Router();
// GET /api/admin/camera-models?page=...&limit=...&q=...
cameraRouter.get("/", cameraController.getAllCameraModels);
// POST /api/admin/camera-models
cameraRouter.post("/", cameraController.createCameraModel);
// GET /api/admin/camera-models/:id
cameraRouter.get("/:id", cameraController.getCameraModelById);
// PUT /api/admin/camera-models/:id
cameraRouter.put("/:id", cameraController.updateCameraModel);
// DELETE /api/admin/camera-models/:id
cameraRouter.delete("/:id", cameraController.deleteCameraModel);

// /api/admin/camera-models 경로에 cameraRouter 마운트
router.use("/camera-models", cameraRouter);

export default router;