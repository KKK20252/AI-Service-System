import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Book, Layers, Flame, Clock } from 'lucide-react';
import { KnowledgeItem } from '../types';

interface DashboardProps {
  items: KnowledgeItem[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export const Dashboard: React.FC<DashboardProps> = ({ items = [] }) => {
  
  // Calculate Stats
  const stats = useMemo(() => {
    const total = items.length;
    const apps = new Set(items.map(i => i.app)).size;
    const categories = new Set(items.map(i => i.category)).size;
    
    // Calculate "New this week"
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newCount = items.filter(i => {
       // Handle cases where lastUpdated might be missing or invalid
       if (!i.lastUpdated) return false;
       const d = new Date(i.lastUpdated);
       return !isNaN(d.getTime()) && d >= oneWeekAgo;
    }).length;

    return [
      { label: '知识库总条目', value: total, icon: Book, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: '覆盖产品 (App)', value: apps, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: '本周新增问题', value: newCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: '活跃分类数', value: categories, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];
  }, [items]);

  // Chart Data 1: By App
  const appDistribution = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
      const appName = i.app || '未分类';
      map.set(appName, (map.get(appName) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  // Chart Data 2: By Category
  const categoryDistribution = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
      const catName = i.category || '未分类';
      map.set(catName, (map.get(catName) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [items]);

  // Recent Items
  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const dateA = new Date(a.lastUpdated || 0).getTime();
        const dateB = new Date(b.lastUpdated || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [items]);

  return (
    <div className="p-6 overflow-y-auto h-full">
       <div className="mb-6">
         <h2 className="text-2xl font-bold text-slate-800">知识库概览</h2>
         <p className="text-slate-500">实时监控知识库内容分布与更新动态。</p>
       </div>

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         {stats.map((stat, idx) => (
           <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition hover:shadow-md">
             <div className={`p-4 rounded-full ${stat.bg} ${stat.color}`}>
               <stat.icon size={24} />
             </div>
             <div>
               <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
               <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
             </div>
           </div>
         ))}
       </div>

       {/* Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 min-h-[400px]">
         {/* App Distribution */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-slate-700 mb-4">各 App 问题数量分布</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" name="问题数量" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Category Distribution */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Top 热门问题分类</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
       </div>

       {/* Recent Items List */}
       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-700 mb-4">最近更新的知识条目</h3>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                 <tr>
                   <th className="p-3 font-medium">问题摘要</th>
                   <th className="p-3 font-medium">App</th>
                   <th className="p-3 font-medium">分类</th>
                   <th className="p-3 font-medium text-right">最后更新</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {recentItems.map(item => (
                   <tr key={item.id} className="hover:bg-slate-50 transition">
                     <td className="p-3 font-medium text-slate-700 max-w-md truncate" title={item.question}>{item.question}</td>
                     <td className="p-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">{item.app}</span></td>
                     <td className="p-3 text-slate-500">{item.category}</td>
                     <td className="p-3 text-slate-400 text-right font-mono text-xs">{item.lastUpdated}</td>
                   </tr>
                 ))}
                 {items.length === 0 && (
                   <tr><td colSpan={4} className="p-8 text-center text-slate-400">暂无数据，请前往知识库添加内容</td></tr>
                 )}
               </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}