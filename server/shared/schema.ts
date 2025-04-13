import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Camera Models Table - 카메라 모델 정보 관리
export const cameraModels = pgTable("camera_models", {
  id: serial("id").primaryKey(),
  model: text("model").notNull().unique(),
  manufacturer: text("manufacturer"), // 제조사
  type: text("type"), // 카메라 타입 (DSLR, Mirrorless, Smartphone, etc.)
  releaseYear: integer("release_year"), // 출시년도
  sensorSize: text("sensor_size"), // 센서 크기
  megapixels: integer("megapixels"), // 메가픽셀
  description: text("description"), // 설명
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// User table for Google OAuth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id"),
  displayName: text("display_name"),
  email: text("email"),
  profilePicture: text("profile_picture"),
  bio: text("bio"),
  websiteUrl1: text("website_url1"),
  websiteUrl2: text("website_url2"),
  websiteLabel1: text("website_label1"),
  websiteLabel2: text("website_label2"),
  socialLinks: jsonb("social_links"),
  createdAt: text("created_at").notNull(),
  lastLogin: text("last_login").notNull(),
});

// Photos table - stores information about uploaded photos
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalFilename: text("original_filename").notNull(),
  displayImagePath: text("display_image_path").notNull(),
  analysisImagePath: text("analysis_image_path").notNull(),
  // displayImageData와 analysisImageData 필드 제거 - 실제 DB에 존재하지 않음
  firebaseDisplayUrl: text("firebase_display_url"), // Firebase Storage URL for display image
  firebaseAnalysisUrl: text("firebase_analysis_url"), // Firebase Storage URL for analysis image
  s3DisplayUrl: text("s3_display_url"), // AWS S3 URL for display image
  s3AnalysisUrl: text("s3_analysis_url"), // AWS S3 URL for analysis image
  replitDisplayUrl: text("replit_display_url"), // Replit Object Storage URL for display image
  replitAnalysisUrl: text("replit_analysis_url"), // Replit Object Storage URL for analysis image
  exifData: jsonb("exif_data"),
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: text("created_at").notNull(),
});

// Analysis results table - stores the results of photo analyses
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").references(() => photos.id).notNull(),
  userId: integer("user_id").references(() => users.id), // 사용자 ID 추가 (직접 검색 최적화)
  detectedGenre: text("detected_genre").notNull().default("Unknown"),
  summary: text("summary").notNull(),
  overallScore: integer("overall_score").notNull(),
  tags: text("tags").array().notNull(),
  categoryScores: jsonb("category_scores").notNull(),
  analysis: jsonb("analysis").notNull(),
  focusPoint: text("focus_point").notNull().default("center"), // 기본값 추가
  detailLevel: text("detail_level").notNull().default("standard"), // 기본값 추가
  persona: text("persona").notNull(),
  language: text("language").notNull(),
  cameraModel: text("camera_model"), // 카메라 모델명 (빠른 조회용)
  cameraManufacturer: text("camera_manufacturer"), // 카메라 제조사 (빠른 조회용)
  isHidden: boolean("is_hidden").default(false).notNull(),
  createdAt: text("created_at").notNull(),
});

// User opinions on analysis - 사용자 의견 저장
export const opinions = pgTable("opinions", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => analyses.id, {
    onDelete: "set null", // Analysis가 삭제되면 해당 opinion의 analysisId를 null로 설정
  }),
  userId: integer("user_id").references(() => users.id),
  isLiked: boolean("is_liked"), // 좋아요 여부 (true: 좋아요, false: 싫어요, null: 선택 안함)
  comment: text("comment"), // 사용자 코멘트
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Schema for inserting a new photo
export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  userId: true,
  displayImagePath: true,
  analysisImagePath: true,
  createdAt: true,
});

// Schema for inserting a new analysis
export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a new opinion
export const insertOpinionSchema = createInsertSchema(opinions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for PhotoUpload request
export const photoUploadSchema = z.object({
  image: z.string(), // base64 encoded image
  originalFilename: z.string(),
  language: z.string().optional(), // 분석 언어 선택 (없으면 기본값: 'ko')
});



// Schema for Analysis request
export const analysisRequestSchema = z.object({
  photoId: z.number(),
  persona: z.string(),
  language: z.string(),
  imageUrl: z.string(), // 이미지 URL 필드 추가
  genre: z.string().optional(), // 선택적 장르 필드
  detailLevel: z.string().optional(), // 선택적 상세 수준 필드
});

// Types for the frontend
export const categoryScoresSchema = z.object({
  composition: z.number(),
  lighting: z.number(),
  color: z.number(),
  focus: z.number(),
  creativity: z.number(),
});

export const analysisTextSchema = z.object({
  text: z.string(),
  suggestions: z.string(),
});

export const overallAnalysisSchema = z.object({
  text: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  modifications: z.string(),
});

export const genreSpecificSchema = z.object({
  text: z.string(),
  suggestions: z.string(),
});

export const analysisContentSchema = z.object({
  overall: overallAnalysisSchema,
  composition: analysisTextSchema,
  lighting: analysisTextSchema,
  color: analysisTextSchema,
  focus: analysisTextSchema,
  creativity: analysisTextSchema,
  genreSpecific: genreSpecificSchema.optional(),
});

export const analysisResultSchema = z.object({
  detectedGenre: z.string().default("Unknown"),
  summary: z.string(),
  overallScore: z.number(),
  tags: z.array(z.string()),
  categoryScores: categoryScoresSchema,
  analysis: analysisContentSchema,
  // 유명 작품 감지 관련 필드 추가
  isNotEvaluable: z.boolean().optional(),
  reason: z.string().optional(),
  // 분석 옵션 필드 추가
  options: z.object({
    focusPoint: z.string().optional(),
    persona: z.string().optional(),
    detailLevel: z.string().optional(),
    language: z.string().optional()
  }).optional(),
});

// Create insert schema for users (to fix the reference error)
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Create insert schema for camera models
export const insertCameraModelSchema = createInsertSchema(cameraModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertCameraModel = z.infer<typeof insertCameraModelSchema>;
export type CameraModel = typeof cameraModels.$inferSelect;
export type CategoryScores = z.infer<typeof categoryScoresSchema>;
export type AnalysisText = z.infer<typeof analysisTextSchema>;
export type OverallAnalysis = z.infer<typeof overallAnalysisSchema>;
export type GenreSpecific = z.infer<typeof genreSpecificSchema>;
export type AnalysisContent = z.infer<typeof analysisContentSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type PhotoUploadRequest = z.infer<typeof photoUploadSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type InsertOpinion = z.infer<typeof insertOpinionSchema>;
export type Opinion = typeof opinions.$inferSelect;
