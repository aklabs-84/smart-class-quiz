// ===================================
// Smart Class Quiz - Audio Service (Tone.js)
// ===================================

import * as Tone from 'tone';
import { useCallback } from 'react';

const bgmUrl = '/assets/bgm.mp3';

class AudioService {
  private enabled = true;
  private started = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmLoaded = false;
  private clickSynth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
  }).toDestination();
  private tickSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
  }).toDestination();
  private lastTickTime = 0;
  private correctSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
  }).toDestination();
  private wrongSynth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
  }).toDestination();
  private resultSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
  }).toDestination();

  /**
   * Tone 컨텍스트 시작 (사용자 제스처 필요)
   */
  async ensureStarted(): Promise<void> {
    if (this.started) return;
    await Tone.start();
    await Tone.getContext().resume();
    this.started = true;
  }

  /**
   * 효과음 프리로드 (BGM 로드용)
   */
  async preload(): Promise<void> {
    if (!this.started) return;
    await this.ensureBgmLoaded();
  }

  private async ensureBgmLoaded(): Promise<void> {
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio(bgmUrl);
      this.bgmAudio.loop = true;
      this.bgmAudio.preload = 'auto';
      this.bgmAudio.volume = 0.5;
    }

    if (!this.bgmLoaded) {
      try {
        if (this.bgmAudio) {
          await this.bgmAudio.play();
          this.bgmAudio.pause();
          this.bgmAudio.currentTime = 0;
          this.bgmLoaded = true;
        }
      } catch (error) {
        console.warn('BGM load failed:', error);
      }
    }
  }

  /**
   * BGM 재생
   */
  async playBgm(): Promise<void> {
    if (!this.enabled) return;
    if (!this.started) {
      await this.ensureStarted();
    }
    await this.ensureBgmLoaded();
    if (this.bgmAudio) {
      try {
        await this.bgmAudio.play();
      } catch (error) {
        console.warn('BGM play failed:', error);
      }
    }
  }

  /**
   * BGM 정지
   */
  stopBgm(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  /**
   * 카운트다운 효과음
   */
  playCountdown(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.tickSynth.triggerAttackRelease('C5', 0.08, now, 0.5);
  }

  /**
   * 정답 효과음
   */
  playCorrect(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.correctSynth.triggerAttackRelease(['C5', 'E5', 'G5'], 0.2, now, 0.6);
  }

  /**
   * 오답 효과음
   */
  playWrong(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.wrongSynth.triggerAttackRelease(0.15, now, 0.4);
  }

  /**
   * 틱 효과음 (타이머)
   */
  playTick(): void {
    if (!this.enabled || !this.started) return;
    let now = Tone.now();
    if (now <= this.lastTickTime) {
      now = this.lastTickTime + 0.001;
    }
    this.lastTickTime = now;
    try {
      this.tickSynth.triggerAttackRelease('G5', 0.05, now, 0.3);
    } catch (error) {
      console.warn('Tick sound skipped:', error);
    }
  }

  /**
   * 결과 표시 효과음
   */
  playResult(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.resultSynth.triggerAttackRelease('A4', 0.15, now, 0.4);
  }

  /**
   * 우승자 효과음
   */
  playWinner(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.correctSynth.triggerAttackRelease(['C5', 'E5', 'G5'], 0.2, now, 0.6);
    this.correctSynth.triggerAttackRelease(['D5', 'F5', 'A5'], 0.2, now + 0.2, 0.6);
    this.correctSynth.triggerAttackRelease(['E5', 'G5', 'B5'], 0.25, now + 0.4, 0.7);
  }

  /**
   * 참여 효과음
   */
  playJoin(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.clickSynth.triggerAttackRelease('C4', 0.1, now, 0.4);
  }

  /**
   * 선택 효과음
   */
  playClick(): void {
    if (!this.enabled || !this.started) return;
    const now = Tone.now();
    this.clickSynth.triggerAttackRelease('E4', 0.05, now, 0.3);
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
    this.stopBgm();
  }
}

// 싱글톤 인스턴스
export const audioService = new AudioService();

// 효과음 후크
export function useSound() {
  const playCountdown = useCallback(() => audioService.playCountdown(), []);
  const playCorrect = useCallback(() => audioService.playCorrect(), []);
  const playWrong = useCallback(() => audioService.playWrong(), []);
  const playTick = useCallback(() => audioService.playTick(), []);
  const playWinner = useCallback(() => audioService.playWinner(), []);
  const playJoin = useCallback(() => audioService.playJoin(), []);
  const playClick = useCallback(() => audioService.playClick(), []);
  const playResult = useCallback(() => audioService.playResult(), []);

  return {
    playCountdown,
    playCorrect,
    playWrong,
    playTick,
    playWinner,
    playJoin,
    playClick,
    playResult,
  };
}
