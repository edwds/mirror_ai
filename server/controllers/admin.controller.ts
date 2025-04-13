import { Request, Response, NextFunction } from "express";
import path from 'path';
import fs from 'fs/promises'; // Use promise-based fs
import { exec } from 'child_process';
import util from 'util';
import { getAnalyticsStats, cleanupDuplicateAnalyses, getScoreDistribution, getGenreDistribution } from '../adminTools'; // adminTools 함수 가져오기

const execPromise = util.promisify(exec);

class AdminController {

    // 서버 업로드 디렉토리 상태 확인
    async getUploadsStatus(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('[Admin API] 업로드 디렉토리 상태 확인 요청');
            const uploadsDir = path.join(process.cwd(), "uploads");
            let stats;
            let permissions = "N/A";
            let files: string[] = [];
            let fileCount = 0;
            let directoryExists = false;
            let isDirectory = false;

            try {
                stats = await fs.stat(uploadsDir);
                directoryExists = true;
                isDirectory = stats.isDirectory();

                // 명령어 실행은 환경에 따라 실패할 수 있으므로 방어적으로 처리
                try {
                     // Windows 와 Linux/macOS 호환성 고려 (ls 대신 dir 사용 등)
                     const command = process.platform === "win32" ? `dir "${uploadsDir}"` : `ls -la "${uploadsDir}" | head -n 20`;
                     const { stdout } = await execPromise(command);
                     permissions = stdout || "Failed to execute command";
                } catch (execError) {
                     console.error("   - 디렉토리 권한/목록 조회 명령어 실행 실패:", execError);
                     permissions = `Command execution failed: ${execError instanceof Error ? execError.message : String(execError)}`;
                }

                if (isDirectory) {
                    const allFiles = await fs.readdir(uploadsDir);
                    fileCount = allFiles.length;
                    files = allFiles.slice(0, 20); // 최대 20개 파일명
                }

            } catch (error: any) {
                 if (error.code === 'ENOENT') {
                    console.log("   - 업로드 디렉토리 없음:", uploadsDir);
                 } else {
                    console.error("   - 업로드 디렉토리 정보 조회 오류:", error);
                 }
                 // 디렉토리가 없거나 접근 오류 시 stats는 undefined 유지
            }

            return res.status(200).json({
                success: true,
                directoryExists,
                isDirectory,
                permissions,
                fileCount,
                files,
                cwd: process.cwd(),
                fullPath: uploadsDir
            });
        } catch (error) {
            console.error("서버 상태 확인 중 오류:", error);
            next(error); // 중앙 에러 핸들러로 전달
        }
    }

    // 분석 통계 정보 조회
    async getAnalyticsStats(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('[Admin API] 분석 통계 정보 조회 시작 - 요청자:', (req.user as any)?.id);
            const stats = await getAnalyticsStats(); // adminTools 사용
            console.log('[Admin API] 분석 통계 정보 조회 완료');
            return res.status(200).json({ success: true, stats });
        } catch (error) {
            console.error("[Admin API] 분석 통계 정보 조회 중 오류:", error);
            next(error);
        }
    }

     // 점수 분포 데이터 조회
     async getScoreDistribution(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('[Admin API] 점수 분포 분석 시작 - 요청자:', (req.user as any)?.id);
            const distributionData = await getScoreDistribution(); // adminTools 사용
            console.log('[Admin API] 점수 분포 분석 완료');
            return res.status(200).json({ success: true, distribution: distributionData });
        } catch (error) {
            console.error("[Admin API] 점수 분포 분석 중 오류:", error);
            next(error);
        }
    }

    // 장르 분포 데이터 조회
    async getGenreDistribution(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('[Admin API] 장르 분포 분석 시작 - 요청자:', (req.user as any)?.id);
            const genreData = await getGenreDistribution(); // adminTools 사용
            console.log('[Admin API] 장르 분포 분석 완료');
            return res.status(200).json({ success: true, genreData });
        } catch (error) {
            console.error("[Admin API] 장르 분포 분석 중 오류:", error);
            next(error);
        }
    }

    // 중복 분석 정리
    async cleanupAnalyses(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('[Admin API] 중복 분석 정리 시작 - 요청자:', (req.user as any)?.id);
            const result = await cleanupDuplicateAnalyses(); // adminTools 사용
            console.log('[Admin API] 중복 분석 정리 완료:', result);
            return res.status(200).json({
                success: true,
                message: `중복 분석 ${result.deletedCount}개가 성공적으로 삭제되었습니다. (${result.keptCount}개 유지)`,
                ...result
            });
        } catch (error) {
            console.error("[Admin API] 중복 분석 정리 중 오류:", error);
            next(error);
        }
    }
}

export const adminController = new AdminController();