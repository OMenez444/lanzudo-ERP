import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Sparkles
} from 'lucide-react';
import { Stat } from '../types';

interface DashboardStatsProps {
  stats: Stat[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const getIcon = (label: string) => {
    switch (label) {
      case 'Ocupação': return <Users size={16} className="text-brand-gold" />;
      case 'Check-ins': return <Calendar size={16} className="text-brand-gold" />;
      case 'Receita': return <DollarSign size={16} className="text-brand-gold" />;
      case 'Limpeza': return <Sparkles size={16} className="text-brand-gold" />;
      default: return <Calendar size={16} className="text-brand-gold" />;
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {stats.map((stat, i) => (
        <div key={i} className="bg-brand-slate p-6 rounded-3xl border border-white/5 hover:border-brand-gold/20 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] uppercase text-slate-500 font-black tracking-[0.2em]">{stat.label}</p>
            <div className="p-2 rounded-xl bg-brand-gold/10 text-brand-gold group-hover:scale-110 transition-transform">
              {getIcon(stat.label)}
            </div>
          </div>
          <p className="text-3xl font-serif text-brand-cream">{stat.value}</p>
          <div className="flex items-center gap-2 mt-2 bg-white/[0.03] w-fit px-2 py-0.5 rounded-full border border-white/5">
            {stat.trend === 'up' ? (
              <TrendingUp size={12} className="text-emerald-500" />
            ) : (
              <TrendingDown size={12} className="text-rose-500" />
            )}
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
