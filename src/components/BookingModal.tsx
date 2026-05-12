/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Users, Star, CreditCard } from 'lucide-react';
import { Room, Guest } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoomId?: string;
  rooms: Room[];
  guests: Guest[];
  onConfirm: (bookingData: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    roomId: string;
    guestsCount: number;
    discount: number;
    source: 'DIRECT' | 'AIRBNB' | 'BOOKING';
    customPricePerNight?: number;
  }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedRoomId, 
  rooms,
  guests,
  onConfirm 
}) => {
  const [formData, setFormData] = useState<{
    guestName: string;
    checkIn: string;
    checkOut: string;
    roomId: string;
    guestsCount: number;
    discount: number;
    source: 'DIRECT' | 'AIRBNB' | 'BOOKING';
    customPricePerNight?: number;
  }>({
    guestName: '',
    checkIn: '',
    checkOut: '',
    roomId: selectedRoomId || rooms[0]?.id || '',
    guestsCount: 1,
    discount: 0,
    source: 'DIRECT',
    customPricePerNight: 0,
  });

  const nights = formData.checkIn && formData.checkOut 
    ? Math.max(0, Math.ceil((new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Pricing rules: 1=139, 2=189, 3=279
  let pricePerNight = 139;
  if (formData.guestsCount === 2) pricePerNight = 189;
  if (formData.guestsCount === 3) pricePerNight = 279;
  if (formData.guestsCount >= 4 || formData.source === 'AIRBNB') {
    pricePerNight = formData.customPricePerNight || 0;
  }
  
  const totalPrice = Math.max(0, (pricePerNight * nights) - formData.discount);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
    onClose();
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
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-brand-slate border border-white/5 rounded-[32px] overflow-hidden shadow-2xl"
        >
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-serif text-brand-cream">Novo Agendamento</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Lanzudo's Experience</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* User Info */}
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="text" 
                    list="guest-suggestions"
                    placeholder="Nome completo do hóspede" 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                    value={formData.guestName}
                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    required
                  />
                  <datalist id="guest-suggestions">
                    {guests.map(g => (
                      <option key={g.id} value={g.fullName} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-slate-400"
                      value={formData.checkIn}
                      onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-slate-400"
                      value={formData.checkOut}
                      onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="number" 
                    min="1"
                    max="4"
                    placeholder="Quantidade de Hóspedes" 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white"
                    value={formData.guestsCount}
                    onChange={(e) => setFormData({ ...formData, guestsCount: Math.min(4, Math.max(1, parseInt(e.target.value) || 1)) })}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-black uppercase">Hóspedes</span>
                </div>
              </div>

              {/* Room & Experience Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Unidade</label>
                  <select 
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white appearance-none"
                  >
                    {rooms.map(room => (
                      <option key={room.id} value={room.id} className="bg-brand-slate">
                        {room.number} - {room.type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Origem (Plataforma)</label>
                  <select 
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as 'DIRECT' | 'AIRBNB' | 'BOOKING' })}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white appearance-none"
                  >
                    <option value="DIRECT" className="bg-brand-slate">Direta (Recepção/Whats)</option>
                    <option value="AIRBNB" className="bg-brand-slate">Airbnb</option>
                    <option value="BOOKING" className="bg-brand-slate">Booking.com</option>
                  </select>
                </div>
              </div>

              <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="text-brand-gold" size={20} />
                  <span className="text-sm font-bold text-brand-cream uppercase tracking-tight">Tarifário Dinâmico</span>
                </div>
                
                {formData.source === 'AIRBNB' ? (
                  <div className="bg-brand-gold/10 p-4 rounded-xl border border-brand-gold/20 mb-4">
                    <p className="text-brand-gold text-xs font-bold uppercase tracking-tight mb-2">Reserva via Airbnb</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed mb-4">
                      Para reservas do Airbnb, a plataforma já gerencia o pagamento das diárias. 
                      Insira abaixo o valor líquido repassado (opcional). Os consumos locais serão cobrados à parte no check-out.
                    </p>
                    <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="text-slate-500 text-sm font-mono">R$</span>
                      <input 
                        type="number"
                        value={formData.customPricePerNight || ''}
                        onChange={(e) => setFormData({ ...formData, customPricePerNight: Number(e.target.value) })}
                        placeholder="Valor por Diária Repassado (0,00)"
                        className="bg-transparent text-brand-cream font-serif text-xl outline-none w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div className={`p-2 rounded-xl text-center border ${formData.guestsCount === 1 ? 'bg-brand-gold text-brand-bg border-brand-gold' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                        <p className="text-[8px] font-black uppercase">1 Pessoa</p>
                        <p className="text-xs font-mono">139,00</p>
                      </div>
                      <div className={`p-2 rounded-xl text-center border ${formData.guestsCount === 2 ? 'bg-brand-gold text-brand-bg border-brand-gold' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                        <p className="text-[8px] font-black uppercase">2 Pessoas</p>
                        <p className="text-xs font-mono">189,00</p>
                      </div>
                      <div className={`p-2 rounded-xl text-center border ${formData.guestsCount === 3 ? 'bg-brand-gold text-brand-bg border-brand-gold' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                        <p className="text-[8px] font-black uppercase">3 Pessoas</p>
                        <p className="text-xs font-mono">279,00</p>
                      </div>
                      <div className={`p-2 rounded-xl text-center border ${formData.guestsCount >= 4 ? 'bg-brand-gold text-brand-bg border-brand-gold' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                        <p className="text-[8px] font-black uppercase">4 Pessoas</p>
                        <p className="text-xs font-mono">A combinar</p>
                      </div>
                    </div>

                    {formData.guestsCount >= 4 && (
                      <div className="mt-4 pt-4 border-t border-brand-gold/10">
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest px-1 mb-2">
                          <span className="text-brand-gold font-black">Valor da Diária Personalizado (4 Hóspedes)</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                          <span className="text-slate-500 text-sm font-mono">R$</span>
                          <input 
                            type="number"
                            value={formData.customPricePerNight || ''}
                            onChange={(e) => setFormData({ ...formData, customPricePerNight: Number(e.target.value) })}
                            placeholder="0,00"
                            className="bg-transparent text-brand-cream font-serif text-xl outline-none w-full"
                          />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-2 italic">* O valor informado será multiplicado pelo total de noites.</p>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-4 pt-4 border-t border-brand-gold/10">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-widest px-1 mb-2">
                    <span className="text-brand-gold font-black">Desconto Personalizado</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                    <span className="text-slate-500 text-sm font-mono">R$</span>
                    <input 
                      type="number"
                      value={formData.discount || ''}
                      onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      placeholder="0,00"
                      className="bg-transparent text-brand-cream font-serif text-xl outline-none w-full"
                    />
                  </div>
                  <p className="text-[9px] text-slate-600 mt-2 italic">* O valor informado será subtraído do total da estadia.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CreditCard size={18} />
                  <span className="text-xs font-bold uppercase tracking-tighter">
                    Estadia: {nights} noites | Total: R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-brand-gold hover:bg-brand-gold/80 text-brand-bg px-10 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl shadow-brand-gold/20 transition-all"
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
