import React, { useState, useRef } from 'react';
import { Upload, MessageSquare, AlertCircle, CheckCircle, ArrowRight, Loader2, Sparkles, Save, Copy, Check } from 'lucide-react';
import { auditChatInteraction } from '../services/geminiService';
import { ChatAuditResult, KnowledgeItem } from '../types';
import { SaveToKnowledgeModal } from './SaveToKnowledgeModal';

interface ChatAuditProps {
  onAddToKnowledgeBase: (item: Omit<KnowledgeItem, 'id' | 'lastUpdated'>) => void;
}

export const ChatAudit: React.FC<ChatAuditProps> = ({ onAddToKnowledgeBase }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChatAuditResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
        setResult(null); // Reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const runAudit = async () => {
    if (!previewImage) return;
    setLoading(true);
    try {
      const base64Data = previewImage.split(',')[1];
      const auditData = await auditChatInteraction(base64Data);
      setResult({
        ...auditData,
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error(error);
      alert("分析失败，请检查图片或 API Key。");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.improvedResponse) return;
    try {
      await navigator.clipboard.writeText(result.improvedResponse);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
       // Fallback for some environments
       const textArea = document.createElement("textarea");
       textArea.value = result.improvedResponse;
       document.body.appendChild(textArea);
       textArea.select();
       document.execCommand("copy");
       document.body.removeChild(textArea);
       setIsCopied(true);
       setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col md:flex-row gap-6">
      {/* Left Panel: Upload */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">会话质检</h2>
          <p className="text-slate-500 mb-4">上传聊天记录截图，即刻进行质量检测。</p>
        </div>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 min-h-[300px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden
            ${previewImage ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}
        >
          {previewImage ? (
            <img src={previewImage} alt="Chat" className="absolute inset-0 w-full h-full object-contain p-4" />
          ) : (
            <>
              <Upload size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">上传聊天截图</p>
              <p className="text-slate-400 text-sm mt-2">支持 JPG, PNG 格式</p>
            </>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>

        <button 
          onClick={runAudit}
          disabled={!previewImage || loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
          {loading ? 'AI 正在分析...' : '开始智能质检'}
        </button>
      </div>

      {/* Right Panel: Results */}
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
            <MessageSquare size={64} className="mb-4" />
            <p>分析结果将显示在这里</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-indigo-600">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="animate-pulse">正在识别截图文本...</p>
            <p className="text-sm text-slate-400 mt-2">评估同理心与准确度中</p>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header Score */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">质量评估</h3>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  ['不满', '愤怒', 'Negative', 'Frustrated'].includes(result.sentiment) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  用户情绪: {result.sentiment}
                </span>
              </div>
              <div className={`text-3xl font-bold ${result.score >= 8 ? 'text-green-600' : result.score >= 5 ? 'text-orange-500' : 'text-red-500'}`}>
                {result.score}/10
              </div>
            </div>

            {/* Identified Issue */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">识别到的问题</h4>
              <p className="text-slate-800 font-medium">{result.userIssue}</p>
            </div>

            {/* Critique */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                <AlertCircle size={14} /> 分析与点评
              </h4>
              <p className="text-slate-600 leading-relaxed text-sm">{result.critique}</p>
            </div>

            {/* Improved Response */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={100} className="text-indigo-600" />
              </div>
              <h4 className="text-sm font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2">
                <CheckCircle size={16} /> 建议的优化回复
              </h4>
              <div className="bg-white rounded-lg p-4 text-slate-700 shadow-sm text-sm whitespace-pre-wrap font-medium relative z-10 border-l-4 border-indigo-500">
                {result.improvedResponse}
              </div>
              <div className="mt-3 flex gap-2">
                 <button 
                  onClick={handleCopy}
                  className={`px-3 py-1.5 border rounded-md text-xs font-medium transition flex items-center gap-1
                    ${isCopied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}
                  `}
                 >
                   {isCopied ? <Check size={12}/> : null}
                   {isCopied ? '已复制' : '复制'}
                 </button>
                 <button 
                  onClick={() => setShowSaveModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 flex items-center gap-1 transition"
                 >
                   <Save size={12} /> 保存到知识库
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <SaveToKnowledgeModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={onAddToKnowledgeBase}
          initialQuestion={result.userIssue}
          initialAnswer={result.agentResponseOriginal}
          initialOptimizedAnswer={result.improvedResponse}
        />
      )}
    </div>
  );
};