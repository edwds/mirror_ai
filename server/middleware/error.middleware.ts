import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ 중앙 에러 핸들러 감지:", err); // 에러 로깅 강화

  // Zod 에러 처리 (필요시)
  if (err?.name === 'ZodError') {
      return res.status(400).json({
          success: false,
          error: "Invalid input data",
          details: err.errors
      });
  }

  // Multer 에러 처리 (필요시)
  if (err?.name === 'MulterError') {
      return res.status(400).json({
          success: false,
          error: "File upload error",
          details: { code: err.code, message: err.message }
      });
  }

  // 기본 에러 처리
  const statusCode = err.statusCode || 500; // 에러 객체에 statusCode가 있으면 사용
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: message,
    // 개발 환경에서는 스택 트레이스 포함 (옵션)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};