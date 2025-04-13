// Type definitions for missing modules

declare module 'exif' {
  export class ExifImage {
    constructor(options: { image: Buffer }, callback: (error: Error | null, data: any) => void);
  }
}

// Social media links type
declare interface SocialLinks {
  instagram?: string;
  thread?: string;
  x?: string;
  youtube?: string;
  tiktok?: string;
  naverBlog?: string;
  [key: string]: string | undefined; // For custom links
}