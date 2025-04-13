import { Router } from "express";
import { analysisController } from "../controllers/analysis.controller"; // analysisController 객체 가져오기
import { isAuthenticated } from '../middleware/auth.middleware';
// import { upload } from '../middleware/upload.middleware'; // 업로드가 필요하면

const router = Router();

// 사진 분석 요청 (기존 /api/photos/analyze 경로를 여기로 이동)
// POST /api/analyses/
// 또는 POST /api/analyses/photo/:photoId  (경로 설계에 따라)
router.post("/", analysisController.analyzePhotoHandler); // 컨트롤러의 메서드 사용

// 특정 분석 조회
// GET /api/analyses/:id
router.get("/:id", analysisController.getAnalysisById);

// 분석에 대한 의견 추가/수정
// POST /api/analyses/:id/opinions
router.post("/:id/opinions", isAuthenticated, analysisController.submitOpinion); // 로그인 필요

// 분석 삭제 (숨김 처리)
// DELETE /api/analyses/:id
router.delete("/:id", isAuthenticated, analysisController.deleteAnalysis); // 로그인 필요

// 분석 가시성 업데이트 기능은 삭제됨
// 대신 deleteAnalysis를 사용하세요

export default router;