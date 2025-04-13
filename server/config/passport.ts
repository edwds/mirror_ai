import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';
import { insertUserSchema } from '../shared/schema';

// Configure Google Strategy
// Determine the callback URL based on environment
// Dynamic callback URL based on deployment environment
const isDev = process.env.NODE_ENV !== 'production';

// 개발 환경에서는 Replit 개발 URL 사용
const callbackURL = isDev
  ? 'https://cf022aa4-89a4-463a-b675-09a06287566a-00-2o75vp8h0n02x.worf.replit.dev/auth/google/callback'
  : process.env.REPLIT_DEPLOYMENT_URL 
    ? `${process.env.REPLIT_DEPLOYMENT_URL}/auth/google/callback` 
    : `${process.env.REPLIT_URL || 'http://localhost:3000'}/auth/google/callback`;

console.log('Google OAuth configured with:');
console.log(`- Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Present (length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : 'Missing'}`);
console.log(`- Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Present (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'Missing'}`);
console.log(`- Callback URL: ${callbackURL}`);
console.log(`- Deployment URL: ${process.env.REPLIT_DEPLOYMENT_URL || 'Not set'}`);
console.log(`- Replit URL: ${process.env.REPLIT_URL || 'Not set'}`);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: callbackURL,
    // Add proxy configuration to handle Replit's proxy setup
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log(`Google auth callback received for profile ID: ${profile.id}`);
      console.log(`Profile data: Name: ${profile.displayName}, Email: ${profile.emails?.[0]?.value || 'None'}`);

      // 이메일로 먼저 사용자 조회 (구글 ID가 변경되었을 가능성도 고려)
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      let user = null;

      // 1. 이메일이 있으면 이메일로 먼저 검색
      if (email) {
        user = await storage.getUserByUsername(email);
        if (user) {
          console.log(`User found by email: ${email}, userID: ${user.id}`);

          // 구글 ID가 다르거나 없으면 업데이트 (구글 계정 변경/연결 시)
          if (user.googleId !== profile.id) {
            console.log(`Updating Google ID for user ${user.id} from ${user.googleId} to ${profile.id}`);
            user = await storage.updateUser(user.id, { googleId: profile.id });
          }
        }
      }

      // 2. 구글 ID로 사용자 검색 (이메일로 찾지 못한 경우)
      if (!user) {
        user = await storage.getUserByGoogleId(profile.id);
      }

      // 3. 사용자가 여전히 없으면 새로 생성
      if (!user) {
        console.log(`Creating new user for Google ID: ${profile.id}, Email: ${email}`);
        try {
          const userInfo = {
            googleId: profile.id,
            displayName: profile.displayName || null,
            email: email,
            profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };

          user = await storage.createUser(userInfo);
          console.log(`New user created with ID: ${user.id}`);
        } catch (createError) {
          console.error(`Error creating user: ${createError.message}`);
          // 중복 키 오류인 경우 다시 조회 시도
          if (createError.message.includes("duplicate key") || createError.message.includes("unique constraint")) {
            console.log(`Duplicate key detected, retrying user lookup`);
            // 다시 사용자 조회 (동시 요청에 의한 경합 상태 해결)
            if (email) {
              user = await storage.getUserByUsername(email);
            }
            if (!user) {
              user = await storage.getUserByGoogleId(profile.id);
            }
            if (!user) {
              return done(new Error(`Failed to create or find user after handling duplicate key error`), null);
            }
          } else {
            // 다른 종류의 오류는 그대로 전달
            return done(createError, null);
          }
        }
      } else {
        // 4. 기존 사용자인 경우 로그인 시간 업데이트
        console.log(`Existing user found with ID: ${user.id}`);
        user = await storage.updateUserLastLogin(user.id);

        // 프로필 정보 업데이트 (이름이나 프로필 사진이 변경된 경우)
        const updates: Record<string, any> = {};
        if (!user.displayName && profile.displayName) {
          updates.displayName = profile.displayName;
        }
        if (!user.profilePicture && profile.photos && profile.photos[0]) {
          updates.profilePicture = profile.photos[0].value;
        }
        if (Object.keys(updates).length > 0) {
          console.log(`Updating user profile info for ${user.id}:`, updates);
          user = await storage.updateUser(user.id, updates);
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('Error in Google authentication:', error);
      return done(error as Error);
    }
  }
));

// Serialize user to store in session
passport.serializeUser((user: any, done) => {
  console.log(`Serializing user: ${user.id}`);
  done(null, user.id);
});

// User 캐시 맵 - 세션 최적화용
const userCache = new Map<number, any>();
const MAX_CACHE_SIZE = 100; // 최대 캐시 크기
const CACHE_TTL = 10 * 60 * 1000; // 캐시 유효기간 (10분)

// 캐시에서 사용자 정보를 가져오거나 저장하는 함수
async function getUserWithCache(id: number) {
  // 캐시에 있는지 확인
  const cachedUser = userCache.get(id);
  if (cachedUser && (Date.now() - cachedUser.cachedAt < CACHE_TTL)) {
    return cachedUser.user;
  }

  // 캐시에 없으면 DB에서 가져오기
  const user = await storage.getUser(id);

  // 캐시에 저장
  if (user) {
    // 캐시 크기 관리 (LRU 방식)
    if (userCache.size >= MAX_CACHE_SIZE) {
      // 가장 오래된 항목 제거
      const oldestKey = userCache.keys().next().value;
      if (oldestKey !== undefined) {
        userCache.delete(oldestKey);
      }
    }

    userCache.set(id, { 
      user, 
      cachedAt: Date.now() 
    });
  }

  return user;
}

// Deserialize user from session (최적화된 버전)
passport.deserializeUser(async (id: number, done) => {
  try {
    // 로그 최소화 (디버깅이 필요한 경우에만 활성화)
    // console.log(`Deserializing user ID: ${id}`);

    const user = await getUserWithCache(id);

    if (user) {
      // 로그 최소화 (디버깅이 필요한 경우에만 활성화)
      // console.log(`User found: ${user.id}, name: ${user.displayName}`);
      done(null, user);
    } else {
      console.log(`No user found for ID: ${id}`);
      done(new Error(`No user found for ID: ${id}`), null);
    }
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

export default passport;

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface User {
      id: number;
      googleId: string | null;
      displayName: string | null;
      email: string | null;
      profilePicture: string | null;
      createdAt: string;
      lastLogin: string;
    }
  }
}