
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCcw } from 'lucide-react';
import { Participant } from '../types';

interface FinalProps {
  participants: Participant[];
  onRestart: () => void;
}

const FinalView: React.FC<FinalProps> = ({ participants, onRestart }) => {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const winners = sorted.slice(0, 3);

  useEffect(() => {
    // In a real environment we would trigger confetti here
    console.log("CELEBRATION TIME!");
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <h1 className="text-6xl font-jua text-white mb-20 text-center drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
        오늘의 퀴즈 우승자!
      </h1>

      <div className="flex items-end justify-center gap-4 mb-20 w-full max-w-4xl h-80">
        {/* 2nd Place */}
        {winners[1] && (
          <motion.div 
            initial={{ height: 0 }} animate={{ height: '60%' }} 
            className="flex-1 bg-gray-400 rounded-t-3xl relative flex flex-col items-center justify-end p-6 border-x-4 border-t-4 border-gray-300"
          >
            <div className="absolute -top-24 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center border-4 border-white mb-2 shadow-xl">
                 <span className="text-3xl font-bold text-gray-700">2</span>
              </div>
              <span className="text-2xl font-bold whitespace-nowrap">{winners[1].name}</span>
            </div>
            <span className="text-3xl font-jua text-gray-800">{winners[1].score}</span>
          </motion.div>
        )}

        {/* 1st Place */}
        {winners[0] && (
          <motion.div 
            initial={{ height: 0 }} animate={{ height: '100%' }}
            className="flex-1 bg-yellow-500 rounded-t-3xl relative flex flex-col items-center justify-end p-6 border-x-4 border-t-4 border-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.3)]"
          >
            <div className="absolute -top-32 flex flex-col items-center">
              <Trophy size={64} className="text-yellow-300 mb-4 animate-bounce drop-shadow-xl" />
              <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white mb-2 shadow-xl">
                 <span className="text-4xl font-bold text-yellow-900">1</span>
              </div>
              <span className="text-3xl font-bold whitespace-nowrap text-yellow-100">{winners[0].name}</span>
            </div>
            <span className="text-4xl font-jua text-yellow-900">{winners[0].score}</span>
          </motion.div>
        )}

        {/* 3rd Place */}
        {winners[2] && (
          <motion.div 
            initial={{ height: 0 }} animate={{ height: '40%' }}
            className="flex-1 bg-orange-700 rounded-t-3xl relative flex flex-col items-center justify-end p-6 border-x-4 border-t-4 border-orange-600"
          >
            <div className="absolute -top-24 flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center border-4 border-white mb-2 shadow-xl">
                 <span className="text-2xl font-bold text-orange-200">3</span>
              </div>
              <span className="text-xl font-bold whitespace-nowrap">{winners[2].name}</span>
            </div>
            <span className="text-2xl font-jua text-orange-200">{winners[2].score}</span>
          </motion.div>
        )}
      </div>

      <button
        onClick={onRestart}
        className="bg-white/10 hover:bg-white/20 text-white text-2xl font-jua px-8 py-4 rounded-2xl flex items-center gap-3 transition-all border border-white/20"
      >
        <RefreshCcw /> 다시 하기
      </button>
    </div>
  );
};

export default FinalView;
