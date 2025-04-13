import { 
  users, 
  photos, 
  analyses, 
  opinions,
  type User, 
  type InsertUser, 
  type Photo, 
  type InsertPhoto,
  type Analysis, 
  type InsertAnalysis,
  type Opinion, 
  type InsertOpinion,
  type AnalysisResult
} from "server/shared/schema"; // <-- 경로 변경됨

import { db } from "./db";
import { 
  and, 
  desc, 
  eq, 
  inArray, 
  sql 
} from "drizzle-orm";

export interface IStorage {
  // ==============================
  // 1) User methods
  // ==============================
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User>;
  updateUser(
    id: number, 
    updates: Partial<Omit<User, "id" | "createdAt" | "lastLogin">>
  ): Promise<User>;

  // ==============================
  // 2) Photo methods
  // ==============================
  getPhoto(id: number): Promise<Photo | undefined>;
  createPhoto(
    photo: Omit<InsertPhoto, "createdAt"> & { 
      userId?: number;
      displayImagePath: string;
      analysisImagePath: string;
      firebaseDisplayUrl?: string;
      firebaseAnalysisUrl?: string;
      s3DisplayUrl?: string;
      s3AnalysisUrl?: string;
      replitDisplayUrl?: string;
      replitAnalysisUrl?: string;
    }
  ): Promise<Photo>;
  getUserPhotos(userId?: number): Promise<Photo[]>;

  // ==============================
  // 3) 카메라 모델로 사진 가져오기 (analysis.cameraModel 활용)
  // ==============================
  getPhotosByModelDirect(
    cameraModel: string, 
    userId?: number, 
    page?: number, 
    limit?: number
  ): Promise<{ photos: any[]; total: number }>;

  // ==============================
  // 4) Analysis methods
  // ==============================
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getPhotoAnalyses(photoId: number): Promise<Analysis[]>;
  createAnalysis(analysis: Omit<InsertAnalysis, "createdAt">): Promise<Analysis>;
  deleteAnalysis(id: number): Promise<boolean>;

  // ==============================
  // 5) Opinion methods
  // ==============================
  getOpinion(id: number): Promise<Opinion | undefined>;
  getOpinionByAnalysisId(analysisId: number, userId?: number): Promise<Opinion | undefined>;
  createOpinion(opinion: Omit<InsertOpinion, "createdAt" | "updatedAt">): Promise<Opinion>;
  updateOpinion(
    id: number, 
    updates: Partial<Omit<Opinion, "id" | "createdAt">>
  ): Promise<Opinion>;

  // ==============================
  // 6) Combined methods
  // ==============================
  getUserPhotosWithAnalyses(
    userId?: number,
    includeHidden?: boolean,
    page?: number, 
    limit?: number
  ): Promise<{ photos: any[]; total: number }>;
}

// ------------------------------------------------------
// PostgreSQL 기반 DatabaseStorage 구현
// ------------------------------------------------------
export class DatabaseStorage implements IStorage {
  // --------------------------
  // 1) User methods
  // --------------------------
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

  async updateUser(
    id: number, 
    updates: Partial<Omit<User, "id" | "createdAt" | "lastLogin">>
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // --------------------------
  // 2) Photo methods
  // --------------------------
  async getPhoto(id: number): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo || undefined;
  }

  async createPhoto(
    photo: Omit<InsertPhoto, "createdAt"> & { 
      userId?: number; 
      displayImagePath: string; 
      analysisImagePath: string;
      firebaseDisplayUrl?: string;
      firebaseAnalysisUrl?: string;
      s3DisplayUrl?: string;
      s3AnalysisUrl?: string;
      replitDisplayUrl?: string;
      replitAnalysisUrl?: string;
    }
  ): Promise<Photo> {
    const photoWithCreatedAt = {
      ...photo,
      createdAt: new Date().toISOString(),
      userId: photo.userId ?? null
    };

    const [newPhoto] = await db
      .insert(photos)
      .values(photoWithCreatedAt)
      .returning();

    return newPhoto;
  }

  async getUserPhotos(userId?: number): Promise<Photo[]> {
    const query = db.select().from(photos);

    if (userId !== undefined) {
      query.where(eq(photos.userId, userId));
    }

    // 최신 순 정렬
    query.orderBy(desc(photos.createdAt));

    return await query;
  }

  // --------------------------
  // 3) getPhotosByModelDirect
  // --------------------------
  async getPhotosByModelDirect(
    cameraModel: string, 
    userId?: number, 
    page: number = 1, 
    limit: number = 12
  ): Promise<{ photos: any[]; total: number }> {
    try {
      let whereCondition = sql`a."camera_model" = ${cameraModel}`;

      if (userId) {
        whereCondition = sql`${whereCondition} AND p."user_id" = ${userId}`;
      }

      // 총 개수
      const countResult = await db.execute(
        sql`SELECT COUNT(DISTINCT a."photo_id") as total_count
            FROM "analyses" a
            JOIN "photos" p ON a."photo_id" = p."id"
            WHERE ${whereCondition}`
      );
      const totalCount = Number(
        (countResult as unknown as Array<{ total_count: string }>)[0]?.total_count || 0
      );

      // 사진별 최신 분석 ID
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

      const photoIdList = (uniquePhotoIds2 as any[]).map((a) => a.photoId);
      if (photoIdList.length === 0) {
        return { photos: [], total: totalCount };
      }

      // 각 photoId별로 photo + 최신 analysis
      const result = await Promise.all(
        photoIdList.map(async (photoId) => {
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
        })
      );

      const filteredResults = result.filter(r => r !== null);

      return {
        photos: filteredResults,
        total: totalCount
      };
    } catch (error) {
      console.error(`Error in getPhotosByModelDirect:`, error);
      return {
        photos: [],
        total: 0
      };
    }
  }

  // --------------------------
  // 4) Analysis methods
  // --------------------------
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
    const analysisWithCreatedAt = { ...analysis, createdAt: now };

    const [createdAnalysis] = await db
      .insert(analyses)
      .values(analysisWithCreatedAt)
      .returning();
    return createdAnalysis;
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

  // --------------------------
  // 5) Opinion methods
  // --------------------------
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
      const whereConditions = [eq(opinions.analysisId, analysisId)];
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

  async createOpinion(opinion: Omit<InsertOpinion, "createdAt" | "updatedAt">): Promise<Opinion> {
    try {
      const now = new Date().toISOString();
      const opinionWithDates = { 
        ...opinion, 
        createdAt: now,
        updatedAt: now 
      };

      const [createdOpinion] = await db
        .insert(opinions)
        .values(opinionWithDates)
        .returning();
      return createdOpinion;
    } catch (error) {
      console.error(`Error creating opinion:`, error);
      throw error;
    }
  }

  async updateOpinion(
    id: number, 
    updates: Partial<Omit<Opinion, "id" | "createdAt">>
  ): Promise<Opinion> {
    try {
      // updatedAt 필드 자동 업데이트
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const [updatedOpinion] = await db
        .update(opinions)
        .set(updatesWithTimestamp)
        .where(eq(opinions.id, id))
        .returning();

      return updatedOpinion;
    } catch (error) {
      console.error(`Error updating opinion ${id}:`, error);
      throw error;
    }
  }

  // --------------------------
  // 6) Combined method: 사진 + 분석
  // --------------------------
  async getUserPhotosWithAnalyses(
    userId?: number, 
    includeHidden: boolean = false,
    page: number = 1, 
    limit: number = 24
  ): Promise<{ photos: any[], total: number }> {
    try {
      console.log(`[DB Storage] getUserPhotosWithAnalyses 호출됨 (userId=${userId || 'null'}, includeHidden=${includeHidden})`);
      // 음수 OFFSET 오류 방지 (페이지는 1부터 시작)
      page = Math.max(1, page);
      limit = Math.max(1, limit);
      
      // SQL 조건 구성 (analyses 테이블의 userId 필드 직접 사용)
      let whereCondition = sql`1=1`; 

      if (userId) {
        // 이제 photos 테이블이 아닌 analyses 테이블의 user_id를 직접 사용
        whereCondition = sql`${whereCondition} AND a."user_id" = ${userId}`;
        console.log(`[DB Storage] userId=${userId} 조건 추가됨`);
      } else {
        console.log(`[DB Storage] userId 조건 없음 (모든 사용자 사진 조회)`);
      }
      
      if (!includeHidden) {
        whereCondition = sql`${whereCondition} AND a."is_hidden" = false`;
        console.log(`[DB Storage] 숨김 사진 제외 조건 추가됨`);
      } else {
        console.log(`[DB Storage] 숨김 사진 포함 조건 추가됨`);
      }

      // 첫 페이지면 count(*) over()로 total_count를 구하는 최적화
      const optimizedCountClause = page === 1 
        ? sql`, COUNT(*) OVER() as total_count`
        : sql``;

      const result = await db.execute(
        sql`SELECT 
            a."id" as analysis_id, 
            a."photo_id",
            a."user_id",              -- analyses 테이블에서 직접 user_id 사용
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
            a."camera_model",         -- 카메라 모델 필드 추가
            a."camera_manufacturer",  -- 카메라 제조사 필드 추가

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
            LIMIT ${limit} 
            OFFSET ${(page - 1) * limit}`
      );

      const resultArray = result as Array<Record<string, any>>;

      // total count 계산
      let totalAnalyses: number;
      if (page === 1 && resultArray.length > 0 && resultArray[0].total_count !== undefined) {
        totalAnalyses = Number(resultArray[0].total_count);
      } else if (page > 1) {
        // 최적화: analyses 테이블만 조회하여 카운트 (JOIN 없이)
        const totalCountResult = await db.execute(
          sql`SELECT COUNT(*) as total 
              FROM "analyses" a
              WHERE ${whereCondition}`
        );
        const totalCountResultArray = totalCountResult as Array<{ total: number | string }>;
        totalAnalyses = Number(totalCountResultArray[0]?.total || 0);
      } else {
        totalAnalyses = 0;
      }

      // 사용자 ID -> 사용자 캐시
      const userIds = resultArray
        .map(row => row.user_id)
        .filter(id => id !== null && id !== undefined);

      const uniqueUserIds = [...new Set(userIds)];
      const userCache = new Map();

      if (uniqueUserIds.length > 0) {
        const userResults = await db
          .select({
            id: users.id,
            displayName: users.displayName
          })
          .from(users)
          .where(inArray(users.id, uniqueUserIds));

        userResults.forEach(u => {
          userCache.set(u.id, u);
        });
      }

      // 결과 매핑
      console.log(`[DB Storage] 결과 개수: ${resultArray.length}개, 첫번째 항목 userId=${resultArray.length > 0 ? resultArray[0].user_id || 'null' : 'N/A'}`);

      const analysesWithPhotos = resultArray.map(row => {
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
        
        console.log(`[DB Storage] 행 매핑: analysis.id=${analysis.id}, photo.id=${photo.id}, photo.userId=${photo.userId || 'null'}`);
      

        // 사용자 정보
        const userInfo = photo.userId ? userCache.get(photo.userId) || null : null;

        // 분석 내용 파싱 (강점/개선점)
        let analysisContent = null;
        let strengths: string[] = [];
        let improvements: string[] = [];

        try {
          analysisContent = typeof analysis.analysis === 'string'
            ? JSON.parse(analysis.analysis)
            : analysis.analysis;

          if (analysisContent && typeof analysisContent === 'object') {
            if (analysisContent.overall) {
              if (Array.isArray(analysisContent.overall.strengths)) {
                strengths = analysisContent.overall.strengths;
              }
              if (Array.isArray(analysisContent.overall.improvements)) {
                improvements = analysisContent.overall.improvements;
              }
            }

            // fallback
            if ((!strengths?.length || !improvements?.length) && analysisContent.analysis?.overall) {
              const o = analysisContent.analysis.overall;
              if (Array.isArray(o.strengths)) strengths = o.strengths;
              if (Array.isArray(o.improvements)) improvements = o.improvements;
            }
          }
        } catch (err) {
          console.error(`Error parsing analysis data:`, err);
        }

        // 카메라 정보
        let cameraInfo = null;
        if (photo.exifData) {
          try {
            const exifObj = 
              typeof photo.exifData === 'string' 
                ? JSON.parse(photo.exifData) 
                : photo.exifData;
            if (exifObj?.cameraMake && exifObj?.cameraModel) {
              cameraInfo = `${exifObj.cameraMake} | ${exifObj.cameraModel}`;
            } else if (exifObj?.cameraInfo) {
              cameraInfo = exifObj.cameraInfo;
            }
          } catch (e) { /* ignore */ }
        }

        return {
          id: analysis.id,
          photoId: photo.id,
          userId: photo.userId,
          user: userInfo,
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
          strengths: strengths.length ? strengths : ["훌륭한 구도", "자연스러운 색감"],
          improvements: improvements.length ? improvements : ["초점 개선", "노출 밸런스 조정"],
          cameraInfo,
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

// 실제 DB 스토리지
export const storage = new DatabaseStorage();

// ------------------------------------------------------
// (옵션) In-memory 구현체: 개발/테스트용
// ------------------------------------------------------
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

  // 1) User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === username);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.googleId === googleId);
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
    if (!user) throw new Error(`User with ID ${id} not found`);

    const updatedUser = { ...user, lastLogin: new Date().toISOString() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUser(
    id: number, 
    updates: Partial<Omit<User, "id" | "createdAt" | "lastLogin">>
  ): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error(`User with ID ${id} not found`);

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // 2) Photo methods
  async getPhoto(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async createPhoto(
    photo: Omit<InsertPhoto, "createdAt"> & { 
      userId?: number;
      displayImagePath: string;
      analysisImagePath: string;
      firebaseDisplayUrl?: string;
      firebaseAnalysisUrl?: string;
      s3DisplayUrl?: string;
      s3AnalysisUrl?: string;
      replitDisplayUrl?: string;
      replitAnalysisUrl?: string;
    }
  ): Promise<Photo> {
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
      createdAt: new Date().toISOString()
    };
    this.photos.set(id, newPhoto);
    return newPhoto;
  }

  async getUserPhotos(userId?: number): Promise<Photo[]> {
    const allPhotos = Array.from(this.photos.values());

    if (userId !== undefined) {
      return allPhotos
        .filter(photo => photo.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // userId가 없으면 전체 (단순 정렬)
    return allPhotos.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // 3) getPhotosByModelDirect (analysis.cameraModel)
  async getPhotosByModelDirect(
    cameraModel: string, 
    userId?: number, 
    page: number = 1, 
    limit: number = 12
  ): Promise<{ photos: any[]; total: number }> {
    // 간단 구현: analyses 전체 중 cameraModel 일치 항목 필터
    let allAnalyses = Array.from(this.analyses.values()).filter(a => 
      a.cameraModel?.toLowerCase() === cameraModel.toLowerCase()
    );

    if (userId) {
      // 해당 user의 photos만
      const userPhotos = Array.from(this.photos.values()).filter(p => p.userId === userId);
      const userPhotoIds = new Set(userPhotos.map(p => p.id));
      allAnalyses = allAnalyses.filter(a => userPhotoIds.has(a.photoId));
    }

    // 가장 최신 분석만 유지 (photoId당 1건)
    allAnalyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const uniquePhotoIds: number[] = [];
    const latestAnalyses: Analysis[] = [];
    for (const a of allAnalyses) {
      if (!uniquePhotoIds.includes(a.photoId)) {
        uniquePhotoIds.push(a.photoId);
        latestAnalyses.push(a);
      }
    }

    const total = latestAnalyses.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
    const selectedAnalyses = latestAnalyses.slice(startIndex, endIndex);

    const result = selectedAnalyses.map(a => {
      const photo = this.photos.get(a.photoId);
      if (!photo) return null;
      return {
        id: a.id,
        photoId: photo.id,
        originalFilename: photo.originalFilename,
        displayImagePath: photo.displayImagePath,
        firebaseDisplayUrl: photo.firebaseDisplayUrl,
        createdAt: photo.createdAt,
        exifData: photo.exifData,
        summary: a.summary,
        overallScore: a.overallScore,
        detectedGenre: a.detectedGenre,
        categoryScores: a.categoryScores,
        hasAnalysis: true
      };
    }).filter(item => item !== null);

    return {
      photos: result as any[],
      total
    };
  }

  // 4) Analysis
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getPhotoAnalyses(photoId: number): Promise<Analysis[]> {
    return Array.from(this.analyses.values())
      .filter(a => a.photoId === photoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  async deleteAnalysis(id: number): Promise<boolean> {
    const exists = this.analyses.has(id);
    if (exists) {
      this.analyses.delete(id);
    }
    return exists;
  }

  // 5) Opinion
  async getOpinion(id: number): Promise<Opinion | undefined> {
    return this.opinions.get(id);
  }

  async getOpinionByAnalysisId(analysisId: number, userId?: number): Promise<Opinion | undefined> {
    let filtered = Array.from(this.opinions.values()).filter(o => o.analysisId === analysisId);
    if (userId != null) {
      filtered = filtered.filter(o => o.userId === userId);
    }
    if (filtered.length === 0) return undefined;

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered[0];
  }

  async createOpinion(opinion: Omit<InsertOpinion, "createdAt" | "updatedAt">): Promise<Opinion> {
    const id = this.currentOpinionId++;
    const now = new Date().toISOString();
    const newOpinion: Opinion = {
      id,
      userId: opinion.userId,
      analysisId: opinion.analysisId,
      isLiked: opinion.isLiked ?? null,
      comment: opinion.comment || null,
      createdAt: now,
      updatedAt: now
    };
    this.opinions.set(id, newOpinion);
    return newOpinion;
  }

  async updateOpinion(
    id: number, 
    updates: Partial<Omit<Opinion, "id" | "createdAt">>
  ): Promise<Opinion> {
    const existing = this.opinions.get(id);
    if (!existing) throw new Error(`Opinion with ID ${id} not found`);

    const updated = { 
      ...existing, 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.opinions.set(id, updated);
    return updated;
  }

  // 6) Combined: 사진 + 최신 분석
  async getUserPhotosWithAnalyses(
    userId?: number,
    includeHidden: boolean = false,
    page: number = 1, 
    limit: number = 24
  ): Promise<{ photos: any[], total: number }> {
    // 1) 사용자 사진 목록 (최신순)
    const userPhotos = await this.getUserPhotos(userId);
    
    // includeHidden 옵션에 따라 필터링
    const filteredPhotos = includeHidden 
      ? userPhotos 
      : userPhotos.filter(photo => !photo.isHidden);
    
    const totalPhotos = filteredPhotos.length;

    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalPhotos);
    const paginatedPhotos = filteredPhotos.slice(startIndex, endIndex);

    // 2) 각 사진별 최신 분석
    const photosWithAnalyses = paginatedPhotos.map(photo => {
      const photoAnalyses = Array.from(this.analyses.values())
        .filter(a => a.photoId === photo.id)
        // includeHidden이 false면 숨겨진 분석은 제외
        .filter(a => includeHidden || !a.isHidden)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const latestAnalysis = photoAnalyses[0] || null;
      if (!latestAnalysis) {
        return {
          id: photo.id,
          photoId: photo.id,
          userId: photo.userId,
          displayImagePath: photo.displayImagePath,
          createdAt: photo.createdAt,
          title: photo.originalFilename,
          overallScore: 0,
          isPublic: !photo.isHidden,
          isHidden: photo.isHidden,
          categoryScores: {
            composition: 0,
            lighting: 0,
            color: 0,
            focus: 0,
            creativity: 0
          },
          strengths: [],
          improvements: [],
          cameraInfo: null,
          tags: []
        };
      }

      // 분석 내용 파싱
      let strengths: string[] = [];
      let improvements: string[] = [];
      if (typeof latestAnalysis.analysis === 'string') {
        try {
          const parsed = JSON.parse(latestAnalysis.analysis);
          if (parsed?.overall?.strengths) {
            strengths = parsed.overall.strengths;
          }
          if (parsed?.overall?.improvements) {
            improvements = parsed.overall.improvements;
          }
        } catch (e) { /* ignore */ }
      }

      return {
        id: latestAnalysis.id,
        photoId: photo.id,
        userId: photo.userId,
        displayImagePath: photo.displayImagePath,
        createdAt: latestAnalysis.createdAt,
        title: latestAnalysis.summary || photo.originalFilename,
        overallScore: latestAnalysis.overallScore,
        isPublic: !latestAnalysis.isHidden,
        isHidden: latestAnalysis.isHidden,
        categoryScores: latestAnalysis.categoryScores || {
          composition: 0,
          lighting: 0,
          color: 0,
          focus: 0,
          creativity: 0
        },
        strengths,
        improvements,
        cameraInfo: null,  // exifData 파싱해서 넣고 싶으면 추가
        tags: latestAnalysis.tags || []
      };
    });

    return {
      photos: photosWithAnalyses,
      total: totalPhotos
    };
  }
}
