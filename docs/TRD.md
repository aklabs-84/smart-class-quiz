# TRD (Technical Requirements Document)
# Smart Class Quiz - 기술 요구사항 문서

## 1. 시스템 아키텍처

### 1.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트 (브라우저)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  React App  │  │   Vite      │  │ Tailwind CDN│              │
│  │ TypeScript  │  │ Dev/Build   │  │ + Framer    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (선택) Google Apps Script API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Apps Script (백엔드)                    │
│  - GET 기반 API (CORS 회피)                                      │
│  - 참가자/문제/답변/게임상태 관리                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Google Sheets (데이터 저장소)                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 동작 모드
- API URL이 설정되면 Google Sheets 연동 모드로 동작
- API URL이 없으면 목(Mock) 데이터로 데모 진행

---

## 2. 기술 스택

### 2.1 런타임/빌드
- React 19 + TypeScript
- Vite (dev/build/preview)
- Tailwind CSS (CDN 로드)
- Framer Motion (애니메이션)
- Tone.js (효과음), HTMLAudio (BGM)

### 2.2 의존성 (package.json 기준)
```json
{
  "dependencies": {
    "framer-motion": "^12.23.26",
    "lucide-react": "^0.562.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "tone": "^15.1.22"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

### 2.3 폴더 구조 (현재 코드 기준)
```
App.tsx
index.tsx
types.ts
components/
  JoinView.tsx
  LobbyView.tsx
  CountdownView.tsx
  QuizView.tsx
  ResultView.tsx
  RankingView.tsx
  FinalView.tsx
  TeacherLogin.tsx
  TeacherControls.tsx
services/
  googleSheetsApi.ts
  audioService.ts
utils/
  constants.ts
assets/
public/
```

---

## 3. 주요 모듈 설명

### 3.1 App.tsx (상태/흐름)
- 모드 선택, 선생님 로그인, 학생 참여 흐름
- 게임 상태: LOBBY → QUIZ → RESULT → RANKING → FINAL
- 폴링 기반 상태 동기화 및 타이머 동작

### 3.2 services/googleSheetsApi.ts
- Google Apps Script API를 GET 쿼리로 호출
- API 미설정 시 Mock 데이터 사용

### 3.3 services/audioService.ts
- Tone.js 기반 효과음, HTMLAudio 기반 BGM
- 사용자 제스처 후 오디오 시작

### 3.4 utils/constants.ts
- 폴링 간격, 타이머 옵션, 인증 키, 색상/애니메이션 상수

---

## 4. 데이터 모델 (types.ts)

### 4.1 GameState
```
'WAITING' | 'LOBBY' | 'COUNTDOWN' | 'QUIZ' | 'RESULT' | 'RANKING' | 'FINAL'
```

### 4.2 Participant
- id, name, score, joinedAt, answers
- lastAnswer, isCorrect, rank/previousRank (옵션)
- sessionId (옵션)

### 4.3 Question
- id, text, options[4], correctAnswer(0-3), timeLimit

### 4.4 Answer
- participantId, questionId, selectedOption, responseTime
- isCorrect, score, sessionId, answeredAt

---

## 5. API 설계 (Google Apps Script)

### 5.1 공통 규칙
- CORS 이슈 회피를 위해 GET 요청으로 통일
- 쿼리 파라미터: `action`, 나머지는 key/value
- 응답 형식: `{ success: boolean, data?: T, error?: string }`

### 5.2 액션 목록
| Action | 설명 | 주요 파라미터 |
|--------|------|---------------|
| getParticipants | 참가자 목록 조회 | sessionId? |
| addParticipant | 참가자 추가 | name, sessionId? |
| getQuestions | 문제 목록 조회 | - |
| submitAnswer | 답변 제출 | participantId, questionId, selectedAnswer, responseTime, sessionId? |
| getAnswers | 특정 문제 답변 통계 | questionId, sessionId? |
| getGameState | 게임 상태 조회 | - |
| updateGameState | 게임 상태 업데이트 | state, currentQuestionIndex, maxTimer, sessionId? |
| resetGame | 게임 리셋 | - |

---

## 6. 실시간 동기화 (폴링)

### 6.1 폴링 주기 (현재 구현)
- 로비 참가자 목록: 3초
- 진행 중 참가자 목록: 1초
- 학생 게임 상태: 200ms
- 응답 통계: 500ms
- 학생 타이머 보정: 250ms

### 6.2 타이머 동기화
- 선생님이 갱신한 `updatedAt` 기준으로 학생 타이머 계산

---

## 7. 오디오 시스템

### 7.1 효과음
- Tone.js로 합성된 효과음 (정답/오답/틱/클릭 등)

### 7.2 BGM
- `/assets/bgm.mp3` 로드 후 반복 재생
- 로비 상태에서만 재생

---

## 8. 환경 변수

```
VITE_GOOGLE_SCRIPT_URL=Google Apps Script Web App URL
VITE_TEACHER_PASSWORD=선생님 비밀번호 (기본값: teacher123)
```

---

## 9. 배포

```bash
npm install
npm run build
npm run preview
```

---

## 10. 테스트

- 자동 테스트는 구성되어 있지 않음
- 수동 테스트: 교사용/학생용 브라우저 분리로 동시 접속 확인

---

## 11. 버전 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 2.0 | 2025-01-06 | - | 현재 코드 기준 최신화 |
