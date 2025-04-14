# 포토 AI 미러 (Photo AI Mirror)

AI 기반 사진 분석 및 관리 플랫폼으로, 사용자가 업로드한 사진을 AI가 분석하여 상세한 피드백을 제공합니다. 다양한 AI 페르소나 시스템을 통해 개성있는 피드백을 여러 언어로 제공하며, 사진 관리, 분석 결과 확인, 공개/비공개 설정 등의 기능을 제공합니다.

## 주요 기능

1. **사진 업로드 및 분석**
   - 사용자가 사진을 업로드하면 AI가 자동으로 장르 탐지
   - 사진의 장점과 개선점에 대한 상세한 피드백 제공
   - OpenAI Vision API 및 Google Gemini API를 활용한 고급 이미지 분석

2. **다양한 AI 페르소나 분석 시스템**
   - 여러 가지 개성을 가진 AI 페르소나가 각자 다른 관점에서 분석 제공
   - 지원 페르소나: 전문 사진작가, 친절한 조언자, 까다로운 비평가 등
   - 각 페르소나는 고유한 평가 기준, 어조, 스타일을 가짐

3. **다국어 지원**
   - 분석 결과를 다양한 언어로 제공 (한국어, 영어, 일본어 등)
   - 페르소나별 특성을 유지한 일관된 번역 품질

4. **개인화된 사진 갤러리**
   - 사용자별 개인 갤러리(마이페이지) 제공
   - 사진 및 분석 결과 관리
   - 공개/비공개 설정 기능

5. **사용자 인증 및 프로필**
   - 구글 OAuth를 통한 로그인
   - 사용자 프로필 관리

6. **향상된 텍스트 표현**
   - 마크다운 *강조* 구문 지원으로 중요 텍스트 강조 표시
   - 페르소나별 일관된 텍스트 스타일링

7. **관리자 기능**
   - 데이터베이스 통계 확인
   - 중복 분석 정리 도구

## 시스템 아키텍처

### 프론트엔드
- **React + TypeScript**: 모던 웹 UI 구현
- **Tailwind CSS**: 반응형 디자인 및 스타일링
- **shadcn/ui**: 컴포넌트 라이브러리
- **TanStack Query**: 서버 상태 관리 및 데이터 페칭
- **wouter**: 클라이언트 라우팅
- **i18next**: 다국어 지원 및 번역 관리

### 백엔드
- **Express.js**: RESTful API 서버
- **PostgreSQL**: 주요 데이터베이스
- **Drizzle ORM**: 데이터베이스 스키마 및 쿼리 관리
- **Firebase Storage**: 이미지 저장소
- **Passport.js**: 인증 관리

### AI 통합
- **OpenAI Vision API**: 이미지 분석 및 피드백 생성
- **Google Gemini API**: 대체 이미지 분석 엔진 및 다국어 번역 
- **AI 페르소나 시스템**: 다양한 개성을 지닌 AI 평가자 구현

## 폴더 구조

```
/
├── client/                   # 프론트엔드 코드
│   ├── src/
│   │   ├── components/       # 재사용 가능한 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── hooks/            # 커스텀 React 훅
│   │   ├── lib/              # 유틸리티 및 헬퍼 함수
│   │   └── context/          # React 컨텍스트 (상태 관리)
│   └── public/               # 정적 에셋
│
├── server/                   # 백엔드 코드
│   ├── routes.ts             # API 엔드포인트 정의
│   ├── storage.ts            # 데이터 저장소 인터페이스
│   ├── db.ts                 # 데이터베이스 연결 관리
│   ├── auth.ts               # 인증 로직
│   ├── imageProcessor.ts     # 이미지 처리 로직
│   ├── openai.ts             # OpenAI API 연동
│   ├── gemini.ts             # Google Gemini API 연동
│   ├── firebase.ts           # Firebase 스토리지 연동
│   ├── adminTools.ts         # 관리자 도구 기능
│   └── index.ts              # 서버 시작점
│
├── shared/                   # 프론트엔드와 백엔드 공유 코드
│   └── schema.ts             # 데이터 스키마 정의
│
├── uploads/                  # 업로드된 이미지 저장 (개발 환경)
├── migrations/               # 데이터베이스 마이그레이션
└── public/                   # 빌드된 프론트엔드 (배포용)
```

## 데이터 모델

### 사용자 (User)
- id: 고유 식별자
- googleId: 구글 인증 ID
- displayName: 표시 이름
- email: 이메일 주소
- profilePicture: 프로필 사진 URL
- createdAt: 계정 생성 시간
- lastLogin: 마지막 로그인 시간

### 사진 (Photo)
- id: 고유 식별자
- userId: 사용자 ID (외래 키)
- title: 사진 제목
- description: 사진 설명
- displayImagePath: 표시용 이미지 경로
- analysisImagePath: 분석용 이미지 경로
- firebaseDisplayUrl: Firebase 저장소 URL (표시용)
- firebaseAnalysisUrl: Firebase 저장소 URL (분석용)
- isHidden: 공개/비공개 상태
- createdAt: 업로드 시간

### 분석 (Analysis)
- id: 고유 식별자
- photoId: 사진 ID (외래 키)
- focusPoint: 분석 초점 (주제)
- persona: 분석 페르소나 (관점)
- detailLevel: 상세도 수준
- language: 분석 언어
- overall: 전체 분석 (JSON)
- strengths: 장점 (JSON 배열)
- improvements: 개선점 (JSON 배열)
- isHidden: 공개/비공개 상태
- createdAt: 분석 생성 시간

## API 엔드포인트

### 인증
- `GET /api/auth/user`: 현재 인증된 사용자 정보 조회
- `GET /auth/google`: 구글 OAuth 인증 시작
- `GET /auth/google/callback`: 구글 OAuth 콜백
- `GET /api/auth/logout`: 로그아웃

### 사용자
- `GET /api/user/:id`: 사용자 정보 조회
- `PATCH /api/user/:id`: 사용자 정보 업데이트

### 사진
- `POST /api/photos/upload`: 사진 업로드
- `GET /api/photos`: 사용자의 모든 사진 조회
- `GET /api/photos/:id`: 특정 사진 조회
- `PATCH /api/photos/:id`: 사진 정보 업데이트 (공개/비공개 설정 등)

### 분석
- `POST /api/photos/analyze`: 사진 분석 요청
- `GET /api/photos/:id/analyses`: 특정 사진의 분석 결과 조회
- `GET /api/analyses/:id`: 특정 분석 결과 조회
- `PATCH /api/analyses/:id`: 분석 결과 업데이트 (공개/비공개 설정 등)

### 결합 API
- `GET /api/photos/with-analyses`: 사진과 분석 결과를 함께 조회

### 관리자 API
- `GET /api/admin/analytics`: 시스템 통계 정보 조회
- `POST /api/admin/cleanup-analyses`: 중복 분석 정리

## 주요 기능 흐름

### 사진 업로드 및 분석
1. 사용자가 사진 업로드
2. 서버에서 이미지 처리 (크기 조정, 최적화)
3. 처리된 이미지를 Firebase Storage에 저장
4. 데이터베이스에 사진 메타데이터 저장
5. 사용자가 분석 요청
6. AI 모델(OpenAI 또는 Gemini)을 통해 사진 분석
7. 분석 결과를 데이터베이스에 저장

### 사진 관리 및 가시성 설정
1. 사용자가 마이페이지에서 사진 목록 확인
2. 각 사진에 대해 공개/비공개 설정 가능
3. 각 분석 결과에 대해 공개/비공개 설정 가능
4. 변경 사항은 실시간으로 UI에 반영되고 서버에 저장

## 환경 변수 설정

프로젝트 실행을 위해 다음 환경 변수가 필요합니다:

```
# 데이터베이스
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Firebase (선택 사항)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
```

## 개발 및 실행

### 개발 환경 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 데이터베이스 마이그레이션
```bash
# 스키마 변경사항 적용
npm run db:push
```

### 배포
```bash
# 프로덕션 빌드
npm run build

# 서버 실행
npm start
```

## 주요 개발 고려사항

1. **작동 방식**: 사진 업로드 후 분석 요청을 통해 AI 피드백을 얻는 2단계 프로세스
2. **AI 페르소나 시스템**: 각 페르소나마다 고유한 톤, 스타일, 평가 기준 정의
3. **다국어 지원**: 분석 결과를 여러 언어로 번역하면서 페르소나의 톤과 스타일 유지
4. **비용 관리**: AI API 호출 최적화를 통한 비용 효율성 (중복 분석 방지)
5. **사용자 경험**: 빠른 응답 시간과 직관적인 UI를 통한 부드러운 사용자 경험 제공
6. **마크다운 강조 기능**: *별표*로 감싼 텍스트를 시각적으로 강조하여 표시
7. **캐싱 전략**: 빈번하게 조회되는 데이터에 대한 효율적인 캐싱 구현

## 보안 및 개인정보

1. 모든 사용자 인증은 Google OAuth를 통해 안전하게 처리
2. 사진 및 분석 데이터에 대한 접근 제어 구현
3. 환경 변수를 통한 중요 API 키 및 비밀 관리
4. Firebase Storage의 보안 규칙을 통한 데이터 보호