import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: number;
  googleId: string | null;
  displayName: string | null;
  email: string | null;
  profilePicture: string | null;
  bio?: string | null;
  socialLinks?: SocialLinks;
  websiteUrl1?: string | null;
  websiteUrl2?: string | null;
  websiteLabel1?: string | null;
  websiteLabel2?: string | null;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 최적화된 인증 상태 확인 함수
    const fetchUser = async () => {
      try {
        interface AuthResponse {
          isAuthenticated: boolean;
          user: User | null;
        }
        
        // 성능 최적화: API 요청 캐싱을 활용하도록 캐시 제어 헤더 추가
        const response = await apiRequest<AuthResponse>('/api/auth/user', 'GET');
        
        if (response && response.isAuthenticated && response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
          
          // 로그인 후 저장된 리다이렉트 경로가 있는지 확인
          const redirectPath = localStorage.getItem('loginRedirect');
          const loginSource = localStorage.getItem('loginSource');
          
          if (redirectPath) {
            // 리다이렉트 경로 정보 삭제
            localStorage.removeItem('loginRedirect');
            localStorage.removeItem('loginSource');
            
            // 로그인 소스에 따라 다른 처리
            if (loginSource === 'dialog') {
              // 다이얼로그에서 로그인한 경우 업로드 페이지로 직접 이동
              window.location.href = '/upload';
            } else {
              // 일반 로그인 버튼에서 로그인한 경우 마이페이지로 이동
              window.location.href = '/my';
            }
          }
        } else {
          // 성능 최적화: 개발 모드에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.log('AuthContext: User is not authenticated');
          }
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // 에러 로그는 유지 (중요 정보)
        console.error('AuthContext: Failed to fetch auth status:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    // 로컬 쿠키를 확인하여 인증 상태 최적화
    const checkLocalAuth = () => {
      try {
        // 세션 쿠키가 있는지 확인 (direct 접근은 불가하지만 존재 여부는 확인 가능)
        const hasCookies = document.cookie.length > 0;
        
        // 성능 최적화: 개발 모드에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('AuthContext: Cookies present:', hasCookies);
        }
        
        // URL에서 로그인 완료 상태 확인 (예: 리디렉션 후 특별 파라미터)
        const urlParams = new URLSearchParams(window.location.search);
        const authComplete = urlParams.get('auth_complete');
        
        if (authComplete === 'true') {
          // 로그인 완료 파라미터 처리 후 URL 정리
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (error) {
        console.error('AuthContext: Error checking local auth:', error);
      }
    };
    
    // 로컬 인증 상태 확인 후 사용자 정보 가져오기
    checkLocalAuth();
    fetchUser();
    
    // 성능 최적화: 인증 상태 확인 주기 연장 (10분)
    // 미사용 상태에서 불필요한 서버 호출을 줄이기 위함
    const authInterval = setInterval(fetchUser, 600000);
    
    return () => {
      clearInterval(authInterval);
    };
  }, []);

  const login = () => {
    // 현재 페이지가 홈페이지인지 확인하고 로그인 후 리다이렉트 설정
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
    
    // 홈페이지에서 로그인하는 경우, 로그인 후 마이페이지로 리다이렉트하도록 쿼리 파라미터 추가
    if (isHomePage) {
      // 로그인 후 리다이렉트할 페이지 정보 저장
      localStorage.setItem('loginRedirect', '/my');
    }
    
    // Redirect to Google login page
    window.location.href = '/auth/google';
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };
  
  // 사용자 정보 업데이트 함수
  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};