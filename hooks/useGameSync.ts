// ===================================
// Smart Class Quiz - Game Sync Hook
// ===================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Participant } from '../types';
import { API_CONFIG } from '../utils/constants';
import {
  getParticipants,
  getGameState,
} from '../services/googleSheetsApi';

interface GameSyncState {
  state: GameState;
  currentQuestionIndex: number;
  maxTimer: number;
}

interface UseGameSyncReturn {
  participants: Participant[];
  gameState: GameSyncState | null;
  isConnected: boolean;
  lastSync: Date | null;
  error: string | null;
  forceSync: () => Promise<void>;
}

/**
 * 실시간 게임 동기화 훅 (폴링 방식)
 */
export function useGameSync(
  enabled: boolean = true,
  currentState: GameState = 'LOBBY'
): UseGameSyncReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [gameState, setGameState] = useState<GameSyncState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // 동기화 간격 결정
  const getPollInterval = useCallback(() => {
    switch (currentState) {
      case 'LOBBY':
        return API_CONFIG.POLL_INTERVAL_LOBBY;
      case 'QUIZ':
        return API_CONFIG.POLL_INTERVAL_QUIZ;
      case 'RESULT':
      case 'RANKING':
        return API_CONFIG.POLL_INTERVAL_RESULT;
      default:
        return API_CONFIG.POLL_INTERVAL;
    }
  }, [currentState]);

  // 동기화 실행
  const sync = useCallback(async () => {
    if (!API_CONFIG.BASE_URL) {
      // API URL이 없으면 연결 안됨 상태
      setIsConnected(false);
      return;
    }

    try {
      const [participantsResult, stateResult] = await Promise.all([
        getParticipants(),
        getGameState(),
      ]);

      if (!isMountedRef.current) return;

      if (participantsResult.success && participantsResult.data) {
        setParticipants(participantsResult.data.map(p => ({
          ...p,
          joinedAt: new Date(p.joinedAt),
          answers: [],
        })));
      }

      if (stateResult.success && stateResult.data) {
        setGameState(stateResult.data);
      }

      setIsConnected(true);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setError(String(err));
    }
  }, []);

  // 강제 동기화
  const forceSync = useCallback(async () => {
    await sync();
  }, [sync]);

  // 폴링 효과
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !API_CONFIG.BASE_URL) {
      return;
    }

    // 초기 동기화
    sync();

    // 폴링 시작
    const interval = setInterval(() => {
      sync();
    }, getPollInterval());

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [enabled, sync, getPollInterval]);

  return {
    participants,
    gameState,
    isConnected,
    lastSync,
    error,
    forceSync,
  };
}

/**
 * 학생 화면용 게임 상태 동기화 훅
 * 선생님이 게임 상태를 변경하면 학생도 자동으로 반영
 */
export function useStudentSync(
  enabled: boolean = true,
  onStateChange?: (newState: GameState) => void
): {
  currentState: GameState;
  currentQuestionIndex: number;
  isConnected: boolean;
} {
  const [currentState, setCurrentState] = useState<GameState>('LOBBY');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const previousStateRef = useRef<GameState>('LOBBY');

  useEffect(() => {
    if (!enabled || !API_CONFIG.BASE_URL) {
      return;
    }

    const sync = async () => {
      try {
        const result = await getGameState();
        if (result.success && result.data) {
          const newState = result.data.state;

          // 상태가 변경되었을 때만 콜백 호출
          if (newState !== previousStateRef.current) {
            previousStateRef.current = newState;
            setCurrentState(newState);
            onStateChange?.(newState);
          }

          setCurrentQuestionIndex(result.data.currentQuestionIndex);
          setIsConnected(true);
        }
      } catch {
        setIsConnected(false);
      }
    };

    sync();
    const interval = setInterval(sync, API_CONFIG.POLL_INTERVAL_QUIZ);

    return () => clearInterval(interval);
  }, [enabled, onStateChange]);

  return {
    currentState,
    currentQuestionIndex,
    isConnected,
  };
}
