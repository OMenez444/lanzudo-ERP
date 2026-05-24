/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Room, Booking } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, ShoppingBag } from 'lucide-react';
import { getLocalDateString } from '../lib/dateUtils';

interface TimelineViewProps {
  rooms: Room[];
  bookings: Booking[];
  onAddBooking: (roomId: string) => void;
  onManageConsumption: (roomId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ rooms, bookings, onAddBooking, onManageConsumption }) => {
  // Simular 10 dias a partir de hoje
  const days = Array.from({ length: 15 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      day: date.getDate(),
      weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      isToday: i === 0,
    };
  });

  return (
    <div className="bg-brand-slate border border-white/5 rounded-3xl overflow-hidden">
      {/* Timeline Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <h3 className="font-serif text-xl text-brand-cream">Planejamento Mensal</h3>
          <div className="flex items-center gap-2 text-slate-500">
            <button className="p-1 hover:text-brand-gold transition-colors"><ChevronLeft size={20}/></button>
            <span className="text-xs font-bold uppercase tracking-widest">Abril 2026</span>
            <button className="p-1 hover:text-brand-gold transition-colors"><ChevronRight size={20}/></button>
          </div>
        </div>
        <div className="flex gap-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-gold"></div>
                <span className="text-[10px] text-slate-500 font-black uppercase">Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10 border border-white/10"></div>
                <span className="text-[10px] text-slate-500 font-black uppercase">Livre</span>
            </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Days Header */}
          <div className="flex border-b border-white/5">
            <div className="w-64 flex-shrink-0 p-4 border-r border-white/5 text-[10px] text-slate-600 font-black uppercase tracking-widest bg-white/[0.03]">
              Unidades
            </div>
            {days.map((d, i) => (
              <div 
                key={i} 
                className={`flex-1 p-4 border-r border-white/5 text-center transition-colors ${d.isToday ? 'bg-brand-gold/10' : ''}`}
              >
                <p className={`text-[10px] uppercase font-bold mb-1 ${d.isToday ? 'text-brand-gold' : 'text-slate-500'}`}>
                    {d.weekday}
                </p>
                <p className={`text-lg font-serif ${d.isToday ? 'text-brand-gold font-bold' : 'text-slate-200'}`}>
                    {d.day}
                </p>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {rooms.map((room) => (
            <div key={room.id} className="flex border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
              <div className="w-64 flex-shrink-0 p-6 border-r border-white/5 bg-white/[0.03]">
                <p className="text-xs text-brand-gold/70 font-black uppercase tracking-tighter mb-1">Suíte {room.number}</p>
                <p className="text-sm font-serif text-brand-cream truncate">{room.type}</p>
              </div>
              
              {days.map((d, i) => {
                // Verificar se existe uma reserva para esta unidade e data
                const dateAtCell = new Date();
                dateAtCell.setDate(dateAtCell.getDate() + i);
                const dateStr = getLocalDateString(dateAtCell);

                const activeBooking = bookings.find(b => 
                  b.roomId === room.id && 
                  b.status === 'CONFIRMED' &&
                  dateStr >= b.checkIn && 
                  dateStr <= b.checkOut
                );

                const isCleaning = room.status === 'CLEANING' && i === 0;

                return (
                  <div 
                    key={i} 
                    className="flex-1 border-r border-white/5 relative h-20 group/cell"
                  >
                    {activeBooking && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => onManageConsumption(room.id)}
                        className="absolute inset-y-2 left-2 right-2 bg-brand-gold rounded-xl shadow-xl shadow-brand-gold/10 z-10 p-3 flex flex-col justify-center overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group/booking"
                      >
                         <div className="flex justify-between items-start gap-1">
                            <p className="text-[10px] text-brand-bg font-black uppercase tracking-tighter truncate leading-none mb-1">
                                {activeBooking.guestName}
                            </p>
                            <ShoppingBag size={10} className="text-brand-bg/40 opacity-0 group-hover/booking:opacity-100 transition-opacity" />
                         </div>
                         <p className="text-[8px] text-brand-bg/60 font-bold uppercase truncate leading-none">
                            {activeBooking.createdBy ? `Recepcionista: ${activeBooking.createdBy.name}` : `Estadia em curso`}
                         </p>
                      </motion.div>
                    )}

                    {isCleaning && (
                      <div className="absolute inset-y-4 left-2 right-2 bg-sky-500/20 border border-sky-500/30 rounded-lg z-10 flex items-center justify-center">
                         <span className="text-[8px] text-sky-400 font-black uppercase">Limpeza</span>
                      </div>
                    )}

                    {!activeBooking && !isCleaning && (
                      <button 
                        onClick={() => onAddBooking(room.id)}
                        className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 flex items-center justify-center bg-white/5 transition-all text-brand-gold"
                      >
                        <Plus size={20} className="transform scale-75 group-hover/cell:scale-100 transition-transform" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
