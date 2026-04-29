import React from 'react';
import { Room } from '../types';
import { motion } from 'motion/react';
import { Edit2, BedDouble, Users } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onRelease: (id: string) => void;
  onEdit?: (room: Room) => void;
  onManageConsumption?: (roomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ 
  room, 
  onCheckIn, 
  onCheckOut, 
  onRelease, 
  onEdit,
  onManageConsumption 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'OCCUPIED': return 'bg-brand-gold/10 text-brand-gold border-brand-gold/20';
      case 'CLEANING': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'MAINTENANCE': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Livre';
      case 'OCCUPIED': return 'VIP';
      case 'CLEANING': return 'Limpeza';
      case 'MAINTENANCE': return 'Manutenção';
      default: return status;
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => {
        if (room.status === 'OCCUPIED' && onManageConsumption) {
          onManageConsumption(room.id);
        }
      }}
      className={`bg-brand-slate rounded-3xl border border-white/5 transition-all duration-500 group relative overflow-hidden flex flex-col ${room.status === 'OCCUPIED' ? 'cursor-pointer hover:border-brand-gold/30' : ''}`}
    >
      <div className="p-8 flex-1">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] text-brand-gold/70 uppercase font-black tracking-widest mb-1 block">Suíte No. {room.number}</span>
            <h4 className="text-2xl font-serif text-brand-cream">{room.type}</h4>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-[9px] px-3 py-1 rounded-full border font-black uppercase tracking-[0.1em] ${getStatusColor(room.status)}`}>
              {getStatusLabel(room.status)}
            </span>
            {onEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(room);
                }}
                className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-brand-gold hover:bg-white/10 transition-all"
                title="Editar Quarto"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-4">
          <div className="flex justify-between items-center bg-white/[0.03] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-gold/10 rounded-xl text-brand-gold">
                <BedDouble size={16} />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Camas</p>
                <p className="text-[10px] font-bold text-slate-200 uppercase">
                  {room.bedType?.replace(/_/g, ' ') || '1 CASAL'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-brand-cream font-black uppercase opacity-60">
              <Users size={12} /> MAX {room.bedType?.includes('1_SOLTEIRO') ? '1' : room.bedType?.includes('1_CASAL_1_SOLTEIRO') ? '3' : '2'}
            </div>
          </div>
          
          <div className="flex justify-between border-b border-white/5 pb-2 px-2">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Hóspede Atual</span>
            <span className="text-slate-200 font-serif text-sm truncate max-w-[120px]">{room.guest || '—'}</span>
          </div>

          <div className="flex justify-between px-2">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Tarifa</span>
            <span className="text-brand-gold font-mono italic text-sm">R$ 139,00</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-white/5">
        {room.status === 'AVAILABLE' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onCheckIn(room.id);
            }}
            className="w-full bg-white/5 hover:bg-brand-gold hover:text-brand-bg text-white py-3 rounded-xl text-xs font-bold transition-all border border-white/10 tracking-widest uppercase"
          >
            Realizar Check-in
          </button>
        )}
        {room.status === 'OCCUPIED' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onCheckOut(room.id);
            }}
            className="w-full bg-brand-gold text-brand-bg py-3 rounded-xl text-xs font-bold transition-all hover:bg-brand-gold/80 tracking-widest uppercase"
          >
            Finalizar Experiência
          </button>
        )}
        {room.status === 'CLEANING' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRelease(room.id);
            }}
            className="w-full bg-sky-500/10 text-sky-400 py-3 rounded-xl text-xs font-bold border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all tracking-widest uppercase"
          >
            Liberar Quarto
          </button>
        )}
        {room.status === 'MAINTENANCE' && (
          <button className="w-full bg-slate-800 text-slate-500 py-3 rounded-xl text-xs font-bold cursor-not-allowed italic uppercase">
            Em Manutenção
          </button>
        )}
      </div>
    </motion.div>
  );
};
