import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { firebaseService } from "../services/firebase.service"; // Firebase 서비스 사용

// 사용자 정보에서 민감한 필드를 제외하는 헬퍼 함수
const sanitizeUser = (user: any) => {
    if (!user) return null;
    // 필요한 필드만 선택하여 새 객체 생성
    const { passwordHash, providerKey, ...safeUser } = user; // 예시: 제외할 필드
    return safeUser;
};

class UserController {

    // 현재 로그인한 사용자 프로필 조회
    async getCurrentUserProfile(req: Request, res: Response, next: NextFunction) {
        try {
            // isAuthenticated 미들웨어에서 이미 확인되었으므로 req.user 존재
            const userId = (req.user as any).id;
            console.log("👤 현재 사용자 프로필 조회 요청:", userId);

            const user = await storage.getUser(userId);
            if (!user) {
                // 이 경우는 세션은 유효하나 DB에 사용자가 없는 경우 (거의 발생하지 않음)
                console.warn("세션 사용자는 있으나 DB에서 찾을 수 없음:", userId);
                return res.status(404).json({ error: "User not found in database" });
            }

            console.log("   - 사용자 발견:", user.id, "이름:", user.displayName);
            return res.json({ success: true, user: sanitizeUser(user) });

        } catch (error) {
            console.error('사용자 프로필 가져오기 오류:', error);
            next(error);
        }
    }

    // 특정 사용자 프로필 조회 (ID 사용)
    async getUserProfileById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ error: "Invalid user ID" });
            }
            console.log(`👤 특정 사용자(${userId}) 프로필 조회 요청`);

            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // 공개용 프로필 정보만 반환 (이메일 등 민감 정보 제외)
            const publicProfile = {
                id: user.id,
                displayName: user.displayName,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
                bio: user.bio,
                socialLinks: user.socialLinks, // 공개 여부 정책에 따라 결정
                websiteUrl1: user.websiteUrl1,
                websiteUrl2: user.websiteUrl2,
                websiteLabel1: user.websiteLabel1,
                websiteLabel2: user.websiteLabel2,
            };

            return res.json({ success: true, user: publicProfile });

        } catch (error) {
            console.error('사용자 정보 가져오기 오류:', error);
            next(error);
        }
    }

    // 사용자 프로필 업데이트
    async updateUserProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userIdToUpdate = parseInt(req.params.id);
            if (isNaN(userIdToUpdate)) {
                return res.status(400).json({ error: "Invalid user ID" });
            }

            // 현재 로그인한 사용자와 업데이트 대상 사용자가 일치하는지 확인
            const sessionUserId = (req.user as any).id;
            if (sessionUserId !== userIdToUpdate) {
                console.warn(`권한 없는 사용자(${sessionUserId})가 프로필(${userIdToUpdate}) 업데이트 시도`);
                return res.status(403).json({ error: "Not authorized to update this profile" });
            }

            console.log(`👤 사용자(${sessionUserId}) 프로필 업데이트 요청`);

            // 업데이트할 데이터 추출 (텍스트 필드)
            const { displayName, bio, socialLinks, websiteUrl1, websiteLabel1, websiteUrl2, websiteLabel2, profilePicture: profilePictureData } = req.body;
            const updates: any = {};

            if (displayName !== undefined) updates.displayName = displayName;
            if (bio !== undefined) updates.bio = bio;
            if (websiteUrl1 !== undefined) updates.websiteUrl1 = websiteUrl1;
            if (websiteLabel1 !== undefined) updates.websiteLabel1 = websiteLabel1;
            if (websiteUrl2 !== undefined) updates.websiteUrl2 = websiteUrl2;
            if (websiteLabel2 !== undefined) updates.websiteLabel2 = websiteLabel2;

            // 소셜 링크 파싱 (JSON 문자열로 올 경우)
            if (socialLinks) {
                try {
                    updates.socialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
                } catch (e) {
                    console.warn("잘못된 소셜 링크 형식:", socialLinks);
                    // 오류를 반환하거나 무시할 수 있음
                    // return res.status(400).json({ error: "Invalid social links format" });
                }
            }

            // 프로필 이미지 처리
            let profileImageUrl: string | undefined = undefined;
            const useFirebase = process.env.FIREBASE_API_KEY && process.env.FIREBASE_STORAGE_BUCKET;

            if (req.file) { // Multer를 통해 파일이 업로드된 경우 (profileUpload 미들웨어 사용)
                console.log("   - 새 프로필 이미지 파일 감지:", req.file.originalname, `(${req.file.size} bytes)`);
                if (useFirebase) {
                    try {
                        profileImageUrl = await firebaseService.uploadImageToFirebase(
                            req.file.buffer,
                            `profile_${userIdToUpdate}_${Date.now()}${path.extname(req.file.originalname || '.jpg')}`, // 고유 파일명 생성
                            'profiles/', // 저장 경로
                            req.file.mimetype
                        );
                        console.log("   - Firebase에 프로필 이미지 업로드 완료");
                    } catch (firebaseError) {
                        console.error("   - Firebase 프로필 이미지 업로드 실패:", firebaseError);
                        // Firebase 실패 시 Base64로 저장 (DB 컬럼이 text 타입이어야 함)
                        profileImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                        console.log("   - Base64 인코딩된 이미지로 대체 저장");
                    }
                } else {
                    // Firebase 미설정 시 Base64 저장
                    profileImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                     console.log("   - Firebase 미설정, Base64 인코딩된 이미지로 저장");
                }
            } else if (profilePictureData && typeof profilePictureData === 'string') { // Body에 이미지 데이터(URL 또는 Base64)가 직접 온 경우
                 if (profilePictureData.startsWith('http')) {
                    // 이미 URL 형태이면 그대로 사용 (외부 URL 허용 정책 확인 필요)
                    console.log("   - 기존 프로필 이미지 URL 사용:", profilePictureData.substring(0, 60) + "...");
                    profileImageUrl = profilePictureData;
                } else if (profilePictureData.startsWith('data:')) {
                     console.log("   - Base64 인코딩된 프로필 이미지 감지");
                     // Base64 데이터인 경우 Firebase 업로드 시도 (중복 업로드 방지 고려 필요)
                     if (useFirebase) {
                         try {
                             profileImageUrl = await firebaseService.uploadBase64ImageToFirebase(
                                 profilePictureData,
                                 `profile_${userIdToUpdate}_${Date.now()}`, // 파일명
                                 'profiles/'
                             );
                             console.log("   - Firebase에 Base64 프로필 이미지 업로드 완료");
                         } catch (error) {
                             console.error("   - Firebase Base64 이미지 업로드 실패:", error);
                             profileImageUrl = profilePictureData; // 실패 시 원본 Base64 사용
                             console.log("   - Base64 인코딩된 이미지로 대체 저장");
                         }
                     } else {
                          profileImageUrl = profilePictureData; // Firebase 미설정 시 그대로 사용
                          console.log("   - Firebase 미설정, Base64 인코딩된 이미지로 저장");
                     }
                }
            }

            if (profileImageUrl !== undefined) {
                 updates.profilePicture = profileImageUrl;
                 // TODO: 기존 프로필 이미지가 Firebase에 있었다면 삭제하는 로직 추가
                 // const oldUser = await storage.getUser(userIdToUpdate);
                 // if (oldUser?.profilePicture?.includes('firebasestorage.googleapis.com')) {
                 //     try {
                 //        const oldFilePath = decodeURIComponent(oldUser.profilePicture.split('/o/')[1].split('?')[0]);
                 //        await firebaseService.deleteFileFromFirebase(oldFilePath);
                 //     } catch(deleteError) { console.error("기존 Firebase 프로필 이미지 삭제 실패:", deleteError); }
                 // }
            }


            // DB 업데이트
            if (Object.keys(updates).length > 0) {
                 const updatedUser = await storage.updateUser(userIdToUpdate, updates);
                 console.log("   - 사용자 정보 DB 업데이트 완료");
                 return res.status(200).json({ success: true, user: sanitizeUser(updatedUser) });
            } else {
                 // 업데이트할 내용이 없는 경우
                 const currentUser = await storage.getUser(userIdToUpdate);
                 console.log("   - 업데이트할 내용 없음");
                 return res.status(200).json({ success: true, user: sanitizeUser(currentUser) });
            }

        } catch (error) {
            console.error("사용자 프로필 업데이트 오류:", error);
            next(error);
        }
    }
}

export const userController = new UserController();