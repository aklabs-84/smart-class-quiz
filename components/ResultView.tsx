// ===================================
// 결과 화면 컴포넌트 (선택 통계)
// ===================================

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Users } from 'lucide-react';
import { Question, Participant } from '../types';
import { OPTION_LABELS, OPTION_COLORS } from '../types';

interface ResultViewProps {
  question: Question;
  participants: Participant[];
  onNext?: () => void;
  isTeacher?: boolean;
}

const ResultView: React.FC<ResultViewProps> = ({
  question,
  participants,
  onNext,
  isTeacher = false
}) => {
  // 선택지별 통계 계산
  const optionStats = question.options.map((_, idx) => {
    const count = participants.filter(p => p.lastAnswer === idx).length;
    return {
      index: idx,
      count,
      percentage: participants.length > 0
        ? Math.round((count / participants.length) * 100)
        : 0,
      isCorrect: idx === question.correctAnswer
    };
  });

  const totalAnswered = participants.filter(p => p.lastAnswer !== undefined).length;

  const barColors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-yellow-500',
    'bg-green-500'
  ];

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center p-4">
      {/* 정답 표시 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white text-gray-900 p-8 rounded-3xl shadow-2xl w-full mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <CheckCircle className="text-green-500" size={32} />
          <h2 className="text-2xl font-bold">정답</h2>
        </div>
        <div className={`inline-block px-8 py-4 rounded-2xl text-white text-3xl font-bold ${barColors[question.correctAnswer]}`}>
          {OPTION_LABELS[question.correctAnswer]}. {question.options[question.correctAnswer]}
        </div>
      </motion.div>

      {/* 응답 현황 */}
      <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} /> 응답 현황
          </h3>
          <span className="text-white/60">
            {totalAnswered}/{participants.length}명 응답
          </span>
        </div>

        <div className="space-y-4">
          {optionStats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              {/* 라벨 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${barColors[idx]}`}>
                    {OPTION_LABELS[idx]}
                  </span>
                  <span className="font-medium">{question.options[idx]}</span>
                  {stat.isCorrect && (
                    <CheckCircle className="text-green-400" size={20} />
                  )}
                </div>
                <span className="font-bold">
                  {stat.count}명 ({stat.percentage}%)
                </span>
              </div>

              {/* 바 */}
              <div className="h-8 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.percentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full ${barColors[idx]} ${stat.isCorrect ? 'ring-2 ring-green-400' : ''}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 다음 버튼 (선생님만) */}
      {isTeacher && onNext && (
        <motion.button
          onClick={onNext}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-blue-500 hover:bg-blue-600 text-white text-2xl font-jua px-10 py-5 rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          순위 보기
        </motion.button>
      )}
    </div>
  );
};

export default ResultView;
