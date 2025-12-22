# TRD (Technical Requirements Document)
# Smart Class Quiz - 기술 요구사항 문서

## 1. 시스템 아키텍처

### 1.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트 (브라우저)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  React App  │  │   Vite      │  │  Tailwind   │              │
│  │  TypeScript │  │   Dev/Build │  │  CSS        │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Apps Script (백엔드)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Web App (doGet/doPost)                                 │    │
│  │  - 참가자 관리 API                                       │    │
│  │  - 문제 조회 API                                         │    │
│  │  - 답변 저장 API                                         │    │
│  │  - 게임 상태 관리 API                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Google Sheets (데이터베이스)                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ 참가자    │  │ 문제      │  │ 문제선택  │  │ 게임상태  │    │
│  │ 시트      │  │ 시트      │  │ 시트      │  │ 시트      │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 선택 이유

| 기술 | 선택 이유 |
|------|-----------|
| **React** | 컴포넌트 기반 UI, 상태 관리 용이, 대규모 커뮤니티 |
| **TypeScript** | 타입 안전성, 개발 생산성 향상, 버그 사전 방지 |
| **Vite** | 빠른 개발 서버, HMR 지원, 최적화된 빌드 |
| **Tailwind CSS** | 유틸리티 기반 빠른 스타일링, 반응형 디자인 용이 |
| **Framer Motion** | 선언적 애니메이션, React 최적화 |
| **Google Apps Script** | 무료, 서버리스, Google Sheets 직접 연동 |
| **Google Sheets** | 무료 데이터베이스, 실시간 협업, 쉬운 데이터 관리 |

---

## 2. 프론트엔드 기술 스택

### 2.1 핵심 기술

```json
{
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "framer-motion": "^12.23.26",
    "lucide-react": "^0.562.0"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vite": "^6.2.0",
    "@vitejs/plugin-react": "^4.4.1"
  }
}
```

### 2.2 폴더 구조

```
src/
├── index.tsx              # 앱 진입점
├── App.tsx                # 메인 앱 컴포넌트
├── types.ts               # TypeScript 타입 정의
├── components/
│   ├── JoinView.tsx       # 이름 입력 화면
│   ├── LobbyView.tsx      # 대기 화면
│   ├── CountdownView.tsx  # 카운트다운 화면
│   ├── QuizView.tsx       # 퀴즈 화면
│   ├── RankingView.tsx    # 결과/순위 화면
│   ├── FinalView.tsx      # 최종 결과 화면
│   ├── TeacherLogin.tsx   # 선생님 로그인
│   └── TeacherControls.tsx# 선생님 제어판
├── hooks/
│   ├── useGameState.ts    # 게임 상태 관리
│   ├── useGoogleSheets.ts # Google Sheets 연동
│   └── useTimer.ts        # 타이머 로직
├── services/
│   ├── googleSheetsApi.ts # Google Sheets API 호출
│   └── audioService.ts    # 효과음 관리
├── utils/
│   ├── scoring.ts         # 점수 계산 로직
│   └── constants.ts       # 상수 정의
└── assets/
    └── sounds/            # 효과음 파일
```

### 2.3 상태 관리

```typescript
// types.ts - 핵심 타입 정의

type GameState =
  | 'WAITING'      // 선생님 로그인 대기
  | 'LOBBY'        // 학생 참여 대기
  | 'COUNTDOWN'    // 3,2,1 카운트다운
  | 'QUIZ'         // 문제 풀이 중
  | 'RESULT'       // 문제별 결과
  | 'RANKING'      // 중간 순위
  | 'FINAL'        // 최종 결과

interface GameContext {
  state: GameState
  participants: Participant[]
  questions: Question[]
  currentQuestionIndex: number
  timer: number
  maxTimer: number
  isTeacher: boolean
}

interface Participant {
  id: string
  name: string
  score: number
  answers: Answer[]
  joinedAt: Date
}

interface Question {
  id: number
  text: string
  options: [string, string, string, string]
  correctAnswer: number  // 0-3
  timeLimit: number      // seconds
}

interface Answer {
  questionId: number
  selectedOption: number
  responseTime: number
  isCorrect: boolean
  score: number
}
```

---

## 3. 백엔드 (Google Apps Script)

### 3.1 Web App 구조

```javascript
// Code.gs - Google Apps Script

// 스프레드시트 ID (환경 설정)
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

// 시트 이름
const SHEETS = {
  PARTICIPANTS: '참가자',
  QUESTIONS: '문제',
  ANSWERS: '문제선택',
  GAME_STATE: '게임상태'
};

// CORS 헤더 설정
function setCorsHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// GET 요청 핸들러
function doGet(e) {
  const action = e.parameter.action;
  let result;

  switch(action) {
    case 'getParticipants':
      result = getParticipants();
      break;
    case 'getQuestions':
      result = getQuestions();
      break;
    case 'getGameState':
      result = getGameState();
      break;
    default:
      result = { error: 'Unknown action' };
  }

  return setCorsHeaders(
    ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// POST 요청 핸들러
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  switch(action) {
    case 'addParticipant':
      result = addParticipant(data.name);
      break;
    case 'submitAnswer':
      result = submitAnswer(data);
      break;
    case 'updateGameState':
      result = updateGameState(data.state);
      break;
    case 'startGame':
      result = startGame();
      break;
    default:
      result = { error: 'Unknown action' };
  }

  return setCorsHeaders(
    ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
  );
}
```

### 3.2 API 엔드포인트

| Method | Action | 설명 | 요청 파라미터 | 응답 |
|--------|--------|------|--------------|------|
| GET | getParticipants | 참가자 목록 조회 | - | Participant[] |
| GET | getQuestions | 문제 목록 조회 | - | Question[] |
| GET | getGameState | 게임 상태 조회 | - | GameState |
| POST | addParticipant | 참가자 추가 | name: string | Participant |
| POST | submitAnswer | 답변 제출 | participantId, questionId, answer, time | Answer |
| POST | updateGameState | 게임 상태 변경 | state: GameState | boolean |
| POST | startGame | 게임 시작 | - | boolean |

### 3.3 Google Sheets 데이터 함수

```javascript
// 참가자 추가
function addParticipant(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEETS.PARTICIPANTS);

  const id = Utilities.getUuid();
  const timestamp = new Date();

  sheet.appendRow([id, name, timestamp, 0]);

  return {
    id: id,
    name: name,
    joinedAt: timestamp,
    score: 0
  };
}

// 문제 목록 조회
function getQuestions() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEETS.QUESTIONS);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => ({
    id: row[0],
    text: row[1],
    options: [row[2], row[3], row[4], row[5]],
    correctAnswer: row[6] - 1,  // 1-based to 0-based
    timeLimit: row[7] || 20
  }));
}

// 답변 제출
function submitAnswer(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEETS.ANSWERS);

  const questions = getQuestions();
  const question = questions.find(q => q.id === data.questionId);
  const isCorrect = question.correctAnswer === data.answer;

  // 점수 계산: 정답 시 시간 기반 점수
  const score = isCorrect
    ? Math.floor(1000 * (1 - data.responseTime / question.timeLimit))
    : 0;

  sheet.appendRow([
    data.participantId,
    data.questionId,
    data.answer + 1,  // 0-based to 1-based
    isCorrect ? 'O' : 'X',
    score,
    data.responseTime
  ]);

  // 총점 업데이트
  updateParticipantScore(data.participantId, score);

  return {
    isCorrect: isCorrect,
    score: score,
    correctAnswer: question.correctAnswer
  };
}
```

---

## 4. 실시간 동기화

### 4.1 폴링 전략

```typescript
// hooks/useGameSync.ts

const POLL_INTERVAL = 2000; // 2초마다 폴링

export function useGameSync() {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stateRes, participantsRes] = await Promise.all([
          fetch(`${API_URL}?action=getGameState`),
          fetch(`${API_URL}?action=getParticipants`)
        ]);

        const state = await stateRes.json();
        const participants = await participantsRes.json();

        setGameState(state);
        setParticipants(participants);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return { gameState, participants };
}
```

### 4.2 상태 동기화 흐름

```
선생님 화면                        학생 화면
    │                                │
    │  게임 시작 버튼 클릭            │
    ▼                                │
POST /updateGameState               │
(state: COUNTDOWN)                  │
    │                                │
    ▼                                ▼
Google Sheets                    폴링으로 감지
(게임상태 시트 업데이트)              │
    │                                ▼
    │                           카운트다운 표시
    ▼                                │
모든 클라이언트                      ▼
동시에 상태 변경 감지            문제 화면 표시
```

---

## 5. 점수 계산 로직

### 5.1 점수 공식

```typescript
// utils/scoring.ts

/**
 * 점수 계산
 * - 정답 시: 기본 500점 + 시간 보너스 (최대 500점)
 * - 오답 시: 0점
 *
 * 시간 보너스 = (남은시간 / 제한시간) * 500
 */
export function calculateScore(
  isCorrect: boolean,
  responseTime: number,  // 응답에 걸린 시간 (초)
  timeLimit: number      // 제한 시간 (초)
): number {
  if (!isCorrect) return 0;

  const BASE_SCORE = 500;
  const MAX_BONUS = 500;

  const remainingTime = Math.max(0, timeLimit - responseTime);
  const timeBonus = Math.floor((remainingTime / timeLimit) * MAX_BONUS);

  return BASE_SCORE + timeBonus;
}

// 예시:
// 20초 제한, 5초만에 정답 → 500 + 375 = 875점
// 20초 제한, 15초만에 정답 → 500 + 125 = 625점
// 20초 제한, 오답 → 0점
```

### 5.2 순위 계산

```typescript
export function calculateRankings(
  participants: Participant[]
): RankedParticipant[] {
  return [...participants]
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({
      ...p,
      rank: index + 1
    }));
}
```

---

## 6. 효과음 시스템

### 6.1 오디오 서비스

```typescript
// services/audioService.ts

const SOUNDS = {
  countdown: '/sounds/countdown.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  tick: '/sounds/tick.mp3',
  winner: '/sounds/winner.mp3',
  join: '/sounds/join.mp3'
};

class AudioService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  preload() {
    Object.entries(SOUNDS).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.audioCache.set(key, audio);
    });
  }

  play(soundKey: keyof typeof SOUNDS) {
    const audio = this.audioCache.get(soundKey);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  }
}

export const audioService = new AudioService();
```

### 6.2 무료 효과음 소스

- [Pixabay Sound Effects](https://pixabay.com/sound-effects/) - 무료, 저작권 없음
- [Freesound](https://freesound.org/) - CC 라이선스
- [Mixkit](https://mixkit.co/free-sound-effects/) - 무료

---

## 7. 보안

### 7.1 선생님 인증

```typescript
// 간단한 비밀번호 기반 인증
const TEACHER_PASSWORD = 'teacher123'; // 환경변수로 관리 권장

function authenticateTeacher(password: string): boolean {
  return password === TEACHER_PASSWORD;
}

// 로컬 스토리지에 인증 상태 저장
function setTeacherSession(isAuthenticated: boolean) {
  sessionStorage.setItem('isTeacher', String(isAuthenticated));
}

function isTeacherAuthenticated(): boolean {
  return sessionStorage.getItem('isTeacher') === 'true';
}
```

### 7.2 API 키 보안

```typescript
// .env.local (gitignore에 추가)
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
VITE_TEACHER_PASSWORD=securepassword123

// 환경변수 사용
const API_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
```

---

## 8. 배포

### 8.1 프론트엔드 배포 (Vercel/Netlify)

```bash
# 빌드
npm run build

# Vercel 배포
npx vercel --prod

# 또는 Netlify
npx netlify deploy --prod --dir=dist
```

### 8.2 Google Apps Script 배포

1. Google Sheets 생성 및 시트 구조 설정
2. Extensions > Apps Script 열기
3. Code.gs 코드 붙여넣기
4. Deploy > New deployment
5. Web app으로 배포
6. 접근 권한: "Anyone" 설정
7. 배포 URL 복사하여 프론트엔드 환경변수에 설정

### 8.3 CORS 설정

Google Apps Script에서 CORS 허용:
```javascript
function setCorsHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

---

## 9. 성능 최적화

### 9.1 프론트엔드 최적화

- **코드 스플리팅**: React.lazy()로 컴포넌트 지연 로딩
- **메모이제이션**: useMemo, useCallback 활용
- **이미지 최적화**: WebP 포맷, lazy loading
- **번들 크기**: 트리쉐이킹, 압축

### 9.2 API 최적화

- **배치 요청**: 여러 API 호출 병합
- **캐싱**: 문제 목록 등 정적 데이터 캐싱
- **폴링 간격 조정**: 상태에 따라 동적 조절
  - 로비: 3초
  - 퀴즈 진행 중: 1초
  - 결과 화면: 5초

---

## 10. 테스트 전략

### 10.1 단위 테스트

```typescript
// scoring.test.ts
import { calculateScore } from './scoring';

describe('calculateScore', () => {
  it('returns 0 for incorrect answers', () => {
    expect(calculateScore(false, 5, 20)).toBe(0);
  });

  it('returns maximum score for instant correct answer', () => {
    expect(calculateScore(true, 0, 20)).toBe(1000);
  });

  it('returns base score for last-second correct answer', () => {
    expect(calculateScore(true, 20, 20)).toBe(500);
  });
});
```

### 10.2 통합 테스트

- Google Sheets API 연동 테스트
- 게임 플로우 E2E 테스트
- 다중 사용자 동시 접속 테스트

---

## 11. 모니터링

### 11.1 에러 추적

```typescript
// 에러 경계 컴포넌트
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
    // 에러 로깅 서비스로 전송 (선택적)
  }
}
```

### 11.2 로깅

```typescript
// 게임 이벤트 로깅
function logGameEvent(event: string, data: any) {
  console.log(`[GameEvent] ${event}:`, data);
  // Google Analytics 등으로 전송 가능
}
```

---

## 12. 버전 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2024-12-22 | - | 최초 작성 |
