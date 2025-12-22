// ===================================
// 선생님 로그인 컴포넌트
// ===================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface TeacherLoginProps {
  onLogin: (password: string) => boolean;
  onBack: () => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    const success = onLogin(password);
    if (!success) {
      setError('비밀번호가 올바르지 않습니다.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{
          y: 0,
          opacity: 1,
          x: isShaking ? [0, -10, 10, -10, 10, 0] : 0
        }}
        transition={{ duration: isShaking ? 0.5 : 0.3 }}
        className="bg-white text-gray-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
            <Shield size={40} className="text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-jua text-center mb-2">선생님 로그인</h2>
        <p className="text-gray-500 text-center mb-8">
          퀴즈를 진행하려면 비밀번호를 입력하세요
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="비밀번호"
              autoFocus
              className="w-full pl-12 pr-12 py-4 text-xl border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-jua py-4 rounded-xl shadow-lg transition-all active:scale-95"
          >
            로그인
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full mt-4 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors py-2"
        >
          <ArrowLeft size={20} />
          뒤로 가기
        </button>
      </motion.div>

      <p className="text-white/50 text-sm mt-8">
        기본 비밀번호: teacher123
      </p>
    </div>
  );
};

export default TeacherLogin;
