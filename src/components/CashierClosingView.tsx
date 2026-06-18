import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Calendar as CalendarIcon, 
  Printer, 
  Coins, 
  CreditCard, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  History,
  FileText,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Booking, CashierClosing, PaymentMethod, Consumption } from '../types';

interface CashierClosingViewProps {
  bookings: Booking[];
  currentUser: {
    uid?: string;
    id?: string;
    email?: string | null;
    displayName?: string | null;
    name?: string | null;
  } | null;
  currentUserProfile?: {
    name: string | null;
    role: 'ADMIN' | 'RECEPTIONIST';
  } | null;
}

export const CashierClosingView: React.FC<CashierClosingViewProps> = ({ 
  bookings, 
  currentUser,
  currentUserProfile
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [selectedShift, setSelectedShift] = useState<'DIURNO' | 'NOTURNO'>('DIURNO');
  const [observations, setObservations] = useState<string>('');
  const [closingsHistory, setClosingsHistory] = useState<CashierClosing[]>([]);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashierClosing | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  // Subscribe to cashierClosings history
  useEffect(() => {
    const q = query(collection(db, 'cashierClosings'), orderBy('closedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history: CashierClosing[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          history.push({
            id: docSnap.id,
            ...data,
          } as CashierClosing);
        });
        setClosingsHistory(history);
      },
      (error) => {
        console.error("Error reading cashier closings history: ", error);
        handleFirestoreError(error, OperationType.LIST, 'cashierClosings');
      }
    );
    return () => unsubscribe();
  }, []);

  const getBookingFinalTotal = (b: Booking) => {
    const isAirbnb = b.source === 'AIRBNB';
    const stayTotal = isAirbnb ? (Number(b.extraStayCharges) || 0) : (Number(b.totalPrice) || 0);
    const consumptionTotal = b.consumptions?.reduce((acc, c) => acc + (c.price * c.quantity), 0) || 0;
    const discount = b.discount || 0;
    return b.finalTotal || Math.max(0, stayTotal + consumptionTotal - discount);
  };

  // Helper to parse dates without timezone shifts using localized hour slices
  const getShiftPeriod = (dateStr: string, shift: 'DIURNO' | 'NOTURNO') => {
    const [year, month, day] = dateStr.split('-').map(Number);
    // DIURNO: 07:00:00 to 18:59:59.999
    // NOTURNO: 19:00:00 to 06:59:59.999 of next day
    const start = new Date(year, month - 1, day, shift === 'DIURNO' ? 7 : 19, 0, 0, 0);
    const end = shift === 'DIURNO'
      ? new Date(year, month - 1, day, 19, 0, 0, 0)
      : new Date(year, month - 1, day + 1, 7, 0, 0, 0);
    return { start, end };
  };

  // Filter bookings checked out during the selected shift period
  const { start: shiftStart, end: shiftEnd } = getShiftPeriod(selectedDate, selectedShift);

  const currentUid = currentUser?.uid || currentUser?.id;

  const dailyTransactions: {
    id: string;
    type: 'CHECKOUT' | 'UPFRONT' | 'CONSUMPTION_SALE';
    booking: Booking;
    guestName: string;
    roomId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    operatorName: string;
    time: string;
    timestamp: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    details: string;
    consumptionsTotal?: number;
    discount?: number;
  }[] = [];

  bookings.forEach((b) => {
    // 1. Check if checkout transaction is during this shift & operator
    if (b.status === 'CHECKED_OUT' && b.checkedOutAt) {
      const checkoutDate = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
      if (checkoutDate >= shiftStart && checkoutDate < shiftEnd) {
        const checkoutOperatorUid = b.checkedOutBy?.uid || b.checkedOutBy?.id || b.createdBy?.uid || b.createdBy?.id;
        // Only show operations realized on the login of each collaborator
        if (checkoutOperatorUid === currentUid) {
          const consumptionsTotal = b.consumptions?.reduce((s, c) => s + (c.price * c.quantity), 0) || 0;
          const finalTotal = b.finalTotal !== undefined ? b.finalTotal : getBookingFinalTotal(b);
          
          dailyTransactions.push({
            id: `checkout_${b.id}`,
            type: 'CHECKOUT',
            booking: b,
            guestName: b.guestName || 'Hóspede',
            roomId: b.roomId || '',
            amount: finalTotal,
            paymentMethod: b.paymentMethod || 'DINHEIRO',
            operatorName: b.checkedOutBy?.name || b.createdBy?.name || 'Sistema',
            time: checkoutDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: b.checkedOutAt,
            details: 'Checkout de Estadia',
            consumptionsTotal,
            discount: b.discount || 0
          });
        }
      }
    }

    // 2. Check if upfront payments are during this shift & operator
    if (b.upfrontPaymentsList && b.upfrontPaymentsList.length > 0) {
      b.upfrontPaymentsList.forEach((upPay, idx) => {
        const upfrontDate = upPay.paidAt?.toDate ? upPay.paidAt.toDate() : new Date(upPay.paidAt);
        if (upfrontDate >= shiftStart && upfrontDate < shiftEnd) {
          const upfrontOperatorUid = upPay.paidBy?.uid || upPay.paidBy?.id;
          if (upfrontOperatorUid === currentUid) {
            dailyTransactions.push({
              id: `upfront_${b.id}_${upPay.id || idx}`,
              type: 'UPFRONT',
              booking: b,
              guestName: b.guestName || 'Hóspede',
              roomId: b.roomId || '',
              amount: upPay.amount || 0,
              paymentMethod: upPay.paymentMethod || 'PIX',
              operatorName: upPay.paidBy?.name || 'Sistema',
              time: upfrontDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              timestamp: upPay.paidAt,
              details: 'Pagamento Antecipado (Início)',
              consumptionsTotal: 0,
              discount: 0
            });
          }
        }
      });
    } else if (b.upfrontPaid && b.upfrontPaidAt) {
      const upfrontDate = b.upfrontPaidAt.toDate ? b.upfrontPaidAt.toDate() : new Date(b.upfrontPaidAt);
      if (upfrontDate >= shiftStart && upfrontDate < shiftEnd) {
        const upfrontOperatorUid = b.upfrontPaidBy?.uid || b.upfrontPaidBy?.id;
        if (upfrontOperatorUid === currentUid) {
          dailyTransactions.push({
            id: `upfront_${b.id}`,
            type: 'UPFRONT',
            booking: b,
            guestName: b.guestName || 'Hóspede',
            roomId: b.roomId || '',
            amount: b.upfrontPaymentAmount || 0,
            paymentMethod: b.upfrontPaymentMethod || 'PIX',
            operatorName: b.upfrontPaidBy?.name || 'Sistema',
            time: upfrontDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: b.upfrontPaidAt,
            details: 'Pagamento Antecipado (Início)',
            consumptionsTotal: 0,
            discount: 0
          });
        }
      }
    }

    // 3. Check for immediate paid consumptions during this shift & operator
    if (b.consumptions && b.consumptions.length > 0) {
      b.consumptions.forEach((c) => {
        if (c.isPaidImmediate && c.paidAt) {
          const paidDate = c.paidAt.toDate ? c.paidAt.toDate() : new Date(c.paidAt);
          if (paidDate >= shiftStart && paidDate < shiftEnd) {
            const paidOperatorUid = c.paidBy?.uid || c.paidBy?.id;
            if (paidOperatorUid === currentUid) {
              dailyTransactions.push({
                id: `consumption_${b.id}_${c.id}`,
                type: 'CONSUMPTION_SALE',
                booking: b,
                guestName: b.guestName || 'Hóspede',
                roomId: b.roomId || '',
                amount: (c.price || 0) * (c.quantity || 1),
                paymentMethod: c.paymentMethod || 'DINHEIRO',
                operatorName: c.paidBy?.name || 'Sistema',
                time: paidDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: c.paidAt,
                details: `${c.productName} (${c.quantity}x)`,
                consumptionsTotal: (c.price || 0) * (c.quantity || 1),
                discount: 0
              });
            }
          }
        }
      });
    }
  });

  // Get active bookings with pending consumptions (room tab)
  const activeUnpaidConsumptions: {
    bookingId: string;
    roomId: string;
    guestName: string;
    itemsCount: number;
    totalAmount: number;
    consumptions: Consumption[];
  }[] = [];

  bookings.forEach((b) => {
    if (b.status === 'CONFIRMED') {
      const unpaidList = b.consumptions?.filter(c => !c.isPaidImmediate) || [];
      if (unpaidList.length > 0) {
        const totalAmount = unpaidList.reduce((acc, c) => acc + (c.price * c.quantity), 0);
        activeUnpaidConsumptions.push({
          bookingId: b.id,
          roomId: b.roomId || '',
          guestName: b.guestName || 'Hóspede',
          itemsCount: unpaidList.reduce((acc, c) => acc + c.quantity, 0),
          totalAmount,
          consumptions: unpaidList
        });
      }
    }
  });

  // Sort dailyTransactions by time
  dailyTransactions.sort((a, b) => {
    const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
    const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  // Calculate totals by payment method from transactions
  const totals = dailyTransactions.reduce(
    (acc, tx) => {
      const value = tx.amount;
      const method = tx.paymentMethod || 'DINHEIRO';
      if (method === 'DINHEIRO') acc.DINHEIRO += value;
      else if (method === 'PIX') acc.PIX += value;
      else if (method === 'DEBITO') acc.DEBITO += value;
      else if (method === 'CREDITO') acc.CREDITO += value;
      acc.total += value;
      return acc;
    },
    { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0, total: 0 }
  );

  const isZeroClosing = dailyTransactions.length === 0;

  // Check if a closing is already officialised for this date and shift
  const currentClosingRecord = closingsHistory.find((c) => c.date === selectedDate && c.shift === selectedShift);

  const handleSaveClosing = async () => {
    if (!currentUser) return;
    setSaveStatus('SAVING');
    setErrorMessage('');
    try {
      const closingId = `closing_${selectedDate}_${selectedShift}`;
      const payload: CashierClosing = {
        date: selectedDate || '',
        shift: selectedShift || 'DIURNO',
        closedByUid: currentUser.uid || currentUser.id || 'unknown',
        closedByName: currentUserProfile?.name || currentUser.name || currentUser.displayName || 'Colaborador',
        closedByEmail: currentUser.email || null,
        closedAt: new Date().toISOString(),
        totalRevenue: Number(totals.total) || 0,
        totalCash: Number(totals.DINHEIRO) || 0,
        totalPix: Number(totals.PIX) || 0,
        totalDebit: Number(totals.DEBITO) || 0,
        totalCredit: Number(totals.CREDITO) || 0,
        wasZero: isZeroClosing || false,
        observations: observations || '',
      };

      await setDoc(doc(db, 'cashierClosings', closingId), payload);

      // Create a statusLog entry for the global logs
      const logRef = doc(collection(db, 'statusLogs'));
      await setDoc(logRef, {
        id: logRef.id,
        type: 'CASHIER_CLOSING',
        shift: selectedShift || 'DIURNO',
        date: selectedDate || '',
        totalRevenue: Number(totals.total) || 0,
        updatedBy: {
          uid: currentUser.uid || currentUser.id || 'unknown',
          email: currentUser.email || null,
          name: currentUserProfile?.name || currentUser.name || currentUser.displayName || 'Colaborador',
        },
        timestamp: new Date().toISOString()
      });

      setSaveStatus('SUCCESS');
      setObservations('');
      setTimeout(() => setSaveStatus('IDLE'), 3000);
    } catch (e: unknown) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setSaveStatus('ERROR');
    }
  };

  const handleDeleteClosing = async (closingId: string, dateStr: string, shift: string) => {
    try {
      await deleteDoc(doc(db, 'cashierClosings', closingId));
      
      const logRef = doc(collection(db, 'statusLogs'));
      await setDoc(logRef, {
        id: logRef.id,
        type: 'CASHIER_REOPEN',
        shift: shift || 'DIURNO',
        date: dateStr || '',
        updatedBy: {
          uid: currentUser?.uid || currentUser?.id || 'unknown',
          email: currentUser?.email || null,
          name: currentUserProfile?.name || currentUser?.name || currentUser?.displayName || 'Colaborador',
        },
        timestamp: new Date().toISOString()
      });
      setReopeningId(null);
    } catch (error) {
      console.error("Erro ao reabrir caixa:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setSaveStatus('ERROR');
    }
  };

  const handleOpenPrintPreview = (closingObj?: CashierClosing) => {
    if (closingObj) {
      setSelectedReceipt(closingObj);
    } else {
      // Build on-the-fly preview object for current state
      setSelectedReceipt({
        date: selectedDate || '',
        shift: selectedShift || 'DIURNO',
        closedByUid: currentUser?.uid || currentUser?.id || 'temp',
        closedByName: currentUserProfile?.name || currentUser?.name || currentUser?.displayName || 'Colaborador',
        closedByEmail: currentUser?.email || null,
        closedAt: new Date().toISOString(),
        totalRevenue: totals.total || 0,
        totalCash: totals.DINHEIRO || 0,
        totalPix: totals.PIX || 0,
        totalDebit: totals.DEBITO || 0,
        totalCredit: totals.CREDITO || 0,
        wasZero: isZeroClosing,
        observations: observations || '',
      });
    }
    setShowReceiptModal(true);
  };

  const executePrint = () => {
    window.print();
  };

  const formattedDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Print CSS to only print the coupon */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 5mm;
          }
          
          /* Force strict light background & black text on printout */
          body {
            background-color: #ffffff !important;
            background-image: none !important;
            color: #000000 !important;
          }
          
          /* Remove background watermark decoration */
          body::before, body::after {
            display: none !important;
            content: none !important;
          }
          
          /* Hide everything in the document body */
          body * {
            visibility: hidden !important;
          }
          
          /* Explicitly restore visibility and force styling only for the coupon card and its contents */
          #print-coupon-root, #print-coupon-root * {
            visibility: visible !important;
          }
          
          #print-coupon-root {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 15px !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: monospace !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 9999999 !important;
          }

          /* Match specific nested coupon element classes */
          #print-coupon-root * {
            background-color: transparent !important;
            color: #000000 !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Date selector and main cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Control Column */}
        <div className="bg-brand-slate p-8 rounded-[32px] border border-white/5 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-3 bg-brand-gold/15 rounded-2xl text-brand-gold">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h4 className="text-lg font-serif text-brand-cream">Data do Fechamento</h4>
                <p className="text-xs text-slate-500">Selecione o dia de movimentação</p>
              </div>
            </div>

            <div className="relative">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSaveStatus('IDLE');
                }}
                className="w-full bg-brand-bg border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 cursor-pointer text-sm text-brand-cream font-bold font-mono"
              />
            </div>

            {/* Turnos / Shifts Selector */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Turno de Exercício</label>
              <div className="grid grid-cols-2 gap-2 bg-brand-bg p-1.5 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShift('DIURNO');
                    setSaveStatus('IDLE');
                  }}
                  className={`py-3 px-2 rounded-xl text-[11px] font-bold transition-all text-center uppercase tracking-wider ${
                    selectedShift === 'DIURNO'
                      ? 'bg-[#fccf14] text-[#003814] shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 bg-transparent'
                  }`}
                >
                  ☀️ Diurno
                  <span className="block text-[8px] opacity-75 mt-0.5 lowercase">07h às 19h</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShift('NOTURNO');
                    setSaveStatus('IDLE');
                  }}
                  className={`py-3 px-2 rounded-xl text-[11px] font-bold transition-all text-center uppercase tracking-wider ${
                    selectedShift === 'NOTURNO'
                      ? 'bg-[#fccf14] text-[#003814] shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 bg-transparent'
                  }`}
                >
                  🌙 Noturno
                  <span className="block text-[8px] opacity-75 mt-0.5 lowercase">19h às 07h</span>
                </button>
              </div>
            </div>

            {/* Operator info */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-[#009b3a]/25 text-emerald-400 flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none mb-1">Operador Ativo</p>
                <p className="text-xs text-brand-cream font-bold">{currentUserProfile?.name || currentUser?.displayName || 'Sem nome'}</p>
                <p className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">{currentUser?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Observações adicionais</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Exemplo: Fundo de caixa de R$ 200,00 mantido, tudo conferido sem divergência..."
                rows={3}
                className="w-full bg-brand-bg border border-white/5 rounded-xl p-4 text-xs text-slate-300 focus:outline-none focus:border-brand-gold/40 placeholder:text-slate-650 resize-hidden"
              />
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/5">
            {currentClosingRecord ? (
              <div className="bg-[#009b3a]/10 border border-[#009b3a]/30 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="text-[#009b3a] shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-xs font-bold text-[#009b3a] uppercase tracking-widest">Caixa Oficializado</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Este dia já foi fechado por <span className="text-slate-300 font-bold">{currentClosingRecord.closedByName}</span>.
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSaveClosing}
                disabled={saveStatus === 'SAVING'}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  saveStatus === 'SAVING' 
                    ? 'bg-slate-705 text-slate-400' 
                    : 'bg-[#fccf14] text-[#003814] shadow-xl shadow-[#fccf14]/10'
                }`}
              >
                {saveStatus === 'SAVING' ? 'Processando...' : 'Efetuar Fechamento Oficial'}
              </button>
            )}

            <button
              onClick={() => handleOpenPrintPreview()}
              className="w-full py-4 border border-white/10 text-brand-cream hover:bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Printer size={14} className="text-brand-gold" />
              Gerar Comprovante do Dia
            </button>

            {saveStatus === 'SUCCESS' && (
              <p className="text-xs text-[#009b3a] text-center font-bold">✓ Fechamento oficializado no sistema com sucesso!</p>
            )}
            {saveStatus === 'ERROR' && (
              <div className="text-center space-y-1">
                <p className="text-xs text-red-500 font-bold">⚠️ Erro ao salvar fechamento no Firestore.</p>
                {errorMessage && (
                  <p className="text-[10px] text-red-400 font-mono break-words max-w-xs mx-auto opacity-80 leading-tight">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Financial Breakdown Column */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Main big balance */}
          <div className="bg-brand-slate p-8 rounded-[32px] border border-white/5 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/[0.01] to-transparent pointer-events-none"></div>

            {isZeroClosing ? (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-red-500/10 text-red-500 border border-red-500/20 uppercase mb-4">
                    <AlertTriangle size={12} /> Turno {selectedShift === 'DIURNO' ? 'Diurno' : 'Noturno'} Zerado
                  </div>
                  <h3 className="text-4xl font-serif text-brand-cream mb-2 leading-tight">CAIXA DE TURNO ZERADO</h3>
                  <p className="text-sm text-slate-400 italic">
                    Não houve nenhuma operação financeira registrada sob seu login no turno {selectedShift === 'DIURNO' ? 'Diurno (07h às 19h)' : 'Noturno (19h às 07h)'} de {formattedDate(selectedDate)}.
                  </p>
                </div>
                <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl text-center md:w-48">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Receita total</p>
                  <p className="text-2xl font-serif font-bold text-red-500">R$ 0,00</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-[#009b3a]/20 text-emerald-400 border border-[#009b3a]/30 uppercase mb-4">
                    <CheckCircle2 size={12} className="text-[#fccf14]" /> Turno {selectedShift === 'DIURNO' ? 'Diurno' : 'Noturno'} Ativo
                  </div>
                  <h3 className="text-5xl font-serif text-brand-cream font-bold">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-sm text-slate-400 italic mt-2">
                    Somatória das {dailyTransactions.length} operações financeiras realizadas no seu login durante o turno {selectedShift === 'DIURNO' ? 'Diurno (07h às 19h)' : 'Noturno (19h às 07h)'} de {formattedDate(selectedDate)}.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center min-w-[110px]">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Operações</p>
                    <p className="text-xl font-bold font-serif text-brand-gold mt-1">{dailyTransactions.length}</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center min-w-[110px]">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Quartos Atend.</p>
                    <p className="text-xl font-bold font-serif text-emerald-400 mt-1">
                      {new Set(dailyTransactions.map(tx => tx.roomId)).size} unidades
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subcard payment breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Cash */}
            <div className="bg-brand-slate p-6 rounded-2xl border border-white/5 hover:border-brand-gold/15 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Dinheiro</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Coins size={16} />
                </div>
              </div>
              <p className="text-xl font-serif text-brand-cream">R$ {totals.DINHEIRO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                {dailyTransactions.filter(tx => tx.paymentMethod === 'DINHEIRO').length} transações
              </p>
            </div>

            {/* Pix */}
            <div className="bg-brand-slate p-6 rounded-2xl border border-white/5 hover:border-brand-gold/15 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pix</span>
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Receipt size={16} />
                </div>
              </div>
              <p className="text-xl font-serif text-brand-cream">R$ {totals.PIX.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                {dailyTransactions.filter(tx => tx.paymentMethod === 'PIX').length} transações
              </p>
            </div>

            {/* Debit */}
            <div className="bg-brand-slate p-6 rounded-2xl border border-white/5 hover:border-brand-gold/15 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Débito</span>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <CreditCard size={16} />
                </div>
              </div>
              <p className="text-xl font-serif text-brand-cream">R$ {totals.DEBITO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                {dailyTransactions.filter(tx => tx.paymentMethod === 'DEBITO').length} transações
              </p>
            </div>

            {/* Credit */}
            <div className="bg-brand-slate p-6 rounded-2xl border border-white/5 hover:border-brand-gold/15 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Crédito</span>
                <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl">
                  <CreditCard size={16} />
                </div>
              </div>
              <p className="text-xl font-serif text-brand-cream">R$ {totals.CREDITO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                {dailyTransactions.filter(tx => tx.paymentMethod === 'CREDITO').length} transações
              </p>
            </div>

          </div>

          {/* List of checked-out bookings on selected date */}
          <div className="bg-brand-slate p-8 rounded-[32px] border border-white/5">
            <h4 className="text-lg font-serif text-brand-cream mb-6 flex items-center gap-2">
              <Receipt className="text-[#fccf14]" size={20} />
              Transações Detalhadas do Dia ({dailyTransactions.length})
            </h4>

            {isZeroClosing ? (
              <div className="py-12 text-center text-slate-600 italic text-sm border-2 border-dashed border-white/5 rounded-2xl">
                Nenhuma transação financeira registrada por seu login em {formattedDate(selectedDate)}.
                <p className="text-xs text-slate-500 mt-1 not-italic">O dia fechou zerado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-4 font-black">Hóspede / Unidade</th>
                      <th className="pb-4 font-black font-sans">Horário</th>
                      <th className="pb-4 font-black">Operador</th>
                      <th className="pb-4 font-black">Método / Tipo</th>
                      <th className="pb-4 text-right font-black">Valores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTransactions.map((tx) => {
                      const b = tx.booking;
                      return (
                        <tr key={tx.id} className="text-sm border-b border-white/[0.02]">
                          <td className="py-4">
                            <p className="font-serif text-brand-cream text-base">{tx.guestName}</p>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                              Quarto {tx.roomId ? tx.roomId.replace('room_', '') : ''} • {b.source || 'DIRECT'}
                            </span>
                          </td>
                          <td className="py-4 text-slate-400">
                            <span className="flex items-center gap-1 text-xs">
                              <Clock size={12} className="text-brand-gold" />
                              {tx.time}
                            </span>
                          </td>
                          <td className="py-4 text-slate-400 capitalize text-xs">
                            {tx.operatorName}
                          </td>
                          <td className="py-4">
                            <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-md ${
                              tx.paymentMethod === 'DINHEIRO' ? 'bg-emerald-500/10 text-emerald-400' :
                              tx.paymentMethod === 'PIX' ? 'bg-sky-500/10 text-sky-400' :
                              'bg-purple-500/10 text-purple-400'
                            }`}>
                              {tx.paymentMethod}
                            </span>
                            <span className="block text-[8px] text-slate-500 mt-1.5 uppercase font-black tracking-widest">
                              {tx.type === 'UPFRONT' ? 'Adiantamento' : tx.type === 'CONSUMPTION_SALE' ? 'Venda de Consumo' : 'Check-out'}
                            </span>
                          </td>
                          <td className="py-4 text-right border-l-0">
                            <p className="font-mono text-brand-cream font-bold">R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            {tx.type === 'CONSUMPTION_SALE' ? (
                              <span className="text-[8px] text-slate-500 uppercase block">{tx.details}</span>
                            ) : tx.consumptionsTotal !== undefined && tx.consumptionsTotal > 0 && (
                              <span className="text-[8px] text-slate-500 uppercase block">Estadia + R$ {tx.consumptionsTotal} cons.</span>
                            )}
                            {tx.discount !== undefined && tx.discount > 0 && (
                              <span className="text-[8px] text-red-400 block">-R$ {tx.discount} desc.</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Consumos Lançados em Conta (Pendentes nos Quartos) */}
          <div className="bg-brand-slate p-8 rounded-[32px] border border-white/5 hover:border-brand-gold/15 transition-all mt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] text-brand-gold/70 uppercase font-black tracking-widest mb-1 block">Controle e Auditoria</span>
                <h4 className="text-xl font-serif text-brand-cream flex items-center gap-2">
                  <Receipt className="text-brand-gold" size={20} />
                  Consumos Lançados em Conta (Pendentes nos Quartos)
                </h4>
              </div>
              <div className="bg-brand-bg px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-3">
                <span className="text-[10px] uppercase text-slate-500 font-extrabold tracking-widest">Total Pendente Acumulado:</span>
                <span className="text-sm font-bold text-brand-gold font-mono">
                  R$ {activeUnpaidConsumptions.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed mb-6 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
              💡 <strong>Atenção:</strong> Estes itens foram lançados com a opção <span className="text-brand-gold font-bold">"Pendurar no Quarto"</span> para hóspedes que ainda estão hospedados. Eles <strong>não entram no caixa de hoje</strong> porque o pagamento de fato só será efetuado e recebido no momento do <strong>Check-out</strong> (quando a conta total do quarto for fechada). Esta lista serve para você conferir de forma auditada todos os consumos em aberto registrados no hotel.
            </p>

            {activeUnpaidConsumptions.length === 0 ? (
              <div className="py-8 text-center text-slate-550 italic text-sm border-2 border-dashed border-white/5 rounded-2xl">
                Nenhum consumo pendente nos quartos ativos no momento. Todos os consumos lançados foram pagos no ato ou já foram finalizados no checkout.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-4 font-black">Hóspede / Quarto</th>
                      <th className="pb-4 font-black">Itens Lançados</th>
                      <th className="pb-4 font-black text-center">Qtd Total</th>
                      <th className="pb-4 text-right font-black">Valor Pendente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUnpaidConsumptions.map((item) => (
                      <tr key={item.bookingId} className="text-sm border-b border-white/[0.02] hover:bg-white/[0.01]/30 transition-colors">
                        <td className="py-4">
                          <p className="font-serif text-brand-cream text-base">{item.guestName}</p>
                          <span className="text-[10px] text-brand-gold uppercase tracking-wider font-extrabold">
                            Quarto {item.roomId ? item.roomId.replace('room_', '') : ''}
                          </span>
                        </td>
                        <td className="py-4 text-slate-300 text-xs max-w-xs">
                          <div className="flex flex-wrap gap-1.5">
                            {item.consumptions.map((c, idx) => (
                              <span key={idx} className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg text-[10px] font-mono text-slate-300">
                                {c.productName} ({c.quantity}x • R$ {c.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 text-center text-slate-400 font-mono font-bold">
                          {item.itemsCount}x
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono text-brand-gold font-bold text-base">R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <span className="text-[8px] text-emerald-400 font-extrabold uppercase tracking-widest block mt-0.5">Aguardando Checkout</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Closings history */}
      <div className="bg-brand-slate p-8 rounded-[32px] border border-white/5 mt-8">
        <h4 className="text-xl font-serif text-brand-cream mb-6 flex items-center gap-2">
          <History className="text-brand-gold" size={22} />
          Histórico Recente de Fechamentos Oficializados
        </h4>

        {closingsHistory.length === 0 ? (
          <p className="text-slate-600 italic text-sm py-8 text-center bg-white/[0.01] rounded-2xl border border-white/5">
            Nenhum fechamento de caixa armazenado no histórico ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-white/5">
                  <th className="pb-4 font-black">Data do Caixa</th>
                  <th className="pb-4 font-black">Turno</th>
                  <th className="pb-4 font-black">Quem Fechou</th>
                  <th className="pb-4 font-black">Oficializado em</th>
                  <th className="pb-4 font-black">Status</th>
                  <th className="pb-4 text-right font-black">Faturamento</th>
                  <th className="pb-4 text-center font-black">Ações</th>
                </tr>
              </thead>
              <tbody>
                {closingsHistory.map((c) => {
                  const closedStr = c.closedAt ? new Date(c.closedAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                  }) : '—';

                  return (
                    <tr key={c.id} className="text-sm border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 font-mono font-bold text-brand-cream">
                        {formattedDate(c.date)}
                      </td>
                      <td className="py-4 font-mono font-medium">
                        {c.shift === 'DIURNO' ? (
                          <span className="text-xs text-amber-400 font-bold flex items-center gap-1">☀️ Diurno</span>
                        ) : (
                          <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">🌙 Noturno</span>
                        )}
                      </td>
                      <td className="py-4">
                        <p className="text-brand-cream font-medium">{c.closedByName}</p>
                        <span className="text-[9px] text-slate-500 font-mono italic">{c.closedByEmail}</span>
                      </td>
                      <td className="py-4 text-slate-400 text-xs text-nowrap">
                        {closedStr}
                      </td>
                      <td className="py-4">
                        {c.wasZero ? (
                          <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full border border-red-500/20">
                            Zerado
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            Faturado
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-brand-cream">
                        R$ {c.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenPrintPreview(c)}
                            className="p-2 border border-white/10 hover:border-brand-gold rounded-xl hover:bg-brand-gold/10 text-slate-400 hover:text-brand-gold transition-all"
                            title="Visualizar Comprovante Fiscal"
                          >
                            <FileText size={16} />
                          </button>

                          {reopeningId === c.id ? (
                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider animate-pulse">Reabrir?</span>
                              <button
                                onClick={() => handleDeleteClosing(c.id, c.date, c.shift)}
                                className="text-emerald-400 hover:text-emerald-300 font-black text-xs px-1"
                                title="Confirmar"
                              >
                                Sim
                              </button>
                              <span className="text-slate-650 text-xs">/</span>
                              <button
                                onClick={() => setReopeningId(null)}
                                className="text-slate-400 hover:text-white font-black text-xs px-1"
                                title="Cancelar"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReopeningId(c.id)}
                              className="p-2 border border-white/10 hover:border-red-500/40 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                              title="Reabrir Caixa (Excluir Fechamento)"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprovante / Coupon Modal */}
      <AnimatePresence>
        {showReceiptModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1c1c21] border border-white/10 rounded-[32px] overflow-hidden w-full max-w-lg shadow-2xl relative flex flex-col my-8"
            >
              {/* Top action bar */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#131316]">
                <h3 className="font-serif text-lg text-brand-cream">Pré-visualização do Comprovante</h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Printable Area Wrapper */}
              <div className="p-8 flex-1 overflow-y-auto max-h-[70vh]">
                
                {/* Coupon itself */}
                <div 
                  id="print-coupon-root"
                  className="bg-white text-black p-6 rounded-2xl shadow-inner font-mono text-xs border border-gray-200"
                  style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                >
                  {/* Lanzudo's Header */}
                  <div className="text-center space-y-1 mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                    <p className="font-bold text-lg tracking-wider uppercase">LANZUDO'S HOTEL PMS</p>
                    <p className="text-[10px] uppercase font-sans font-bold tracking-wider">Relatório de Fechamento de Turno</p>
                  </div>

                  {/* Closing Metadata */}
                  <div className="space-y-1 pb-4 border-b border-gray-200 mb-4 text-[10px]">
                    <div className="flex justify-between">
                      <span>DATA DO EXERCÍCIO:</span>
                      <span className="font-bold">{formattedDate(selectedReceipt.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TURNO DE EXERCÍCIO:</span>
                      <span className="font-bold uppercase">
                        {selectedReceipt.shift === 'DIURNO' ? '☀️ DIURNO (07h às 19h)' : '🌙 NOTURNO (19h às 07h)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>FECHAMENTO ATRELADO A:</span>
                      <span className="font-bold uppercase">{selectedReceipt.closedByName}</span>
                    </div>
                    {selectedReceipt.closedByEmail && (
                      <div className="flex justify-between">
                        <span>EMAIL DO COOPERADOR:</span>
                        <span className="font-mono">{selectedReceipt.closedByEmail}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>REGISTRISTA HORÁRIO:</span>
                      <span className="font-mono">{new Date(selectedReceipt.closedAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Main status indicator */}
                  {selectedReceipt.wasZero ? (
                    <div className="border border-red-500 bg-red-50 text-red-900 font-bold p-3 text-center uppercase mb-6 rounded">
                      ⚠️ TURNO SEM MOVIMENTAÇÃO ⚠️
                      <p className="text-[8px] font-normal lowercase tracking-normal mt-0.5">Sem reservas concluídas ou receitas faturadas listadas neste turno de trabalho.</p>
                    </div>
                  ) : (
                    <div className="border border-emerald-500 bg-emerald-50 text-emerald-950 font-bold p-3 text-center uppercase mb-6 rounded text-sm [text-shadow:none]">
                      ✓ TURNO COM FATURAMENTO ✓
                    </div>
                  )}

                  {/* Financial Values table */}
                  <div className="space-y-1.5 border-b-2 border-dashed border-gray-300 pb-4 mb-4 text-[11px]">
                    <p className="font-bold border-b border-gray-200 pb-1 mb-2">BALANÇO FINANCEIRO DE CATEGORIAS</p>
                    <div className="flex justify-between">
                      <span>(💵) MEIO DINHEIRO:</span>
                      <span className="font-bold">R$ {selectedReceipt.totalCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(⚡) MEIO PIX:</span>
                      <span className="font-bold">R$ {selectedReceipt.totalPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(💳) COBRANÇA DÉBITO:</span>
                      <span className="font-bold">R$ {selectedReceipt.totalDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(💳) COBRANÇA CRÉDITO:</span>
                      <span className="font-bold">R$ {selectedReceipt.totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t-2 border-dashed border-gray-300 text-sm font-bold mt-2">
                      <span>(💰) TOTAL GERAL CONCILIADO:</span>
                      <span>R$ {selectedReceipt.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Associated checkouts */}
                  {!selectedReceipt.wasZero && (
                    <div className="text-[9px] space-y-1 pb-4 border-b border-gray-200 mb-4 max-h-96">
                      <p className="font-bold text-[10px] uppercase mb-1 border-b border-gray-150 pb-0.5">Transações Incluídas</p>
                      {(() => {
                        const { start: rStart, end: rEnd } = getShiftPeriod(selectedReceipt.date, selectedReceipt.shift);
                        const receiptOperatorUid = selectedReceipt.closedByUid;
                        
                        const printTxList: {
                          desc: string;
                          amount: number;
                          method: string;
                          typeLabel: string;
                        }[] = [];

                        bookings.forEach((b) => {
                          if (b.status === 'CHECKED_OUT' && b.checkedOutAt) {
                            const co = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
                            if (co >= rStart && co < rEnd) {
                              const checkoutOperatorUid = b.checkedOutBy?.uid || b.checkedOutBy?.id || b.createdBy?.uid || b.createdBy?.id;
                              if (checkoutOperatorUid === receiptOperatorUid) {
                                const amount = b.finalTotal !== undefined ? b.finalTotal : getBookingFinalTotal(b);
                                printTxList.push({
                                  desc: `Qto ${b.roomId ? b.roomId.replace('room_', '') : ''} - ${b.guestName?.substring(0, 14)}`,
                                  amount,
                                  method: b.paymentMethod || 'DINHEIRO',
                                  typeLabel: 'Checkout'
                                });
                              }
                            }
                          }
                          if (b.upfrontPaid && b.upfrontPaidAt) {
                            const up = b.upfrontPaidAt.toDate ? b.upfrontPaidAt.toDate() : new Date(b.upfrontPaidAt);
                            if (up >= rStart && up < rEnd) {
                              const upfrontOperatorUid = b.upfrontPaidBy?.uid || b.upfrontPaidBy?.id;
                              if (upfrontOperatorUid === receiptOperatorUid) {
                                printTxList.push({
                                  desc: `Qto ${b.roomId ? b.roomId.replace('room_', '') : ''} - ${b.guestName?.substring(0, 14)}`,
                                  amount: b.upfrontPaymentAmount || 0,
                                  method: b.upfrontPaymentMethod || 'PIX',
                                  typeLabel: 'Adiantam.'
                                });
                              }
                            }
                          }
                          if (b.consumptions && b.consumptions.length > 0) {
                            b.consumptions.forEach((c) => {
                              if (c.isPaidImmediate && c.paidAt) {
                                const paidDate = c.paidAt.toDate ? c.paidAt.toDate() : new Date(c.paidAt);
                                if (paidDate >= rStart && paidDate < rEnd) {
                                  const paidOperatorUid = c.paidBy?.uid || c.paidBy?.id;
                                  if (paidOperatorUid === receiptOperatorUid) {
                                    printTxList.push({
                                      desc: `${c.productName} (${c.quantity}x) - Qto ${b.roomId ? b.roomId.replace('room_', '') : ''}`,
                                      amount: (c.price || 0) * (c.quantity || 1),
                                      method: c.paymentMethod || 'DINHEIRO',
                                      typeLabel: 'Consumo'
                                    });
                                  }
                                }
                              }
                            });
                          }
                        });

                        return printTxList.map((tx, i) => (
                          <div key={i} className="flex justify-between items-center text-gray-700 py-0.5 border-b border-gray-100 last:border-0 font-sans text-[9px]">
                            <span>{tx.desc} <span className="text-[7px] text-gray-400 font-mono">({tx.typeLabel})</span></span>
                            <span className="font-mono text-[9px] font-bold text-gray-950">
                              R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[7px] text-gray-500 font-sans">[{tx.method}]</span>
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {/* User observations */}
                  {selectedReceipt.observations && (
                    <div className="text-[10px] text-gray-650 bg-gray-50 border border-gray-200 p-3 rounded mb-6 italic">
                      <p className="font-bold uppercase text-[8px] tracking-wider not-italic text-gray-500 mb-1">OBSERVAÇÕES DO OPERADOR:</p>
                      "{selectedReceipt.observations}"
                    </div>
                  )}

                  {/* Footer signature line */}
                  <div className="text-center mt-12 pt-6 border-t border-gray-200 space-y-4">
                    <div className="border-b border-gray-400 w-44 mx-auto pb-1 mt-6"></div>
                    <p className="text-[8px] uppercase font-sans tracking-widest text-gray-500 font-bold">Assinatura Operador</p>
                    
                    <div className="border-b border-gray-400 w-44 mx-auto pb-1 mt-8"></div>
                    <p className="text-[8px] uppercase font-sans tracking-widest text-gray-500 font-bold">Assinatura Patrão / Lanzudo</p>
                    
                    <p className="text-[8px] text-gray-400 italic pt-6">Gerado via Lanzudo's PMS - Comprovante oficial de integridade de caixa.</p>
                  </div>

                </div>

              </div>

              {/* Botões do Modal */}
              <div className="p-6 border-t border-white/5 bg-[#131316] flex gap-3 justify-end">
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-brand-cream font-bold transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={executePrint}
                  className="px-5 py-3 bg-brand-gold hover:bg-brand-gold-hover text-[#003814] rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-brand-gold/10"
                >
                  <Printer size={14} /> Imprimir / Salvar PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
