import { Request, Response, NextFunction } from "express";

// 로그인 여부 확인 미들웨어
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, error: "Authentication required" });
};

// 관리자 권한 확인 미들웨어
export const checkAdminAccess = (req: Request, res: Response, next: NextFunction) => {
  try {
    // --- 실제 배포 시 활성화 ---
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ success: false, message: '인증이 필요합니다' });
    // }
    // const user = req.user as any;
    // if (!user || user.id !== 1) { // ID 1번 사용자를 관리자로 가정
    //   console.log(`[Admin Access Denied] User ID: ${user?.id}`);
    //   return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다' });
    // }
    // console.log(`[Admin Access Granted] User ID: ${user.id}`);
    // next();
    // --- --- --- --- --- ---

    // --- 임시 테스트 모드 (모든 사용자 허용) ---
    console.log('[Admin Access] 임시 테스트 모드: 모든 사용자에게 어드민 대시보드 접근 허용');
    if (!req.isAuthenticated()) {
       console.warn('[Admin Access] 비로그인 사용자가 관리자 API 접근 시도 (테스트 모드)');
       // 비로그인 시에도 테스트를 위해 임시 사용자 객체 주입 (주의!)
       // req.user = { id: 0, displayName: 'Test Admin' };
    }
     // 혹은 실제 서비스에서는 아래와 같이 인증 요구
     // if (!req.isAuthenticated()) {
     //  return res.status(401).json({ success: false, message: '인증이 필요합니다 (테스트 모드)' });
     // }
    next();
    // --- --- --- --- --- ---

  } catch (error) {
    console.error('[Admin Access] 권한 검사 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '권한 검사 중 오류가 발생했습니다'
    });
  }
};