// ===================================
// Smart Class Quiz - Constants
// ===================================

// API 설정
export const API_CONFIG = {
  // Google Apps Script Web App URL (환경변수에서 가져옴)
  BASE_URL: import.meta.env.VITE_GOOGLE_SCRIPT_URL || '',
  POLL_INTERVAL: 2000,  // 폴링 간격 (ms)
  POLL_INTERVAL_LOBBY: 3000,  // 로비 폴링 간격
  POLL_INTERVAL_QUIZ: 1000,   // 퀴즈 중 폴링 간격
  POLL_INTERVAL_RESULT: 5000, // 결과 화면 폴링 간격
};

// 게임 설정
export const GAME_CONFIG = {
  DEFAULT_TIMER: 20,           // 기본 제한 시간 (초)
  COUNTDOWN_DURATION: 3,       // 카운트다운 시간 (초)
  MIN_PARTICIPANTS: 1,         // 최소 참가자 수
  MAX_PARTICIPANTS: 50,        // 최대 참가자 수
  GAME_PIN: '123 456',         // 게임 PIN 코드
};

// 점수 설정
export const SCORE_CONFIG = {
  BASE_SCORE: 500,      // 정답 기본 점수
  MAX_BONUS: 500,       // 시간 보너스 최대 점수
  WRONG_SCORE: 0,       // 오답 점수
};

// UI 설정
export const UI_CONFIG = {
  RANKING_TOP_COUNT: 5,        // 순위 표시 인원 수
  ANIMATION_DURATION: 0.3,     // 기본 애니메이션 시간 (초)
  TOAST_DURATION: 3000,        // 토스트 메시지 표시 시간 (ms)
};

// 선생님 인증
export const AUTH_CONFIG = {
  TEACHER_PASSWORD: import.meta.env.VITE_TEACHER_PASSWORD || 'teacher123',
  SESSION_KEY: 'smartquiz_teacher_auth',
};

// 효과음 경로
export const SOUND_PATHS = {
  countdown: '/sounds/countdown.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  tick: '/sounds/tick.mp3',
  winner: '/sounds/winner.mp3',
  join: '/sounds/join.mp3',
  click: '/sounds/click.mp3',
};

// 색상 테마
export const COLORS = {
  primary: '#46178f',      // 메인 보라색
  secondary: '#864cbf',    // 보조 보라색
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  optionA: '#e21b3c',      // 빨강
  optionB: '#1368ce',      // 파랑
  optionC: '#d89e00',      // 노랑
  optionD: '#26890c',      // 초록
  correct: '#4ade80',      // 정답 (연두)
  wrong: '#f87171',        // 오답 (빨강)
  gold: '#fbbf24',         // 1등
  silver: '#9ca3af',       // 2등
  bronze: '#d97706',       // 3등
};

// 애니메이션 variants (Framer Motion)
export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scale: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
  bounce: {
    initial: { scale: 0 },
    animate: {
      scale: [0, 1.2, 1],
      transition: { duration: 0.5 }
    },
  },
  countdownNumber: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1.5, opacity: 1 },
    exit: { scale: 2, opacity: 0 },
  },
};

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  STUDENT_INFO: 'smartquiz_student_info',
  TEACHER_AUTH: 'smartquiz_teacher_auth',
  GAME_STATE: 'smartquiz_game_state',
};
