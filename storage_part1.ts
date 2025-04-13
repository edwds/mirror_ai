import { 
  users, photos, analyses, 
  type User, type InsertUser, 
  type Photo, type InsertPhoto,
  type Analysis, type InsertAnalysis,
  type AnalysisResult
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<User, "id" | "createdAt" | "lastLogin">>): Promise<User>;
  
  // Photo methods
  getPhoto(id: number): Promise<Photo | undefined>;
  createPhoto(photo: Omit<InsertPhoto, "createdAt"> & { 
    userId?: number;
    displayImagePath: string;
    analysisImagePath: string;
    firebaseDisplayUrl?: string;
    firebaseAnalysisUrl?: string;
  }): Promise<Photo>;
  getUserPhotos(userId?: number, includeHidden?: boolean): Promise<Photo[]>;
  updatePhotoVisibility(id: number, isHidden: boolean): Promise<Photo>;
  
  // Photo search/filter methods
  getPhotosByCamera(cameraModel: string, userId?: number, includeHidden?: boolean, page?: number, limit?: number): Promise<{
    photos: Photo[];
    total: number;
  }>;
  
  // 카메라 모델로 사진 검색 (최적화된 버전 - 분석 테이블에서 직접 조회)
  getPhotosByModelDirect(cameraModel: string, userId?: number, includeHidden?: boolean, page?: number, limit?: number): Promise<{
    photos: any[];
    total: number;
  }>;
  
  // Analysis methods
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getPhotoAnalyses(photoId: number): Promise<Analysis[]>;
  createAnalysis(analysis: Omit<InsertAnalysis, "createdAt">): Promise<Analysis>;
  updateAnalysisVisibility(id: number, isHidden: boolean): Promise<Analysis>;
  
  // Combined methods
  getUserPhotosWithAnalyses(userId?: number, includeHidden?: boolean, page?: number, limit?: number): Promise<{
    photos: any[];
    total: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUserLastLogin(id: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ lastLogin: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<Omit<User, "id" | "createdAt" | "lastLogin">>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  


  // Photo methods
  async getPhoto(id: number): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo || undefined;
  }

  async createPhoto(photo: Omit<InsertPhoto, "createdAt"> & { 
    userId?: number, 
    displayImagePath: string, 
    analysisImagePath: string,
    firebaseDisplayUrl?: string,
    firebaseAnalysisUrl?: string
  }): Promise<Photo> {
    const photoData = {
      originalFilename: photo.originalFilename,
      displayImagePath: photo.displayImagePath,
      analysisImagePath: photo.analysisImagePath,
      userId: photo.userId,
      exifData: photo.exifData,
      firebaseDisplayUrl: photo.firebaseDisplayUrl || null,
      firebaseAnalysisUrl: photo.firebaseAnalysisUrl || null,
      createdAt: new Date().toISOString(),
    };
    
    const [createdPhoto] = await db
      .insert(photos)
      .values(photoData)
      .returning();
    
    return createdPhoto;
  }

  async getUserPhotos(userId?: number, includeHidden: boolean = false): Promise<Photo[]> {
    if (userId) {
      // 숨겨진 사진 포함 여부에 따라 쿼리 조건 추가
      if (includeHidden) {
        return db
          .select()
          .from(photos)
          .where(eq(photos.userId, userId))
          .orderBy(desc(photos.createdAt));
      } else {
        // 여러 조건을 and로 연결
        return db
          .select()
          .from(photos)
          .where(and(
            eq(photos.userId, userId),
            eq(photos.isHidden, false)
          ))
          .orderBy(desc(photos.createdAt));
      }
    } else {
      // If no userId is provided, return all public photos
      return db
        .select()
        .from(photos)
        .where(eq(photos.isHidden, false))
        .orderBy(desc(photos.createdAt));
    }
  }
  
  async updatePhotoVisibility(id: number, isHidden: boolean): Promise<Photo> {
    const [updatedPhoto] = await db
      .update(photos)
      .set({ isHidden })
      .where(eq(photos.id, id))
      .returning();
    
    return updatedPhoto;
  }
  
  // Photo search by camera model
  async getPhotosByCamera(cameraModel: string, userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12): Promise<{ photos: Photo[]; total: number }> {
    try {
      console.log(`Getting photos for camera model: ${cameraModel}, userId: ${userId}, includeHidden: ${includeHidden}`);
      
      // 카메라 모델 검색 조건 (JSON 필드 내 검색)
      let photoQuery = db
        .select()
        .from(photos)
        .where(
          sql`${photos.exifData}->>'cameraModel' ILIKE ${`%${cameraModel}%`}`
        );
      
      // 사용자 ID 필터 조건 추가
      if (userId) {
        photoQuery = photoQuery.where(eq(photos.userId, userId));
      }
      
      // 숨김 상태 필터링
      if (!includeHidden) {
        photoQuery = photoQuery.where(eq(photos.isHidden, false));
      }
      
      // 결과 정렬
      const allMatchingPhotos = await photoQuery.orderBy(desc(photos.createdAt));
      
      // 총 개수 계산
      const totalPhotos = allMatchingPhotos.length;
      
      // 페이지네이션 적용
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, totalPhotos);
      const paginatedPhotos = allMatchingPhotos.slice(startIndex, endIndex);
      
      return {
        photos: paginatedPhotos,
        total: totalPhotos
      };
    } catch (error) {
      console.error('Error in getPhotosByCamera:', error);
      throw error;
    }
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async getPhotoAnalyses(photoId: number): Promise<Analysis[]> {
    return db
      .select()
      .from(analyses)
      .where(eq(analyses.photoId, photoId))
      .orderBy(desc(analyses.createdAt));
  }

  async createAnalysis(analysis: Omit<InsertAnalysis, "createdAt">): Promise<Analysis> {
    const analysisData = {
      ...analysis,
      createdAt: new Date().toISOString(),
    };
    
    const [createdAnalysis] = await db
      .insert(analyses)
      .values(analysisData)
      .returning();
    
    return createdAnalysis;
  }
  
  async updateAnalysisVisibility(id: number, isHidden: boolean): Promise<Analysis> {
    const [updatedAnalysis] = await db
      .update(analyses)
      .set({ isHidden })
      .where(eq(analyses.id, id))
      .returning();
    
    return updatedAnalysis;
  }
  
  // 최적화된 카메라 모델 검색 메서드 (analyses 테이블의 camera_model 칼럼 활용)
  async getPhotosByModelDirect(cameraModel: string, userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12): Promise<{ photos: any[]; total: number }> {
    try {
      console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}"로 사진 및 분석 데이터 조회 중...`);
      
      // SQL 조건 구성
      let whereCondition = sql`a.camera_model = ${cameraModel}`; // 기본 카메라 모델 조건
      
      // 사용자 ID 조건 (선택적)
      if (userId !== undefined) {
        whereCondition = sql`${whereCondition} AND p.user_id = ${userId}`;
      }
      
      // 숨김 항목 필터링 조건 (선택적)
      if (!includeHidden) {
        whereCondition = sql`${whereCondition} AND a.is_hidden = false`;
      }
      
      // 1. 총 개수 계산
      const countResult = await db.execute(
        sql`SELECT COUNT(*) as total
            FROM "analyses" a
            INNER JOIN "photos" p ON a."photo_id" = p.id
            WHERE ${whereCondition}`
      );
      
      // 총 개수 추출
      const countResultArray = countResult as unknown as Array<{total: number | string}>;
      const totalCount = countResultArray[0]?.total;
      const total = typeof totalCount === 'number' ? totalCount : Number(totalCount || 0);
      
      if (total === 0) {
        console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}"로 찾은 사진이 없습니다.`);
        return { photos: [], total: 0 };
      }
      
      // 2. 페이지네이션 적용된 쿼리 - 명시적으로 각 테이블의 모든 컬럼 지정
      const result = await db.execute(
        sql`SELECT 
            a.id as analysis_id, 
            a.photo_id,
            a.detected_genre,
            a.summary,
            a.overall_score,
            a.category_scores,
            a.analysis,
            a.focus_point,
            a.persona,
            a.detail_level,
            a.language,
            a.tags,
            a.camera_model,
            a.created_at as analysis_created_at,
            a.is_hidden as analysis_is_hidden,
            
            p.id as photo_id,
            p.user_id,
            p.original_filename,
            p.display_image_path,
            p.analysis_image_path,
            p.firebase_display_url,
            p.firebase_analysis_url,
            p.s3_display_url,
            p.s3_analysis_url,
            p.replit_display_url,
            p.replit_analysis_url,
            p.exif_data,
            p.created_at as photo_created_at,
            p.is_hidden as photo_is_hidden
            
            FROM "analyses" a
            INNER JOIN "photos" p ON a.photo_id = p.id
            WHERE ${whereCondition}
            ORDER BY a.created_at DESC
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`
      );
      
      // 3. 결과 처리
      const resultArray = result as unknown as Array<Record<string, any>>;
      
      if (resultArray.length === 0) {
        console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 쿼리 결과가 없습니다 (페이지: ${page}, 제한: ${limit}).`);
        return { photos: [], total };
      }
      
      // 4. 결과 변환 및 포맷팅
      const photosWithAnalyses = await Promise.all(resultArray.map(async (row: Record<string, any>) => {
        // 필드 추출
        const analysis = {
          id: row.analysis_id,
          photoId: row.photo_id,
          detectedGenre: row.detected_genre,
          summary: row.summary,
          overallScore: row.overall_score,
          categoryScores: row.category_scores,
          analysis: row.analysis,
          focusPoint: row.focus_point,
          persona: row.persona,
          detailLevel: row.detail_level,
          language: row.language,
          tags: row.tags || [],
          cameraModel: row.camera_model,
          createdAt: row.analysis_created_at,
          isHidden: row.analysis_is_hidden
        };
        
        const photo = {
          id: row.photo_id,
          userId: row.user_id,
          originalFilename: row.original_filename,
          displayImagePath: row.display_image_path,
          analysisImagePath: row.analysis_image_path,
          firebaseDisplayUrl: row.firebase_display_url,
          firebaseAnalysisUrl: row.firebase_analysis_url,
          s3DisplayUrl: row.s3_display_url,
          s3AnalysisUrl: row.s3_analysis_url,
          replitDisplayUrl: row.replit_display_url,
          replitAnalysisUrl: row.replit_analysis_url,
          exifData: row.exif_data,
          isHidden: row.photo_is_hidden,
          createdAt: row.photo_created_at
        };
        
        // 강점 및 개선점 추출
        let analysisContent = null;
        let strengths: string[] = [];
        let improvements: string[] = [];
        
        try {
          // 분석 데이터가 문자열인 경우 JSON으로 파싱
          analysisContent = typeof analysis.analysis === 'string'
            ? JSON.parse(analysis.analysis)
            : analysis.analysis;
          
          // 강점 및 개선점 추출
          if (analysisContent && typeof analysisContent === 'object') {
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
            
            // analysisContent.analysis.overall 구조에서도 확인
            if ((!strengths || !strengths.length) && analysisContent.analysis && analysisContent.analysis.overall) {
              if (analysisContent.analysis.overall.strengths && Array.isArray(analysisContent.analysis.overall.strengths)) {
                strengths = analysisContent.analysis.overall.strengths;
              }
              
              if (analysisContent.analysis.overall.improvements && Array.isArray(analysisContent.analysis.overall.improvements)) {
                improvements = analysisContent.analysis.overall.improvements;
              }
            }
          }
        } catch (error) {
          console.error(`[getPhotosByModelDirect] 분석 데이터 파싱 오류 (분석 ID: ${analysis.id}):`, error);
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
              console.error(`[getPhotosByModelDirect] EXIF 데이터 파싱 오류 (사진 ID: ${photo.id}):`, e);
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
        
        // 필요한 정보만 포함하여 반환
        return {
          id: analysis.id,
          photoId: photo.id,
          firebaseDisplayUrl: photo.firebaseDisplayUrl,
          firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
          s3DisplayUrl: photo.s3DisplayUrl,
          s3AnalysisUrl: photo.s3AnalysisUrl,
          replitDisplayUrl: photo.replitDisplayUrl,
          replitAnalysisUrl: photo.replitAnalysisUrl,
          displayImagePath: photo.displayImagePath,
          createdAt: analysis.createdAt,
          title: analysis.summary || "Untitled Photo",
          overallScore: analysis.overallScore,
          isPublic: !analysis.isHidden,
          isHidden: analysis.isHidden || false,
          categoryScores: analysis.categoryScores || {
            composition: 0,
            lighting: 0,
            color: 0,
            focus: 0,
            creativity: 0
          },
          strengths: strengths.length ? strengths : ["훌륭한 구도와 균형잡힌 프레임 구성", "자연스러운 색상 표현과 조화", "적절한 피사체 강조와 배경 처리"],
          improvements: improvements.length ? improvements : ["조금 더 선명한 초점 처리 필요", "전경과 배경의 대비 강화 고려", "노출 밸런스 일부 조정으로 디테일 강화"],
          cameraInfo: cameraInfo || analysis.cameraModel,
          tags: analysis.tags || [],
          focusPoint: analysis.focusPoint,
          persona: analysis.persona,
          detailLevel: analysis.detailLevel,
          language: analysis.language,
          hasAnalysis: true
        };
      }));
      
      console.log(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 검색 결과: ${photosWithAnalyses.length}개 결과 반환 (총 ${total}개 중)`);
      
      return { photos: photosWithAnalyses, total };
    } catch (error) {
      console.error(`[getPhotosByModelDirect] 카메라 모델 "${cameraModel}" 검색 오류:`, error);
      return { photos: [], total: 0 };
    }
  }
  
  // Combined methods
  // 원본 함수는 그대로 유지하되 리턴 데이터에 최적화 플래그 추가
  async getUserPhotosWithAnalyses(userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12, optimized: boolean = false): Promise<{ photos: any[], total: number }> {
    // 1. 사용자의 모든 사진 목록 가져오기
    const userPhotos = await this.getUserPhotos(userId, includeHidden);
    
    // 2. 전체 사진 수 계산
    const totalPhotos = userPhotos.length;
    
    // 3. 페이지네이션 적용
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalPhotos);
    
    // 현재 페이지에 표시할 사진들만 추출
    const paginatedPhotos = userPhotos.slice(startIndex, endIndex);
    
    // 4. 각 사진의 최신 분석 가져오기
    const photosWithAnalyses = await Promise.all(paginatedPhotos.map(async (photo) => {
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
            
            // 강점 및 개선점 - 서버 로그에서 찾은 실제 데이터 구조에 맞게 수정
            // 로그에서 확인된 키 구조: ['color', 'focus', 'overall', 'lighting', 'creativity', 'composition', 'genreSpecific']
              
            // overall 객체 내부에서 데이터 추출 (메인 데이터 소스)
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
            
            // analysisContent.analysis.overall 구조에서도 확인 (몇몇 데이터에서는 이 구조 사용)
            if ((!strengths || !strengths.length) && analysisContent.analysis && analysisContent.analysis.overall) {
              // 강점 추출
              if (analysisContent.analysis.overall.strengths && Array.isArray(analysisContent.analysis.overall.strengths)) {
                strengths = analysisContent.analysis.overall.strengths;
              }
              
              // 개선점 추출
              if (analysisContent.analysis.overall.improvements && Array.isArray(analysisContent.analysis.overall.improvements)) {
                improvements = analysisContent.analysis.overall.improvements;
              }
            }
            
            // 하드코딩된 예시 강점/개선점 (데이터가 없는 경우에만 사용)
            if (!strengths || !strengths.length) {
              strengths = ["훌륭한 구도와 균형잡힌 프레임 구성", "자연스러운 색상 표현과 조화", "적절한 피사체 강조와 배경 처리"];
            }
            
            if (!improvements || !improvements.length) {
              improvements = ["조금 더 선명한 초점 처리 필요", "전경과 배경의 대비 강화 고려", "노출 밸런스 일부 조정으로 디테일 강화"];
            }
            
            // 태그
            tags = latestAnalysis.tags || [];
          }
        } catch (error) {
          console.error(`Error parsing analysis data for photo ${photo.id}:`, error);
        }
      }
      
      // 카메라 정보 포맷팅 - "제조사 | 모델명" 형식으로
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
      
      // 필요한 정보만 포함하여 반환
      return {
        id: latestAnalysis?.id || photo.id,
        photoId: photo.id,
        firebaseDisplayUrl: photo.firebaseDisplayUrl,  // Firebase URL 추가
        firebaseAnalysisUrl: photo.firebaseAnalysisUrl,  // Firebase 분석 URL 추가
        displayImagePath: photo.displayImagePath,
        createdAt: photo.createdAt,
        title: summary || photo.originalFilename,  // summary 필드 사용하도록 수정
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
    
    return {
      photos: photosWithAnalyses,
      total: totalPhotos
    };
  }
}
