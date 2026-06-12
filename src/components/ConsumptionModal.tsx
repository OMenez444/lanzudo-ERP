/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, Product, BookingStatusLog, Room, PaymentMethod, AppUser } from '../types';
import { formatDisplayDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingBag, CreditCard, History, User, Trash2, Edit3, Check, DollarSign } from 'lucide-react';

interface ConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  products: Product[];
  onAddConsumption: (bookingId: string, product: Product, quantity: number) => Promise<void>;
  onRemoveConsumption: (bookingId: string, consumptionId: string) => Promise<void>;
  onCheckOut: (roomId: string) => Promise<void>;
  onExtendStay: (bookingId: string, newCheckOut: string) => Promise<void>;
  onUpdateBooking: (bookingId: string, updates: { 
    guestsCount?: number; 
    stayTotal?: number;
    upfrontPaid?: boolean;
    upfrontPaymentAmount?: number;
    upfrontPaymentMethod?: PaymentMethod;
    upfrontPaidAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    upfrontPaidBy?: { uid: string; email: string | null; name: string | null; } | null;
  }) => Promise<void>;
  onCancelBooking: (bookingId: string) => Promise<void>;
  rooms: Room[];
  onMoveGuest: (bookingId: string, newRoomId: string) => Promise<void>;
  currentUser?: {
    uid: string;
    email: string | null;
    name: string | null;
  } | null;
  users?: AppUser[];
}

export const ConsumptionModal: React.FC<ConsumptionModalProps> = ({ 
  isOpen, 
  onClose, 
  booking, 
  products,
  onAddConsumption,
  onRemoveConsumption,
  onCheckOut,
  onExtendStay,
  onUpdateBooking,
  onCancelBooking,
  rooms,
  onMoveGuest,
  currentUser,
  users
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [newCheckOutDate, setNewCheckOutDate] = useState('');
  
  const [selectedNewRoomId, setSelectedNewRoomId] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editGuestsCount, setEditGuestsCount] = useState(1);
  const [editStayTotal, setEditStayTotal] = useState(0);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logs, setLogs] = useState<BookingStatusLog[]>([]);

  const [upfrontAmount, setUpfrontAmount] = useState<string>('');
  const [upfrontMethod, setUpfrontMethod] = useState<PaymentMethod>('PIX');
  const [upfrontReceiverUid, setUpfrontReceiverUid] = useState<string>('');
  const [isSavingUpfront, setIsSavingUpfront] = useState(false);

  const bookingId = booking?.id;
  const isAirbnb = booking ? booking.source === 'AIRBNB' : false;
  const stayTotal = booking ? (isAirbnb ? (Number(booking.extraStayCharges) || 0) : (Number(booking.totalPrice) || 0)) : 0;
  const repasseAirbnb = isAirbnb ? ((Number(booking.totalPrice) || 0) - (Number(booking.extraStayCharges) || 0)) : 0;

  useEffect(() => {
    if (!bookingId) {
      return;
    }
    const q = query(
      collection(db, 'statusLogs'),
      where('bookingId', '==', bookingId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BookingStatusLog[];
      
      logsData.sort((a, b) => {
        const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      
      setLogs(logsData);
    }, (error) => {
      console.error("Erro ao carregar logs de status:", error);
    });
    return () => unsubscribe();
  }, [bookingId]);

  useEffect(() => {
    if (booking) {
      const targetAmount = booking.upfrontPaymentAmount !== undefined ? booking.upfrontPaymentAmount.toString() : stayTotal.toString();
      const targetMethod = booking.upfrontPaymentMethod || 'PIX';
      setUpfrontAmount((prev) => (prev !== targetAmount ? targetAmount : prev)); // eslint-disable-line
      setUpfrontMethod((prev) => (prev !== targetMethod ? targetMethod : prev));
      
      const targetReceiverUid = booking.upfrontPaidBy?.uid || currentUser?.uid || '';
      setUpfrontReceiverUid((prev) => (prev !== targetReceiverUid ? targetReceiverUid : prev));
    }
  }, [bookingId, stayTotal, booking, currentUser]);

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

  const handleUpdateDetails = async () => {
    setIsUpdatingDetails(true);
    try {
      await onUpdateBooking(booking.id, {
        guestsCount: editGuestsCount,
        stayTotal: editStayTotal
      });
      setIsEditingDetails(false);
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleCancelBooking = async () => {
    if (window.confirm("Certeza que deseja cancelar esta reserva? O quarto ficará disponível novamente.")) {
      setIsCancelling(true);
      try {
        await onCancelBooking(booking.id);
      } finally {
        setIsCancelling(false);
      }
    }
  };

  const handleMoveRoom = async () => {
    if (!selectedNewRoomId) return;
    setIsMoving(true);
    try {
      await onMoveGuest(booking.id, selectedNewRoomId);
      setSelectedNewRoomId('');
    } finally {
      setIsMoving(false);
    }
  };

  const handleSaveUpfront = async () => {
    if (!booking) return;
    setIsSavingUpfront(true);
    try {
      const amount = parseFloat(upfrontAmount) || 0;
      
      const selectedUser = users?.find(u => u.uid === upfrontReceiverUid);
      const receiverInfo = selectedUser ? {
        uid: selectedUser.uid,
        email: selectedUser.email || null,
        name: selectedUser.name || selectedUser.email?.split('@')[0] || 'Desconhecido'
      } : (currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email || null,
        name: currentUser.name || currentUser.email?.split('@')[0] || 'Desconhecido'
      } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' });

      await onUpdateBooking(booking.id, {
        upfrontPaid: true,
        upfrontPaymentAmount: amount,
        upfrontPaymentMethod: upfrontMethod,
        upfrontPaidAt: new Date().toISOString(),
        upfrontPaidBy: receiverInfo
      });
    } catch (error) {
      console.error("Erro ao salvar pagamento antecipado:", error);
    } finally {
      setIsSavingUpfront(false);
    }
  };

  const handleResetUpfront = async () => {
    if (!booking) return;
    if (window.confirm("Certeza que deseja estornar/cancelar este pagamento antecipado?")) {
      setIsSavingUpfront(true);
      try {
        await onUpdateBooking(booking.id, {
          upfrontPaid: false,
          upfrontPaymentAmount: 0,
          upfrontPaymentMethod: 'PIX',
          upfrontPaidAt: null,
          upfrontPaidBy: null
        });
      } catch (error) {
        console.error("Erro ao estornar pagamento antecipado:", error);
      } finally {
        setIsSavingUpfront(false);
      }
    }
  };

  const totalConsumido = booking ? (booking.consumptions?.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) || 0) : 0;
  const grandTotal = totalConsumido + stayTotal;
  const upfrontAmt = booking?.upfrontPaid ? (Number(booking.upfrontPaymentAmount) || 0) : 0;
  const finalGrandTotal = Math.max(0, grandTotal - upfrontAmt);

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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User className="text-slate-600" size={16} />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Informações da Estadia</span>
                  </div>
                  {!isEditingDetails ? (
                    <button onClick={() => {
                      setEditGuestsCount(booking.guestsCount || 1);
                      setEditStayTotal(stayTotal);
                      setIsEditingDetails(true);
                    }} className="text-brand-gold hover:text-brand-gold/80 transition-colors p-1" title="Editar Informações">
                      <Edit3 size={14} />
                    </button>
                  ) : (
                    <button onClick={() => setIsEditingDetails(false)} className="text-slate-500 hover:text-slate-300 transition-colors p-1" title="Cancelar Edição">
                      <X size={14} />
                    </button>
                  )}
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
                  
                  {isEditingDetails ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase tracking-tighter">Qtd. Hóspedes</span>
                        <input 
                          type="number"
                          min="1"
                          className="bg-white/5 border border-white/5 rounded px-2 py-1 w-20 text-right text-brand-cream font-mono focus:outline-none focus:border-brand-gold/50 transition-all"
                          value={editGuestsCount}
                          onChange={(e) => setEditGuestsCount(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase tracking-tighter">Valor das Diárias</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">R$</span>
                          <input 
                            type="number"
                            min="0"
                            step="0.01"
                            className="bg-white/5 border border-white/5 rounded px-2 py-1 w-24 text-right text-brand-cream font-mono focus:outline-none focus:border-brand-gold/50 transition-all"
                            value={editStayTotal}
                            onChange={(e) => setEditStayTotal(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <button 
                         onClick={handleUpdateDetails}
                         disabled={isUpdatingDetails}
                         className="w-full bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 disabled:opacity-50 transition-colors rounded-xl py-3 text-[10px] uppercase font-black tracking-widest mt-2 flex items-center justify-center gap-2"
                      >
                         {isUpdatingDetails ? 'Salvando...' : <><Check size={14} /> Salvar Alterações</>}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase tracking-tighter">Qtd. Hóspedes</span>
                        <span className="text-slate-300 font-mono">{booking.guestsCount || 1}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 uppercase tracking-tighter">Valor Diárias {isAirbnb && repasseAirbnb > 0 && <span className="lowercase text-[8px] text-brand-gold/70 ml-1">(Adicionais)</span>}</span>
                        <span className="text-slate-300 font-mono">R$ {stayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

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

                  <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
                    <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest block">Mover Quarto</span>
                    <div className="flex items-center gap-2">
                      <select 
                        value={selectedNewRoomId}
                        onChange={(e) => setSelectedNewRoomId(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brand-gold/50"
                      >
                        <option value="">Selecione o novo quarto</option>
                        {rooms.filter(r => r.status === 'AVAILABLE').map(room => (
                          <option key={room.id} value={room.id}>
                            Quarto {room.number} - {room.type}
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={handleMoveRoom}
                        disabled={!selectedNewRoomId || isMoving}
                        className="bg-brand-gold text-brand-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:grayscale transition-all"
                      >
                        {isMoving ? '...' : 'Mover'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest flex items-center gap-1.5">
                        <DollarSign size={12} />
                        Pagamento Antecipado (No Início)
                      </span>
                      {booking.upfrontPaid ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full">
                          Pago
                        </span>
                      ) : (
                        <span className="bg-slate-500/10 text-slate-400 border border-slate-500/10 text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full">
                          Não Registrado
                        </span>
                      )}
                    </div>

                    {!booking.upfrontPaid ? (
                      <div className="space-y-3 bg-white/[0.01] p-3.5 rounded-2xl border border-white/5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase text-slate-500 font-extrabold tracking-wider block">Valor Recebido (R$)</label>
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={stayTotal.toFixed(2)}
                              value={upfrontAmount}
                              onChange={(e) => setUpfrontAmount(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 rounded-xl py-1.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-brand-gold/70"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase text-slate-500 font-extrabold tracking-wider block">Forma de Pgto</label>
                            <select 
                              value={upfrontMethod}
                              onChange={(e) => setUpfrontMethod(e.target.value as PaymentMethod)}
                              className="w-full bg-brand-slate border border-white/5 rounded-xl py-1.5 px-2 text-xs text-white focus:outline-none focus:border-brand-gold/70"
                            >
                              <option value="DINHEIRO">Dinheiro</option>
                              <option value="PIX">PIX</option>
                              <option value="DEBITO">Débito</option>
                              <option value="CREDITO">Crédito</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-slate-500 font-extrabold tracking-wider block">Recebido por (Colaborador)</label>
                          <select 
                            value={upfrontReceiverUid}
                            onChange={(e) => setUpfrontReceiverUid(e.target.value)}
                            className="w-full bg-brand-slate border border-white/5 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-brand-gold/70"
                          >
                            {users && users.length > 0 ? (
                              users.filter(u => u.status === 'ACTIVE').map(u => (
                                <option key={u.uid} value={u.uid} className="bg-brand-slate text-white">
                                  {u.name || u.email?.split('@')[0]}
                                </option>
                              ))
                            ) : (
                              <option value={currentUser?.uid || ''} className="bg-brand-slate text-white">
                                {currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuário Atual'}
                              </option>
                            )}
                          </select>
                        </div>
                        <button 
                          onClick={handleSaveUpfront}
                          disabled={isSavingUpfront}
                          className="w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/10 transition-colors rounded-xl py-2 text-[9px] uppercase font-black tracking-wider flex items-center justify-center gap-1"
                        >
                          {isSavingUpfront ? 'Salvando...' : 'Confirmar Recebimento'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/[0.02] p-3.5 rounded-2xl border border-emerald-500/10 text-xs text-brand-cream space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Valor Pago Antecipado:</span>
                          <span className="font-bold text-emerald-450 font-mono">
                            R$ {Number(booking.upfrontPaymentAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Forma de Pagamento:</span>
                          <span className="font-bold text-brand-gold text-xs">{booking.upfrontPaymentMethod || 'PIX'}</span>
                        </div>
                        {booking.upfrontPaidBy && (
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Processado por:</span>
                            <span>{booking.upfrontPaidBy.name}</span>
                          </div>
                        )}
                        <button 
                          onClick={handleResetUpfront}
                          disabled={isSavingUpfront}
                          className="w-full text-slate-500 hover:text-red-450 text-[8px] uppercase tracking-widest font-black pt-2 transition-colors border-t border-white/5 block text-center"
                        >
                          Cancelar Pagamento Antecipado
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Histórico de Alterações de Status (Logs de Auditoria) */}
              <div className="pt-8 mt-6 border-t border-white/5 pb-2">
                <div className="flex items-center gap-2 mb-4">
                  <History className="text-brand-gold font-bold" size={16} />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    Rastreabilidade de Status (Histórico de Alterações)
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                  {logs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-2">Sem histórico de status registrado.</p>
                  ) : (
                    <div className="relative border-l border-white/10 ml-2 pl-6 space-y-6">
                      {logs.map((log) => {
                        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                        const formattedTime = isNaN(date.getTime()) 
                          ? 'Sincronizando...' 
                          : date.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
                        
                        const getStatusBadge = (status: Booking['status'] | 'NONE') => {
                          switch (status) {
                            case 'CONFIRMED':
                              return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">Confirmada</span>;
                            case 'CHECKED_IN':
                              return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/10 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">Em Uso</span>;
                            case 'CHECKED_OUT':
                              return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/10 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">Encerrada</span>;
                            case 'CANCELLED':
                              return <span className="bg-red-500/10 text-red-400 border border-red-500/10 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">Cancelada</span>;
                            case 'NONE':
                            default:
                              return <span className="bg-white/5 text-slate-500 border border-white/5 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">Nenhum</span>;
                          }
                        };

                        return (
                          <div key={log.id} className="relative group">
                            {/* Pontinho da linha do tempo */}
                            <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-gold border-2 border-brand-slate group-hover:scale-125 transition-transform" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {getStatusBadge(log.previousStatus)}
                                  <span className="text-slate-600 text-xs font-bold font-sans">➔</span>
                                  {getStatusBadge(log.newStatus)}
                                </div>
                                <p className="text-xs text-brand-cream font-medium mt-1">
                                  Alterado por: <span className="text-brand-gold">{log.updatedBy?.name || 'Desconhecido'}</span> 
                                  <span className="text-slate-500 text-[9px] ml-1">({log.updatedBy?.email || 'N/A'})</span>
                                </p>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap self-start sm:self-center">
                                {formattedTime}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                    <span>Subtotal de Consumo</span>
                    <span className="text-slate-300">R$ {totalConsumido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    <span>Diárias Estadia {isAirbnb && repasseAirbnb > 0 && <span className="lowercase text-[8px] text-brand-gold/70">(Adicionais)</span>}</span>
                    <span className="text-slate-300">R$ {stayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {isAirbnb && repasseAirbnb > 0 && (
                    <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      <span>Repasse Airbnb (Já Pago)</span>
                      <span className="text-brand-gold">R$ {repasseAirbnb.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {booking && booking.upfrontPaid && (
                    <div className="flex justify-between text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                      <span>Pgto Antecipado ({booking.upfrontPaymentMethod || 'PIX'})</span>
                      <span>- R$ {upfrontAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="pt-4 flex justify-between items-end">
                    <div className="flex items-center gap-2 text-brand-gold">
                      <CreditCard size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{booking && booking.upfrontPaid ? 'Saldo Restante' : 'Total Geral'}</span>
                    </div>
                    <span className="text-3xl font-serif text-brand-cream">
                      R$ {finalGrandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  
                  <button 
                    onClick={handleCancelBooking}
                    disabled={isCancelling}
                    className="w-full py-2 text-red-500/50 hover:text-red-500 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
                  >
                    {isCancelling ? 'CANCELANDO...' : 'Cancelar Reserva'}
                  </button>
                </div>
              </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
