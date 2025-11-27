import React, { useState, useEffect } from 'react';
import { X, Save, Book } from 'lucide-react';
import { KnowledgeItem } from '../types';

interface SaveToKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<KnowledgeItem, 'id' | 'lastUpdated'>) => void;
  initialQuestion: string;
  initialAnswer: string;
  initialOptimizedAnswer?: string;
}

export const SaveToKnowledgeModal: React.FC<SaveToKnowledgeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuestion,
  initialAnswer,
  initialOptimizedAnswer
}) => {
  const [app, setApp] = useState('通用');
  const [category, setCategory] = useState('通用');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [optimizedAnswer, setOptimizedAnswer] = useState('');
  const [frequency, setFrequency] = useState('中');

  useEffect(() => {
    if (isOpen) {
      setQuestion(initialQuestion);
      setAnswer(initialAnswer);
      setOptimizedAnswer(initialOptimizedAnswer || initialAnswer);
    }
  }, [isOpen, initialQuestion, initialAnswer, initialOptimizedAnswer]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      app,
      category,
      question,
      answer,
      optimizedAnswer,
      frequency,
      alternativeQuestions: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Book size={18} className="text-indigo-600" />
            保存到知识库
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">所属 App</label>
              <select 
                value={app} 
                onChange={e => setApp(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white text-slate-900"
              >
                {['辞书', 'Test', '阅读', 'Kana', '会话', 'Web', '活动', '通用'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">分类</label>
              <input 
                type="text" 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">标准问题</label>
            <input 
              type="text" 
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">原始/简略回答</label>
            <textarea 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none resize-none bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 flex justify-between">
              <span>AI 优化话术 (最终回复)</span>
              <span className="text-indigo-600 font-normal">将作为主要参考</span>
            </label>
            <textarea 
              value={optimizedAnswer}
              onChange={e => setOptimizedAnswer(e.target.value)}
              rows={4}
              className="w-full border border-indigo-200 bg-indigo-50/50 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none resize-none text-slate-900"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">频率</label>
             <div className="flex gap-4">
               {['高', '中', '低'].map(f => (
                 <label key={f} className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                   <input 
                    type="radio" 
                    name="frequency" 
                    value={f} 
                    checked={frequency === f} 
                    onChange={e => setFrequency(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                   />
                   {f}
                 </label>
               ))}
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
            >
              取消
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Save size={16} />
              保存条目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};