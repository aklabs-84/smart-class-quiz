// ===================================
// 카운트다운 컴포넌트 (3, 2, 1, GO!)
// ===================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownViewProps {
  onComplete?: () => void;
  duration?: number;
  startAt?: number;
}

const CountdownView: React.FC<CountdownViewProps> = ({
  onComplete,
  duration = 3,
  startAt
}) => {
  const [count, setCount] = useState(duration);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!startAt) return;

    hasCompletedRef.current = false;
    const updateCount = () => {
      const elapsed = (Date.now() - startAt) / 1000;
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      setCount(remaining);

      if (remaining <= 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (onComplete) {
          setTimeout(() => onComplete(), 800);
        }
      }
    };

    updateCount();
    const interval = setInterval(updateCount, 200);
    return () => clearInterval(interval);
  }, [duration, onComplete, startAt]);

  useEffect(() => {
    if (startAt) return;
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      // "GO!" 표시 후 완료 콜백
      const timer = setTimeout(() => {
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete, startAt]);

  const getColor = () => {
    if (count === 3) return 'text-red-400';
    if (count === 2) return 'text-yellow-400';
    if (count === 1) return 'text-green-400';
    return 'text-yellow-300';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: 1,
            rotate: 0
          }}
          exit={{ scale: 2, opacity: 0, rotate: 10 }}
          transition={{
            duration: 0.3,
            scale: {
              times: [0, 0.5, 1],
              duration: 0.5,
            }
          }}
          className={`text-[12rem] font-jua ${getColor()} drop-shadow-[0_0_50px_currentColor]`}
        >
          {count === 0 ? 'GO!' : count}
        </motion.div>
      </AnimatePresence>

      {/* 배경 펄스 효과 */}
      <motion.div
        key={`pulse-${count}`}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.8 }}
        className={`absolute w-64 h-64 rounded-full ${
          count === 3 ? 'bg-red-500' :
          count === 2 ? 'bg-yellow-500' :
          count === 1 ? 'bg-green-500' :
          'bg-yellow-500'
        }`}
      />
    </div>
  );
};

export default CountdownView;
