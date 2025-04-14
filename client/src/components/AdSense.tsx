
import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  slot?: string;
  format?: 'auto' | 'fluid';
  responsive?: boolean;
}

export const AdSense: React.FC<AdSenseProps> = ({
  slot = "your-ad-slot-id", // AdSense에서 제공한 실제 slot ID로 교체하세요
  format = "auto",
  responsive = true
}) => {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-3807107150603516"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    />
  );
};
