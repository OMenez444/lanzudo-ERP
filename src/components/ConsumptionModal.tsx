/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingBag, CreditCard, History, User, Trash2 } from 'lucide-react';
import { Booking, Product } from '../types';
import { formatDisplayDate } from '../lib/dateUtils';

interface ConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  products: Product[];
  onAddConsumption: (bookingId: string, product: Product, quantity: number) => Promise<void>;
  onRemoveConsumption: (bookingId: string, consumptionId: string) => Promise<void>;
  onCheckOut: (roomId: string) => Promise<void>;
  onExtendStay: (bookingId: string, newCheckOut: string) => Promise<void>;
}

export const ConsumptionModal: React.FC<ConsumptionModalProps> = ({ 
  isOpen, 
  onClose, 
  booking, 
  products,
  onAddConsumption,
  onRemoveConsumption,
  onCheckOut,
  onExtendStay
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [newCheckOutDate, setNewCheckOutDate] = useState('');

  if (!isOpen || !booking) return null;

  const handleAdd = async () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddConsumption(booking.id, product, quantity);
      setQuantity(1);
      setSelectedProductId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setIsCheckingOut(true);
    try {
      await onCheckOut(booking.roomId);
      onClose();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleExtend = async () => {
    if (!newCheckOutDate) return;
    setIsExtending(true);
    try {
      await onExtendStay(booking.id, newCheckOutDate);
      setNewCheckOutDate('');
    } finally {
      setIsExtending(false);
    }
  };

  const totalConsumido = booking.consumptions?.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-brand-slate border border-brand-gold/10 rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh] md:h-auto max-h-[90vh]"
        >
          {/* Left Side: Adding Products */}
          <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-serif text-brand-cream">Consumo da Unidade</h3>
                <p className="text-[10px] text-brand-gold uppercase tracking-widest font-black mt-1">
                  Lançamento de Itens: {booking.guestName}
                </p>
              </div>
              <button onClick={onClose} className="md:hidden p-2 hover:bg-white/5 rounded-full text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Selecionar Produto</label>
                  <div className="relative">
                    <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/50" size={18} />
                    <select 
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white appearance-none"
                    >
                      <option value="" className="bg-brand-slate text-slate-500">Escolha um item do catálogo</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="bg-brand-slate">
                          {p.name} - R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest px-1">Quantidade</label>
                    <div className="flex items-center bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-4 hover:bg-white/10 text-slate-400 transition-colors"
                      >
                        <Minus size={18} />
                      </button>
                      <input 
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="flex-1 bg-transparent text-center text-sm font-bold focus:outline-none text-white font-mono"
                      />
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-4 hover:bg-white/10 text-slate-400 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button 
                      onClick={handleAdd}
                      disabled={!selectedProductId || isSubmitting}
                      className="h-[52px] bg-brand-gold text-brand-bg px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-gold/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                      {isSubmitting ? 'Lançando...' : 'Lançar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-slate-600" size={16} />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Informações da Estadia</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 uppercase tracking-tighter">Hóspede</span>
                    <span className="text-brand-cream font-bold">{booking.guestName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 uppercase tracking-tighter">Check-in</span>
                    <span className="text-slate-300 font-mono">{formatDisplayDate(booking.checkIn)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 uppercase tracking-tighter">Check-out Previsto</span>
                    <span className="text-slate-300 font-mono">{formatDisplayDate(booking.checkOut)}</span>
                  </div>
                  <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
                    <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest block">Prolongar Estadia</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date"
                        min={booking.checkOut}
                        value={newCheckOutDate}
                        onChange={(e) => setNewCheckOutDate(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                      />
                      <button 
                        onClick={handleExtend}
                        disabled={!newCheckOutDate || isExtending}
                        className="bg-brand-gold text-brand-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:grayscale transition-all"
                      >
                        {isExtending ? '...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Consumption Summary */}
          <div className="w-full md:w-[380px] bg-black/20 p-8 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-2">
                 <History className="text-brand-gold" size={20} />
                 <h4 className="font-serif text-brand-cream text-lg">Extrato de Conta</h4>
               </div>
               <button onClick={onClose} className="hidden md:block p-2 hover:bg-white/5 rounded-full text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 space-y-3 mb-8">
              {!booking.consumptions || booking.consumptions.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag size={40} className="mx-auto text-slate-700 mb-4 opacity-20" />
                  <p className="text-xs text-slate-600 italic">Nenhum produto lançado até o momento.</p>
                </div>
              ) : (
                booking.consumptions.map((item) => (
                  <div key={item.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center group relative border border-transparent hover:border-brand-gold/10 transition-all pr-12">
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 uppercase tracking-tight">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {item.quantity}x R$ {(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-gold font-mono">
                        R$ {((item.price || 0) * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[8px] text-slate-600 uppercase font-black">Lançado agora</p>
                    </div>
                    <button
                      onClick={() => onRemoveConsumption(booking.id, item.id)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                      title="Remover Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    <span>Subtotal Consumo</span>
                    <span className="text-slate-300">R$ {totalConsumido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    <span>Diárias Estadia</span>
                    <span className="text-slate-300">R$ {(booking.totalPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-4 flex justify-between items-end">
                    <div className="flex items-center gap-2 text-brand-gold">
                      <CreditCard size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Geral</span>
                    </div>
                    <span className="text-3xl font-serif text-brand-cream">
                      R$ {((booking.totalPrice || 0) + totalConsumido).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button 
                    onClick={handleFinalize}
                    disabled={isCheckingOut}
                    className="w-full bg-brand-gold text-brand-bg py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand-gold/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isCheckingOut ? 'ENCERRANDO...' : 'Finalizar Experiência'}
                  </button>

                  <button 
                    onClick={onClose}
                    className="w-full py-2 text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
                  >
                    Fechar Painel
                  </button>
                </div>
              </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
