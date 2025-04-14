import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface LanguageSelectorProps {
  isResultsPage?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isResultsPage = false }) => {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  
  const changeUiLanguage = async (lang: string) => {
    if (loading) return; // 이미 다른 언어 로딩 중이면 무시

    try {
      setLoading(lang);
      
      // 언어 변경을 Promise로 래핑하여 처리
      await new Promise<void>((resolve, reject) => {
        const changeHandler = (newLang: string) => {
          if (newLang === lang) {
            i18n.off('languageChanged', changeHandler);
            resolve();
          }
        };
        
        // 타임아웃 처리 (5초 후에도 로드되지 않으면 오류로 처리)
        const timeoutId = setTimeout(() => {
          i18n.off('languageChanged', changeHandler);
          reject(new Error(`Timeout loading language: ${lang}`));
        }, 5000);
        
        // 언어 변경 이벤트 리스너 등록
        i18n.on('languageChanged', changeHandler);
        
        // 언어 변경 시도
        i18n.changeLanguage(lang).catch((err) => {
          clearTimeout(timeoutId);
          i18n.off('languageChanged', changeHandler);
          reject(err);
        });
      });
      
      // 로컬 스토리지에 저장
      localStorage.setItem('uiLanguage', lang);
      console.log(`Language changed to ${lang} successfully`);
      
    } catch (error) {
      console.error(`Failed to change language to ${lang}:`, error);
      toast({
        title: "언어 전환 실패 / Language Change Failed",
        description: `${lang} 언어를 불러오는데 문제가 발생했습니다. 자동으로 영어로 전환합니다. / Failed to load language: ${lang}. Switched to English automatically.`,
        variant: "destructive",
      });
      
      // 오류 발생 시 영어로 폴백
      i18n.changeLanguage('en');
      localStorage.setItem('uiLanguage', 'en');
    } finally {
      setLoading(null);
    }
  };

  // 현재 언어 표시 (로딩 중인 경우 로딩 중인 언어 표시)
  const currentLanguage = loading || i18n.language;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`px-2 ${isResultsPage ? 'text-white hover:bg-white/10' : ''}`}
          disabled={!!loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-0 animate-spin" />
          ) : (
            <Globe className={`h-4 w-4 mr-0 ${isResultsPage ? 'text-white' : ''}`} />
          )}
          <span className={`text-xs uppercase ${isResultsPage ? 'text-white' : ''}`}>{currentLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel>
          UI Language / 인터페이스 언어
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('en')}
          disabled={loading === 'en'}
          className={i18n.language === 'en' ? 'bg-muted' : ''}
        >
          English {loading === 'en' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('ko')}
          disabled={loading === 'ko'}
          className={i18n.language === 'ko' ? 'bg-muted' : ''}
        >
          한국어 {loading === 'ko' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('ja')}
          disabled={loading === 'ja'}
          className={i18n.language === 'ja' ? 'bg-muted' : ''}
        >
          日本語 {loading === 'ja' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('zh_CN')}
          disabled={loading === 'zh_CN'}
          className={i18n.language === 'zh_CN' ? 'bg-muted' : ''}
        >
          简体中文 {loading === 'zh_CN' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('zh_TW')}
          disabled={loading === 'zh_TW'}
          className={i18n.language === 'zh_TW' ? 'bg-muted' : ''}
        >
          繁體中文 {loading === 'zh_TW' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('fr')}
          disabled={loading === 'fr'}
          className={i18n.language === 'fr' ? 'bg-muted' : ''}
        >
          Français {loading === 'fr' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('es')}
          disabled={loading === 'es'}
          className={i18n.language === 'es' ? 'bg-muted' : ''}
        >
          Español {loading === 'es' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('de')}
          disabled={loading === 'de'}
          className={i18n.language === 'de' ? 'bg-muted' : ''}
        >
          Deutsch {loading === 'de' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('nl')}
          disabled={loading === 'nl'}
          className={i18n.language === 'nl' ? 'bg-muted' : ''}
        >
          Nederlands {loading === 'nl' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('it')}
          disabled={loading === 'it'}
          className={i18n.language === 'it' ? 'bg-muted' : ''}
        >
          Italiano {loading === 'it' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('pt')}
          disabled={loading === 'pt'}
          className={i18n.language === 'pt' ? 'bg-muted' : ''}
        >
          Português {loading === 'pt' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('vi')}
          disabled={loading === 'vi'}
          className={i18n.language === 'vi' ? 'bg-muted' : ''}
        >
          Tiếng Việt {loading === 'vi' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('th')}
          disabled={loading === 'th'}
          className={i18n.language === 'th' ? 'bg-muted' : ''}
        >
          ไทย {loading === 'th' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeUiLanguage('id')}
          disabled={loading === 'id'}
          className={i18n.language === 'id' ? 'bg-muted' : ''}
        >
          Bahasa Indonesia {loading === 'id' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;