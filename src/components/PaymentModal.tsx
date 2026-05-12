/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Banknote, QrCode, CreditCard as DebitIcon } from 'lucide-react';
import { Booking, Room, PaymentMethod } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  room: Room | null;
  onConfirm: (paymentMethod: PaymentMethod, discount: number) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  room,
  onConfirm
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountValue, setDiscountValue] = useState<string>('0');

  if (!isOpen || !booking) return null;

  const isAirbnb = booking.source === 'AIRBNB';
  const originalAirbnbTotal = (Number(booking.totalPrice) || 0) - (Number(booking.extraStayCharges) || 0);
  const repasseAirbnb = isAirbnb ? originalAirbnbTotal : 0;
  
  // O que deve ser pago no balcão de diárias: se for Airbnb, apenas as extensões locais.
  const stayTotal = isAirbnb ? (Number(booking.extraStayCharges) || 0) : (Number(booking.totalPrice) || 0);
  
  const consumptionsTotal = booking.consumptions?.reduce((acc, curr) => {
    return acc + (Number(curr.price) * Number(curr.quantity));
  }, 0) || 0;
  
  const discount = Number(discountValue) || 0;
  const subtotal = stayTotal + consumptionsTotal;
  const grandTotal = Math.max(0, subtotal - discount);

  const handleSelectPayment = async (method: PaymentMethod) => {
    setIsSubmitting(true);
    try {
      await onConfirm(method, discount);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = [
    { id: 'DINHEIRO' as PaymentMethod, label: 'Dinheiro', icon: Banknote, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { id: 'PIX' as PaymentMethod, label: 'PIX', icon: QrCode, color: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' },
    { id: 'DEBITO' as PaymentMethod, label: 'Débito', icon: DebitIcon, color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { id: 'CREDITO' as PaymentMethod, label: 'Crédito', icon: CreditCard, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-brand-slate rounded-[40px] border border-white/5 shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                <span className="text-[10px] text-brand-gold/70 uppercase font-black tracking-widest mb-1 block">Check-out de Unidade</span>
                <h2 className="text-3xl font-serif text-brand-cream">Finalizar Pagamento</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-white/[0.02] rounded-3xl p-6 mb-8 border border-white/5">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Hóspede</p>
                  <p className="text-xl font-serif text-brand-cream">{booking.guestName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Unidade</p>
                  <p className="text-xl font-serif text-brand-gold">{room?.number}</p>
                </div>
              </div>

              <div className="space-y-3 py-6 border-y border-white/5">
                {isAirbnb ? (
                  <div className="flex justify-between text-xs uppercase tracking-widest">
                    <span className="text-slate-500 font-bold">Total Diárias (Airbnb)</span>
                    <span className="text-brand-gold font-mono italic">Já Pago (Repasse: R$ {repasseAirbnb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs uppercase tracking-widest">
                    <span className="text-slate-500 font-bold">Total Diárias</span>
                    <span className="text-slate-300 font-mono italic">R$ {stayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs uppercase tracking-widest">
                  <span className="text-slate-500 font-bold">Total Consumo</span>
                  <span className="text-slate-300 font-mono italic">R$ {consumptionsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs uppercase tracking-widest pt-2">
                  <span className="text-brand-gold font-bold">Desconto Especial</span>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                    <span className="text-slate-500 font-mono">R$</span>
                    <input 
                      type="number" 
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-20 bg-transparent text-brand-cream font-mono outline-none text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Valor Final</span>
                <span className="text-4xl font-serif text-brand-cream italic">R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest text-center mb-6">Selecione o Método de Pagamento</p>
              
              <div className="grid grid-cols-2 gap-4">
                {paymentOptions.map((option) => (
                  <button
                    key={option.id}
                    disabled={isSubmitting}
                    onClick={() => handleSelectPayment(option.id)}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all hover:scale-[1.02] active:scale-95 group ${option.color} disabled:opacity-50`}
                  >
                    <option.icon size={24} className="transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-8 text-[9px] text-slate-600 uppercase font-black text-center tracking-tighter">
              A confirmação do pagamento liberará o quarto automaticamente para limpeza
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
