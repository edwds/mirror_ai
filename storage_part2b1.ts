// For backward compatibility, maintain MemStorage class
// Initialize database storage
export const storage = new DatabaseStorage();

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private photos: Map<number, Photo>;
  private analyses: Map<number, Analysis>;
  currentUserId: number;
  currentPhotoId: number;
  currentAnalysisId: number;

  constructor() {
    this.users = new Map();
    this.photos = new Map();
    this.analyses = new Map();
    this.currentUserId = 1;
    this.currentPhotoId = 1;
    this.currentAnalysisId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === username, // Using email instead of username
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      googleId: insertUser.googleId || null,
      displayName: insertUser.displayName || null,
      email: insertUser.email || null,
      profilePicture: insertUser.profilePicture || null,
      bio: insertUser.bio || null,
      websiteUrl1: insertUser.websiteUrl1 || null,
      websiteUrl2: insertUser.websiteUrl2 || null,
      websiteLabel1: insertUser.websiteLabel1 || null,
      websiteLabel2: insertUser.websiteLabel2 || null,
      socialLinks: insertUser.socialLinks || {},
      createdAt: insertUser.createdAt || new Date().toISOString(),
      lastLogin: insertUser.lastLogin || new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserLastLogin(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      lastLogin: new Date().toISOString()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUser(id: number, updates: Partial<Omit<User, "id" | "createdAt" | "lastLogin">>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      ...updates
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  


  // Photo methods
  async getPhoto(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async createPhoto(photo: Omit<InsertPhoto, "createdAt"> & { 
    userId?: number;
    displayImagePath: string;
    analysisImagePath: string;
    firebaseDisplayUrl?: string;
    firebaseAnalysisUrl?: string;
  }): Promise<Photo> {
    const id = this.currentPhotoId++;
    const newPhoto: Photo = {
      id,
      userId: photo.userId || null,
      originalFilename: photo.originalFilename,
      displayImagePath: photo.displayImagePath,
      analysisImagePath: photo.analysisImagePath,
      firebaseDisplayUrl: photo.firebaseDisplayUrl || null,
      firebaseAnalysisUrl: photo.firebaseAnalysisUrl || null,
      exifData: photo.exifData || null,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    this.photos.set(id, newPhoto);
    return newPhoto;
  }

  async getUserPhotos(userId?: number, includeHidden: boolean = false): Promise<Photo[]> {
    const allPhotos = Array.from(this.photos.values());
    if (userId) {
      // 숨겨진 사진 포함 여부에 따라 필터링
      const filteredPhotos = includeHidden 
        ? allPhotos.filter(photo => photo.userId === userId)
        : allPhotos.filter(photo => photo.userId === userId && !photo.isHidden);
      
      // 날짜 기준 내림차순 정렬
      return filteredPhotos.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      // 모든 공개 사진 반환
      const publicPhotos = allPhotos.filter(photo => !photo.isHidden);
      
      // 날짜 기준 내림차순 정렬
      return publicPhotos.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  }
  
  async updatePhotoVisibility(id: number, isHidden: boolean): Promise<Photo> {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error(`Photo with ID ${id} not found`);
    }
    
    const updatedPhoto: Photo = {
      ...photo,
      isHidden
    };
    this.photos.set(id, updatedPhoto);
    return updatedPhoto;
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getPhotoAnalyses(photoId: number): Promise<Analysis[]> {
    const allAnalyses = Array.from(this.analyses.values())
      .filter(analysis => analysis.photoId === photoId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return allAnalyses;
  }

  async createAnalysis(analysis: Omit<InsertAnalysis, "createdAt">): Promise<Analysis> {
    const id = this.currentAnalysisId++;
    const newAnalysis: Analysis = {
      id,
      photoId: analysis.photoId,
      detectedGenre: analysis.detectedGenre || "Unknown",
      summary: analysis.summary,
      overallScore: analysis.overallScore,
      categoryScores: analysis.categoryScores,
      analysis: analysis.analysis,
      focusPoint: analysis.focusPoint,
      persona: analysis.persona,
      detailLevel: analysis.detailLevel,
      language: analysis.language,
      tags: analysis.tags || [],
      createdAt: new Date().toISOString()
    };
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }
  
  // Combined methods
  async getUserPhotosWithAnalyses(userId?: number, includeHidden: boolean = false): Promise<any[]> {
    // 1. 사용자의 사진 목록 가져오기
    const userPhotos = await this.getUserPhotos(userId, includeHidden);
    
    // 2. 각 사진의 최신 분석 가져오기
    const photosWithAnalyses = await Promise.all(userPhotos.map(async (photo) => {
      const photoAnalyses = await this.getPhotoAnalyses(photo.id);
      
      // 가장 최신 분석 선택 (이미 날짜순 정렬되어 있음)
      const latestAnalysis = photoAnalyses.length > 0 ? photoAnalyses[0] : null;
      
      let analysisContent = null;
      let summary = "";
      let overallScore = 0;
      let categoryScores = null;
      let strengths: string[] = [];
      let improvements: string[] = [];
      let tags: string[] = [];
      
      // 분석 데이터 파싱
      if (latestAnalysis) {
        try {
          // 분석 데이터가 문자열인 경우 JSON으로 파싱
          analysisContent = typeof latestAnalysis.analysis === 'string'
            ? JSON.parse(latestAnalysis.analysis)
            : latestAnalysis.analysis;
          
          // 요약 정보 추출
          if (analysisContent && typeof analysisContent === 'object') {
            // 요약 정보
            summary = latestAnalysis.summary;
            
            // 전체 점수
            overallScore = latestAnalysis.overallScore;
            
            // 카테고리 점수
            categoryScores = latestAnalysis.categoryScores;
            
            // 강점 및 개선점 
            // overall 객체 내부에서 데이터 추출
            if (analysisContent.overall) {
              // 강점 추출
              if (analysisContent.overall.strengths && Array.isArray(analysisContent.overall.strengths)) {
                strengths = analysisContent.overall.strengths;
              }
              
              // 개선점 추출
              if (analysisContent.overall.improvements && Array.isArray(analysisContent.overall.improvements)) {
                improvements = analysisContent.overall.improvements;
              }
              
              // 둘 다 없을 경우 overview.pros/cons에서 추출 시도
              if ((!strengths || strengths.length === 0) && analysisContent.overall.overview) {
                if (analysisContent.overall.overview.pros && Array.isArray(analysisContent.overall.overview.pros)) {
                  strengths = analysisContent.overall.overview.pros;
                }
                
                if (analysisContent.overall.overview.cons && Array.isArray(analysisContent.overall.overview.cons)) {
                  improvements = analysisContent.overall.overview.cons;
                }
              }
            }
            
            // 분석 구조가 다른 경우 (nested 구조)
            if ((!strengths || !strengths.length) && analysisContent.analysis && analysisContent.analysis.overall) {
              if (analysisContent.analysis.overall.strengths && Array.isArray(analysisContent.analysis.overall.strengths)) {
                strengths = analysisContent.analysis.overall.strengths;
              }
              
              if (analysisContent.analysis.overall.improvements && Array.isArray(analysisContent.analysis.overall.improvements)) {
                improvements = analysisContent.analysis.overall.improvements;
              }
            }
            
            // 태그
            tags = latestAnalysis.tags || [];
          }
        } catch (error) {
          console.error(`Error parsing analysis data for photo ${photo.id}:`, error);
        }
      }
      
      // 카메라 정보 포맷팅
      let cameraInfo = null;
      if (photo.exifData) {
        if (typeof photo.exifData === 'string') {
          try {
            const exifData = JSON.parse(photo.exifData);
            if (exifData.cameraMake && exifData.cameraModel) {
              cameraInfo = `${exifData.cameraMake} | ${exifData.cameraModel}`;
            } else if (exifData.cameraInfo) {
              cameraInfo = exifData.cameraInfo;
            }
          } catch (e) {
            console.error(`Error parsing EXIF data for photo ${photo.id}:`, e);
          }
        } else if (typeof photo.exifData === 'object') {
          const exifData = photo.exifData as Record<string, any>;
          if (exifData?.cameraMake && exifData?.cameraModel) {
            cameraInfo = `${exifData.cameraMake} | ${exifData.cameraModel}`;
          } else if (exifData?.cameraInfo) {
            cameraInfo = exifData.cameraInfo;
          }
        }
      }
      
      // 최종 결과 반환
      return {
        id: latestAnalysis?.id || photo.id,
        photoId: photo.id,
        firebaseDisplayUrl: photo.firebaseDisplayUrl,
        firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
        displayImagePath: photo.displayImagePath,
        createdAt: photo.createdAt,
        title: summary || photo.originalFilename,
        overallScore: overallScore,
        isPublic: !photo.isHidden,
        isHidden: photo.isHidden || false,
        categoryScores: categoryScores || {
          composition: 0,
          lighting: 0,
          color: 0,
          focus: 0,
          creativity: 0
        },
        strengths: strengths,
        improvements: improvements,
        cameraInfo: cameraInfo,
        tags: tags,
        analysisId: latestAnalysis?.id
      };
    }));
    
    return photosWithAnalyses;
  }
}
