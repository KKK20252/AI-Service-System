import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ChatAudit } from './components/ChatAudit';
import { SmartDrafter } from './components/SmartDrafter';
import { AppSection, KnowledgeItem } from './types';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.DASHBOARD);
  
  // Shared Knowledge Base State
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([
    { 
      id: '1', 
      app: '辞书', 
      category: '会员问题', 
      question: '为什么我的退款被拒绝？', 
      alternativeQuestions: ['退款失败是什么原因？', '申请退款没通过', '怎么才能符合退款条件？'],
      answer: '只有在购买后 14 天内且未使用的商品才能申请退款。',
      optimizedAnswer: '我们完全理解您的困扰。根据我们的退款政策，退款通常适用于购买后 14 天内未使用的商品。虽然这次无法为您办理，但我们很乐意为您提供下一次订阅的折扣优惠。',
      frequency: '高', 
      lastUpdated: '2023-10-27' 
    },
    { 
      id: '2', 
      app: 'Test', 
      category: '使用问题', 
      question: '应用启动崩溃 (iOS)', 
      alternativeQuestions: ['打开App就闪退', 'iOS版本无法进入应用', 'Test应用总是崩溃'],
      answer: '请确保版本为 2.4.5。尝试彻底卸载并重新安装。', 
      optimizedAnswer: '很抱歉给您带来不便。请尝试将应用更新至最新的 2.4.5 版本。如果问题依旧，建议您卸载后重新安装，这通常能解决大多数启动问题。如有需要，请随时联系我们。',
      frequency: '中', 
      lastUpdated: '2023-11-02' 
    },
  ]);

  const handleAddKnowledgeItems = (newItems: KnowledgeItem[]) => {
    setKnowledgeItems(prev => [...newItems, ...prev]);
  };

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.DASHBOARD:
        return <Dashboard items={knowledgeItems} />;
      case AppSection.KNOWLEDGE_BASE:
        return (
          <KnowledgeBase 
            items={knowledgeItems} 
            setItems={setKnowledgeItems} 
            onAddItems={handleAddKnowledgeItems}
          />
        );
      case AppSection.CHAT_AUDIT:
        return (
          <ChatAudit 
            onAddToKnowledgeBase={(item) => {
              const newItem: KnowledgeItem = {
                ...item,
                id: Date.now().toString(),
                lastUpdated: new Date().toISOString().split('T')[0]
              };
              handleAddKnowledgeItems([newItem]);
              alert("已成功保存到知识库！");
            }}
          />
        );
      case AppSection.SMART_DRAFTER:
        return (
          <SmartDrafter 
            onAddToKnowledgeBase={(item) => {
               const newItem: KnowledgeItem = {
                ...item,
                id: Date.now().toString(),
                lastUpdated: new Date().toISOString().split('T')[0]
              };
              handleAddKnowledgeItems([newItem]);
              alert("已成功保存到知识库！");
            }}
          />
        );
      default:
        return <Dashboard items={knowledgeItems} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar currentSection={currentSection} onNavigate={setCurrentSection} />
      <main className="flex-1 h-full overflow-hidden">
        {renderSection()}
      </main>
    </div>
  );
};

export default App;