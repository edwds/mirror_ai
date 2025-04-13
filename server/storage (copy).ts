import { 
  users, photos, analyses, cameraModels, opinions,
  type User, type InsertUser, 
  type Photo, type InsertPhoto,
  type Analysis, type InsertAnalysis,
  type CameraModel, type InsertCameraModel,
  type Opinion, type InsertOpinion,
  type AnalysisResult
} from "./shared/schema";
import { db } from "./db";
import { 
  and, asc, desc, eq, inArray, like, sql 
} from "drizzle-orm";

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
    s3DisplayUrl?: string;
    s3AnalysisUrl?: string;
    replitDisplayUrl?: string;
    replitAnalysisUrl?: string;
  }): Promise<Photo>;
  getUserPhotos(userId?: number, includeHidden?: boolean): Promise<Photo[]>;
  updatePhotoVisibility(id: number, isHidden: boolean): Promise<Photo>;
  
  // Photo search/filter methods
  getPhotosByCamera(cameraModel: string, userId?: number, includeHidden?: boolean, page?: number, limit?: number): Promise<{
    photos: Photo[];
    total: number;
  }>;
  
  getPhotosByModelDirect(cameraModel: string, userId?: number, includeHidden?: boolean, page?: number, limit?: number): Promise<{
    photos: any[];
    total: number;
  }>;
  
  // Analysis methods
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getPhotoAnalyses(photoId: number): Promise<Analysis[]>;
  createAnalysis(analysis: Omit<InsertAnalysis, "createdAt">): Promise<Analysis>;
  updateAnalysisVisibility(id: number, isHidden: boolean): Promise<Analysis>;
  deleteAnalysis(id: number): Promise<boolean>;
  
  // Opinion methods
  getOpinion(id: number): Promise<Opinion | undefined>;
  getOpinionByAnalysisId(analysisId: number, userId?: number): Promise<Opinion | undefined>;
  createOpinion(opinion: Omit<InsertOpinion, "createdAt">): Promise<Opinion>;
  updateOpinion(id: number, updates: Partial<Omit<Opinion, "id" | "createdAt">>): Promise<Opinion>;
  
  // Combined methods
  getUserPhotosWithAnalyses(userId?: number, includeHidden?: boolean, page?: number, limit?: number): Promise<{
    photos: any[];
    total: number;
  }>;
}

// Implementation of the IStorage interface using a PostgreSQL database through Drizzle ORM
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
    firebaseAnalysisUrl?: string,
    s3DisplayUrl?: string,
    s3AnalysisUrl?: string,
    replitDisplayUrl?: string,
    replitAnalysisUrl?: string,
  }): Promise<Photo> {
    // Set createdAt to current date
    const photoWithCreatedAt = {
      ...photo,
      createdAt: new Date().toISOString()
    };
    
    // Ensure userId is null if not provided
    if (photoWithCreatedAt.userId === undefined) {
      photoWithCreatedAt.userId = null;
    }
    
    const [newPhoto] = await db
      .insert(photos)
      .values(photoWithCreatedAt)
      .returning();
    
    return newPhoto;
  }
  
  async getUserPhotos(userId?: number, includeHidden: boolean = false): Promise<Photo[]> {
    const query = db.select().from(photos);
    
    // 만약 userId가 제공되었다면 해당 사용자의 사진으로 필터링
    if (userId !== undefined) {
      query.where(eq(photos.userId, userId));
    }
    
    // 최신 사진 순으로 정렬
    query.orderBy(desc(photos.createdAt));
    
    return await query;
  }
  
  async updatePhotoVisibility(id: number, isHidden: boolean): Promise<Photo> {
    const [photo] = await db
      .update(photos)
      .set({ isHidden })
      .where(eq(photos.id, id))
      .returning();
    
    return photo;
  }
  
  // Photo search methods - 카메라 모델로 필터링 및 페이지네이션
  async getPhotosByCamera(cameraModel: string, userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12): Promise<{ photos: Photo[]; total: number }> {
    try {
      // 여러 쿼리 조건 결합을 위한 조건 배열
      const whereConditions = [];
      
      // exifData 내부의 카메라 모델로 필터링 (JSON 필드 검색)
      whereConditions.push(
        sql`(photos."exif_data"::jsonb->>'cameraModel' = ${cameraModel}
            OR photos."exif_data"::jsonb->>'model' = ${cameraModel})`
      );
      
      // 사용자 ID로 필터링 (선택적)
      if (userId !== undefined) {
        whereConditions.push(sql`photos."user_id" = ${userId}`);
      }
      
      // 조건들을 AND로 결합
      const whereClause = whereConditions.length > 1 
        ? sql`(${sql.join(whereConditions, sql` AND `)})`
        : whereConditions[0];
      
      // 총 개수 조회
      const countResult = await db.execute(
        sql`SELECT COUNT(*) FROM photos WHERE ${whereClause}`
      );
      const totalPhotos = Number(
        (countResult as unknown as Array<{count: string}>)[0]?.count || 0
      );
      
      // 페이지네이션이 적용된 데이터 조회
      const filteredPhotos = await db.execute(
        sql`SELECT * FROM photos
            WHERE ${whereClause}
            ORDER BY photos."created_at" DESC
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`
      );
      
      return {
        photos: filteredPhotos as Photo[],
        total: totalPhotos
      };
    } catch (error) {
      console.error(`[getPhotosByCamera] Error for camera model "${cameraModel}":`, error);
      return { photos: [], total: 0 };
    }
  }
  
  // 카메라 모델별로 사진 가져오기 (직접 검색 최적화 버전)
  async getPhotosByModelDirect(cameraModel: string, userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12): Promise<{ photos: any[]; total: number }> {
    try {
      // 조건 구성
      let whereCondition = sql`a."camera_model" = ${cameraModel}`;
      
      if (userId) {
        whereCondition = sql`${whereCondition} AND p."user_id" = ${userId}`;
      }
      
      if (!includeHidden) {
        whereCondition = sql`${whereCondition} AND a."is_hidden" = false`;
      }
      
      // 토탈 카운트 가져오기
      const countResult = await db.execute(
        sql`SELECT COUNT(DISTINCT a."photo_id") as total_count
            FROM "analyses" a
            JOIN "photos" p ON a."photo_id" = p."id"
            WHERE ${whereCondition}`
      );
      
      const totalCount = Number(
        (countResult as unknown as Array<{total_count: string}>)[0]?.total_count || 0
      );
      
      // 각 사진별로 최신 분석 ID 가져오기 (중복 제거)
      const uniquePhotoIds = await db.execute(
        sql`SELECT DISTINCT ON (a."photo_id") 
            a."photo_id" as "photoId"
            FROM "analyses" a
            JOIN "photos" p ON a."photo_id" = p."id"
            WHERE ${whereCondition}
            ORDER BY a."photo_id", a."created_at" DESC`
      );
      
      // 페이지네이션 적용
      const uniquePhotoIds2 = await db.execute(
        sql`SELECT t."photoId"
            FROM (
              ${sql`SELECT DISTINCT ON (a."photo_id") 
                a."photo_id" as "photoId",
                a."created_at"
                FROM "analyses" a
                JOIN "photos" p ON a."photo_id" = p."id"
                WHERE ${whereCondition}
                ORDER BY a."photo_id", a."created_at" DESC`}
            ) as t
            ORDER BY t."created_at" DESC
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`
      );
      
      const photoIdList = (uniquePhotoIds2 as any[]).map(a => a.photoId);
      
      if (photoIdList.length === 0) {
        return { photos: [], total: totalCount };
      }
      
      // 사진 정보와 최신 분석 정보 조인하여 가져오기
      const result = await Promise.all(photoIdList.map(async (photoId) => {
        const photo = await db
          .select()
          .from(photos)
          .where(eq(photos.id, photoId))
          .limit(1);
        
        const analysis = await db
          .select()
          .from(analyses)
          .where(and(
            eq(analyses.photoId, photoId),
            eq(analyses.cameraModel, cameraModel)
          ))
          .orderBy(desc(analyses.createdAt))
          .limit(1);
        
        if (photo.length === 0 || analysis.length === 0) {
          return null;
        }
        
        return {
          id: analysis[0].id,
          photoId: photo[0].id,
          originalFilename: photo[0].originalFilename,
          displayImagePath: photo[0].displayImagePath,
          firebaseDisplayUrl: photo[0].firebaseDisplayUrl,
          createdAt: photo[0].createdAt,
          exifData: photo[0].exifData,
          summary: analysis[0].summary,
          overallScore: analysis[0].overallScore,
          detectedGenre: analysis[0].detectedGenre,
          categoryScores: analysis[0].categoryScores,
          hasAnalysis: true,
        };
      }));
      
      // null 값 제거
      const filteredResults = result.filter(r => r !== null);
      
      return {
        photos: filteredResults,
        total: totalCount
      };
    } catch (error) {
      console.error(`Error in getPhotosByModelDirect for ${cameraModel}:`, error);
      return {
        photos: [],
        total: 0
      };
    }
  }
  
  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }
  
  async getPhotoAnalyses(photoId: number): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.photoId, photoId))
      .orderBy(desc(analyses.createdAt));
  }
  
  async createAnalysis(analysis: Omit<InsertAnalysis, "createdAt">): Promise<Analysis> {
    const now = new Date().toISOString();
    
    const analysisWithCreatedAt = {
      ...analysis,
      createdAt: now
    };
    
    // Insert the analysis and return the created record
    const [createdAnalysis] = await db
      .insert(analyses)
      .values(analysisWithCreatedAt)
      .returning();
    
    return createdAnalysis;
  }
  
  async updateAnalysisVisibility(id: number, isHidden: boolean): Promise<Analysis> {
    const [analysis] = await db
      .update(analyses)
      .set({ isHidden })
      .where(eq(analyses.id, id))
      .returning();
    
    return analysis;
  }
  
  async deleteAnalysis(id: number): Promise<boolean> {
    try {
      const result = await db.delete(analyses).where(eq(analyses.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting analysis ${id}:`, error);
      return false;
    }
  }
  
  // Opinion methods implementation
  async getOpinion(id: number): Promise<Opinion | undefined> {
    try {
      const [opinion] = await db.select().from(opinions).where(eq(opinions.id, id));
      return opinion || undefined;
    } catch (error) {
      console.error(`Error getting opinion ${id}:`, error);
      return undefined;
    }
  }

  async getOpinionByAnalysisId(analysisId: number, userId?: number): Promise<Opinion | undefined> {
    try {
      let whereConditions = [eq(opinions.analysisId, analysisId)];
      
      // 특정 사용자의 의견만 필터링 (선택적)
      if (userId !== undefined) {
        whereConditions.push(eq(opinions.userId, userId));
      }
      
      const [opinion] = await db
        .select()
        .from(opinions)
        .where(and(...whereConditions))
        .orderBy(desc(opinions.createdAt))
        .limit(1);
      
      return opinion || undefined;
    } catch (error) {
      console.error(`Error getting opinion for analysis ${analysisId}:`, error);
      return undefined;
    }
  }

  async createOpinion(opinion: Omit<InsertOpinion, "createdAt">): Promise<Opinion> {
    try {
      const now = new Date().toISOString();
      
      const opinionWithCreatedAt = {
        ...opinion,
        createdAt: now
      };
      
      const [createdOpinion] = await db
        .insert(opinions)
        .values(opinionWithCreatedAt)
        .returning();
      
      return createdOpinion;
    } catch (error) {
      console.error(`Error creating opinion:`, error);
      throw error;
    }
  }

  async updateOpinion(id: number, updates: Partial<Omit<Opinion, "id" | "createdAt">>): Promise<Opinion> {
    try {
      const [updatedOpinion] = await db
        .update(opinions)
        .set(updates)
        .where(eq(opinions.id, id))
        .returning();
      
      return updatedOpinion;
    } catch (error) {
      console.error(`Error updating opinion ${id}:`, error);
      throw error;
    }
  }
  
  // Combined methods that join photos with analyses for a more comprehensive view
  async getUserPhotosWithAnalyses(userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 24): Promise<{ photos: any[], total: number }> {
    try {
      // SQL 조건 구성
      let whereCondition = sql`1=1`; // 항상 참인 기본 조건
      
      if (userId) {
        whereCondition = sql`${whereCondition} AND p."user_id" = ${userId}`;
      }
      
      if (!includeHidden) {
        // 분석 테이블의 is_hidden 필드 사용
        whereCondition = sql`${whereCondition} AND a."is_hidden" = false`;
      }
      
      // 1. 최적화된 쿼리 - 전체 개수와 페이지 데이터를 한 번에 가져오기
      const optimizedCountClause = page === 1 
        ? sql`, COUNT(*) OVER() as total_count`
        : sql``;
      
      // 2. 최적화된 쿼리 - 전체 갯수를 같이 가져오면서 페이지네이션 적용
      // 첫 페이지에서만 전체 카운트를 계산하고, 후속 페이지에서는 캐싱된 값 사용
      const result = await db.execute(
        sql`SELECT 
            a."id" as analysis_id, 
            a."photo_id",
            a."detected_genre",
            a."summary",
            a."overall_score",
            a."category_scores",
            a."analysis",
            a."focus_point",
            a."persona",
            a."detail_level",
            a."language",
            a."tags",
            a."created_at" as analysis_created_at,
            a."is_hidden" as analysis_is_hidden,
            
            p."id" as photo_id,
            p."user_id",
            p."original_filename",
            p."display_image_path",
            p."analysis_image_path",
            p."firebase_display_url",
            p."firebase_analysis_url",
            p."s3_display_url",
            p."s3_analysis_url",
            p."replit_display_url",
            p."replit_analysis_url",
            p."exif_data",
            p."created_at" as photo_created_at,
            p."is_hidden" as photo_is_hidden
            ${optimizedCountClause}
            
            FROM "analyses" a
            INNER JOIN "photos" p ON a."photo_id" = p.id
            WHERE ${whereCondition}
            ORDER BY a."created_at" DESC
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`
      );
      
      // 결과 배열로 변환
      const resultArray = result as unknown as Array<Record<string, any>>;
      
      // 총 갯수 계산 - 첫 페이지에서는 쿼리 결과에서, 후속 페이지에서는 캐싱된 값 또는 별도 쿼리 결과 사용
      let totalAnalyses: number;
      
      if (page === 1 && resultArray.length > 0 && resultArray[0].total_count !== undefined) {
          // 첫 페이지에서 총 카운트 가져오기 (최적화된 쿼리 사용)
          totalAnalyses = Number(resultArray[0].total_count);
      } else if (page > 1) {
          // 페이지가 1보다 크면 카운트 쿼리 실행
          const totalCountResult = await db.execute(
              sql`SELECT COUNT(*) as total 
                  FROM "analyses" a
                  INNER JOIN "photos" p ON a."photo_id" = p.id
                  WHERE ${whereCondition}`
          );
          const totalCountResultArray = totalCountResult as unknown as Array<{total: number | string}>;
          totalAnalyses = Number(totalCountResultArray[0]?.total || 0);
      } else {
          // 결과가 없는 경우
          totalAnalyses = 0;
      }
      
      // 사용자 정보 한 번에 가져오기 (성능 최적화)
      const userIds = resultArray
        .map(row => row.user_id)
        .filter(id => id !== null && id !== undefined);
      
      const uniqueUserIds = [...new Set(userIds)];
      
      // 사용자 정보 캐싱
      const userCache = new Map();
      
      if (uniqueUserIds.length > 0) {
        const userResults = await db
          .select({
            id: users.id,
            displayName: users.displayName
            // profilePicture 필드 제거 - 응답 크기 감소
          })
          .from(users)
          .where(inArray(users.id, uniqueUserIds));
          
        userResults.forEach(user => {
          userCache.set(user.id, user);
        });
      }
      
      // 3. 결과 처리하기 - 미리 가져온 사용자 정보 활용
      const analysesWithPhotos = resultArray.map((row: Record<string, any>) => {
        // 필드 추출 - 명시적으로 이름이 지정된 컬럼 사용
        const analysis = {
          id: row.analysis_id, // analyses 테이블의 id (명시적 컬럼명 사용)
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
          createdAt: row.analysis_created_at, // 명시적 분석 생성일
          isHidden: row.analysis_is_hidden // analyses 테이블의 is_hidden 값
        };
        
        const photo = {
          id: row.photo_id, // photos 테이블의 id
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
          isHidden: row.photo_is_hidden, // 구분을 위해 명칭 변경
          createdAt: row.photo_created_at // 사진 생성일
        };
        
        // 사용자 정보는 미리 가져온 캐시에서 찾기
        const userInfo = photo.userId ? userCache.get(photo.userId) || null : null;
        
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
          }
        } catch (error) {
          console.error(`Error parsing analysis data for analysis ${analysis.id}:`, error);
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
              // EXIF 파싱 오류는 조용히 무시
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
          id: analysis.id, // analysis ID로 변경
          photoId: photo.id,
          userId: photo.userId, // 사용자 ID 포함
          user: userInfo, // 사용자 정보 포함
          firebaseDisplayUrl: photo.firebaseDisplayUrl,
          firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
          s3DisplayUrl: photo.s3DisplayUrl,
          s3AnalysisUrl: photo.s3AnalysisUrl,
          replitDisplayUrl: photo.replitDisplayUrl,
          replitAnalysisUrl: photo.replitAnalysisUrl,
          displayImagePath: photo.displayImagePath,
          createdAt: analysis.createdAt, // analysis 생성일로 변경
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
          cameraInfo: cameraInfo,
          tags: analysis.tags || [],
          focusPoint: analysis.focusPoint,
          persona: analysis.persona,
          detailLevel: analysis.detailLevel,
          language: analysis.language
        };
      });
      
      return { photos: analysesWithPhotos, total: totalAnalyses };
    } catch (error) {
      console.error("Error in getUserPhotosWithAnalyses:", error);
      return { photos: [], total: 0 };
    }
  }
}

// Initialize database storage
export const storage = new DatabaseStorage();

// Memory storage implementation for backward compatibility
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private photos: Map<number, Photo>;
  private analyses: Map<number, Analysis>;
  private opinions: Map<number, Opinion>;
  currentUserId: number;
  currentPhotoId: number;
  currentAnalysisId: number;
  currentOpinionId: number;

  constructor() {
    this.users = new Map();
    this.photos = new Map();
    this.analyses = new Map();
    this.opinions = new Map();
    this.currentUserId = 1;
    this.currentPhotoId = 1;
    this.currentAnalysisId = 1;
    this.currentOpinionId = 1;
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
    s3DisplayUrl?: string;
    s3AnalysisUrl?: string;
    replitDisplayUrl?: string;
    replitAnalysisUrl?: string;
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
      s3DisplayUrl: photo.s3DisplayUrl || null,
      s3AnalysisUrl: photo.s3AnalysisUrl || null,
      replitDisplayUrl: photo.replitDisplayUrl || null,
      replitAnalysisUrl: photo.replitAnalysisUrl || null,
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
  
  // Photo search by camera model
  async getPhotosByCamera(cameraModel: string, userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12): Promise<{ photos: Photo[], total: number }> {
    const allPhotos = Array.from(this.photos.values());
    
    // 카메라 모델과 기타 조건으로 필터링
    const filteredPhotos = allPhotos.filter(photo => {
      // 카메라 모델 매칭 확인
      let cameraMatches = false;
      if (photo.exifData) {
        const exifData = typeof photo.exifData === 'string' 
          ? JSON.parse(photo.exifData) 
          : photo.exifData;
          
        const model = exifData?.cameraModel || '';
        if (model.toLowerCase().includes(cameraModel.toLowerCase())) {
          cameraMatches = true;
        }
      }
      
      // 사용자 ID 필터링
      const userMatches = !userId || photo.userId === userId;
      
      // 숨김 상태 필터링
      const hiddenMatches = includeHidden || !photo.isHidden;
      
      return cameraMatches && userMatches && hiddenMatches;
    });
    
    // 날짜 기준 내림차순 정렬
    const sortedPhotos = filteredPhotos.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // 페이지네이션 적용
    const totalPhotos = sortedPhotos.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalPhotos);
    const paginatedPhotos = sortedPhotos.slice(startIndex, endIndex);
    
    return {
      photos: paginatedPhotos,
      total: totalPhotos
    };
  }

  // 카메라 모델별로 사진 가져오기 (직접 검색 최적화 버전)
  async getPhotosByModelDirect(cameraModel: string, userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 12): Promise<{ photos: any[]; total: number }> {
    // 간단히 구현 - 실제 최적화는 DB 버전에서 진행
    return this.getPhotosByCamera(cameraModel, userId, includeHidden, page, limit);
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
      cameraModel: analysis.cameraModel || null,
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
      isHidden: false,
      createdAt: new Date().toISOString()
    };
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }
  
  async updateAnalysisVisibility(id: number, isHidden: boolean): Promise<Analysis> {
    const analysis = this.analyses.get(id);
    if (!analysis) {
      throw new Error(`Analysis with ID ${id} not found`);
    }
    
    const updatedAnalysis: Analysis = {
      ...analysis,
      isHidden
    };
    this.analyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }
  
  async deleteAnalysis(id: number): Promise<boolean> {
    const exists = this.analyses.has(id);
    if (exists) {
      this.analyses.delete(id);
    }
    return exists;
  }
  
  // Opinion methods
  async getOpinion(id: number): Promise<Opinion | undefined> {
    return this.opinions.get(id);
  }
  
  async getOpinionByAnalysisId(analysisId: number, userId?: number): Promise<Opinion | undefined> {
    const allOpinions = Array.from(this.opinions.values());
    let filteredOpinions = allOpinions.filter(opinion => opinion.analysisId === analysisId);
    
    if (userId !== undefined) {
      filteredOpinions = filteredOpinions.filter(opinion => opinion.userId === userId);
    }
    
    // 가장 최근 의견 반환
    if (filteredOpinions.length > 0) {
      return filteredOpinions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    }
    
    return undefined;
  }
  
  async createOpinion(opinion: Omit<InsertOpinion, "createdAt">): Promise<Opinion> {
    const id = this.currentOpinionId++;
    const newOpinion: Opinion = {
      id,
      userId: opinion.userId,
      analysisId: opinion.analysisId,
      rating: opinion.rating,
      comment: opinion.comment || null,
      createdAt: new Date().toISOString()
    };
    
    this.opinions.set(id, newOpinion);
    return newOpinion;
  }
  
  async updateOpinion(id: number, updates: Partial<Omit<Opinion, "id" | "createdAt">>): Promise<Opinion> {
    const opinion = this.opinions.get(id);
    if (!opinion) {
      throw new Error(`Opinion with ID ${id} not found`);
    }
    
    const updatedOpinion: Opinion = {
      ...opinion,
      ...updates
    };
    this.opinions.set(id, updatedOpinion);
    return updatedOpinion;
  }

  // Combined methods
  async getUserPhotosWithAnalyses(userId?: number, includeHidden: boolean = false, page: number = 1, limit: number = 24): Promise<{ photos: any[], total: number }> {
    // 1. 사용자의 사진 목록 가져오기
    const userPhotos = await this.getUserPhotos(userId, includeHidden);
    
    // 페이지네이션 적용
    const totalPhotos = userPhotos.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalPhotos);
    const paginatedPhotos = userPhotos.slice(startIndex, endIndex);
    
    // 2. 각 사진의 최신 분석 가져오기
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
            
            // analysisContent.analysis.overall 구조에서도 확인
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
            // EXIF 파싱 오류는 조용히 무시
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
        userId: photo.userId,
        firebaseDisplayUrl: photo.firebaseDisplayUrl,
        firebaseAnalysisUrl: photo.firebaseAnalysisUrl,
        s3DisplayUrl: photo.s3DisplayUrl,
        s3AnalysisUrl: photo.s3AnalysisUrl,
        replitDisplayUrl: photo.replitDisplayUrl,
        replitAnalysisUrl: photo.replitAnalysisUrl,
        displayImagePath: photo.displayImagePath,
        createdAt: latestAnalysis?.createdAt || photo.createdAt,
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
    
    return { photos: photosWithAnalyses, total: totalPhotos };
  }
}
