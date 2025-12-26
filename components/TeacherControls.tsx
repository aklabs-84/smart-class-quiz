
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
    <div className="bg-black/30 backdrop-blur-xl border border-white/20 px-3 py-2 rounded-2xl shadow-lg">
      <div className="flex items-center gap-3 flex-nowrap overflow-x-auto">
        {onToggleBgm && (
          <button
            onClick={onToggleBgm}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-jua px-3 py-2 rounded-2xl border border-white/20 transition-all whitespace-nowrap"
          >
            {isBgmPlaying ? 'BGM 끄기' : 'BGM 재생'}
          </button>
        )}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Clock className="text-blue-400" size={16} />
          <span className="font-bold text-sm">문제 시간:</span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          {[10, 15, 20, 30].map(t => (
            <button
              key={t}
              onClick={() => setMaxTimer(t)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
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
