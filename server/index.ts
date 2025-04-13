import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import session from "express-session";
import passport from "./auth";
import path from "path";
import { Server } from "http";

// 카메라 모델별 최적화된 사진 검색 메서드 확장
import "./storageExtension";
import "./memStorageExtension";

// Express 세션에 사용자 정의 속성 추가
declare module "express-session" {
  interface SessionData {
    user?: any;
    userId?: number;
    isAuthenticated?: boolean;
  }
}

const app = express();

// JSON 파서 및 URL 인코딩 미들웨어를 먼저 설정
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// 라우터 임포트 - 세션 및 인증 미들웨어 설정 후에 추가될 예정

// Configure session with production-ready settings
const isProduction =
  process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEPLOYMENT_URL;
console.log(`Running in ${isProduction ? "production" : "development"} mode`);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mirror-secret-key",
    // 명시적으로 세션 저장 요청 - OAuth 로그인 문제 해결에 중요
    resave: true,
    // OAuth 흐름에서는 초기화되지 않은 세션도 저장하도록 설정
    saveUninitialized: true,
    rolling: true, // 모든 응답에서 쿠키를 새로 설정
    cookie: {
      // Replit 배포에서는 secure를 조건부로 설정 (앱에 따라 다름)
      secure: false, // HTTPS 환경에서는 true로 설정할 수 있지만, 로그인 문제 해결을 위해 false로 유지
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일 유지
      httpOnly: true,
      // OAuth 리디렉션을 허용하기 위해 lax로 설정
      sameSite: "lax",
      // 경로 설정으로 쿠키 스코프 제한
      path: "/",
    },
  }),
);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the public directory (favicon, ogimage, etc.)
app.use(express.static(path.join(process.cwd(), "public")));

// Firebase로 업로드를 마이그레이션했으므로 uploads 디렉토리 정적 서빙 제거

// 인증 후에 라우터 등록 - isAuthenticated 함수 사용 가능
import photoRoutes from "./routes/photo.routes";
app.use("/api/photos", photoRoutes);
import { analysesRouter } from "./routes/analyses.routes";
app.use("/api/analyses", analysesRouter); // 수정: /api/photos → /api/analyses로 경로 변경

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Firebase로 이미지 업로드를 이동했으므로 uploads 디렉토리 관련 로직 제거

  // Initialize database first
  await initializeDatabase();

  // Auth routes
  app.get("/auth/google", (req, res, next) => {
    // 인증 요청 로깅 - 성능 디버깅용
    console.log("Starting Google authentication request...");

    // 인증 요청 전에 캐시 헤더 설정
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");

    // 구글 인증 과정 시작
    passport.authenticate("google", {
      scope: ["profile", "email"],
      // 인증 상태를 명시적으로 저장
      session: true,
      // 빠른 응답을 위해 프롬프트 설정 최적화
      prompt: "select_account",
    })(req, res, next);
  });

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      // 캐시 컨트롤 헤더 설정으로 인증 응답이 캐시되지 않도록 함
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // 인증 처리 시작 로깅
      console.log("Processing Google auth callback...");

      passport.authenticate("google", {
        failureRedirect: "/login",
        failureMessage: true,
        // 세션 저장 등 필요한 모든 작업이 완료될 때까지 기다리도록 함
        keepSessionInfo: true,
      })(req, res, next);
    },
    (req, res) => {
      // 인증 성공 로깅
      console.log(
        "Google authentication successful. User:",
        req.user ? `ID: ${(req.user as any).id}` : "Unknown",
      );

      // 세션 확인 로그
      console.log(
        "Session before save:",
        !!req.session,
        "IsAuthenticated:",
        req.isAuthenticated(),
      );

      // 세션에 중요 데이터 설정 (문제 해결용)
      if (req.user) {
        // 세션에 명시적으로 사용자 정보 저장
        req.session.user = req.user;
        req.session.userId = (req.user as any).id;
        req.session.isAuthenticated = true;
      }

      // 완료 전에 세션이 저장되도록 하기 위한 추가 단계
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session after authentication:", err);
          // 오류 발생시에도 리디렉션은 진행
          return res.redirect("/my");
        }

        console.log("Session successfully saved. Redirecting to MyPage...");

        // 사용자를 마이페이지로 리디렉션
        res.redirect("/my");
      });
    },
  );

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        isAuthenticated: true,
        user: req.user,
      });
    } else {
      res.json({
        isAuthenticated: false,
        user: null,
      });
    }
  });

  // Logout route
  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // 계정 삭제 API
  app.get("/api/auth/delete-account", async (req, res) => {
    try {
      // 세션에서 현재 로그인한 사용자 확인
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "로그인이 필요합니다." });
      }

      const sessionUser = req.user as any;
      const userId = sessionUser.id;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "유효하지 않은 사용자 ID입니다." });
      }

      // 여기서 사용자 계정 삭제 로직 구현
      // 현재 스키마에 deleteUser 기능이 없기 때문에 아래 코드는 샘플입니다
      // storage.deleteUser(userId);

      // 대신, 사용자에게 계정 삭제는 아직 구현 중이라고 알리고 로그아웃 처리
      console.log(
        `사용자 ID ${userId}의 계정 삭제 요청을 받았습니다. 기능 구현 예정입니다.`,
      );

      // 로그아웃 처리
      req.logout(() => {
        // 세션 삭제
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error(
              "Session destruction error during account deletion:",
              sessionErr,
            );
          }

          // 알림과 함께 홈 페이지로 리다이렉트
          res.redirect("/?message=account_deletion_requested");
        });
      });
    } catch (error) {
      console.error("계정 삭제 중 오류 발생:", error);
      return res
        .status(500)
        .json({ error: "계정 삭제 중 오류가 발생했습니다." });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
