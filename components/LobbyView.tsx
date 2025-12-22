
import React from 'react';
import { motion } from 'framer-motion';
import { User, Play } from 'lucide-react';
import { Participant } from '../types';

interface LobbyProps {
  participants: Participant[];
  isTeacher: boolean;
  onStart: () => void;
}

const LobbyView: React.FC<LobbyProps> = ({ participants, isTeacher, onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-jua mb-4">참가자를 기다리고 있습니다...</h2>
        <div className="text-xl bg-black/30 px-6 py-2 rounded-full inline-block border border-white/10">
          대기실 PIN: <span className="font-bold text-yellow-300 tracking-widest">123 456</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-6 max-w-4xl">
        {participants.length === 0 ? (
          <p className="text-white/40 italic">아직 참여한 학생이 없습니다.</p>
        ) : (
          participants.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ scale: 0, y: 50 }}
              animate={{ 
                scale: 1, 
                y: [0, -10, 0],
                transition: { 
                    y: { repeat: Infinity, duration: 2 + Math.random(), ease: "easeInOut" },
                    scale: { type: 'spring' }
                } 
              }}
              className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 border border-white/20 shadow-xl"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][i % 5]}`}>
                <User size={20} />
              </div>
              <span className="text-xl font-bold">{p.name}</span>
            </motion.div>
          ))
        )}
      </div>

      {isTeacher && (
        <motion.div 
          className="mt-16"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <button
            onClick={onStart}
            disabled={participants.length === 0}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-3xl font-jua px-12 py-6 rounded-3xl flex items-center gap-4 shadow-[0_10px_0_rgb(21,128,61)] active:translate-y-2 active:shadow-none transition-all"
          >
            <Play fill="white" size={32} /> 게임 시작하기
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default LobbyView;
