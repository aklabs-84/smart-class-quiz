import React, { useEffect, useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Question, TIMER_OPTIONS } from '../types';

export interface NewQuestionInput {
  text: string;
  options: [string, string, string, string];
  correctAnswer: number;
  timeLimit: number;
}

interface TeacherQuestionFormProps {
  onAddQuestion: (payload: NewQuestionInput) => Promise<boolean>;
  onUpdateQuestion: (payload: Question) => Promise<boolean>;
  isSaving: boolean;
  useApi: boolean;
  questions: Question[];
}

const TeacherQuestionForm: React.FC<TeacherQuestionFormProps> = ({
  onAddQuestion,
  onUpdateQuestion,
  isSaving,
  useApi,
  questions,
}) => {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'CREATE' | 'EDIT'>(questions.length > 0 ? 'EDIT' : 'CREATE');
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    questions.length > 0 ? questions[0].id : null
  );

  const selectedQuestion = useMemo(
    () => questions.find(q => q.id === selectedQuestionId) || null,
    [questions, selectedQuestionId]
  );

  const updateOption = (index: number, value: string) => {
    setOptions(prev => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const loadQuestion = (question: Question) => {
    setText(question.text);
    setOptions([...question.options]);
    setCorrectAnswer(question.correctAnswer);
    setTimeLimit(question.timeLimit || 20);
  };

  const resetForm = () => {
    setText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setTimeLimit(20);
    setError(null);
  };

  useEffect(() => {
    if (questions.length === 0) {
      setMode('CREATE');
      setSelectedQuestionId(null);
      resetForm();
      return;
    }

    if (mode === 'EDIT') {
      const existing = questions.find(q => q.id === selectedQuestionId);
      if (!existing) {
        setSelectedQuestionId(questions[0].id);
      }
    }
  }, [questions, mode, selectedQuestionId]);

  useEffect(() => {
    if (mode === 'EDIT' && selectedQuestion) {
      loadQuestion(selectedQuestion);
    }
  }, [mode, selectedQuestionId, selectedQuestion]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError('문제 내용을 입력해주세요.');
      return;
    }

    if (options.some(opt => !opt.trim())) {
      setError('보기 4개를 모두 입력해주세요.');
      return;
    }

    const payload = {
      text: text.trim(),
      options: [
        options[0].trim(),
        options[1].trim(),
        options[2].trim(),
        options[3].trim(),
      ] as [string, string, string, string],
      correctAnswer,
      timeLimit,
    };

    if (mode === 'EDIT' && selectedQuestion) {
      const success = await onUpdateQuestion({
        ...payload,
        id: selectedQuestion.id,
      });
      if (success) {
        loadQuestion({
          ...payload,
          id: selectedQuestion.id,
        });
      }
      return;
    }

    const success = await onAddQuestion(payload);
    if (success) {
      resetForm();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-black/30 backdrop-blur-md border border-white/15 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <PlusCircle className="text-yellow-300" />
        <h3 className="text-2xl font-jua">문제 직접 추가</h3>
        <span className="text-sm text-white/60">
          {useApi ? 'Google Sheets에 저장됩니다.' : 'API 미설정: 로컬에만 저장됩니다.'}
        </span>
      </div>

      {questions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMode('EDIT')}
            className={`px-4 py-2 rounded-2xl font-jua text-sm transition-all ${
              mode === 'EDIT' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
            }`}
          >
            기존 문제 수정
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('CREATE');
              resetForm();
            }}
            className={`px-4 py-2 rounded-2xl font-jua text-sm transition-all ${
              mode === 'CREATE' ? 'bg-yellow-400 text-black' : 'bg-white/5 text-white/60'
            }`}
          >
            새 문제 추가
          </button>
          {mode === 'EDIT' && (
            <select
              value={selectedQuestionId ?? undefined}
              onChange={(event) => setSelectedQuestionId(Number(event.target.value))}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white"
            >
              {questions.map(question => (
                <option key={question.id} value={question.id} className="text-black">
                  {question.id}. {question.text.slice(0, 24)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/70 mb-2">문제 내용</label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
            placeholder="예) 대한민국의 수도는 어디인가요?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['A', 'B', 'C', 'D'].map((label, idx) => (
            <div key={label}>
              <label className="block text-white/70 mb-2">보기 {label}</label>
              <input
                value={options[idx]}
                onChange={(event) => updateOption(idx, event.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                placeholder={`선택지 ${label}`}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-white/70 mb-3">정답 선택</label>
            <div className="grid grid-cols-4 gap-2">
              {['A', 'B', 'C', 'D'].map((label, idx) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setCorrectAnswer(idx)}
                  className={`rounded-xl py-3 font-bold transition-all ${
                    correctAnswer === idx ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="md:w-64">
            <label className="block text-white/70 mb-3">제한 시간</label>
            <div className="grid grid-cols-2 gap-2">
              {TIMER_OPTIONS.map(option => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setTimeLimit(option)}
                  className={`rounded-xl py-3 font-bold transition-all ${
                    timeLimit === option ? 'bg-blue-500 text-white' : 'bg-white/10 text-white'
                  }`}
                >
                  {option}초
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-300 text-black font-jua text-xl px-8 py-4 rounded-2xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? '저장 중...' : mode === 'EDIT' ? '수정 저장하기' : '문제 저장하기'}
        </button>
      </form>
    </div>
  );
};

export default TeacherQuestionForm;
