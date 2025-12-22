// ===================================
// Smart Class Quiz - Timer Hook
// ===================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialTime: number;
  autoStart?: boolean;
  onComplete?: () => void;
  onTick?: (time: number) => void;
}

interface UseTimerReturn {
  time: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newTime?: number) => void;
  elapsedTime: number;
}

/**
 * 카운트다운 타이머 훅
 */
export function useTimer({
  initialTime,
  autoStart = false,
  onComplete,
  onTick,
}: UseTimerOptions): UseTimerReturn {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // 타이머 시작
  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, []);

  // 타이머 일시정지
  const pause = useCallback(() => {
    if (isRunning) {
      elapsedRef.current += (Date.now() - startTimeRef.current) / 1000;
    }
    setIsRunning(false);
  }, [isRunning]);

  // 타이머 리셋
  const reset = useCallback((newTime?: number) => {
    setTime(newTime ?? initialTime);
    setIsRunning(false);
    startTimeRef.current = 0;
    elapsedRef.current = 0;
  }, [initialTime]);

  // 타이머 효과
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning && time > 0) {
      intervalId = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime - 1;
          onTick?.(newTime);

          if (newTime <= 0) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, time, onComplete, onTick]);

  // 경과 시간 계산
  const elapsedTime = isRunning
    ? elapsedRef.current + (Date.now() - startTimeRef.current) / 1000
    : elapsedRef.current;

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    elapsedTime: Math.round(elapsedTime * 10) / 10, // 소수점 1자리
  };
}

/**
 * 카운트다운 훅 (3, 2, 1, GO!)
 */
export function useCountdown(
  duration: number = 3,
  onComplete?: () => void
): {
  count: number;
  isActive: boolean;
  start: () => void;
} {
  const [count, setCount] = useState(duration);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(() => {
    setCount(duration);
    setIsActive(true);
  }, [duration]);

  useEffect(() => {
    if (!isActive) return;

    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // count가 0이 되면 잠시 후 완료 콜백
      const timer = setTimeout(() => {
        setIsActive(false);
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [count, isActive, onComplete]);

  return { count, isActive, start };
}
