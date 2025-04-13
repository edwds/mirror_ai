import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import session from 'express-session'; // 세션 설정 추가 (기존 코드에 passport 사용 가정)
import express from 'express';
import session from 'express-session'; // 세션 설정 가정
import passport from './config/passport'; // *** 변경된 경로에서 passport 가져오기 ***
import apiRouter from './routes'; // 모든 API 라우터 가져오기
import { errorHandler } from './middleware/error.middleware';
// import { configurePassport } from './config/passport'; // Passport 설정 함수 (별도 파일 가정)

export async function startServer(): Promise<Server> {
  const app: Express = express();

  // --- 기본 미들웨어 설정 ---
  app.use(express.json({ limit: '50mb' })); // JSON 바디 파서 (용량 제한 증가 고려)
  app.use(express.urlencoded({ extended: true, limit: '50mb' })); // URL-encoded 바디 파서

  // --- 세션 및 인증 설정 (기존 코드에 맞춰 설정 필요) ---
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // 환경 변수 사용 권장
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: process.env.NODE_ENV === 'production' } // HTTPS 환경에서 true 설정
  }));
  // configurePassport(passport); // Passport 설정 초기화
  app.use(passport.initialize());
  app.use(passport.session());

  // --- 정적 파일 서빙 ---
  const publicDir = path.join(process.cwd(), "public");
  app.use(express.static(publicDir));

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // --- API 라우터 마운트 ---
  app.use("/api", apiRouter); // '/api' 경로 아래 모든 라우터 적용

  // --- 기본 경로 핸들러 (옵션) ---
  app.get("/", (req: Request, res: Response) => {
    res.send("API Server is running!");
  });

  // --- 중앙 에러 처리 미들웨어 ---
  app.use(errorHandler);

  // --- 서버 생성 및 시작 ---
  const httpServer = createServer(app);
  const PORT = process.env.PORT || 3000; // 포트 설정

  // 실제 서버 시작 로직은 이 함수 외부에서 호출
  // httpServer.listen(PORT, () => {
  //   console.log(`🚀 Server listening on port ${PORT}`);
  // });

  return httpServer; // 생성된 서버 인스턴스 반환
}

// 예시: 서버 시작
// startServer().then(server => {
//   const PORT = process.env.PORT || 3000;
//   server.listen(PORT, () => {
//     console.log(`🚀 Server listening on port ${PORT}`);
//   });
// }).catch(error => {
//   console.error("❌ Failed to start server:", error);
// });