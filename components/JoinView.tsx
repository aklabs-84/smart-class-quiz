
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface JoinProps {
  onJoin: (name: string) => void;
}

const JoinView: React.FC<JoinProps> = ({ onJoin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white text-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm"
      >
        <h2 className="text-3xl font-jua text-center mb-8">퀴즈 참여하기</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            autoFocus
            className="w-full px-6 py-4 text-xl border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all text-center font-bold"
          />
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-2xl font-jua py-4 rounded-xl shadow-lg transition-all active:scale-95"
          >
            입장하기!
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default JoinView;
