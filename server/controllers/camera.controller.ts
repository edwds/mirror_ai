import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

class CameraController {

    // 모든 카메라 모델 조회 (페이지네이션, 검색 포함)
    async getAllCameraModels(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const searchTerm = req.query.q as string;

            console.log(`[Admin API] 카메라 모델 목록 조회: page=${page}, limit=${limit}, search=${searchTerm}`);

            let result;
            if (searchTerm) {
                result = await storage.searchCameraModels(searchTerm, page, limit);
            } else {
                result = await storage.getAllCameraModels(page, limit);
            }

            return res.status(200).json({
                success: true,
                models: result.models,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error("[Admin API] 카메라 모델 목록 조회 오류:", error);
            next(error);
        }
    }

    // 특정 카메라 모델 조회
    async getCameraModelById(req: Request, res: Response, next: NextFunction) {
        try {
            const modelId = parseInt(req.params.id);
            if (isNaN(modelId)) return res.status(400).json({ error: "Invalid camera model ID" });

            console.log(`[Admin API] 카메라 모델(${modelId}) 상세 조회`);
            const cameraModel = await storage.getCameraModel(modelId);
            if (!cameraModel) return res.status(404).json({ error: "Camera model not found" });

            return res.status(200).json({ success: true, model: cameraModel });
        } catch (error) {
            console.error(`[Admin API] 카메라 모델 상세 조회 오류(ID: ${req.params.id}):`, error);
            next(error);
        }
    }

    // 새 카메라 모델 생성
    async createCameraModel(req: Request, res: Response, next: NextFunction) {
        try {
            const { model, manufacturer, type, releaseYear, sensorSize, megapixels, description } = req.body;

            if (!model) return res.status(400).json({ error: "Model name is required" });
            console.log(`[Admin API] 새 카메라 모델 생성 요청: ${model}`);

            const existingModel = await storage.getCameraModelByName(model);
            if (existingModel) return res.status(409).json({ error: "Camera model with this name already exists" });

            const parsedReleaseYear = releaseYear ? parseInt(releaseYear) : undefined;
            const parsedMegapixels = megapixels ? parseFloat(megapixels) : undefined;

            const modelData = {
                model,
                manufacturer: manufacturer || undefined,
                type: type || undefined,
                releaseYear: isNaN(parsedReleaseYear as number) ? undefined : (parsedReleaseYear as number),
                sensorSize: sensorSize || undefined,
                megapixels: isNaN(parsedMegapixels as number) ? undefined : (parsedMegapixels as number),
                description: description || undefined
            };

            const createdModel = await storage.createCameraModel(modelData);
            console.log(`   - 생성 완료 (ID: ${createdModel.id})`);
            return res.status(201).json({ success: true, model: createdModel });
        } catch (error) {
            console.error("[Admin API] 카메라 모델 생성 오류:", error);
            next(error);
        }
    }

    // 카메라 모델 업데이트
    async updateCameraModel(req: Request, res: Response, next: NextFunction) {
        try {
            const modelId = parseInt(req.params.id);
            if (isNaN(modelId)) return res.status(400).json({ error: "Invalid camera model ID" });

            console.log(`[Admin API] 카메라 모델(${modelId}) 업데이트 요청`);
            const existingModel = await storage.getCameraModel(modelId);
            if (!existingModel) return res.status(404).json({ error: "Camera model not found" });

            // 업데이트할 필드 추출
            const { model, manufacturer, type, releaseYear, sensorSize, megapixels, description } = req.body;
            const updates: any = {};
            if (model !== undefined) updates.model = model;
            if (manufacturer !== undefined) updates.manufacturer = manufacturer;
            if (type !== undefined) updates.type = type;
            if (releaseYear !== undefined) {
                const parsedReleaseYear = parseInt(releaseYear);
                updates.releaseYear = isNaN(parsedReleaseYear) ? null : parsedReleaseYear;
            }
            if (sensorSize !== undefined) updates.sensorSize = sensorSize;
            if (megapixels !== undefined) {
                const parsedMegapixels = parseFloat(megapixels);
                updates.megapixels = isNaN(parsedMegapixels) ? null : parsedMegapixels;
            }
            if (description !== undefined) updates.description = description;

            if (Object.keys(updates).length === 0) {
                 return res.status(400).json({ error: "No fields to update provided" });
            }

            const updatedModel = await storage.updateCameraModel(modelId, updates);
            console.log(`   - 업데이트 완료 (ID: ${updatedModel.id})`);
            return res.status(200).json({ success: true, model: updatedModel });
        } catch (error) {
            console.error(`[Admin API] 카메라 모델 업데이트 오류(ID: ${req.params.id}):`, error);
            next(error);
        }
    }

    // 카메라 모델 삭제
    async deleteCameraModel(req: Request, res: Response, next: NextFunction) {
        try {
            const modelId = parseInt(req.params.id);
            if (isNaN(modelId)) return res.status(400).json({ error: "Invalid camera model ID" });

            console.log(`[Admin API] 카메라 모델(${modelId}) 삭제 요청`);
            const existingModel = await storage.getCameraModel(modelId);
            if (!existingModel) return res.status(404).json({ error: "Camera model not found" });

            // TODO: 해당 카메라 모델을 사용하는 사진이 있는지 확인하는 로직 추가 고려
            // const photosWithModel = await storage.getPhotosByCamera(existingModel.model, undefined, true, 1, 1);
            // if (photosWithModel.total > 0) {
            //    return res.status(409).json({ error: `Cannot delete model, ${photosWithModel.total} photos are using it.` });
            // }

            const result = await storage.deleteCameraModel(modelId);
            if (result) {
                console.log(`   - 삭제 완료 (ID: ${modelId})`);
                return res.status(200).json({ success: true, message: `Camera model ID ${modelId} deleted.` });
            } else {
                 // 삭제 실패 (DB 제약 조건 등)
                 console.error(`   - 삭제 실패 (ID: ${modelId})`);
                 return res.status(500).json({ success: false, error: "Failed to delete camera model" });
            }
        } catch (error) {
            console.error(`[Admin API] 카메라 모델 삭제 오류(ID: ${req.params.id}):`, error);
            next(error);
        }
    }
}

export const cameraController = new CameraController();