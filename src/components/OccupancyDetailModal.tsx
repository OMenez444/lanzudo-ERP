import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Search, DoorOpen, Calendar, ArrowRight, Home } from 'lucide-react';
import { Room, Booking } from '../types';
import { formatDisplayDate } from '../lib/dateUtils';

interface OccupancyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  bookings: Booking[];
}

export const OccupancyDetailModal: React.FC<OccupancyDetailModalProps> = ({
  isOpen,
  onClose,
  rooms,
  bookings
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Get only occupied rooms
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED');

  // Match each occupied room with its active booking (status === 'CONFIRMED' and matching roomId)
  const occupiedDetails = occupiedRooms.map(room => {
    const booking = bookings.find(b => b.roomId === room.id && b.status === 'CONFIRMED');
    const guestsCount = booking?.guestsCount || 1;
    return {
      room,
      booking,
      guestName: room.guest || booking?.guestName || 'Desconhecido',
      guestsCount,
      source: booking?.source || 'DIRECT',
      checkIn: booking?.checkIn || '',
      checkOut: booking?.checkOut || ''
    };
  });

  // Calculate totals
  const totalOccupiedRooms = occupiedRooms.length;
  const totalGuests = occupiedDetails.reduce((sum, item) => sum + item.guestsCount, 0);

  const breakdown1Num = occupiedDetails.filter(item => item.guestsCount === 1).length;
  const breakdown2Num = occupiedDetails.filter(item => item.guestsCount === 2).length;
  const breakdown3Num = occupiedDetails.filter(item => item.guestsCount === 3).length;
  const breakdown4OrMoreNum = occupiedDetails.filter(item => item.guestsCount >= 4).length;

  // Filter based on search term
  const filteredDetails = occupiedDetails.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.guestName.toLowerCase().includes(term) ||
      item.room.number.toString().includes(term) ||
      item.room.type.toLowerCase().includes(term)
    );
  });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'AIRBNB':
        return (
          <span className="text-[8px] bg-[#FF5A5F]/10 text-[#FF5A5F] border border-[#FF5A5F]/20 font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
            Airbnb
          </span>
        );
      case 'BOOKING':
        return (
          <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
            Booking
          </span>
        );
      default:
        return (
          <span className="text-[8px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
            Balcão
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-bg/85 backdrop-blur-md"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-brand-slate rounded-[40px] border border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 pb-4 border-b border-white/5 flex justify-between items-start">
            <div>
              <span className="text-[10px] text-brand-gold/70 uppercase font-black tracking-widest mb-1 block">Visão Geral da Ocupação</span>
              <h2 className="text-3xl font-serif text-brand-cream">Hóspedes Hospedados</h2>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-8 overflow-y-auto flex-1 space-y-8">
            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card Total Hospedes */}
              <div className="bg-gradient-to-br from-brand-gold/10 to-transparent p-6 rounded-3xl border border-brand-gold/10 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Total de Hóspedes</span>
                  <div className="p-2 rounded-xl bg-brand-gold/10 text-brand-gold">
                    <Users size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-4xl font-serif font-bold text-brand-gold">{totalGuests}</h3>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mt-1">Atualmente no hotel</p>
                </div>
              </div>

              {/* Card Quartos Ocupados */}
              <div className="bg-white/[0.01] p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Quartos Ocupados</span>
                  <div className="p-2 rounded-xl bg-white/5 text-slate-400">
                    <DoorOpen size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-4xl font-serif font-bold text-brand-cream">{totalOccupiedRooms}</h3>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mt-1">Quartos com hóspedes ativos</p>
                </div>
              </div>

              {/* Breakdown de reservas por tamanho */}
              <div className="bg-white/[0.01] p-6 rounded-3xl border border-white/5 space-y-2 flex flex-col justify-center">
                <span className="text-[8px] uppercase tracking-widest text-slate-500 font-black block mb-2">Pessoas por Reserva</span>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Individual (1 pessoa):
                  </span>
                  <span className="font-mono font-bold text-brand-cream">{breakdown1Num} {breakdown1Num === 1 ? 'quarto' : 'quartos'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                    Duplo (2 pessoas):
                  </span>
                  <span className="font-mono font-bold text-brand-gold">{breakdown2Num} {breakdown2Num === 1 ? 'quarto' : 'quartos'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Triplo (3 pessoas):
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{breakdown3Num} {breakdown3Num === 1 ? 'quarto' : 'quartos'}</span>
                </div>

                {breakdown4OrMoreNum > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Quadruplo (4+ pessoas):
                    </span>
                    <span className="font-mono font-bold text-purple-400">{breakdown4OrMoreNum} {breakdown4OrMoreNum === 1 ? 'quarto' : 'quartos'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter and search */}
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Buscar hóspede, número da suíte ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-brand-cream text-sm focus:outline-none placeholder-slate-600"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-slate-500 hover:text-white text-xs font-mono uppercase bg-white/5 py-1 px-2 rounded-lg"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Guest list detailed view */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-black text-slate-500 tracking-[0.2em] mb-4">Quartos e Hóspedes Ativos ({filteredDetails.length})</h4>
              
              {filteredDetails.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                  <Home size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Nenhum hóspede encontrado com os termos digitados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDetails.map((item, index) => (
                    <div 
                      key={item.room.id || index}
                      className="bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors p-5 rounded-3xl space-y-3 relative group overflow-hidden"
                    >
                      {/* Top row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-brand-gold/70 font-black">Suíte No. {item.room.number}</span>
                          <h5 className="font-serif text-lg text-brand-cream">{item.room.type}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSourceBadge(item.source)}
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-xl flex items-center gap-1 ${
                            item.guestsCount === 1 
                              ? 'bg-slate-500/10 text-slate-400 border border-slate-500/10'
                              : item.guestsCount === 2
                                ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/10'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          }`}>
                            <Users size={10} />
                            {item.guestsCount} {item.guestsCount === 1 ? 'pessoa' : 'pessoas'}
                          </span>
                        </div>
                      </div>

                      {/* Line divider */}
                      <div className="border-t border-white/5" />

                      {/* Guest details & dates */}
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          <span className="text-[8px] uppercase tracking-widest text-slate-500 font-extrabold block">Hóspede Atual</span>
                          <span className="text-sm font-serif text-brand-cream font-medium block max-w-[170px] truncate">{item.guestName}</span>
                        </div>

                        {item.booking && (
                          <div className="text-right">
                            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-extrabold block mb-1">Período de Estadia</span>
                            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono">
                              <Calendar size={10} className="text-slate-500" />
                              <span>{formatDisplayDate(item.checkIn)}</span>
                              <ArrowRight size={8} className="text-slate-600" />
                              <span>{formatDisplayDate(item.checkOut)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 bg-slate-950/40 border-t border-white/5 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl text-xs font-bold text-slate-300 uppercase tracking-widest cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
