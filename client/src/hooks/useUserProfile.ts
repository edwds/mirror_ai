import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// 사용자 프로필 인터페이스
export interface UserProfile {
  id: number;
  displayName: string | null;
  email: string | null;
  createdAt: string;
  lastLogin: string;
  websiteUrl1?: string | null;
  websiteUrl2?: string | null;
  websiteLabel1?: string | null;
  websiteLabel2?: string | null;
  bio?: string | null;
}

// API 응답 인터페이스
export interface UserResponse {
  success: boolean;
  user: UserProfile;
}

/**
 * 사용자 프로필 정보를 가져오고 관리하는 커스텀 훅
 * - 데이터 캐싱 및 업데이트 기능 제공
 */
export function useUserProfile(userId?: number) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const auth = useAuth();
  
  // 상태 관리
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 로그인한 사용자 또는 특정 사용자 ID의 프로필 가져오기
  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // API 경로 설정 (자신의 프로필 또는 다른 사용자 프로필)
      const endpoint = userId 
        ? `/api/user/${userId}` 
        : '/api/user/profile';
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }
      
      const data: UserResponse = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.success ? 'User profile not found' : 'Failed to fetch user profile');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : String(err));
      
      toast({
        title: t('profile.errorLoadingProfile'),
        description: t('profile.tryAgainLater'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, t, toast]);
  
  // 프로필 업데이트
  const updateProfile = useCallback(async (
    updates: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'lastLogin'>>
  ) => {
    // 프로필 업데이트 함수 로직 (비어있음 - 사용되지 않으므로 스텁만 유지)
    console.log('Profile update function called:', updates);
    return true;
  }, []);
  
  // 초기 데이터 로드 - 컴포넌트 마운트 시 한번만 로드
  const didInitialLoad = useRef(false);
  
  useEffect(() => {
    // 인증 로드가 완료되었을 때만 프로필 데이터 요청
    if (!auth.isLoading && !didInitialLoad.current) {
      // 초기 로드 표시 (useRef로 재렌더링 방지)
      didInitialLoad.current = true;
      console.log('Loading user profile data...');
      fetchUserProfile();
    }
  }, [auth.isLoading, fetchUserProfile]);
  
  return {
    user,
    isLoading,
    error,
    updateProfile,
    refreshProfile: fetchUserProfile
  };
}