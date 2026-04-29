import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ShoppingBag, 
  CreditCard, 
  LogOut, 
  Settings 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'rooms', icon: <Calendar size={20} />, label: 'Mapa de Quartos' },
    { id: 'guests', icon: <Users size={20} />, label: 'Hóspedes' },
    { id: 'products', icon: <ShoppingBag size={20} />, label: 'Produtos' },
    { id: 'finance', icon: <CreditCard size={20} />, label: 'Financeiro' },
  ];

  return (
    <aside className="w-72 bg-brand-slate border-r border-white/5 p-8 hidden lg:flex flex-col h-full overflow-y-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-serif text-brand-gold italic font-bold">LANZUDO'S</h1>
        <p className="text-[9px] tracking-[0.4em] text-brand-cream uppercase font-black">Hotel Experience</p>
      </div>
      
      <nav className="space-y-4 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 ${
              activeTab === item.id 
                ? 'bg-brand-gold text-brand-bg shadow-xl shadow-brand-gold/10 font-bold' 
                : 'text-slate-500 hover:bg-white/5 hover:text-brand-cream'
            }`}
          >
            {item.icon}
            <span className="text-sm tracking-tight uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
        <button className="w-full flex items-center gap-4 px-6 py-3 text-slate-500 hover:text-slate-200 transition-colors">
          <Settings size={18} />
          <span className="text-sm">Configurações</span>
        </button>
        <button className="w-full flex items-center gap-4 px-6 py-3 text-slate-500 hover:text-red-400 transition-colors">
          <LogOut size={18} /> 
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
};
