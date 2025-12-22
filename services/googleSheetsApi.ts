// ===================================
// Smart Class Quiz - Google Sheets API Service
// ===================================

import { Participant, Question, GameState, ApiResponse, Answer } from '../types';
import { API_CONFIG } from '../utils/constants';

const API_URL = API_CONFIG.BASE_URL;

/**
 * API 요청 헬퍼 함수 (GET only - CORS 우회)
 * Google Apps Script는 CORS 문제로 POST가 어려워서 GET으로 통일
 */
async function apiRequest<T>(
  action: string,
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    if (!API_URL) {
      console.warn('Google Sheets API URL이 설정되지 않았습니다. Mock 데이터를 사용합니다.');
      return { success: false, error: 'API URL not configured' };
    }

    // 모든 파라미터를 URL 쿼리스트링으로 변환
    const queryParams = new URLSearchParams({ action });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    // 캐시 우회: 동일 URL 응답이 브라우저 캐시에 묶이는 것을 방지
    queryParams.append('_ts', String(Date.now()));

    const url = `${API_URL}?${queryParams.toString()}`;
    console.log('🌐 API Request:', url);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow', // Google Apps Script 리다이렉트 처리
      cache: 'no-store',
    });

    const result = await response.json();
    console.log('📥 API Response:', result);

    return result;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    return { success: false, error: String(error) };
  }
}

// ===================================
// 참가자 관련 API
// ===================================

/**
 * 모든 참가자 조회
 */
export async function getParticipants(sessionId?: string): Promise<ApiResponse<Participant[]>> {
  return apiRequest<Participant[]>('getParticipants', sessionId ? { sessionId } : undefined);
}

/**
 * 참가자 추가
 */
export async function addParticipant(name: string, sessionId?: string): Promise<ApiResponse<Participant>> {
  return apiRequest<Participant>('addParticipant', sessionId ? { name, sessionId } : { name });
}

// ===================================
// 문제 관련 API
// ===================================

/**
 * 모든 문제 조회
 */
export async function getQuestions(): Promise<ApiResponse<Question[]>> {
  return apiRequest<Question[]>('getQuestions');
}

// ===================================
// 답변 관련 API
// ===================================

/**
 * 답변 제출
 */
export async function submitAnswer(
  participantId: string,
  questionId: number,
  selectedAnswer: number,
  responseTime: number,
  sessionId?: string
): Promise<ApiResponse<{ isCorrect: boolean; score: number; correctAnswer: number }>> {
  return apiRequest('submitAnswer', {
    participantId,
    questionId,
    selectedAnswer,
    responseTime,
    ...(sessionId ? { sessionId } : {}),
  });
}

/**
 * 특정 문제의 답변 통계 조회
 */
export async function getAnswerStats(
  questionId: number,
  sessionId?: string
): Promise<ApiResponse<Answer[]>> {
  const result = await apiRequest<Answer[]>(
    'getAnswers',
    sessionId ? { questionId, sessionId } : { questionId }
  );

  if (result.success && result.data) {
    const normalized = result.data.map((answer: any) => ({
      ...answer,
      selectedOption: answer.selectedOption ?? answer.selectedAnswer,
    }));
    return { ...result, data: normalized };
  }

  return result;
}

// ===================================
// 게임 상태 관련 API
// ===================================

interface GameStateData {
  state: GameState;
  currentQuestionIndex: number;
  maxTimer: number;
  updatedAt?: string;
  sessionId?: string;
}

/**
 * 게임 상태 조회
 */
export async function getGameState(): Promise<ApiResponse<GameStateData>> {
  return apiRequest<GameStateData>('getGameState');
}

/**
 * 게임 상태 업데이트
 */
export async function updateGameState(
  state: GameState,
  currentQuestionIndex: number,
  maxTimer: number,
  sessionId?: string
): Promise<ApiResponse<void>> {
  return apiRequest('updateGameState', {
    state,
    currentQuestionIndex,
    maxTimer,
    ...(sessionId ? { sessionId } : {}),
  });
}

/**
 * 게임 리셋 (참가자, 답변 초기화)
 */
export async function resetGame(): Promise<ApiResponse<void>> {
  return apiRequest('resetGame');
}

// ===================================
// Mock 데이터 (API 연동 전 테스트용)
// ===================================

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    text: '대한민국의 수도는 어디인가요?',
    options: ['부산', '대구', '서울', '광주'],
    correctAnswer: 2,
    timeLimit: 20,
  },
  {
    id: 2,
    text: 'React의 창시자는?',
    options: ['Google', 'Meta (Facebook)', 'Microsoft', 'Apple'],
    correctAnswer: 1,
    timeLimit: 20,
  },
  {
    id: 3,
    text: '다음 중 프로그래밍 언어가 아닌 것은?',
    options: ['Python', 'Java', 'HTML', 'C++'],
    correctAnswer: 2,
    timeLimit: 15,
  },
  {
    id: 4,
    text: '세계에서 가장 높은 산은?',
    options: ['백두산', '에베레스트', '후지산', 'K2'],
    correctAnswer: 1,
    timeLimit: 15,
  },
  {
    id: 5,
    text: '1 + 1 = ?',
    options: ['1', '2', '3', '11'],
    correctAnswer: 1,
    timeLimit: 10,
  },
];

export const MOCK_PARTICIPANTS: Participant[] = [];

/**
 * Mock 참가자 추가 (API 미연동 시)
 */
export function addMockParticipant(name: string): Participant {
  const participant: Participant = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    score: 0,
    joinedAt: new Date(),
    answers: [],
  };
  MOCK_PARTICIPANTS.push(participant);
  return participant;
}

/**
 * Mock 답변 처리 (API 미연동 시)
 */
export function submitMockAnswer(
  participantId: string,
  questionId: number,
  selectedAnswer: number,
  responseTime: number,
  timeLimit: number
): { isCorrect: boolean; score: number } {
  const question = MOCK_QUESTIONS.find(q => q.id === questionId);
  if (!question) return { isCorrect: false, score: 0 };

  const isCorrect = selectedAnswer === question.correctAnswer;
  const BASE_SCORE = 500;
  const MAX_BONUS = 500;
  const score = isCorrect
    ? BASE_SCORE + Math.floor((1 - responseTime / timeLimit) * MAX_BONUS)
    : 0;

  const participant = MOCK_PARTICIPANTS.find(p => p.id === participantId);
  if (participant) {
    participant.score += score;
    participant.lastAnswer = selectedAnswer;
    participant.isCorrect = isCorrect;
    participant.answers.push({
      questionId,
      selectedOption: selectedAnswer,
      responseTime,
      isCorrect,
      score,
    });
  }

  return { isCorrect, score };
}
