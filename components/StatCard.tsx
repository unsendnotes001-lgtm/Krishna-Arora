
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex items-center space-x-4 transition-all hover:shadow-md">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass} text-white shadow-lg`}>
        <i className={`fas ${icon} text-xl`}></i>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
