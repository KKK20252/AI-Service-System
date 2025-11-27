import React, { useState } from 'react';
import { PenTool, Send, Copy, RefreshCw, Loader2, Plus, Trash2, Book, Sparkles, Save, Check } from 'lucide-react';
import { generateDraftResponse } from '../services/geminiService';
import { SaveToKnowledgeModal } from './SaveToKnowledgeModal';
import { KnowledgeItem } from '../types';

interface CorpusItem {
  id: string;
  text: string;
}

interface SmartDrafterProps {
  onAddToKnowledgeBase: (item: Omit<KnowledgeItem, 'id' | 'lastUpdated'>) => void;
}

export const SmartDrafter: React.FC<SmartDrafterProps> = ({ onAddToKnowledgeBase }) => {
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('专业且共情');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Corpus State
  const [corpusItems, setCorpusItems] = useState<CorpusItem[]>([
    { id: '1', text: '称呼用户为“船友”' },
    { id: '2', text: '分段回复用户，采用微信对话形式沟通（短句、亲切）' }
  ]);
  const [newCorpusText, setNewCorpusText] = useState('');

  const handleAddCorpus = () => {
    if (!newCorpusText.trim()) return;
    const newItem: CorpusItem = {
      id: Date.now().toString(),
      text: newCorpusText.trim()
    };
    setCorpusItems([...corpusItems, newItem]);
    setNewCorpusText('');
  };

  const handleRemoveCorpus = (id: string) => {
    setCorpusItems(corpusItems.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCorpus();
    }
  };

  const handleGenerate = async () => {
    if (!keywords.trim()) return;
    setLoading(true);
    try {
      const corpusStrings = corpusItems.map(item => item.text);
      const result = await generateDraftResponse(keywords, tone, corpusStrings);
      setDraft(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      // Fallback for some environments
      const textArea = document.createElement("textarea");
      textArea.value = draft;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">智能话术助手</h2>
        <p className="text-slate-500">结合常用业务规则库，输入关键词，秒级生成专业回复。</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Column: Input & Corpus */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
          
          {/* Main Input */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">关键点 / 问题描述</label>
            <textarea 
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例如：用户申请退款被拒，因为购买已超过30天。提供下个月续费的9折优惠作为补偿。"
              className="w-full h-32 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
            />
            
            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">语气</label>
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none text-sm bg-slate-50"
              >
                <option>专业且共情 (Empathetic & Professional)</option>
                <option>正式且直接 (Formal & Direct)</option>
                <option>轻松友好 (Casual & Friendly)</option>
                <option>诚恳致歉 (Apologetic)</option>
              </select>
            </div>
          </div>

          {/* Corpus Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Book size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-700">常用语料 / 业务规则库</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">AI 在生成回复时会参考以下规则：</p>

            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={newCorpusText}
                onChange={(e) => setNewCorpusText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="添加规则，如：必须使用敬语 '您'"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={handleAddCorpus}
                className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 transition"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
              {corpusItems.length === 0 && (
                <div className="text-center text-slate-400 text-xs py-4">暂无自定义规则</div>
              )}
              {corpusItems.map(item => (
                <div key={item.id} className="group flex items-center justify-between bg-slate-50 px-3 py-2 rounded border border-slate-100 text-sm">
                  <span className="text-slate-700">{item.text}</span>
                  <button 
                    onClick={() => handleRemoveCorpus(item.id)}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading || !keywords}
            className="bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center gap-2 disabled:opacity-50 shadow-md transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <PenTool size={18} />}
            生成草稿
          </button>
        </div>

        {/* Right Column: Output */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Sparkles size={14} className="text-indigo-500" /> AI 生成结果
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setDraft('')}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition" title="清空"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-white relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 text-indigo-600">
                <Loader2 className="animate-spin mb-3" size={32} /> 
                <span className="font-medium animate-pulse">AI 正在思考并参考业务规则...</span>
              </div>
            ) : draft ? (
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm md:text-base">
                {draft}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 select-none">
                <PenTool size={48} className="mb-4 opacity-20" />
                <p>生成的回复将显示在这里</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
             <button 
               onClick={handleCopy}
               disabled={!draft}
               className={`flex-1 border text-slate-700 py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm font-medium text-sm
                 ${isCopied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-indigo-600'}
               `}
             >
               {isCopied ? <Check size={16} /> : <Copy size={16} />}
               {isCopied ? '已复制' : '复制'}
             </button>
             <button 
               onClick={() => setShowSaveModal(true)}
               disabled={!draft}
               className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm font-medium text-sm"
             >
               <Save size={16} /> 保存到知识库
             </button>
          </div>
        </div>
      </div>

      <SaveToKnowledgeModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={onAddToKnowledgeBase}
        initialQuestion={keywords}
        initialAnswer={draft}
        initialOptimizedAnswer={draft}
      />
    </div>
  );
};