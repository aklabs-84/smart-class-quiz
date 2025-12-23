
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { Participant } from '../types';

interface RankingProps {
  participants: Participant[];
  onNext: () => void;
  isTeacher: boolean;
  nextLabel?: string;
  recentScores?: Record<string, number>;
}

const RankingView: React.FC<RankingProps> = ({ participants, onNext, isTeacher, nextLabel, recentScores }) => {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
      <h2 className="text-5xl font-jua text-yellow-300 mb-12 drop-shadow-lg flex items-center gap-4">
        <Trophy size={48} /> 순위 발표
      </h2>

      <div className="w-full space-y-4">
        {sorted.slice(0, 5).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center justify-between p-6 rounded-2xl shadow-xl ${
              i === 0 ? 'bg-yellow-500/80' : 'bg-white/10'
            } border border-white/20`}
          >
            <div className="flex items-center gap-6">
              <span className="text-3xl font-jua w-8 text-center">{i + 1}</span>
              <span className="text-2xl font-bold">{p.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold opacity-60">+{recentScores?.[p.id] ?? 0}</span>
              <span className="text-3xl font-jua">{p.score}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {isTeacher && (
        <motion.button
          onClick={onNext}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-12 bg-blue-500 hover:bg-blue-400 text-white text-3xl font-jua px-12 py-6 rounded-3xl flex items-center gap-4 shadow-[0_10px_0_rgb(29,78,216)] active:translate-y-2 active:shadow-none transition-all"
        >
          {nextLabel || '다음 문제로'} <ChevronRight size={32} />
        </motion.button>
      )}
    </div>
  );
};

export default RankingView;
