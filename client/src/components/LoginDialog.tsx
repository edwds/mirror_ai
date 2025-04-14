import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { SiGoogle } from "react-icons/si";

import { useAuth } from "@/contexts/AuthContext";

// 인앱 웹뷰 감지 함수
const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // 일반적인 모바일 브라우저가 아닌 인앱 웹뷰 감지 패턴
  return (
    // 페이스북 인앱 브라우저
    /FBAN|FBAV/.test(ua) || 
    // 인스타그램 인앱 브라우저
    /Instagram/.test(ua) || 
    // 라인 인앱 브라우저
    /Line\//.test(ua) || 
    // 카카오톡 인앱 브라우저
    /KAKAOTALK/.test(ua) || 
    // 네이버 인앱 브라우저
    /NAVER\//.test(ua) ||
    // 안드로이드 웹뷰
    /; wv\)/.test(ua) ||
    // 삼성 브라우저 또는 다른 인앱 브라우저 패턴
    (/SamsungBrowser/.test(ua) && /Version\/[0-9.]+/.test(ua))
  );
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectPath?: string;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  open,
  onOpenChange,
  redirectPath,
}) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [isInAppView, setIsInAppView] = useState(false);
  
  // 컴포넌트가 마운트될 때 인앱 브라우저 감지
  useEffect(() => {
    setIsInAppView(isInAppBrowser());
  }, []);

  const handleLogin = () => {
    if (redirectPath) {
      // Save path to redirect to after login (differentiate login from dialog)
      localStorage.setItem("loginRedirect", redirectPath);
      localStorage.setItem("loginSource", "dialog");
    }
    login();
  };

  const handleContinueAsGuest = () => {
    onOpenChange(false);
    if (redirectPath) {
      navigate(redirectPath);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("login.required", "Login Required")}</DialogTitle>
          <DialogDescription>
            {t(
              "login.description",
              "You can login or continue as a guest to analyze your photos."
            )}
          </DialogDescription>
          {isInAppView && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
              <p>{t(
                "login.webViewWarning",
                "⚠️ If you're having trouble logging in, please open this site in your device's web browser for a better experience."
              )}</p>
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4">
          <Button 
            variant="outline" 
            className="flex items-center justify-center space-x-2" 
            onClick={handleLogin}
          >
            <SiGoogle className="h-4 w-4" />
            <span>{t("login.withGoogle", "Sign in with Google")}</span>
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={handleContinueAsGuest}
          >
            {t("login.continueAsGuest", "Continue as Guest")}
          </Button>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t(
              "login.benefitsMessage", 
              "Login to save your analysis history and access more features."
            )}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};