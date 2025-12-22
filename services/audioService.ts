// ===================================
// Smart Class Quiz - Audio Service
// ===================================

import { SOUND_PATHS } from '../utils/constants';

type SoundKey = keyof typeof SOUND_PATHS;

class AudioService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  /**
   * 모든 효과음 미리 로드
   */
  preload(): void {
    Object.entries(SOUND_PATHS).forEach(([key, src]) => {
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 0.5;
        this.audioCache.set(key, audio);
      } catch (error) {
        console.warn(`Failed to preload sound: ${key}`, error);
      }
    });
  }

  /**
   * 효과음 재생
   */
  play(soundKey: SoundKey, volume: number = 0.5): void {
    if (!this.enabled) return;

    const audio = this.audioCache.get(soundKey);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch((error) => {
        // 자동 재생이 차단된 경우 무시
        console.warn(`Failed to play sound: ${soundKey}`, error);
      });
    } else {
      // 캐시에 없으면 새로 생성하여 재생
      const src = SOUND_PATHS[soundKey];
      if (src) {
        const newAudio = new Audio(src);
        newAudio.volume = volume;
        newAudio.play().catch(console.warn);
      }
    }
  }

  /**
   * 카운트다운 효과음 (3, 2, 1)
   */
  playCountdown(): void {
    this.play('countdown');
  }

  /**
   * 정답 효과음
   */
  playCorrect(): void {
    this.play('correct', 0.7);
  }

  /**
   * 오답 효과음
   */
  playWrong(): void {
    this.play('wrong', 0.5);
  }

  /**
   * 틱 효과음 (타이머)
   */
  playTick(): void {
    this.play('tick', 0.3);
  }

  /**
   * 우승자 효과음
   */
  playWinner(): void {
    this.play('winner', 0.8);
  }

  /**
   * 참여 효과음
   */
  playJoin(): void {
    this.play('join', 0.4);
  }

  /**
   * 클릭 효과음
   */
  playClick(): void {
    this.play('click', 0.3);
  }

  /**
   * 효과음 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 효과음 활성화 상태 확인
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 모든 효과음 정지
   */
  stopAll(): void {
    this.audioCache.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}

// 싱글톤 인스턴스
export const audioService = new AudioService();

// 효과음 후크
import { useCallback } from 'react';

export function useSound() {
  const playCountdown = useCallback(() => audioService.playCountdown(), []);
  const playCorrect = useCallback(() => audioService.playCorrect(), []);
  const playWrong = useCallback(() => audioService.playWrong(), []);
  const playTick = useCallback(() => audioService.playTick(), []);
  const playWinner = useCallback(() => audioService.playWinner(), []);
  const playJoin = useCallback(() => audioService.playJoin(), []);
  const playClick = useCallback(() => audioService.playClick(), []);

  return {
    playCountdown,
    playCorrect,
    playWrong,
    playTick,
    playWinner,
    playJoin,
    playClick,
  };
}
