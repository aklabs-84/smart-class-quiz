// ===================================
// Smart Class Quiz - Game State Hook
// ===================================

import { useState, useCallback, useEffect } from 'react';
import { GameState, Participant, Question, Answer } from '../types';
import { GAME_CONFIG, AUTH_CONFIG, STORAGE_KEYS } from '../utils/constants';
import { calculateScore } from '../utils/scoring';
import {
  MOCK_QUESTIONS,
  MOCK_PARTICIPANTS,
  addMockParticipant,
  submitMockAnswer,
  getParticipants as fetchParticipants,
  addParticipant as apiAddParticipant,
  getQuestions as fetchQuestions,
  submitAnswer as apiSubmitAnswer,
  getGameState as fetchGameState,
  updateGameState as apiUpdateGameState,
  resetGame as apiResetGame,
} from '../services/googleSheetsApi';
import { API_CONFIG } from '../utils/constants';

interface UseGameStateReturn {
  // 상태
  gameState: GameState;
  participants: Participant[];
  questions: Question[];
  currentQuestionIndex: number;
  timer: number;
  maxTimer: number;
  isTeacher: boolean;
  studentInfo: Participant | null;
  isLoading: boolean;
  error: string | null;

  // 액션
  setGameState: (state: GameState) => void;
  setMaxTimer: (time: number) => void;
  joinGame: (name: string) => Promise<boolean>;
  submitAnswer: (answerIndex: number) => Promise<void>;
  startGame: () => void;
  nextQuestion: () => void;
  resetGame: () => void;
  authenticateTeacher: (password: string) => boolean;
  logoutTeacher: () => void;
  refreshParticipants: () => Promise<void>;
}

/**
 * 게임 상태 관리 훅
 */
export function useGameState(): UseGameStateReturn {
  // 핵심 상태
  const [gameState, setGameStateInternal] = useState<GameState>('LOBBY');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(GAME_CONFIG.DEFAULT_TIMER);
  const [maxTimer, setMaxTimer] = useState(GAME_CONFIG.DEFAULT_TIMER);

  // 사용자 상태
  const [isTeacher, setIsTeacher] = useState(false);
  const [studentInfo, setStudentInfo] = useState<Participant | null>(null);

  // UI 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 타이머 시작 시간 추적 (응답 시간 계산용)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // API 사용 여부
  const useApi = Boolean(API_CONFIG.BASE_URL);

  // 게임 상태 변경
  const setGameState = useCallback((state: GameState) => {
    setGameStateInternal(state);
    if (useApi) {
      apiUpdateGameState(state, currentQuestionIndex, maxTimer);
    }
  }, [useApi, currentQuestionIndex, maxTimer]);

  // 선생님 인증
  const authenticateTeacher = useCallback((password: string): boolean => {
    const isValid = password === AUTH_CONFIG.TEACHER_PASSWORD;
    if (isValid) {
      setIsTeacher(true);
      sessionStorage.setItem(STORAGE_KEYS.TEACHER_AUTH, 'true');
    }
    return isValid;
  }, []);

  // 선생님 로그아웃
  const logoutTeacher = useCallback(() => {
    setIsTeacher(false);
    sessionStorage.removeItem(STORAGE_KEYS.TEACHER_AUTH);
  }, []);

  // 참가자 새로고침
  const refreshParticipants = useCallback(async () => {
    if (useApi) {
      const result = await fetchParticipants();
      if (result.success && result.data) {
        setParticipants(result.data.map(p => ({
          ...p,
          joinedAt: new Date(p.joinedAt),
          answers: [],
        })));
      }
    } else {
      setParticipants([...MOCK_PARTICIPANTS]);
    }
  }, [useApi]);

  // 게임 참여
  const joinGame = useCallback(async (name: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      let participant: Participant;

      if (useApi) {
        const result = await apiAddParticipant(name);
        if (!result.success || !result.data) {
          setError(result.error || '참가 실패');
          return false;
        }
        participant = {
          ...result.data,
          joinedAt: new Date(result.data.joinedAt),
          answers: [],
        };
      } else {
        participant = addMockParticipant(name);
      }

      setStudentInfo(participant);
      setParticipants(prev => [...prev, participant]);

      // 로컬 스토리지에 저장
      localStorage.setItem(STORAGE_KEYS.STUDENT_INFO, JSON.stringify(participant));

      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [useApi]);

  // 답변 제출
  const submitAnswer = useCallback(async (answerIndex: number) => {
    if (!studentInfo) return;

    const responseTime = (Date.now() - questionStartTime) / 1000;
    const question = questions[currentQuestionIndex];

    if (useApi) {
      const result = await apiSubmitAnswer(
        studentInfo.id,
        question.id,
        answerIndex,
        responseTime
      );

      if (result.success && result.data) {
        const { isCorrect, score } = result.data;

        setStudentInfo(prev => prev ? {
          ...prev,
          score: prev.score + score,
          lastAnswer: answerIndex,
          isCorrect,
          answers: [...prev.answers, {
            questionId: question.id,
            selectedOption: answerIndex,
            responseTime,
            isCorrect,
            score,
          }],
        } : null);

        setParticipants(prev => prev.map(p =>
          p.id === studentInfo.id
            ? { ...p, score: p.score + score, lastAnswer: answerIndex, isCorrect }
            : p
        ));
      }
    } else {
      const { isCorrect, score } = submitMockAnswer(
        studentInfo.id,
        question.id,
        answerIndex,
        responseTime,
        maxTimer
      );

      setStudentInfo(prev => prev ? {
        ...prev,
        score: prev.score + score,
        lastAnswer: answerIndex,
        isCorrect,
        answers: [...prev.answers, {
          questionId: question.id,
          selectedOption: answerIndex,
          responseTime,
          isCorrect,
          score,
        }],
      } : null);

      setParticipants([...MOCK_PARTICIPANTS]);
    }
  }, [studentInfo, questionStartTime, questions, currentQuestionIndex, useApi, maxTimer]);

  // 게임 시작
  const startGame = useCallback(() => {
    setGameState('COUNTDOWN');
    setQuestionStartTime(Date.now() + 3500); // 카운트다운 후 시작
  }, [setGameState]);

  // 다음 문제
  const nextQuestion = useCallback(() => {
    // 현재 문제 답변 상태 초기화
    setParticipants(prev => prev.map(p => ({
      ...p,
      lastAnswer: undefined,
      isCorrect: undefined,
    })));

    if (studentInfo) {
      setStudentInfo(prev => prev ? {
        ...prev,
        lastAnswer: undefined,
        isCorrect: undefined,
      } : null);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setGameState('COUNTDOWN');
      setQuestionStartTime(Date.now() + 3500);
    } else {
      setGameState('FINAL');
    }
  }, [currentQuestionIndex, questions.length, setGameState, studentInfo]);

  // 게임 리셋
  const resetGame = useCallback(() => {
    if (useApi) {
      apiResetGame();
    }

    setGameStateInternal('LOBBY');
    setCurrentQuestionIndex(0);
    setTimer(maxTimer);
    setParticipants([]);
    setStudentInfo(null);

    // MOCK 데이터 초기화
    MOCK_PARTICIPANTS.length = 0;

    localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
  }, [useApi, maxTimer]);

  // 타이머 효과
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameState === 'QUIZ' && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (gameState === 'QUIZ' && timer === 0) {
      setGameStateInternal('RANKING');
    }

    return () => clearInterval(interval);
  }, [gameState, timer]);

  // 카운트다운 → 퀴즈 전환
  useEffect(() => {
    if (gameState === 'COUNTDOWN') {
      const timeout = setTimeout(() => {
        setGameStateInternal('QUIZ');
        setTimer(maxTimer);
        setQuestionStartTime(Date.now());
      }, 3500);

      return () => clearTimeout(timeout);
    }
  }, [gameState, maxTimer]);

  // 초기 로드: 선생님 인증 상태 복원
  useEffect(() => {
    const isAuth = sessionStorage.getItem(STORAGE_KEYS.TEACHER_AUTH) === 'true';
    setIsTeacher(isAuth);
  }, []);

  // 초기 로드: 문제 가져오기
  useEffect(() => {
    async function loadQuestions() {
      if (useApi) {
        const result = await fetchQuestions();
        if (result.success && result.data && result.data.length > 0) {
          setQuestions(result.data);
        }
      }
    }
    loadQuestions();
  }, [useApi]);

  return {
    gameState,
    participants,
    questions,
    currentQuestionIndex,
    timer,
    maxTimer,
    isTeacher,
    studentInfo,
    isLoading,
    error,

    setGameState,
    setMaxTimer,
    joinGame,
    submitAnswer,
    startGame,
    nextQuestion,
    resetGame,
    authenticateTeacher,
    logoutTeacher,
    refreshParticipants,
  };
}
