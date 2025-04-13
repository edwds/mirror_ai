import multer from "multer";

// Configure multer for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// 프로필 이미지용 업로드 미들웨어 (별도 설정이 필요하면)
export const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용 (예시)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!') as any, false); // 타입 에러 방지
    }
  }
}).single('profileImage'); // 필드 이름 지정