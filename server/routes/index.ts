import { Router } from "express";
import userRouter from "./user.routes";
import photoRouter from "./photo.routes";
import analysisRouter from "./analysis.routes";
import adminRouter from "./admin.routes";
import { imageProxyRouter } from "./imageProxy"; // 기존 프록시 라우터

const router = Router();

router.use("/user", userRouter);
router.use("/photos", photoRouter);
router.use("/analyses", analysisRouter); // 분석 관련 경로는 /api/analyses 로 변경 제안
router.use("/admin", adminRouter);
router.use("/image-proxy", imageProxyRouter);

export default router;