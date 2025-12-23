// ===================================
// Smart Class Quiz - Main Application
// ===================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Trophy, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

// Types
import { Answer, GameState, Participant, Question } from './types';

// Components
import LobbyView from './components/LobbyView';
import QuizView from './components/QuizView';
import TeacherControls from './components/TeacherControls';
import RankingView from './components/RankingView';
import FinalView from './components/FinalView';
import JoinView from './components/JoinView';
import TeacherLogin from './components/TeacherLogin';
import CountdownView from './components/CountdownView';
import ResultView from './components/ResultView';

// Services & Utils
import {
  MOCK_QUESTIONS,
  addMockParticipant,
  submitMockAnswer,
  MOCK_PARTICIPANTS,
  getParticipants,
  addParticipant,
  getQuestions,
  submitAnswer,
  getAnswerStats,
  updateGameState,
  getGameState,
  resetGame,
} from './services/googleSheetsApi';
import { AUTH_CONFIG, API_CONFIG, STORAGE_KEYS } from './utils/constants';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  // 뷰 상태
  const [view, setView] = useState<'SELECT' | 'TEACHER_LOGIN' | 'TEACHER' | 'STUDENT'>('SELECT');

  // 게임 상태
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(20);
  const [maxTimer, setMaxTimer] = useState(20);
  const [gameStateUpdatedAt, setGameStateUpdatedAt] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerStats, setAnswerStats] = useState<Answer[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teacherCountdownActive, setTeacherCountdownActive] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [hasAutoReset, setHasAutoReset] = useState(false);

  // 사용자 상태
  const [isTeacher, setIsTeacher] = useState(false);
  const [studentInfo, setStudentInfo] = useState<Participant | null>(null);

  // 타이머 시작 시간 (응답 시간 계산용)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // API 연결 상태
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // API 사용 여부
  const useApi = Boolean(API_CONFIG.BASE_URL);
  const currentQuestion = questions[currentQuestionIndex];

  // 효과음 초기화
  useEffect(() => {
    audioService.preload();
  }, []);

  // 첫 사용자 제스처에서 오디오 시작
  useEffect(() => {
    const handleGesture = () => {
      audioService.ensureStarted().then(() => {
        setAudioReady(true);
      });
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };

    window.addEventListener('pointerdown', handleGesture);
    window.addEventListener('keydown', handleGesture);

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  const handleToggleBgm = useCallback(async () => {
    await audioService.ensureStarted();
    setAudioReady(true);
    setBgmEnabled(prev => !prev);
  }, []);

  // BGM 제어 (대기 화면)
  useEffect(() => {
    const shouldPlay =
      bgmEnabled && gameState === 'LOBBY' && (view === 'STUDENT' || view === 'TEACHER');

    if (shouldPlay) {
      if (audioReady) {
        audioService.playBgm();
      }
    } else {
      audioService.stopBgm();
    }
  }, [view, gameState, audioReady, bgmEnabled]);

  // 선생님 입장 시 세션 동기화 (참가자가 있으면 유지, 없으면 초기화)
  useEffect(() => {
    if (!useApi || view !== 'TEACHER' || gameState !== 'LOBBY' || hasAutoReset) return;

    const syncTeacherSession = async () => {
      const existingParticipants = await getParticipants();
      if (existingParticipants.success && existingParticipants.data && existingParticipants.data.length > 0) {
        const latestParticipant = existingParticipants.data[existingParticipants.data.length - 1];
        const activeSessionId = latestParticipant.sessionId || null;
        if (activeSessionId) {
          setSessionId(prev => (prev !== activeSessionId ? activeSessionId : prev));
          await updateGameState('LOBBY', 0, maxTimer, activeSessionId);
        }
        setHasAutoReset(true);
        return;
      }

      await resetGame();
      const refreshedState = await getGameState();
      if (refreshedState.success && refreshedState.data?.sessionId) {
        setSessionId(refreshedState.data.sessionId);
      }
      setParticipants([]);
      setCurrentQuestionIndex(0);
      setGameState('LOBBY');
      setHasAutoReset(true);
    };

    syncTeacherSession();
  }, [useApi, view, gameState, hasAutoReset, maxTimer]);

  const ensureSessionId = useCallback(async () => {
    if (!useApi) return null;

    const result = await getGameState();
    if (result.success && result.data?.sessionId) {
      const {
        sessionId: loadedSessionId,
        state,
        currentQuestionIndex: loadedQuestionIndex,
        maxTimer: loadedMaxTimer,
        updatedAt,
      } = result.data;

      setSessionId(prev => (prev !== loadedSessionId ? loadedSessionId : prev));

      if (!updatedAt && state === 'LOBBY') {
        await updateGameState(
          state,
          loadedQuestionIndex ?? 0,
          loadedMaxTimer ?? maxTimer,
          loadedSessionId
        );
      }

      return loadedSessionId;
    }

    return null;
  }, [useApi, maxTimer]);

  // 세션 ID 로드
  useEffect(() => {
    if (!useApi || sessionId) return;
    ensureSessionId();
  }, [useApi, sessionId, ensureSessionId]);

  // 문제 로드 (API 또는 Mock)
  useEffect(() => {
    async function loadQuestions() {
      if (useApi) {
        console.log('📚 Loading questions from Google Sheets...');
        const result = await getQuestions();
        if (result.success && result.data && result.data.length > 0) {
          setQuestions(result.data);
          setIsConnected(true);
          console.log('✅ Questions loaded:', result.data.length);
        } else {
          console.warn('⚠️ Failed to load questions, using mock data');
          setIsConnected(false);
        }
      }
    }
    loadQuestions();
  }, [useApi]);

  // 참가자 목록 폴링 (로비에서만)
  useEffect(() => {
    if (!useApi || gameState !== 'LOBBY') return;

    const fetchParticipants = async () => {
      const result = await getParticipants(sessionId || undefined);
      if (result.success && result.data) {
        setParticipants(result.data.map(p => ({
          ...p,
          joinedAt: new Date(p.joinedAt),
          answers: p.answers || [],
        })));
        setIsConnected(true);
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 3000);

    return () => clearInterval(interval);
  }, [useApi, gameState, sessionId]);

  // 참가자 목록 폴링 (진행 중)
  useEffect(() => {
    if (!useApi || view !== 'TEACHER') return;
    if (gameState === 'LOBBY' || gameState === 'FINAL') return;

    const fetchParticipants = async () => {
      const result = await getParticipants(sessionId || undefined);
      if (result.success && result.data) {
        setParticipants(result.data.map(p => ({
          ...p,
          joinedAt: new Date(p.joinedAt),
          answers: p.answers || [],
        })));
        setIsConnected(true);
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 1000);
    return () => clearInterval(interval);
  }, [useApi, view, gameState, sessionId]);

  // 학생 화면: 게임 상태 폴링
  useEffect(() => {
    if (!useApi || view !== 'STUDENT' || !studentInfo) return;

    const syncState = async () => {
      const result = await getGameState();
      if (result.success && result.data) {
        const newState = result.data.state as GameState;
        const newQuestionIndex = result.data.currentQuestionIndex;
        const newMaxTimer = result.data.maxTimer ?? maxTimer;
        const updatedAt = result.data.updatedAt ? new Date(result.data.updatedAt).getTime() : null;
        const newSessionId = result.data.sessionId;

        if (newState !== gameState) {
          console.log('🔄 Game state changed:', newState);
          setGameState(newState);
        }
        if (newQuestionIndex !== currentQuestionIndex) {
          setCurrentQuestionIndex(newQuestionIndex);
        }
        if (newMaxTimer !== maxTimer) {
          setMaxTimer(newMaxTimer);
        }
        if (updatedAt) {
          setGameStateUpdatedAt(updatedAt);
        }
        if (newSessionId) {
          setSessionId(newSessionId);
        }

        if (newState === 'QUIZ' && updatedAt) {
          setQuestionStartTime(updatedAt);
          const elapsed = Math.floor((Date.now() - updatedAt) / 1000);
          setTimer(Math.max(0, newMaxTimer - elapsed));
        }
        if (newState === 'RESULT' && studentInfo?.lastAnswer === undefined) {
          setStudentInfo(prev => prev ? { ...prev, isCorrect: false } : null);
        }
        if (result.success) {
          setIsConnected(true);
        }
      }
    };

    const interval = setInterval(syncState, 200);
    return () => clearInterval(interval);
  }, [useApi, view, studentInfo, gameState, currentQuestionIndex, maxTimer]);

  // 선생님 인증
  const handleTeacherLogin = useCallback((password: string): boolean => {
    audioService.ensureStarted();
    const isValid = password === AUTH_CONFIG.TEACHER_PASSWORD;
    if (isValid) {
      setIsTeacher(true);
      setView('TEACHER');
      sessionStorage.setItem(STORAGE_KEYS.TEACHER_AUTH, 'true');
    }
    return isValid;
  }, []);

  // 학생 참여
  const handleJoin = useCallback(async (name: string) => {
    setIsLoading(true);
    audioService.ensureStarted();

    let activeSessionId = sessionId;
    if (useApi && !activeSessionId) {
      activeSessionId = await ensureSessionId();
    }

    if (useApi) {
      console.log('👤 Adding participant to Google Sheets:', name);
      const result = await addParticipant(name, activeSessionId || undefined);

      if (result.success && result.data) {
        const newParticipant: Participant = {
          ...result.data,
          joinedAt: new Date(result.data.joinedAt),
          answers: [],
        };
        setStudentInfo(newParticipant);
        setParticipants(prev => [...prev, newParticipant]);
        console.log('✅ Participant added:', newParticipant);
        audioService.playJoin();
      } else {
        console.error('❌ Failed to add participant:', result.error);
        alert('참가 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } else {
      const newParticipant = addMockParticipant(name);
      setParticipants([...MOCK_PARTICIPANTS]);
      setStudentInfo(newParticipant);
      audioService.playJoin();
    }

    setIsLoading(false);
  }, [useApi, sessionId]);

  // 게임 시작 (선생님 카운트다운 오버레이 + 바로 퀴즈 진행)
  const startCountdown = useCallback(async () => {
    audioService.ensureStarted();
    audioService.playClick();
    const startAt = Date.now();
    setGameState('QUIZ');
    setTimer(maxTimer);
    setQuestionStartTime(startAt);
    setGameStateUpdatedAt(startAt);
    setTeacherCountdownActive(true);
    setTimeout(() => setTeacherCountdownActive(false), 3500);

    if (useApi) {
      console.log('🎮 Starting game...');
      await updateGameState('QUIZ', currentQuestionIndex, maxTimer, sessionId || undefined);
    }
  }, [useApi, currentQuestionIndex, maxTimer, sessionId]);

  const handleShowResult = useCallback(async () => {
    audioService.ensureStarted();
    audioService.playResult();
    setGameState('RESULT');
    if (useApi) {
      await updateGameState('RESULT', currentQuestionIndex, maxTimer, sessionId || undefined);
    }
  }, [useApi, currentQuestionIndex, maxTimer, sessionId]);

  const handleShowRanking = useCallback(async () => {
    audioService.ensureStarted();
    audioService.playClick();
    setGameState('RANKING');
    if (useApi) {
      await updateGameState('RANKING', currentQuestionIndex, maxTimer, sessionId || undefined);
    }
  }, [useApi, currentQuestionIndex, maxTimer, sessionId]);

  // 답변 제출
  const handleAnswer = useCallback(async (answerIndex: number) => {
    if (!studentInfo) return;
    audioService.ensureStarted();
    audioService.playClick();

    // 즉시 선택 완료 표시
    setStudentInfo(prev => prev ? {
      ...prev,
      lastAnswer: answerIndex,
    } : null);

    const responseTime = (Date.now() - questionStartTime) / 1000;
    const currentQuestion = questions[currentQuestionIndex];

    if (useApi) {
      console.log('📝 Submitting answer to Google Sheets...');
      const result = await submitAnswer(
        studentInfo.id,
        currentQuestion.id,
        answerIndex,
        responseTime,
        sessionId || undefined
      );

      if (result.success && result.data) {
        const { isCorrect, score } = result.data;
        console.log('✅ Answer submitted:', { isCorrect, score });

        if (isCorrect) {
          audioService.playCorrect();
        } else {
          audioService.playWrong();
        }

        setStudentInfo(prev => prev ? {
          ...prev,
          score: prev.score + score,
          isCorrect,
        } : null);
      } else {
        console.error('❌ Failed to submit answer:', result.error);
        setStudentInfo(prev => prev ? { ...prev, lastAnswer: undefined } : null);
      }
    } else {
      const { isCorrect, score } = submitMockAnswer(
        studentInfo.id,
        currentQuestion.id,
        answerIndex,
        responseTime,
        maxTimer
      );

      if (isCorrect) {
        audioService.playCorrect();
      } else {
        audioService.playWrong();
      }

      setStudentInfo(prev => prev ? {
        ...prev,
        score: prev.score + score,
        lastAnswer: answerIndex,
        isCorrect,
      } : null);

      setParticipants([...MOCK_PARTICIPANTS]);
    }
  }, [studentInfo, questionStartTime, questions, currentQuestionIndex, useApi, maxTimer, sessionId]);

  // 다음 문제
  const nextQuestion = useCallback(async () => {
    audioService.ensureStarted();
    audioService.playClick();
    // 답변 상태 초기화
    if (!useApi) {
      MOCK_PARTICIPANTS.forEach(p => {
        p.lastAnswer = undefined;
        p.isCorrect = undefined;
      });
      setParticipants([...MOCK_PARTICIPANTS]);
    }

    if (studentInfo) {
      setStudentInfo(prev => prev ? {
        ...prev,
        lastAnswer: undefined,
        isCorrect: undefined,
      } : null);
    }

    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setGameState('QUIZ');
      setTimer(maxTimer);
      setQuestionStartTime(Date.now());
      setGameStateUpdatedAt(Date.now());
      setTeacherCountdownActive(true);
      setTimeout(() => setTeacherCountdownActive(false), 3500);

      if (useApi) {
        await updateGameState('QUIZ', nextIdx, maxTimer, sessionId || undefined);
      }
    } else {
      setGameState('FINAL');
      audioService.playWinner();

      if (useApi) {
        await updateGameState('FINAL', currentQuestionIndex, maxTimer, sessionId || undefined);
      }
    }
  }, [currentQuestionIndex, questions.length, studentInfo, useApi, maxTimer, sessionId]);

  // 게임 리셋
  const handleRestart = useCallback(async () => {
    audioService.ensureStarted();
    audioService.playClick();
    if (useApi) {
      console.log('🔄 Resetting game...');
      await resetGame();
    }

    MOCK_PARTICIPANTS.length = 0;
    setParticipants([]);
    setStudentInfo(null);
    setCurrentQuestionIndex(0);
    setGameState('LOBBY');
    setTimer(maxTimer);
    setSessionId(null);
    setTeacherCountdownActive(false);
    setHasAutoReset(false);
    setView('SELECT');
  }, [useApi, maxTimer]);

  // 타이머 효과 (선생님만)
  useEffect(() => {
    if (!isTeacher) return;
    let interval: NodeJS.Timeout;

    if (gameState === 'QUIZ' && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => {
          if (t <= 6 && t > 1) {
            audioService.playTick();
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTeacher, gameState, timer, useApi, currentQuestionIndex, maxTimer]);

  // 학생 화면 타이머 동기화 (서버 시간 기준)
  useEffect(() => {
    if (view !== 'STUDENT' || !studentInfo) return;
    if (gameState !== 'QUIZ' || !gameStateUpdatedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStateUpdatedAt) / 1000);
      setTimer(Math.max(0, maxTimer - elapsed));
    }, 250);

    return () => clearInterval(interval);
  }, [view, studentInfo, gameState, gameStateUpdatedAt, maxTimer]);

  // 학생 화면: 결과 전환 효과음
  useEffect(() => {
    if (view !== 'STUDENT') return;
    if (gameState === 'RESULT') {
      audioService.playResult();
    }
  }, [view, gameState]);

  // 학생 화면: 다음 문제 시작 시 답변 상태 초기화
  useEffect(() => {
    if (view !== 'STUDENT' || !studentInfo) return;
    setStudentInfo(prev => prev ? {
      ...prev,
      lastAnswer: undefined,
      isCorrect: undefined,
    } : null);
  }, [view, currentQuestionIndex, studentInfo?.id]);

  // 학생 화면: 순위/결과 화면에서 참가자 최신화
  useEffect(() => {
    if (!useApi || view !== 'STUDENT' || !studentInfo) return;
    if (gameState !== 'RESULT' && gameState !== 'RANKING' && gameState !== 'FINAL') return;

    const fetchParticipants = async () => {
      const result = await getParticipants(sessionId || undefined);
      if (result.success && result.data) {
        setParticipants(result.data.map(p => ({
          ...p,
          joinedAt: new Date(p.joinedAt),
          answers: p.answers || [],
        })));
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 1000);
    return () => clearInterval(interval);
  }, [useApi, view, studentInfo, gameState, sessionId]);

  // 선생님 화면: 응답 현황 폴링 (QUIZ 중)
  useEffect(() => {
    if (!useApi || view !== 'TEACHER') return;
    if (gameState !== 'QUIZ' || !currentQuestion) return;

    const fetchAnswers = async () => {
      const result = await getAnswerStats(currentQuestion.id, sessionId || undefined);
      if (result.success && result.data) {
        setAnsweredCount(result.data.length);
        setAnswerStats(result.data);
      }
    };

    fetchAnswers();
    const interval = setInterval(fetchAnswers, 500);
    return () => clearInterval(interval);
  }, [useApi, view, gameState, currentQuestion, sessionId]);

  // 응답 현황 초기화 (다음 문제로 넘어갈 때만)
  useEffect(() => {
    setAnsweredCount(0);
    setAnswerStats([]);
  }, [currentQuestionIndex]);

  // 현재 문제
  const answeredDisplayCount = useApi
    ? answeredCount
    : participants.filter(p => p.lastAnswer !== undefined).length;
  const recentScores = useMemo(() => {
    if (answerStats.length > 0) {
      return answerStats.reduce<Record<string, number>>((acc, answer) => {
        if (answer.participantId) {
          acc[answer.participantId] = answer.score ?? 0;
        }
        return acc;
      }, {});
    }

    if (!useApi) {
      return participants.reduce<Record<string, number>>((acc, participant) => {
        const latest = participant.answers?.[participant.answers.length - 1];
        if (latest) {
          acc[participant.id] = latest.score ?? 0;
        }
        return acc;
      }, {});
    }

    return {};
  }, [answerStats, participants, useApi]);
  const studentRank = view === 'STUDENT' && studentInfo
    ? [...participants].sort((a, b) => b.score - a.score)
      .findIndex(p => p.id === studentInfo.id) + 1
    : null;

  return (
    <div className="min-h-screen text-white overflow-hidden relative font-sans">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 -z-10" />

      {/* 연결 상태 표시 */}
      {useApi && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          {isConnected ? 'Google Sheets 연결됨' : '연결 안됨'}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* 선택 화면 */}
        {view === 'SELECT' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <h1 className="text-5xl md:text-6xl font-jua mb-4 text-center text-yellow-300 drop-shadow-lg">
              Smart Class Quiz
            </h1>
            <p className="text-white/70 mb-12 text-lg">실시간 교실 퀴즈 게임</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
              <button
                onClick={() => setView('TEACHER_LOGIN')}
                className="bg-white/10 hover:bg-white/20 border-2 border-white/30 p-8 rounded-3xl flex flex-col items-center transition-all group"
              >
                <Shield size={64} className="mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold">선생님으로 시작</span>
                <span className="text-white/50 text-sm mt-2">퀴즈 진행하기</span>
              </button>
              <button
                onClick={() => setView('STUDENT')}
                className="bg-white/10 hover:bg-white/20 border-2 border-white/30 p-8 rounded-3xl flex flex-col items-center transition-all group"
              >
                <User size={64} className="mb-4 text-green-400 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold">학생으로 참여</span>
                <span className="text-white/50 text-sm mt-2">퀴즈 참가하기</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* 선생님 로그인 */}
        {view === 'TEACHER_LOGIN' && (
          <motion.div
            key="teacher-login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center"
          >
            <TeacherLogin
              onLogin={handleTeacherLogin}
              onBack={() => setView('SELECT')}
            />
          </motion.div>
        )}

        {/* 선생님 대시보드 */}
        {view === 'TEACHER' && (
          <div key="teacher" className="p-4 min-h-screen flex flex-col">
            <header className="flex justify-between items-center mb-8 p-4 bg-black/20 rounded-2xl">
              <h2 className="text-2xl font-jua flex items-center gap-2">
                <Shield className="text-blue-400" /> 선생님 대시보드
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-purple-900/50 px-4 py-2 rounded-full border border-purple-400/30">
                  <User size={18} />
                  <span>{participants.length}명 참여 중</span>
                </div>
                <button
                  onClick={() => {
                    setView('SELECT');
                    setIsTeacher(false);
                  }}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  나가기
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
      {gameState === 'LOBBY' && (
        <LobbyView
          participants={participants}
          isTeacher={true}
          onStart={startCountdown}
        />
      )}
              {teacherCountdownActive && (
                <CountdownView playSound />
              )}
              {gameState === 'QUIZ' && currentQuestion && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-3 text-lg text-white/80">
                    <span>응답 현황</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">
                      {answeredDisplayCount} / {participants.length}명
                    </span>
                  </div>
                  <QuizView
                    question={currentQuestion}
                    timer={timer}
                    maxTimer={maxTimer}
                  />
                  <div className="flex justify-center">
                    <button
                      onClick={handleShowResult}
                      className="bg-green-500 hover:bg-green-400 text-white text-2xl font-jua px-10 py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                    >
                      결과 확인
                    </button>
                  </div>
                </div>
              )}
              {gameState === 'RESULT' && currentQuestion && (
                <ResultView
                  question={currentQuestion}
                  participants={participants}
                  answerStats={answerStats}
                  isTeacher={true}
                  onNext={handleShowRanking}
                />
              )}
              {gameState === 'RANKING' && (
                <RankingView
                  participants={participants}
                  onNext={nextQuestion}
                  isTeacher={true}
                  nextLabel={currentQuestionIndex >= questions.length - 1 ? '최종 결과 보기' : '다음 문제로'}
                  recentScores={recentScores}
                />
              )}
              {gameState === 'FINAL' && (
                <FinalView
                  participants={participants}
                  onRestart={handleRestart}
                />
              )}
            </div>

            {gameState === 'LOBBY' && (
              <TeacherControls
                maxTimer={maxTimer}
                setMaxTimer={setMaxTimer}
                onToggleBgm={handleToggleBgm}
                isBgmPlaying={bgmEnabled}
              />
            )}
          </div>
        )}

        {/* 학생 화면 */}
        {view === 'STUDENT' && (
          <div key="student" className="p-4 min-h-screen flex flex-col">
            {!studentInfo ? (
              <JoinView onJoin={handleJoin} />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 w-full relative">
                {(gameState === 'QUIZ' || gameState === 'RESULT' || gameState === 'RANKING' || gameState === 'FINAL') && (
                  <div className="absolute top-0 right-0">
                    <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full border border-white/20 text-sm">
                      <User size={16} />
                      <span>{studentInfo.name}</span>
                    </div>
                  </div>
                )}
                {/* 로비 - 대기 중 */}
                {gameState === 'LOBBY' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
                      <User size={48} />
                    </div>
                    <h2 className="text-3xl font-jua mb-2">{studentInfo.name}님, 환영합니다!</h2>
                    <p className="text-white/60">퀴즈 준비중입니다.</p>
                    <p className="text-white/40 mt-2">선생님이 시작하면 자동으로 진행됩니다.</p>
                  </motion.div>
                )}

                {/* 카운트다운 */}
                {gameState === 'COUNTDOWN' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center bg-white/10 px-10 py-12 rounded-3xl border border-white/20 shadow-2xl"
                  >
                    <p className="text-3xl font-jua text-yellow-300 mb-4">퀴즈 화면 준비중</p>
                    <p className="text-white/70">선생님이 시작 신호를 보내고 있어요.</p>
                  </motion.div>
                )}

                {/* 퀴즈 - 답변 선택 */}
                {gameState === 'QUIZ' && (
                  <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                      <span className="text-6xl font-jua text-yellow-300">{timer}</span>
                      <p className="text-white/60 mt-2">남은 시간</p>
                    </div>

                    <h3 className="text-xl text-center mb-8 font-bold bg-white/10 p-4 rounded-xl">
                      질문 {currentQuestionIndex + 1} / {questions.length}
                    </h3>

                    {studentInfo.lastAnswer === undefined ? (
                      <div className="grid grid-cols-2 gap-4">
                        {['A', 'B', 'C', 'D'].map((label, idx) => {
                          const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAnswer(idx)}
                              className={`${colors[idx]} h-32 rounded-2xl shadow-lg flex items-center justify-center text-4xl font-bold transition-all active:scale-95 hover:brightness-110`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-center bg-white/10 p-8 rounded-2xl"
                      >
                        <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
                        <p className="text-2xl font-bold">답변 완료!</p>
                        <p className="text-white/60 mt-2">결과 집계 중...</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* 결과 - 정답/오답 */}
                {gameState === 'RESULT' && (
                  <div className="text-center">
                    {studentInfo.lastAnswer === undefined ? (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center bg-white/10 px-10 py-12 rounded-3xl border border-white/20 shadow-2xl"
                      >
                        <p className="text-3xl font-jua text-yellow-300 mb-4">퀴즈 시작 대기 중</p>
                        <p className="text-white/70">선생님이 결과 확인을 누르면 표시됩니다.</p>
                      </motion.div>
                    ) : studentInfo.isCorrect ? (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        <CheckCircle size={100} className="text-green-400 mb-4" />
                        <h2 className="text-4xl font-jua text-green-400 mb-2">정답입니다!</h2>
                        <p className="text-2xl font-bold">현재 점수: {studentInfo.score}</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        <XCircle size={100} className="text-red-400 mb-4" />
                        <h2 className="text-4xl font-jua text-red-400 mb-2">오답입니다...</h2>
                        <p className="text-2xl font-bold">
                          정답은 {currentQuestion?.options[currentQuestion.correctAnswer]}입니다.
                        </p>
                        <p className="text-2xl font-bold mt-2">현재 점수: {studentInfo.score}</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* 순위 */}
                {gameState === 'RANKING' && (
                  <div className="w-full">
                    {studentRank ? (
                      <div className="text-center mb-8">
                        <p className="text-4xl font-jua text-yellow-300">현재 순위: {studentRank}등</p>
                        <p className="text-2xl font-bold text-white/80 mt-2">
                          현재 점수: {studentInfo.score}
                        </p>
                      </div>
                    ) : null}
                    <RankingView
                      participants={participants}
                      onNext={() => {}}
                      isTeacher={false}
                      nextLabel={currentQuestionIndex >= questions.length - 1 ? '최종 결과 보기' : '다음 문제로'}
                      recentScores={recentScores}
                    />
                  </div>
                )}

                {/* 최종 결과 */}
                {gameState === 'FINAL' && (
                  <div className="text-center">
                    <Trophy size={100} className="text-yellow-400 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-4xl font-jua mb-4">수고하셨습니다!</h2>
                    <p className="text-3xl font-bold text-yellow-300">
                      최종 점수: {studentInfo.score}점
                    </p>
                    <button
                      onClick={handleRestart}
                      className="mt-8 bg-white/20 hover:bg-white/30 px-8 py-4 rounded-2xl font-bold transition-all"
                    >
                      처음으로
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-white">처리 중...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
