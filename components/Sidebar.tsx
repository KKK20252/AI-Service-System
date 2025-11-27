import React from 'react';
import { LayoutDashboard, Book, MessageSquareText, PenTool, Settings, LogOut } from 'lucide-react';
import { AppSection } from '../types';

interface SidebarProps {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, onNavigate }) => {
  const menuItems = [
    { id: AppSection.DASHBOARD, label: '仪表盘', icon: LayoutDashboard },
    { id: AppSection.KNOWLEDGE_BASE, label: '知识库', icon: Book },
    { id: AppSection.CHAT_AUDIT, label: '会话质检', icon: MessageSquareText },
    { id: AppSection.SMART_DRAFTER, label: '智能话术助手', icon: PenTool },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-full flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 text-white mb-8">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">G</div>
          <span className="text-xl font-bold tracking-tight">CS Genius</span>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200
                ${currentSection === item.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white transition">
          <Settings size={20} />
          <span>设置</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 transition">
          <LogOut size={20} />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
};