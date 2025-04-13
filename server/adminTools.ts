import { db } from './db';
import { sql } from 'drizzle-orm';
import { analyses } from '../shared/schema';

/**
 * 각 사진당 가장 최신 분석만 남기고 나머지 분석을 삭제하는 함수
 * @returns {Promise<{deletedCount: number}>} 삭제된 중복 분석 레코드 수
 */
export async function cleanupDuplicateAnalyses(): Promise<{ deletedCount: number, keptCount: number }> {
  try {
    console.log('[AdminTools] 중복 분석 정리 시작...');
    
    // 1. 각 사진별로 가장 최신 분석을 찾는 쿼리
    // 먼저 photo_id가 NULL이 아닌 분석 레코드가 있는지 확인
    const checkQuery = sql`
      SELECT COUNT(*) as count 
      FROM "analyses" 
      WHERE "photo_id" IS NOT NULL AND "is_hidden" = false
    `;
    
    const checkResult = await db.execute(checkQuery);
    const recordCount = parseInt(String(checkResult[0].count), 10);
    
    if (recordCount === 0) {
      console.log('[AdminTools] 정리할 분석 데이터가 없습니다.');
      return {
        deletedCount: 0,
        keptCount: 0
      };
    }
    
    // 분석 데이터가 있는 경우 각 사진별로 가장 최신 분석 찾기
    const latestAnalysesQuery = sql`
      WITH RankedAnalyses AS (
        SELECT 
          id,
          "photo_id",
          "created_at",
          ROW_NUMBER() OVER (
            PARTITION BY "photo_id" 
            ORDER BY "created_at" DESC, id DESC
          ) as rn
        FROM "analyses"
        WHERE "is_hidden" = false AND "photo_id" IS NOT NULL
      )
      SELECT id, "photo_id"
      FROM RankedAnalyses
      WHERE rn = 1
    `;
    
    const latestAnalyses = await db.execute(latestAnalysesQuery);
    console.log(`[AdminTools] 유지할 최신 분석 ${latestAnalyses.length}개 발견`);
    
    // 2. 남겨둘 최신 분석 ID 목록 수집
    const keepAnalysisIds = latestAnalyses.map((row: any) => Number(row.id));
    
    // 보존할 분석이 없는 경우 처리
    if (keepAnalysisIds.length === 0) {
      console.log('[AdminTools] 보존할 분석이 없습니다. 삭제 작업을 건너뜁니다.');
      return {
        deletedCount: 0,
        keptCount: 0
      };
    }
    
    // 3. 최신 분석이 아닌 모든 분석 삭제
    // 두 가지 조건 분기 처리: keepAnalysisIds가 있을 때와 없을 때
    let deleteQuery;
    
    if (keepAnalysisIds.length === 0) {
      // 보존할 ID가 없을 경우 photo_id가 NULL이 아닌 모든 항목을 제거
      deleteQuery = sql`
        WITH deleted AS (
          DELETE FROM "analyses"
          WHERE "is_hidden" = false
          AND "photo_id" IS NOT NULL
          RETURNING id
        )
        SELECT COUNT(*) as count FROM deleted
      `;
    } else {
      // 보존할 ID가 있을 경우 NOT IN 조건 사용
      // ID 목록을 직접 쿼리에 포함시키는 방식으로 변경
      const keepIdsString = keepAnalysisIds.join(',');
      console.log(`[AdminTools] 보존할 ID 목록: ${keepIdsString.substring(0, 100)}${keepIdsString.length > 100 ? '...' : ''} (${keepAnalysisIds.length}개)`);

      deleteQuery = sql`
        WITH deleted AS (
          DELETE FROM "analyses"
          WHERE "id" NOT IN (${sql.raw(keepIdsString)})
          AND "is_hidden" = false
          AND "photo_id" IS NOT NULL
          RETURNING id
        )
        SELECT COUNT(*) as count FROM deleted
      `;
    }
    
    const result = await db.execute(deleteQuery);
    const deletedCount = parseInt(String(result[0].count), 10);
    
    console.log(`[AdminTools] 중복 분석 ${deletedCount}개 삭제 완료, ${latestAnalyses.length}개 유지`);
    
    return { 
      deletedCount,
      keptCount: latestAnalyses.length
    };
  } catch (error) {
    console.error('[AdminTools] 중복 분석 정리 실패:', error);
    throw error;
  }
}

/**
 * 점수 분포를 분석하는 함수
 */
export async function getScoreDistribution(): Promise<{
  overallScores: { score: number; count: number }[];
  categoryScores: {
    composition: { score: number; count: number }[];
    lighting: { score: number; count: number }[];
    color: { score: number; count: number }[];
    focus: { score: number; count: number }[];
    creativity: { score: number; count: number }[];
  };
}> {
  try {
    // 점수 분포를 10점 단위로 그룹화
    const overallScoreQuery = sql`
      SELECT 
        FLOOR("overall_score" / 10) * 10 as score_range, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "overall_score" IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `;
    
    // 카테고리별 점수 분포 쿼리 (categoryScores 객체에서 각 카테고리 추출)
    const compositionScoreQuery = sql`
      SELECT 
        FLOOR(("category_scores"->>'composition')::numeric / 10) * 10 as score_range, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "category_scores"->>'composition' IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `;
    
    const lightingScoreQuery = sql`
      SELECT 
        FLOOR(("category_scores"->>'lighting')::numeric / 10) * 10 as score_range, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "category_scores"->>'lighting' IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `;
    
    const colorScoreQuery = sql`
      SELECT 
        FLOOR(("category_scores"->>'color')::numeric / 10) * 10 as score_range, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "category_scores"->>'color' IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `;
    
    const focusScoreQuery = sql`
      SELECT 
        FLOOR(("category_scores"->>'focus')::numeric / 10) * 10 as score_range, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "category_scores"->>'focus' IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `;
    
    const creativityScoreQuery = sql`
      SELECT 
        FLOOR(("category_scores"->>'creativity')::numeric / 10) * 10 as score_range, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "category_scores"->>'creativity' IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `;
    
    // 쿼리 실행
    const [
      overallScoreResult,
      compositionScoreResult,
      lightingScoreResult,
      colorScoreResult,
      focusScoreResult,
      creativityScoreResult
    ] = await Promise.all([
      db.execute(overallScoreQuery),
      db.execute(compositionScoreQuery),
      db.execute(lightingScoreQuery),
      db.execute(colorScoreQuery),
      db.execute(focusScoreQuery),
      db.execute(creativityScoreQuery)
    ]);
    
    // 결과 변환
    const formatResults = (result: any[]) => {
      return result.map((row: any) => ({
        score: parseInt(String(row.score_range), 10),
        count: parseInt(String(row.count), 10)
      }));
    };
    
    return {
      overallScores: formatResults(overallScoreResult),
      categoryScores: {
        composition: formatResults(compositionScoreResult),
        lighting: formatResults(lightingScoreResult),
        color: formatResults(colorScoreResult),
        focus: formatResults(focusScoreResult),
        creativity: formatResults(creativityScoreResult)
      }
    };
  } catch (error) {
    console.error('[AdminTools] 점수 분포 분석 실패:', error);
    throw error;
  }
}

/**
 * 장르별 분석 통계를 가져오는 함수
 */
export async function getGenreDistribution(): Promise<{
  genres: { name: string; count: number }[];
  // 장르별 평균 점수
  averageScoresByGenre: { genre: string; averageScore: number }[];
}> {
  try {
    // 장르 분포 쿼리
    const genreQuery = sql`
      SELECT 
        "detected_genre" as genre, 
        COUNT(*) as count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "detected_genre" IS NOT NULL
      GROUP BY "detected_genre"
      ORDER BY count DESC
    `;
    
    // 장르별 평균 점수 쿼리
    const genreScoreQuery = sql`
      SELECT 
        "detected_genre" as genre,
        AVG("overall_score") as average_score
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
        AND "is_hidden" = false
        AND "detected_genre" IS NOT NULL
        AND "overall_score" IS NOT NULL
      GROUP BY "detected_genre"
      ORDER BY average_score DESC
    `;
    
    // 쿼리 실행
    const [genreResult, genreScoreResult] = await Promise.all([
      db.execute(genreQuery),
      db.execute(genreScoreQuery)
    ]);
    
    // 결과 변환
    const genres = genreResult.map((row: any) => ({
      name: String(row.genre),
      count: parseInt(String(row.count), 10)
    }));
    
    const averageScoresByGenre = genreScoreResult.map((row: any) => ({
      genre: String(row.genre),
      averageScore: parseFloat(String(row.average_score))
    }));
    
    return {
      genres,
      averageScoresByGenre
    };
  } catch (error) {
    console.error('[AdminTools] 장르 분포 분석 실패:', error);
    throw error;
  }
}

/**
 * 전체 분석 통계 정보 반환
 */
export async function getAnalyticsStats(): Promise<{
  totalPhotos: number;
  totalAnalyses: number;
  duplicateAnalysesCount: number;
  photosWith: {
    multipleAnalyses: number;
    singleAnalysis: number;
  }
}> {
  try {
    // 전체 사진 수 쿼리
    const totalPhotosQuery = sql`SELECT COUNT(*) as count FROM "photos"`;
    const totalPhotosResult = await db.execute(totalPhotosQuery);
    const totalPhotos = parseInt(String(totalPhotosResult[0].count), 10);
    
    // 전체 분석 수 쿼리
    const totalAnalysesQuery = sql`SELECT COUNT(*) as count FROM "analyses" WHERE "photo_id" IS NOT NULL`;
    const totalAnalysesResult = await db.execute(totalAnalysesQuery);
    const totalAnalyses = parseInt(String(totalAnalysesResult[0].count), 10);
    
    // 사진당 분석 수 통계 쿼리
    const analysesByPhotoQuery = sql`
      SELECT 
        "photo_id", 
        COUNT(*) as analysis_count
      FROM "analyses"
      WHERE "photo_id" IS NOT NULL
      GROUP BY "photo_id"
    `;
    
    const analysesByPhoto = await db.execute(analysesByPhotoQuery);
    
    // 여러 분석이 있는 사진 수
    let multipleAnalyses = 0;
    // 단일 분석이 있는 사진 수
    let singleAnalysis = 0;
    
    analysesByPhoto.forEach((row: any) => {
      if (parseInt(String(row.analysis_count), 10) > 1) {
        multipleAnalyses++;
      } else {
        singleAnalysis++;
      }
    });
    
    // 중복 분석 수 계산 (전체 분석 수 - 사진 수)
    const duplicateAnalysesCount = totalAnalyses - analysesByPhoto.length;
    
    return {
      totalPhotos,
      totalAnalyses,
      duplicateAnalysesCount,
      photosWith: {
        multipleAnalyses,
        singleAnalysis
      }
    };
  } catch (error) {
    console.error('[AdminTools] 분석 통계 조회 실패:', error);
    throw error;
  }
}