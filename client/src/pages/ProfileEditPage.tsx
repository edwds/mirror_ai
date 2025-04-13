import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Container } from '@/components/Container';
import { Icons } from '@/components/Icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, User, UserMinus } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Validation schema for the form
const formSchema = z.object({
  displayName: z.string().min(2, {
    message: 'Display name must be at least 2 characters.',
  }),
  bio: z.string().max(80, {
    message: 'Bio cannot exceed 80 characters.',
  }),
  websiteUrl1: z.string().url({
    message: 'Please enter a valid URL.',
  }).optional().or(z.literal('')),
  websiteLabel1: z.string().max(30, {
    message: 'Label cannot exceed 30 characters.'
  }).optional().or(z.literal('')),
});

const ProfileEditPage: React.FC = () => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 로그인하지 않은 사용자는 로그인 페이지로 리디렉션
  useEffect(() => {
    if (!user) {
      toast({
        variant: "destructive",
        title: t('auth.loginRequired', '로그인이 필요합니다'),
        description: t('auth.loginRequiredDetail', '프로필 설정을 이용하려면 로그인해주세요'),
      });
      navigate('/');
    }
  }, [user, navigate, toast, t]);

  // Form 인스턴스 생성
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      websiteUrl1: user?.websiteUrl1 || '',
      websiteLabel1: user?.websiteLabel1 || '',
    },
  });

  // 컴포넌트 마운트 시 사용자 데이터 로드
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        bio: user?.bio || '',
        websiteUrl1: user?.websiteUrl1 || '',
        websiteLabel1: user?.websiteLabel1 || '',
      });
    }
  }, [user, form]);

  // 폼 제출 처리
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // API 요청
      const response = await fetch(`/api/user/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: values.displayName,
          bio: values.bio || '',
          websiteUrl1: values.websiteUrl1 || '',
          websiteLabel1: values.websiteLabel1 || '',
          // 두 번째 웹사이트 URL은 유지하지만 사용자가 더 이상 편집할 수 없음
          websiteUrl2: user.websiteUrl2 || '',
          websiteLabel2: user.websiteLabel2 || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 사용자 정보 업데이트
        updateUser({
          ...user,
          displayName: values.displayName,
          bio: values.bio,
          websiteUrl1: values.websiteUrl1 || '',
          websiteLabel1: values.websiteLabel1 || '',
        });
        
        // 쿼리 캐시 무효화
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user.id}`] });
        
        toast({
          title: t('profile.updateSuccess', '프로필이 업데이트되었습니다'),
          description: t('profile.updateSuccessDetail', '변경사항이 성공적으로 저장되었습니다'),
        });
        
        // 마이페이지로 이동
        navigate('/my');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        variant: 'destructive',
        title: t('profile.updateFailed', '오류 발생'),
        description: t('profile.updateFailedDetail', '프로필을 업데이트하는 중 문제가 발생했습니다. 다시 시도해주세요.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="pt-24 pb-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="mb-8 border-b pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t('profile.settings', 'Profile Settings')}
              </h1>
              <p className="text-slate-500 mt-1">
                {t('profile.settingsSubtitle', 'Manage your personal information and site preferences')}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={() => navigate('/my')}
            >
              <Icons.X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              {/* 프로필 정보 섹션 */}
              <div>
                <h2 className="text-lg font-medium text-slate-900 mb-4">
                  {t('profile.personalInfo', 'Basic Information')}
                </h2>
                <div className="space-y-4">
                  {/* 닉네임 필드 */}
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profile.displayName', 'Display Name')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder={t('profile.enterDisplayName', 'Enter your display name')} 
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 자기소개 필드 */}
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profile.bio', 'Bio')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              placeholder={t('profile.enterBio', 'Write a brief bio about yourself')} 
                              {...field} 
                              className="resize-none"
                              maxLength={80}
                              rows={4}
                            />
                            <div className="absolute right-3 bottom-3 text-xs text-slate-400">
                              {field.value?.length || 0}/80
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 웹사이트 링크 섹션 */}
              <div>
                <h2 className="text-lg font-medium text-slate-900 mb-4">
                  {t('profile.websiteLinks', 'Website Links')}
                </h2>

                <div className="grid gap-4">
                  <div className="grid gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    {/* 웹사이트 링크 */}
                    <FormField
                      control={form.control}
                      name="websiteUrl1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.websiteUrl', 'Website URL')}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com" 
                              {...field}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="websiteLabel1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.websiteLabel', 'Description (optional)')}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('profile.websiteLabelPlaceholder', 'My Portfolio')} 
                              {...field}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/my')}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving', 'Saving...')}
                  </div>
                ) : t('common.save', 'Save')}
              </Button>
            </div>
            
            {/* 로그아웃 및 계정 탈퇴 섹션 - 눈에 덜 띄게 변경 */}
            <div className="border-t pt-6 mt-8 opacity-70">
              <h2 className="text-sm font-medium text-slate-600 mb-3">
                {t('profile.accountSettings', 'Account Settings')}
              </h2>
              <div className="flex flex-col gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-slate-500 text-sm text-left flex justify-start gap-2 items-center h-9"
                  onClick={() => {
                    if (window.confirm(t('profile.logoutConfirm', 'Are you sure you want to log out?'))) {
                      window.location.href = '/api/auth/logout';
                    }
                  }}
                >
                  <Icons.LogOut className="h-3.5 w-3.5" />
                  {t('profile.logout', 'Log Out')}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-slate-500 text-sm text-left flex justify-start gap-2 items-center h-9"
                  onClick={() => {
                    if (window.confirm(t('profile.deleteAccountConfirm', 'Are you sure you want to delete your account? This action cannot be undone.'))) {
                      window.location.href = '/api/auth/delete-account';
                    }
                  }}
                >
                  <Icons.UserX className="h-3.5 w-3.5" />
                  {t('profile.deleteAccount', 'Delete Account')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </Container>
  );
};

export default ProfileEditPage;