// ===================================
// Smart Class Quiz - Type Definitions
// ===================================

// 게임 상태 타입
export type GameState =
  | 'WAITING'    // 선생님 로그인 대기
  | 'LOBBY'      // 학생 참여 대기
  | 'COUNTDOWN'  // 3,2,1 카운트다운
  | 'QUIZ'       // 문제 풀이 중
  | 'RESULT'     // 문제별 결과 (선택 통계)
  | 'RANKING'    // 중간 순위
  | 'FINAL';     // 최종 결과

// 참가자 정보
export interface Participant {
  id: string;
  name: string;
  score: number;
  joinedAt: Date;
  answers: Answer[];
  lastAnswer?: number;
  isCorrect?: boolean;
  rank?: number;
  previousRank?: number;
  sessionId?: string;
}

// 답변 정보
export interface Answer {
  participantId?: string;
  questionId: number;
  selectedOption: number;
  responseTime: number;  // 응답에 걸린 시간 (초)
  isCorrect: boolean;
  score: number;
  sessionId?: string;
  answeredAt?: string;
}

// 문제 정보
export interface Question {
  id: number;
  text: string;
  options: [string, string, string, string];  // 항상 4개
  correctAnswer: number;  // 0-3
  timeLimit: number;      // 초 단위
}

// 게임 컨텍스트 (전체 상태)
export interface GameContext {
  state: GameState;
  participants: Participant[];
  questions: Question[];
  currentQuestionIndex: number;
  timer: number;
  maxTimer: number;
  isTeacher: boolean;
  gamePin: string;
}

// 선택지별 통계
export interface OptionStats {
  optionIndex: number;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Google Sheets 동기화 액션
export type SyncAction =
  | 'GET_PARTICIPANTS'
  | 'ADD_PARTICIPANT'
  | 'GET_QUESTIONS'
  | 'SUBMIT_ANSWER'
  | 'GET_GAME_STATE'
  | 'UPDATE_GAME_STATE'
  | 'START_GAME'
  | 'RESET_GAME';

// 타이머 옵션
export const TIMER_OPTIONS = [10, 15, 20, 30] as const;
export type TimerOption = typeof TIMER_OPTIONS[number];

// 선택지 색상
export const OPTION_COLORS = [
  'bg-red-500 hover:bg-red-600',      // A
  'bg-blue-500 hover:bg-blue-600',    // B
  'bg-yellow-500 hover:bg-yellow-600', // C
  'bg-green-500 hover:bg-green-600'   // D
] as const;

// 선택지 라벨
export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
