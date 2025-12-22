
import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Question } from '../types';

interface QuizViewProps {
  question: Question;
  timer: number;
  maxTimer: number;
  showCorrect?: boolean;
}

const QuizView: React.FC<QuizViewProps> = ({ question, timer, maxTimer, showCorrect }) => {
  const colors = [
    'bg-red-500 shadow-[0_8px_0_rgb(185,28,28)]',
    'bg-blue-500 shadow-[0_8px_0_rgb(29,78,216)]',
    'bg-yellow-500 shadow-[0_8px_0_rgb(161,98,7)]',
    'bg-green-500 shadow-[0_8px_0_rgb(21,128,61)]'
  ];

  const timerColor = timer < 5 ? 'text-red-500' : 'text-white';

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-12">
        <div className="bg-black/30 p-4 rounded-2xl flex items-center gap-4 border border-white/10">
          <Clock size={32} className={timerColor} />
          <span className={`text-5xl font-jua tabular-nums ${timerColor}`}>{timer}</span>
        </div>
        <div className="h-4 flex-1 mx-8 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-400"
            initial={{ width: '100%' }}
            animate={{ width: `${(timer / maxTimer) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white text-gray-900 p-12 rounded-3xl shadow-2xl w-full text-center mb-12"
      >
        <h2 className="text-4xl font-bold">{question.text}</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {question.options.map((option, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`${colors[idx]} p-8 rounded-2xl text-2xl font-bold flex items-center gap-6 relative`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-3xl font-jua">
              {['▲', '◆', '●', '■'][idx]}
            </div>
            {option}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuizView;
