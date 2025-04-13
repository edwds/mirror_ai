import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { isAuthenticated } from '../middleware/auth.middleware';
import { profileUpload } from '../middleware/upload.middleware'; // 프로필 이미지 업로드용 Multer 미들웨어

const router = Router();

// 현재 로그인한 사용자 프로필 조회
// GET /api/user/profile
router.get("/profile", isAuthenticated, userController.getCurrentUserProfile);

// 특정 사용자 프로필 조회 (ID 사용)
// GET /api/user/:id
router.get("/:id", userController.getUserProfileById); // 인증 불필요 (공개 프로필)

// 사용자 프로필 업데이트
// PATCH /api/user/:id
// profileUpload 미들웨어를 먼저 적용하여 req.file 생성
router.patch("/:id", isAuthenticated, profileUpload, userController.updateUserProfile);

export default router;