import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ShoppingBag, 
  CreditCard, 
  LogOut, 
  Settings,
  Shield,
  Receipt
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail?: string | null;
  userRole?: 'ADMIN' | 'RECEPTIONIST' | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userEmail, userRole, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'rooms', icon: <Calendar size={20} />, label: 'Mapa de Quartos' },
    ...(userEmail?.toLowerCase() === 'jeffersonbala31@gmail.com' || userRole === 'ADMIN'
      ? [{ id: 'users-admin', icon: <Shield size={20} />, label: 'Usuários/Admin' }]
      : []),
    { id: 'guests', icon: <Users size={20} />, label: 'Hóspedes' },
    { id: 'products', icon: <ShoppingBag size={20} />, label: 'Produtos' },
    { id: 'finance', icon: <CreditCard size={20} />, label: 'Financeiro' },
    { id: 'cashier-closing', icon: <Receipt size={20} />, label: 'Fechamento de Caixa' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-[#161a24] to-[#0f1118] border-r border-[#b89047]/20 p-8 hidden lg:flex flex-col h-full overflow-y-auto relative shadow-2xl shadow-slate-950/40">
      {/* Small design stripes */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b89047] via-[#dfc493] to-[#b89047]" />
      
      <div className="mb-12 relative flex flex-col pt-4">
        <div className="absolute top-[-10px] left-0 text-[9px] bg-[#b89047]/15 text-[#b89047] border border-[#b89047]/30 px-2.5 py-0.5 rounded-full font-sans tracking-widest font-black uppercase flex items-center gap-1">
          <span>⚜️ ELEGANCE & LUXURY ⚜️</span>
        </div>
        <h1 className="text-3xl font-serif text-[#b89047] italic font-bold tracking-wider drop-shadow-md">
          LANZUDO'S <span className="text-xl not-italic text-white">HOTEL</span>
        </h1>
        <p className="text-[9px] tracking-[0.3em] text-[#b89047]/80 uppercase font-black mt-1 flex items-center gap-1 drop-shadow-sm">
          PMS & RESERVAS
        </p>
      </div>
      
      <nav className="space-y-4 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 ${
              activeTab === item.id 
                ? 'bg-[#b89047] text-white shadow-xl shadow-[#b89047]/10 font-black scale-[1.02]' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className={activeTab === item.id ? 'text-white' : 'text-[#b89047]'}>
              {item.icon}
            </span>
            <span className="text-sm tracking-tight uppercase">{item.label}</span>
          </button>
        ))}
      </nav>
 
      <div className="border-t border-white/10 pt-6 mt-6 space-y-4">
        <button className="w-full flex items-center gap-4 px-6 py-3 text-white/50 hover:text-white transition-colors">
          <Settings size={18} className="text-[#b89047]" />
          <span className="text-sm">Configurações</span>
        </button>
        <button onClick={onLogout} className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl group transition-all text-left">
          <div className="flex items-center gap-3 text-white/60 group-hover:text-[#b89047] transition-colors">
            <LogOut size={18} className="text-[#b89047]" /> 
            <span className="text-sm font-bold">Troca de Turno</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-[#b89047]/50 group-hover:text-white">Encerrar</span>
        </button>
      </div>
    </aside>
  );
};
