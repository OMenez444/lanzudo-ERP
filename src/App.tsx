/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  ShoppingBag,
  LogIn,
  LogOut,
  Edit2
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { RoomCard } from './components/RoomCard';
import { DashboardStats } from './components/DashboardStats';
import { TimelineView } from './components/TimelineView';
import { BookingModal } from './components/BookingModal';
import { EditRoomModal } from './components/EditRoomModal';
import { EditProductModal } from './components/EditProductModal';
import { AddProductModal } from './components/AddProductModal';
import { ConsumptionModal } from './components/ConsumptionModal';
import { AddGuestModal } from './components/AddGuestModal';
import { PaymentModal } from './components/PaymentModal';
import { Room, Stat, Product, Booking, Consumption, Guest, PaymentMethod } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  writeBatch,
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth, signInWithGoogle } from './lib/firebase';
import { getLocalDateString } from './lib/dateUtils';

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [isEditExpModalOpen, setIsEditExpModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<string | undefined>();
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('number', 'asc'));
    const unsubscribeRooms = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      // Don't throw if just not logged in and it's an expected failure for non-public data
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'rooms');
      }
    });

    return () => unsubscribeRooms();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribeProd = onSnapshot(q, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(prodData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    });

    return () => unsubscribeProd();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Booking));
      setBookings(bookingsData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      }
    });

    return () => unsubscribeBookings();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'guests'), orderBy('fullName', 'asc'));
    const unsubscribeGuests = onSnapshot(q, (snapshot) => {
      const guestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Guest));
      setGuests(guestsData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'guests');
      }
    });

    return () => unsubscribeGuests();
  }, []);

  const occupancyRate = rooms.length > 0 ? Math.round((rooms.filter(r => r.status === 'OCCUPIED').length / rooms.length) * 100) : 0;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const checkinsToday = bookings.filter(b => {
    if (b.status !== 'CONFIRMED' || !b.checkIn) return false;
    const today = getLocalDateString();
    return b.checkIn === today;
  }).length;

  const totalRevenueValue = bookings
    .filter(b => b.status === 'CHECKED_OUT')
    .reduce((acc, b) => acc + (b.totalPrice || 0) + (b.consumptions?.reduce((s, c) => s + (c.price * c.quantity), 0) || 0) - (b.discount || 0), 0);

  const cleaningCount = rooms.filter(r => r.status === 'CLEANING').length;

  const stats: Stat[] = [
    { label: 'Ocupação', value: `${occupancyRate}%`, sub: `${occupiedRooms} de ${rooms.length} UNIDADES`, trend: 'up' },
    { label: 'Check-ins', value: checkinsToday.toString(), sub: 'Hoje', trend: 'up' },
    { label: 'Receita', value: `R$ ${totalRevenueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Total em caixa', trend: 'up' },
    { label: 'Limpeza', value: cleaningCount.toString(), sub: 'Aguardando', trend: cleaningCount > 0 ? 'up' : 'down' },
  ];

  const handleCheckIn = (id: string) => {
    setSelectedRoomForBooking(id);
    setIsBookingModalOpen(true);
  };

  const handleCheckOut = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    const activeBooking = bookings.find(b => b.roomId === roomId && b.status === 'CONFIRMED');
    
    if (activeBooking) {
      setSelectedBooking(activeBooking);
      setSelectedRoom(room || null);
      setIsPaymentModalOpen(true);
    }
  };

  const handleConfirmPayment = async (method: PaymentMethod, discount: number = 0) => {
    if (!selectedBooking || !selectedRoom) return;

    const roomId = selectedRoom.id;
    const activeBooking = selectedBooking;
    
    const consumptionsTotal = activeBooking.consumptions?.reduce((acc, curr) => {
      const price = Number(curr.price) || 0;
      const qty = Number(curr.quantity) || 0;
      return acc + (price * qty);
    }, 0) || 0;
    
    const isAirbnb = activeBooking.source === 'AIRBNB';
    const stayTotal = isAirbnb ? (Number(activeBooking.extraStayCharges) || 0) : (Number(activeBooking.totalPrice) || 0);
    const grandTotal = Math.max(0, stayTotal + consumptionsTotal - discount);

    try {
      const batch = writeBatch(db);

      // 1. Update room status to cleaning
      batch.update(doc(db, 'rooms', roomId), {
        status: 'CLEANING',
        guest: null
      });

      // 2. Update booking status to checked out
      batch.update(doc(db, 'bookings', activeBooking.id), {
        status: 'CHECKED_OUT',
        finalTotal: grandTotal,
        discount: discount,
        paymentMethod: method,
        checkedOutAt: serverTimestamp()
      });

      await batch.commit();
      
      // Close modals
      setIsPaymentModalOpen(false);
      setIsConsumptionModalOpen(false);
      setSelectedBooking(null);
      setSelectedRoom(null);
      
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `checkout/${roomId}`);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      await updateDoc(doc(db, 'rooms', id), {
        status: 'AVAILABLE'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
    }
  };

  const handleUpdateRoom = async (id: string, data: Partial<Room>) => {
    try {
      await updateDoc(doc(db, 'rooms', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
    }
  };

  const handleUpdateProduct = async (id: string, data: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const handleAddProduct = async (data: Omit<Product, 'id'>) => {
    try {
      await addDoc(collection(db, 'products'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handleAddGuest = async (data: Omit<Guest, 'id'>) => {
    try {
      await addDoc(collection(db, 'guests'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'guests');
    }
  };

  const handleManageConsumption = (roomId: string) => {
    const activeBooking = bookings.find(b => b.roomId === roomId && b.status === 'CONFIRMED');
    if (activeBooking) {
      setSelectedBooking(activeBooking);
      setIsConsumptionModalOpen(true);
    }
  };

  const handleAddConsumption = async (bookingId: string, product: Product, quantity: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const newConsumption: Consumption = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      timestamp: new Date().toISOString()
    };

    const updatedConsumptions = [...(booking.consumptions || []), newConsumption];

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        consumptions: updatedConsumptions
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleRemoveConsumption = async (bookingId: string, consumptionId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updatedConsumptions = (booking.consumptions || []).filter(c => c.id !== consumptionId);

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        consumptions: updatedConsumptions
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleExtendStay = async (bookingId: string, newCheckOut: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const checkInDate = new Date(booking.checkIn);
      const oldCheckOutDate = new Date(booking.checkOut);
      const newCheckOutDate = new Date(newCheckOut);
      
      const oldNights = Math.max(1, Math.ceil((oldCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
      const newNights = Math.max(1, Math.ceil((newCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
      const extraNights = Math.max(0, newNights - oldNights);
      
      let extraPricePerNight = (booking.totalPrice + (booking.discount || 0)) / oldNights;

      // Se a diária estava zerada ou muito baixa (ex: repasse do Airbnb não lançado),
      // cobramos o valor padrão na extensão feita direto no balcão.
      if (extraPricePerNight === 0) {
        extraPricePerNight = 139;
        if (booking.guestsCount === 2) extraPricePerNight = 189;
        if (booking.guestsCount === 3) extraPricePerNight = 279;
        if (booking.guestsCount >= 4) extraPricePerNight = 279;
      }
      
      const addedAmount = extraPricePerNight * extraNights;
      const newTotalPrice = booking.totalPrice + addedAmount;
      const newExtraCharges = (booking.extraStayCharges || 0) + addedAmount;

      await updateDoc(doc(db, 'bookings', bookingId), {
        checkOut: newCheckOut,
        totalPrice: newTotalPrice,
        extraStayCharges: newExtraCharges
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleConfirmBooking = async (data: {
    guestName: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    discount: number;
    source: 'DIRECT' | 'AIRBNB' | 'BOOKING';
    customPricePerNight?: number;
  }) => {
    try {
      // Pricing rules: 1=139, 2=189, 3=279
      let pricePerNight = 139;
      if (data.guestsCount === 2) pricePerNight = 189;
      if (data.guestsCount === 3) pricePerNight = 279;
      if ((data.guestsCount >= 4 || data.source === 'AIRBNB') && data.customPricePerNight !== undefined) {
        pricePerNight = data.customPricePerNight;
      } else if (data.guestsCount >= 4) {
        pricePerNight = 279;
      }

      const nights = Math.max(1, Math.ceil((new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      const discount = data.discount || 0;
      const totalPrice = (pricePerNight * nights) - discount;

      const batch = writeBatch(db);
      const bookingRef = doc(collection(db, 'bookings'));
      
      batch.set(bookingRef, {
        guestName: data.guestName,
        roomId: data.roomId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guestsCount: data.guestsCount,
        status: 'CONFIRMED',
        totalPrice: Math.max(0, totalPrice),
        discount: discount,
        source: data.source,
        createdAt: serverTimestamp()
      });

      batch.update(doc(db, 'rooms', data.roomId), {
        status: 'OCCUPIED',
        guest: data.guestName
      });

      await batch.commit();
      
      setIsBookingModalOpen(false);
      setSelectedRoomForBooking(undefined);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bookings/transaction');
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.number.includes(search) || 
    (r.guest && r.guest.toLowerCase().includes(search.toLowerCase())) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen bg-brand-bg flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin mb-6 mx-auto"></div>
          <h1 className="text-3xl font-serif text-brand-gold italic font-bold tracking-tighter uppercase">Lanzudo's</h1>
          <p className="text-[10px] tracking-[0.4em] text-brand-cream uppercase font-black">Hotel Experience</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-brand-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 bg-brand-slate border border-white/5 rounded-[40px] text-center shadow-2xl"
        >
          <div className="mb-8">
            <h1 className="text-4xl font-serif text-brand-gold italic font-bold tracking-tighter uppercase mb-2">Lanzudo's</h1>
            <p className="text-[10px] tracking-[0.4em] text-brand-cream uppercase font-black opacity-60">Hotel Experience PMS</p>
          </div>
          
          <div className="space-y-6">
            <p className="text-slate-400 text-sm italic">
              "Bem-vindo ao sistema de gestão que redefine a hospitalidade de luxo."
            </p>
            
            <button 
              onClick={signInWithGoogle}
              className="w-full bg-brand-gold hover:bg-brand-gold/80 text-brand-bg py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-brand-gold/20"
            >
              <LogIn size={20} />
              Acessar com Google
            </button>
            
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-tighter cursor-help hover:text-slate-400 transition-colors">
              Acesso restrito a colaboradores autorizados
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg text-slate-200 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-y-auto p-6 lg:p-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-serif text-brand-cream mb-2">
              {activeTab === 'dashboard' ? 'Painel Executivo' : 
               activeTab === 'rooms' ? 'Mapa de Unidades' : 
               activeTab === 'guests' ? 'Base de Hóspedes' : 
               activeTab === 'products' ? 'Catálogo de Produtos' : 'Financeiro'}
            </h2>
            <p className="text-slate-500 italic">"Excelência em cada detalhe da hospitalidade."</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por quarto ou hóspede..." 
                className="w-full bg-brand-slate border border-white/5 rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="p-1 px-3 bg-brand-slate border border-white/5 rounded-full flex items-center gap-2 group relative">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-brand-gold/20" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-gold text-brand-bg flex items-center justify-center font-bold text-xs">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex flex-col items-start pr-2">
                <span className="text-[10px] font-black text-brand-gold uppercase tracking-tighter leading-none mb-0.5">
                  {user?.displayName || 'Colaborador'}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Gerente</span>
              </div>
              
              <button 
                onClick={() => signOut(auth)}
                className="ml-2 p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DashboardStats stats={stats} />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif text-brand-cream">Status da Operação</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-4 py-2 bg-brand-gold text-brand-bg rounded-xl text-xs font-bold tracking-widest flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 uppercase"
                >
                  <Plus size={14} /> Adicionar Reserva
                </button>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRooms.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onRelease={handleRelease}
                    onEdit={(room) => {
                      setSelectedRoom(room);
                      setIsEditRoomModalOpen(true);
                    }}
                    onManageConsumption={handleManageConsumption}
                  />
                ))}
              </AnimatePresence>
            </div>

            <section className="mt-12 bg-[#121214] rounded-3xl p-8 border border-white/5">
              <h3 className="text-xl font-serif mb-6 flex items-center gap-2 text-white">
                <ShoppingBag className="text-brand-gold" size={24} /> Log de Consumo Recente
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-4 font-black">Hóspede</th>
                      <th className="pb-4 font-black">Produto</th>
                      <th className="pb-4 font-black">Qtd</th>
                      <th className="pb-4 font-black">Valor Total</th>
                      <th className="pb-4 font-black">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.flatMap(b => (b.consumptions || []).map(c => ({...c, guestName: b.guestName}))).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="text-sm border-b border-white/[0.02]">
                        <td className="py-4 font-serif text-lg">{item.guestName}</td>
                        <td className="py-4">
                          <span className="text-brand-gold uppercase text-[10px] font-black tracking-widest bg-brand-gold/10 px-2 py-1 rounded border border-brand-gold/20">
                            {item.productName}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400">
                          {item.quantity} un
                        </td>
                        <td className="py-4 font-mono text-brand-cream">
                          R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-[10px] text-slate-600 uppercase font-black">
                          {new Date(item.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {bookings.every(b => !b.consumptions || b.consumptions.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-600 italic text-sm">
                          Nenhum consumo registrado recentemente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'guests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-serif text-brand-cream">Gestão de Hóspedes</h3>
                <p className="text-sm text-slate-500 italic">Relacionamento e histórico de hospitalidade.</p>
              </div>
              <button 
                onClick={() => setIsAddGuestModalOpen(true)}
                className="bg-brand-gold text-brand-bg px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-gold/10 hover:scale-105 transition-all"
              >
                <Plus size={16} /> Novo Cadastro
              </button>
            </div>

            <div className="bg-[#121214] rounded-3xl p-8 border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-4 font-black">Hóspede</th>
                      <th className="pb-4 font-black">Contato</th>
                      <th className="pb-4 font-black">Documento</th>
                      <th className="pb-4 font-black">Status</th>
                      <th className="pb-4 font-black">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => {
                      const isActive = rooms.some(r => r.guest === guest.fullName);
                      return (
                        <tr key={guest.id} className="text-sm border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                          <td className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-bold">
                                {guest.fullName.charAt(0)}
                              </div>
                              <span className="font-serif text-lg text-brand-cream">{guest.fullName}</span>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex flex-col">
                              <span className="text-slate-300">{guest.email || '—'}</span>
                              <span className="text-[10px] text-slate-500 font-mono italic">{guest.phone || '—'}</span>
                            </div>
                          </td>
                          <td className="py-6">
                            <span className="font-mono text-xs text-slate-400">{guest.document || '—'}</span>
                          </td>
                          <td className="py-6">
                            {isActive ? (
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                Hospedado
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="py-6">
                            <button className="p-2 text-slate-600 hover:text-brand-gold transition-colors">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {guests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-600 italic">
                          Nenhum hóspede cadastrado na base de dados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="mb-8 p-6 bg-gold-500/5 border border-gold-500/10 rounded-3xl flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-serif text-white">Mapa de Disponibilidade</h3>
                <p className="text-sm text-slate-500">Cronograma de ocupação inspirado no fluxo Jiro/Kanban.</p>
              </div>
              <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="bg-gold-500 hover:bg-gold-600 text-black px-6 py-4 rounded-full text-[10px] font-black tracking-widest transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                AGENDAR AGORA
              </button>
            </div>
            
            <TimelineView 
              rooms={rooms} 
              bookings={bookings}
              onAddBooking={(roomId) => {
                setSelectedRoomForBooking(roomId);
                setIsBookingModalOpen(true);
              }} 
              onManageConsumption={handleManageConsumption}
            />
          </motion.div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={() => setIsAddProductModalOpen(true)}
                className="bg-brand-gold text-brand-bg px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-gold/10 hover:scale-105 transition-all"
              >
                <Plus size={16} /> Novo Produto
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(prod => (
                <div key={prod.id} className="bg-brand-slate p-8 rounded-[32px] border border-white/5 hover:border-brand-gold/30 transition-all group overflow-hidden relative">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-gold/5 rounded-full blur-2xl group-hover:bg-brand-gold/10 transition-all"></div>
                  <div className="p-4 bg-brand-gold/10 rounded-2xl w-fit mb-6">
                    <ShoppingBag className="text-brand-gold" size={32} />
                  </div>
                  <h3 className="text-2xl font-serif text-brand-cream mb-2 uppercase">{prod.name}</h3>
                  <p className="text-slate-500 text-sm mb-6 italic line-clamp-3">
                    {prod.description || 'Produto para consumo adicional dos hóspedes.'}
                  </p>
                  <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Preço Unitário</p>
                      <span className="text-brand-gold font-mono italic text-lg">R$ {prod.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProduct(prod);
                        setIsEditExpModalOpen(true);
                      }}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-brand-gold hover:bg-white/10 transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {products.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-600 italic">
                  Nenhum produto cadastrado no catálogo.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="bg-[#121214] rounded-3xl p-8 border border-white/5">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Receita Acumulada</p>
                <h3 className="text-4xl font-serif text-brand-gold">R$ {totalRevenueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Total de Reservas</p>
                <p className="text-lg text-emerald-500 font-bold">{bookings.filter(b => b.status === 'CHECKED_OUT').length}</p>
              </div>
            </div>
            
            <div className="h-64 flex items-end gap-2 px-4 bg-white/[0.01] rounded-2xl relative mb-12">
              {/* Simple chart logic based on bookings per month */}
              {(() => {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const monthlyRevenue = Array(12).fill(0);
                
                bookings.filter(b => b.status === 'CHECKED_OUT' && b.checkedOutAt).forEach(b => {
                  const date = b.checkedOutAt.toDate();
                  monthlyRevenue[date.getMonth()] += (b.finalTotal || 0);
                });

                const maxRevenue = Math.max(...monthlyRevenue, 1000); // minimum scale of 1000

                return monthlyRevenue.map((rev, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div 
                      className="w-full bg-brand-gold/20 group-hover:bg-brand-gold transition-all rounded-t-lg relative" 
                      style={{ height: `${Math.max(5, (rev / maxRevenue) * 100)}%` }}
                    >
                      {rev > 0 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-slate text-[8px] font-black p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          R$ {rev.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                    <span className="mt-4 text-[9px] text-slate-600 font-black uppercase tracking-widest">{months[i]}</span>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
              <h4 className="text-lg font-serif text-brand-cream mb-6">Histórico de Transações</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5">
                      <th className="font-black py-4 px-4 whitespace-nowrap">Data</th>
                      <th className="font-black py-4 px-4 whitespace-nowrap">Hóspede e Quarto</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Estadia</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Consumo</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Desconto</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Total Pago</th>
                      <th className="font-black py-4 px-4 whitespace-nowrap">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.filter(b => b.status === 'CHECKED_OUT').sort((a, b) => (b.checkedOutAt?.toMillis() || 0) - (a.checkedOutAt?.toMillis() || 0)).map((b, idx) => {
                      const isAirbnb = b.source === 'AIRBNB';
                      const stayTotal = isAirbnb ? (Number(b.extraStayCharges) || 0) : (Number(b.totalPrice) || 0);
                      const consumptionTotal = b.consumptions?.reduce((acc, c) => acc + (c.price * c.quantity), 0) || 0;
                      const discount = b.discount || 0;
                      const finalTotal = b.finalTotal || Math.max(0, stayTotal + consumptionTotal - discount);
                      const room = rooms.find(r => r.id === b.roomId);
                      
                      return (
                        <tr key={b.id || idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group align-top">
                          <td className="py-4 px-4 text-xs text-slate-400">
                            {b.checkedOutAt ? new Date(b.checkedOutAt.toDate()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="py-4 px-4 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-brand-cream">{b.guestName}</p>
                              {b.source === 'AIRBNB' && (
                                <span className="bg-brand-gold/20 text-brand-gold text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Airbnb</span>
                              )}
                              {b.source === 'BOOKING' && (
                                <span className="bg-sky-500/20 text-sky-400 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Booking</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 mb-2">Quarto {room?.number || '-'}</p>
                            
                            {b.consumptions && b.consumptions.length > 0 && (
                              <div className="text-[10px] text-slate-500 bg-white/5 p-2 rounded max-h-24 overflow-y-auto">
                                <p className="uppercase font-black text-[8px] text-brand-gold/70 mb-1 border-b border-brand-gold/10 pb-1">Consumos ({b.consumptions.length})</p>
                                <div className="space-y-1">
                                  {b.consumptions.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center gap-4">
                                      <span className="truncate">{c.quantity}x {c.productName}</span>
                                      <span className="font-mono text-[9px] text-slate-600 shrink-0">R$ {(c.price * c.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-slate-400">
                            {b.source === 'AIRBNB' ? (
                              <span className="text-[10px] text-brand-gold/70 block">Airbnb<br/>(R$ {stayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                            ) : (
                              `R$ ${stayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-slate-400">R$ {consumptionTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-red-400/80">- R$ {discount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-brand-gold font-bold">R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4">
                            <span className="text-[9px] uppercase tracking-widest font-black px-2 py-1 bg-white/5 rounded text-emerald-500 whitespace-nowrap">
                              {b.paymentMethod === 'PIX' ? 'PIX' : 
                               b.paymentMethod === 'DINHEIRO' ? 'Dinheiro' : 
                               b.paymentMethod === 'CREDITO' ? 'Crédito' : 
                               b.paymentMethod === 'DEBITO' ? 'Débito' : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {bookings.filter(b => b.status === 'CHECKED_OUT').length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-600 italic text-sm">
                          Nenhum histórico financeiro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isBookingModalOpen && (
          <BookingModal 
            isOpen={isBookingModalOpen} 
            onClose={() => {
              setIsBookingModalOpen(false);
              setSelectedRoomForBooking(undefined);
            }}
            selectedRoomId={selectedRoomForBooking}
            rooms={rooms}
            guests={guests}
            onConfirm={handleConfirmBooking}
          />
        )}

        <EditRoomModal
          key={selectedRoom?.id || 'room-none'}
          isOpen={isEditRoomModalOpen}
          onClose={() => {
            setIsEditRoomModalOpen(false);
            setSelectedRoom(null);
          }}
          room={selectedRoom}
          onSave={handleUpdateRoom}
        />

        <EditProductModal
          key={selectedProduct?.id || 'prod-none'}
          isOpen={isEditExpModalOpen}
          onClose={() => {
            setIsEditExpModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSave={handleUpdateProduct}
        />

        <AddProductModal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          onSave={handleAddProduct}
        />

        <ConsumptionModal
          isOpen={isConsumptionModalOpen}
          onClose={() => {
            setIsConsumptionModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={bookings.find(b => b.id === selectedBooking?.id) || null}
          products={products}
          onAddConsumption={handleAddConsumption}
          onRemoveConsumption={handleRemoveConsumption}
          onCheckOut={handleCheckOut}
          onExtendStay={handleExtendStay}
        />

        <AddGuestModal
          isOpen={isAddGuestModalOpen}
          onClose={() => setIsAddGuestModalOpen(false)}
          onSave={handleAddGuest}
        />

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedBooking(null);
            setSelectedRoom(null);
          }}
          booking={selectedBooking}
          room={selectedRoom}
          onConfirm={handleConfirmPayment}
        />
      </main>
    </div>
  );
}
