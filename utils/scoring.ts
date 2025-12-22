// ===================================
// Smart Class Quiz - Scoring Utilities
// ===================================

import { Participant, OptionStats } from '../types';
import { SCORE_CONFIG } from './constants';

/**
 * 점수 계산
 * - 정답 시: 기본 500점 + 시간 보너스 (최대 500점)
 * - 오답 시: 0점
 *
 * @param isCorrect 정답 여부
 * @param responseTime 응답에 걸린 시간 (초)
 * @param timeLimit 제한 시간 (초)
 * @returns 획득 점수
 */
export function calculateScore(
  isCorrect: boolean,
  responseTime: number,
  timeLimit: number
): number {
  if (!isCorrect) return SCORE_CONFIG.WRONG_SCORE;

  const { BASE_SCORE, MAX_BONUS } = SCORE_CONFIG;
  const remainingTime = Math.max(0, timeLimit - responseTime);
  const timeBonus = Math.floor((remainingTime / timeLimit) * MAX_BONUS);

  return BASE_SCORE + timeBonus;
}

/**
 * 순위 계산 및 참가자 배열에 순위 추가
 * @param participants 참가자 배열
 * @returns 순위가 추가된 참가자 배열
 */
export function calculateRankings(participants: Participant[]): Participant[] {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return sorted.map((participant, index) => ({
    ...participant,
    previousRank: participant.rank,
    rank: index + 1,
  }));
}

/**
 * 순위 변동 계산
 * @param currentRank 현재 순위
 * @param previousRank 이전 순위
 * @returns 순위 변동 값 (양수: 상승, 음수: 하락, 0: 유지)
 */
export function getRankChange(
  currentRank: number,
  previousRank: number | undefined
): number {
  if (previousRank === undefined) return 0;
  return previousRank - currentRank;
}

/**
 * 순위 변동 텍스트 생성
 * @param change 순위 변동 값
 * @returns 표시할 텍스트 (예: "▲2", "▼1", "-")
 */
export function getRankChangeText(change: number): string {
  if (change > 0) return `▲${change}`;
  if (change < 0) return `▼${Math.abs(change)}`;
  return '-';
}

/**
 * 선택지별 통계 계산
 * @param participants 참가자 배열
 * @param questionId 문제 ID
 * @param correctAnswer 정답 인덱스
 * @returns 선택지별 통계 배열
 */
export function calculateOptionStats(
  participants: Participant[],
  questionId: number,
  correctAnswer: number
): OptionStats[] {
  const optionCounts = [0, 0, 0, 0];
  let totalAnswers = 0;

  participants.forEach((p) => {
    const answer = p.answers.find((a) => a.questionId === questionId);
    if (answer !== undefined) {
      optionCounts[answer.selectedOption]++;
      totalAnswers++;
    }
  });

  return optionCounts.map((count, index) => ({
    optionIndex: index,
    count,
    percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
    isCorrect: index === correctAnswer,
  }));
}

/**
 * 상위 N명 참가자 가져오기
 * @param participants 참가자 배열
 * @param count 가져올 인원 수
 * @returns 상위 N명 참가자
 */
export function getTopParticipants(
  participants: Participant[],
  count: number
): Participant[] {
  return calculateRankings(participants).slice(0, count);
}

/**
 * 1, 2, 3등 가져오기 (최종 결과용)
 * @param participants 참가자 배열
 * @returns [1등, 2등, 3등] 또는 부족시 undefined
 */
export function getPodiumParticipants(
  participants: Participant[]
): [Participant | undefined, Participant | undefined, Participant | undefined] {
  const ranked = calculateRankings(participants);
  return [ranked[0], ranked[1], ranked[2]];
}

/**
 * 정답률 계산
 * @param participant 참가자
 * @returns 정답률 (0-100)
 */
export function getAccuracyRate(participant: Participant): number {
  if (participant.answers.length === 0) return 0;
  const correctCount = participant.answers.filter((a) => a.isCorrect).length;
  return Math.round((correctCount / participant.answers.length) * 100);
}
