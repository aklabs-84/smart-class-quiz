
import React from 'react';
import { Clock } from 'lucide-react';

interface ControlsProps {
  maxTimer: number;
  setMaxTimer: (t: number) => void;
  onToggleBgm?: () => void;
  isBgmPlaying?: boolean;
}

const TeacherControls: React.FC<ControlsProps> = ({ maxTimer, setMaxTimer, onToggleBgm, isBgmPlaying }) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/20 p-4 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
      {onToggleBgm && (
        <button
          onClick={onToggleBgm}
          className="bg-white/10 hover:bg-white/20 text-white text-lg font-jua px-6 py-2 rounded-2xl border border-white/20 transition-all"
        >
          {isBgmPlaying ? 'BGM 끄기' : 'BGM 재생'}
        </button>
      )}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Clock className="text-blue-400" />
          <span className="font-bold whitespace-nowrap">문제 시간 제한:</span>
        </div>
        <div className="flex gap-2">
          {[10, 15, 20, 30].map(t => (
            <button
              key={t}
              onClick={() => setMaxTimer(t)}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                maxTimer === t ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {t}초
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherControls;
