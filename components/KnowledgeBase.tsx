import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, Search, Loader2, Save, Plus, Sparkles, Clipboard, Edit2, Check, X, Filter, FileSpreadsheet, FileType, Download, UploadCloud, Trash2, AlertTriangle } from 'lucide-react';
import { extractKnowledgeFromInput } from '../services/geminiService';
import { KnowledgeItem } from '../types';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

interface KnowledgeBaseProps {
  items: KnowledgeItem[];
  setItems: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
  onAddItems: (items: KnowledgeItem[]) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ items, setItems, onAddItems }) => {
  // Local UI state
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Constants
  const APP_OPTIONS = ['辞书', 'Test', '阅读', 'Kana', '会话', 'Web', '活动', '通用'];

  // Derived State
  const uniqueCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alternativeQuestions?.some(q => q.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesApp = filterApp === 'All' || item.app === filterApp;
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;

      return matchesSearch && matchesApp && matchesCategory;
    });
  }, [items, searchTerm, filterApp, filterCategory]);

  // Paste Event Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!importMode) return;

      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = clipboardItems[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setPreviewImage(event.target?.result as string);
            };
            reader.readAsDataURL(blob);
          }
          break; // Only take the first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [importMode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    try {
      // 1. Handle JSON Backup Import (Direct Restore/Share)
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        try {
          const importedItems = JSON.parse(text) as KnowledgeItem[];
          if (Array.isArray(importedItems)) {
             // Assign new IDs to avoid conflicts if needed, or keep strictly if syncing
             const validatedItems = importedItems.map(item => ({
               ...item,
               // Ensure basic fields exist
               id: item.id || Math.random().toString(36).substr(2, 9),
               lastUpdated: item.lastUpdated || new Date().toISOString().split('T')[0]
             }));
             onAddItems(validatedItems);
             alert(`成功导入 ${validatedItems.length} 条知识条目！`);
             setImportMode(false); // Close import mode on successful JSON import
          } else {
            alert('JSON 格式不正确，必须是知识条目数组。');
          }
        } catch (jsonError) {
          alert('无法解析 JSON 文件。');
        }
        setParsingFile(false);
        setPreviewImage(null);
        return; // Exit, do not process as raw text for AI
      }

      // 2. Handle Image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
          setParsingFile(false);
        };
        reader.readAsDataURL(file);
      } 
      // 3. Handle Word
      else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(prev => (prev ? prev + '\n\n' : '') + `[已导入 Word 文档 - ${file.name}]:\n${result.value}`);
        setParsingFile(false);
        setPreviewImage(null); 
      } 
      // 4. Handle Excel
      else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        const textRepresentation = JSON.stringify(jsonData, null, 2);
        setInputText(prev => (prev ? prev + '\n\n' : '') + `[已导入 Excel 文档 - ${file.name}]:\n${textRepresentation}`);
        setParsingFile(false);
        setPreviewImage(null);
      }
    } catch (error) {
      console.error("File parsing error:", error);
      alert("文件解析失败，请确保文件未损坏。");
      setParsingFile(false);
    }
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const processImport = async () => {
    setLoading(true);
    try {
      const base64Data = previewImage ? previewImage.split(',')[1] : undefined;
      const extracted = await extractKnowledgeFromInput(inputText, base64Data);
      
      const newItems: KnowledgeItem[] = extracted.map(item => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        lastUpdated: new Date().toISOString().split('T')[0],
        frequency: item.frequency
      }));

      // Call parent prop to update state
      onAddItems(newItems);
      
      setImportMode(false);
      setInputText('');
      setPreviewImage(null);
    } catch (error) {
      console.error(error);
      alert("分析失败，请检查您的 API Key 或文件内容。");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cs_genius_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Triggered when user clicks the trash icon
  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  // Triggered when user confirms in the modal
  const confirmDelete = () => {
    if (deleteTargetId) {
      setItems(prev => prev.filter(item => String(item.id) !== String(deleteTargetId)));
      
      // Clear editing state if the deleted item was being edited
      if (editingItemId === deleteTargetId) {
        setEditingItemId(null);
        setEditValue('');
      }
      setDeleteTargetId(null);
    }
  };

  // Edit Logic
  const startEditing = (item: KnowledgeItem) => {
    setEditingItemId(item.id);
    setEditValue(item.optimizedAnswer || '');
  };

  const saveEditing = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, optimizedAnswer: editValue } : item
    ));
    setEditingItemId(null);
    setEditValue('');
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditValue('');
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">知识库</h2>
          <p className="text-slate-500">AI 自动识别问题归类、相似问法，并提供专业话术。</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition shadow-sm"
            title="下载知识库备份 (JSON)"
          >
            <Download size={18} /> 备份/导出
          </button>
          <button 
            onClick={() => setImportMode(!importMode)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
          >
            {importMode ? '取消导入' : <><Plus size={18} /> 添加新知识</>}
          </button>
        </div>
      </div>

      {importMode && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            导入数据
            <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
              支持 JSON 备份还原、文档解析或截图识别
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">上传文件</label>
              <div 
                onClick={() => !parsingFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition relative
                  ${previewImage ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}
                  ${parsingFile ? 'opacity-50 cursor-wait' : ''}`}
              >
                {parsingFile ? (
                  <div className="flex flex-col items-center justify-center py-4 text-indigo-600">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="text-sm font-medium">正在解析文档内容...</span>
                  </div>
                ) : previewImage ? (
                  <div className="relative group">
                     <img src={previewImage} alt="Preview" className="max-h-48 mx-auto rounded shadow-sm" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-sm rounded">
                        点击更换图片
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-400 py-4">
                    <div className="flex gap-2 mb-2">
                      <UploadCloud size={24} />
                      <FileSpreadsheet size={24} />
                      <FileType size={24} />
                    </div>
                    <span className="font-medium text-slate-600">点击上传文件</span>
                    <span className="text-xs mt-1 text-slate-400">支持 JSON 备份, PNG/JPG, Word, Excel</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".json, image/png, image/jpeg, image/webp, .docx, .xlsx, .xls"
                  onChange={handleFileUpload}
                  disabled={parsingFile}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-700 mb-2">AI 智能提取 (针对非 JSON 文档)</label>
              <textarea 
                className="flex-1 border border-slate-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-white text-slate-900"
                placeholder="此处显示解析后的文本内容... 如果您上传的是 JSON 备份文件，数据将直接导入，无需通过 AI 分析。"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={processImport}
              disabled={loading || parsingFile || (!inputText && !previewImage)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {loading ? 'AI 识别归类中...' : '分析并入库'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索问题、问法或答案..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select 
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                value={filterApp}
                onChange={(e) => setFilterApp(e.target.value)}
              >
                <option value="All">所有 App</option>
                {APP_OPTIONS.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <select 
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All">所有分类</option>
                {uniqueCategories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>
        
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b w-[100px]">所属 App</th>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b w-[120px]">分类</th>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b w-[25%]">问题 & 相似问法</th>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b w-[35%]">回答 (原始 vs AI优化)</th>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b w-[80px]">频率</th>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b">更新时间</th>
                <th className="p-4 font-semibold text-slate-600 text-sm border-b w-[80px] text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 group align-top">
                  <td className="p-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {item.app}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-600 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900 mb-2">{item.question}</div>
                    {item.alternativeQuestions && item.alternativeQuestions.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">用户常问:</div>
                        <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5">
                          {item.alternativeQuestions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="space-y-3">
                      <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 block mb-1">原始回复</span>
                        {item.answer}
                      </div>
                      
                      {item.optimizedAnswer && (
                        <div className={`text-sm text-slate-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100 relative group/edit transition-all duration-200 ${editingItemId === item.id ? 'ring-2 ring-indigo-400 bg-white shadow-md' : ''}`}>
                          <span className="text-xs font-bold text-indigo-600 bg-white border border-indigo-100 px-1.5 py-0.5 rounded absolute -top-2 left-2 flex items-center gap-1 z-10 shadow-sm">
                              <Sparkles size={10} /> AI 优化
                          </span>
                          
                          {editingItemId === item.id ? (
                            <div className="mt-2">
                              <textarea
                                className="w-full p-2 text-sm border border-indigo-200 rounded bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                rows={4}
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                 <button 
                                  onClick={cancelEditing} 
                                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 rounded transition"
                                 >
                                   <X size={12}/> 取消
                                 </button>
                                 <button 
                                  onClick={() => saveEditing(item.id)} 
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition shadow-sm"
                                 >
                                   <Check size={12}/> 保存
                                 </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mt-1 leading-relaxed">{item.optimizedAnswer}</div>
                              <button 
                                onClick={() => startEditing(item)}
                                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded opacity-0 group-hover/edit:opacity-100 transition-all duration-200"
                                title="修改话术"
                              >
                                <Edit2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${item.frequency === '高' || item.frequency === 'High' ? 'bg-red-100 text-red-700' : 
                        item.frequency === '中' || item.frequency === 'Medium' ? 'bg-orange-100 text-orange-700' : 
                        'bg-green-100 text-green-700'}`}>
                      {item.frequency}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">{item.lastUpdated}</td>
                  <td className="p-4 text-center">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestDelete(item.id);
                      }}
                      className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无知识条目，请导入数据以开始使用。</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除？</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  您确定要从知识库中永久删除这条内容吗？<br/>此操作无法撤销。
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteTargetId(null)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                  >
                    取消
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm"
                  >
                    确认删除
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};