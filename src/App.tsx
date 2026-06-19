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
  Edit2,
  Trash2,
  Download,
  Lock,
  History
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { RoomCard } from './components/RoomCard';
import { DashboardStats } from './components/DashboardStats';
import { OccupancyDetailModal } from './components/OccupancyDetailModal';
import { TimelineView } from './components/TimelineView';
import { BookingModal } from './components/BookingModal';
import { EditRoomModal } from './components/EditRoomModal';
import { EditProductModal } from './components/EditProductModal';
import { AddProductModal } from './components/AddProductModal';
import { ConsumptionModal } from './components/ConsumptionModal';
import { AddGuestModal } from './components/AddGuestModal';
import { PaymentModal } from './components/PaymentModal';
import { LanChatbot } from './components/LanChatbot';
import { CashierClosingView } from './components/CashierClosingView';
import { Room, Stat, Product, Booking, Consumption, Guest, PaymentMethod, AppUser, BookingStatusLog, UpfrontPayment } from './types';
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
  where,
  serverTimestamp,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, signInWithGoogle } from './lib/firebase';
import { getLocalDateString } from './lib/dateUtils';

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [isEditExpModalOpen, setIsEditExpModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOccupancyModalOpen, setIsOccupancyModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<string | undefined>();
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const isLoginMode = true;
  const [authError, setAuthError] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'logs'>('users');
  const [allStatusLogs, setAllStatusLogs] = useState<BookingStatusLog[]>([]);
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logsError, setLogsError] = useState('');
  
  const [financeMonthFilter, setFinanceMonthFilter] = useState<number>(new Date().getMonth());
  const [financeYearFilter, setFinanceYearFilter] = useState<number>(new Date().getFullYear());

  const handleGenerateMockLogs = async () => {
    if (rooms.length === 0) {
      setLogsError("Para gerar os logs de teste, você precisa criar ao menos 1 quarto antes.");
      return;
    }
    setLogsError("");
    
    try {
      // Remover mocks anteriores
      const qMocks = query(collection(db, 'statusLogs'));
      const snapshotMocks = await getDocs(qMocks);
      const batchDelete = writeBatch(db);
      snapshotMocks.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.updatedBy?.uid?.includes('mock') || data.updatedBy?.uid === 'hotel-lanzudos') {
          batchDelete.delete(docSnap.ref);
        }
      });
      await batchDelete.commit();

      const batch = writeBatch(db);
      const mockLogs = [
        { prev: 'CHECKED_IN' as const, curr: 'CHECKED_OUT' as const, time: '2026-05-22T09:00:15', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
        { prev: 'CONFIRMED' as const, curr: 'CHECKED_IN' as const, time: '2026-05-22T09:02:30', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
        { prev: 'NONE' as const, curr: 'CONFIRMED' as const, time: '2026-05-22T09:05:45', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
        { prev: 'CHECKED_IN' as const, curr: 'CHECKED_OUT' as const, time: '2026-05-22T09:08:12', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
        { prev: 'CONFIRMED' as const, curr: 'CANCELLED' as const, time: '2026-05-22T09:10:05', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
        { prev: 'CONFIRMED' as const, curr: 'CHECKED_IN' as const, time: '2026-05-22T09:13:20', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
        { prev: 'CHECKED_IN' as const, curr: 'CHECKED_OUT' as const, time: '2026-05-22T09:15:00', user: { name: 'Hotel Lanzudos', email: '-', uid: 'hotel-lanzudos' } },
      ];
      let rIndex = 0;
      for (const log of mockLogs) {
        const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
        const bId = `mock-booking-${Date.now()}-${rIndex}`;
        rIndex++;
        const logRef = doc(collection(db, 'statusLogs'));
        batch.set(logRef, {
          id: logRef.id,
          bookingId: bId,
          roomId: randomRoom.id,
          previousStatus: log.prev,
          newStatus: log.curr,
          updatedBy: log.user,
          timestamp: Timestamp.fromDate(new Date(log.time))
        });
      }
      await batch.commit();
      setLogDateFilter('2026-05-22');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setLogsError("Erro ao gerar logs mock: " + msg);
    }
  };

  useEffect(() => {
    const checkLocalSession = async () => {
      const storedUserId = localStorage.getItem('lanzudos_user_id');
      if (storedUserId) {
        const userRef = doc(db, 'users', storedUserId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const u = { id: docSnap.id, uid: docSnap.id, ...docSnap.data() } as AppUser;
          setUser(u);
          setCurrentUserProfile(u);
        } else {
          localStorage.removeItem('lanzudos_user_id');
          setUser(null);
          setCurrentUserProfile(null);
          setAppUsers([]);
        }
      } else {
        setUser(null);
        setCurrentUserProfile(null);
        setAppUsers([]);
      }
      setLoading(false);
    };

    checkLocalSession();
  }, []);

  useEffect(() => {
    const updateAdminPasswordAndAccount = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', 'jeffersonbala31@gmail.com'));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'users', userDoc.id), {
            password: '230623',
            role: 'ADMIN',
            status: 'ACTIVE'
          });
          console.log('Password for jeffersonbala31@gmail.com initialized/updated in DB.');
        } else {
          const newUserRef = doc(collection(db, 'users'));
          await setDoc(newUserRef, {
            id: newUserRef.id,
            uid: newUserRef.id,
            email: 'jeffersonbala31@gmail.com',
            password: '230623',
            name: 'Jefferson Bala',
            role: 'ADMIN',
            status: 'ACTIVE',
            createdAt: serverTimestamp()
          });
          console.log('Created admin account for jeffersonbala31@gmail.com');
        }
      } catch (err) {
        console.error('Error in updateAdminPasswordAndAccount:', err);
      }
    };
    updateAdminPasswordAndAccount();
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

  useEffect(() => {
    if (!user) {
      return;
    }
    const q = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppUser[];
      setAppUsers(usersData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    return () => unsubscribeUsers();
  }, [user]);

  useEffect(() => {
    if (!user || user.email?.toLowerCase() !== 'jeffersonbala31@gmail.com') {
      return;
    }
    const q = query(collection(db, 'statusLogs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as BookingStatusLog[];
      
      logsData.sort((a, b) => {
        const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      setAllStatusLogs(logsData);
      setLogsError('');
    }, (error) => {
      setLogsError(error.message || 'Erro desconhecido ao carregar logs.');
      if (error.code !== 'permission-denied') {
        console.error("Erro ao carregar logs globais de auditoria:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const occupancyRate = rooms.length > 0 ? Math.round((rooms.filter(r => r.status === 'OCCUPIED').length / rooms.length) * 100) : 0;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const checkinsToday = bookings.filter(b => {
    if (b.status !== 'CONFIRMED' || !b.checkIn) return false;
    const today = getLocalDateString();
    return b.checkIn === today;
  }).length;

  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthsList[new Date().getMonth()];

  const getBookingFinalTotal = (b: Booking) => {
    if (b.finalTotal !== undefined && b.finalTotal !== null) return b.finalTotal;
    const isAirbnb = b.source === 'AIRBNB';
    const stayTotal = isAirbnb ? (Number(b.extraStayCharges) || 0) : (Number(b.totalPrice) || 0);
    const consumptionTotal = b.consumptions?.reduce((accC, c) => accC + (c.price * c.quantity), 0) || 0;
    const discount = b.discount || 0;
    return Math.max(0, stayTotal + consumptionTotal - discount);
  };

  const totalRevenueValue = bookings
    .filter(b => b.status === 'CHECKED_OUT')
    .reduce((acc, b) => acc + getBookingFinalTotal(b), 0);

  const currentMonthRevenue = bookings
    .filter(b => b.status === 'CHECKED_OUT' && b.checkedOutAt)
    .filter(b => {
      const dt = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
      const now = new Date();
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    })
    .reduce((acc, b) => acc + getBookingFinalTotal(b), 0);

  const cleaningCount = rooms.filter(r => r.status === 'CLEANING').length;

  const stats: Stat[] = [
    { label: 'Ocupação', value: `${occupancyRate}%`, sub: `${occupiedRooms} de ${rooms.length} UNIDADES`, trend: 'up' },
    { label: 'Check-ins', value: checkinsToday.toString(), sub: 'Hoje', trend: 'up' },
    { label: 'Receita', value: `R$ ${currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `Deste mês (${currentMonthName})`, trend: 'up' },
    { label: 'Limpeza', value: cleaningCount.toString(), sub: 'Aguardando', trend: cleaningCount > 0 ? 'up' : 'down' },
  ];

  const handleOpenBookingModal = (roomId?: string) => {
    if (guests.length === 0) {
      alert("Não é possível realizar uma reserva sem clientes. Cadastre pelo menos um hóspede no sistema primeiro.");
      setIsAddGuestModalOpen(true);
      return;
    }
    if (roomId) setSelectedRoomForBooking(roomId);
    setIsBookingModalOpen(true);
  };

  const handleCheckIn = async (id: string) => {
    const today = getLocalDateString();
    const existingBooking = bookings.find(b => 
      b.roomId === id && 
      b.status === 'CONFIRMED' && 
      b.checkIn <= today && 
      b.checkOut >= today
    );

    if (existingBooking) {
      if (window.confirm(`Encontramos uma reserva agendada para hoje para o hóspede "${existingBooking.guestName}". Deseja realizar o check-in do hóspede nesta reserva agora?`)) {
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'rooms', id), {
            status: 'OCCUPIED',
            guest: existingBooking.guestName,
            cleaningStartedAt: null
          });
          
          const logRef = doc(collection(db, 'statusLogs'));
          batch.set(logRef, {
            id: logRef.id,
            bookingId: existingBooking.id,
            previousStatus: 'CONFIRMED',
            newStatus: 'CHECKED_IN',
            updatedBy: user ? {
              uid: user.uid || user.id || 'unknown',
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || 'Desconhecido'
            } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' },
            timestamp: serverTimestamp()
          });

          await batch.commit();
          return;
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
          return;
        }
      }
    }
    
    handleOpenBookingModal(id);
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
    
    const consumptionsTotal = activeBooking.consumptions?.filter(c => !c.isPaidImmediate).reduce((acc, curr) => {
      const price = Number(curr.price) || 0;
      const qty = Number(curr.quantity) || 0;
      return acc + (price * qty);
    }, 0) || 0;
    
    const isAirbnb = activeBooking.source === 'AIRBNB';
    const stayTotal = isAirbnb ? (Number(activeBooking.extraStayCharges) || 0) : (Number(activeBooking.totalPrice) || 0);
    const upfrontAmt = activeBooking.upfrontPaid ? (Number(activeBooking.upfrontPaymentAmount) || 0) : 0;
    const grandTotal = Math.max(0, stayTotal + consumptionsTotal - upfrontAmt - discount);

    try {
      const batch = writeBatch(db);

      // 1. Update room status to cleaning
      batch.update(doc(db, 'rooms', roomId), {
        status: 'CLEANING',
        guest: null,
        cleaningStartedAt: serverTimestamp()
      });

      // 2. Update booking status to checked out
      batch.update(doc(db, 'bookings', activeBooking.id), {
        status: 'CHECKED_OUT',
        finalTotal: grandTotal,
        discount: discount,
        paymentMethod: method,
        checkedOutAt: serverTimestamp(),
        checkedOutBy: user ? {
          uid: user.uid || user.id || 'unknown',
          email: user.email,
          name: user.name || user.email?.split('@')[0] || 'Desconhecido'
        } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' }
      });

      // 3. Log the status action
      const logRef = doc(collection(db, 'statusLogs'));
      batch.set(logRef, {
        id: logRef.id,
        bookingId: activeBooking.id,
        previousStatus: activeBooking.status || 'CONFIRMED',
        newStatus: 'CHECKED_OUT',
        updatedBy: user ? {
          uid: user.uid || user.id || 'unknown',
          email: user.email,
          name: user.name || user.email?.split('@')[0] || 'Desconhecido'
        } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' },
        timestamp: serverTimestamp()
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
        status: 'AVAILABLE',
        cleaningStartedAt: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
    }
  };

  const handleUpdateRoom = async (id: string, data: Partial<Room>) => {
    try {
      const updateData = { ...data };
      if (updateData.status === 'CLEANING') {
        updateData.cleaningStartedAt = serverTimestamp();
      } else if (updateData.status !== undefined) {
        updateData.cleaningStartedAt = null;
      }
      await updateDoc(doc(db, 'rooms', id), updateData);
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

  const handleAddConsumption = async (
    bookingId: string, 
    product: Product, 
    quantity: number,
    paymentOptions?: {
      isPaidImmediate: boolean;
      paymentMethod?: PaymentMethod;
      paidBy?: { uid: string; email: string | null; name: string | null; } | null;
    }
  ) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const operatorInfo = paymentOptions?.isPaidImmediate ? (paymentOptions.paidBy || {
      uid: user?.uid || 'system',
      email: user?.email || null,
      name: user?.name || user?.email?.split('@')[0] || 'Sistema'
    }) : null;

    const newConsumption: Consumption = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      timestamp: new Date().toISOString(),
      createdBy: {
        uid: user?.uid || user?.id || 'unknown',
        email: user?.email || null,
        name: user?.name || user?.email?.split('@')[0] || 'Colaborador'
      },
      isPaidImmediate: paymentOptions?.isPaidImmediate || false
    };

    if (paymentOptions?.isPaidImmediate) {
      newConsumption.paymentMethod = paymentOptions.paymentMethod || 'DINHEIRO';
      newConsumption.paidAt = new Date().toISOString();
      if (operatorInfo) {
        newConsumption.paidBy = operatorInfo;
      }
    }

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
      
      const oldNights = Math.max(1, Math.round((oldCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
      const newNights = Math.max(1, Math.round((newCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
      const extraNights = Math.max(0, newNights - oldNights);
      
      let extraPricePerNight = (booking.totalPrice + (booking.discount || 0)) / oldNights;

      // Se a diária estava zerada ou muito baixa (ex: repasse do Airbnb não lançado),
      // cobramos o valor padrão na extensão feita direto no balcão.
      if (extraPricePerNight === 0) {
        extraPricePerNight = 139;
        if (booking.guestsCount === 2) extraPricePerNight = 199.99;
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

  const handleUpdateBooking = async (bookingId: string, updates: { 
    guestsCount?: number; 
    stayTotal?: number;
    upfrontPaid?: boolean;
    upfrontPaymentAmount?: number;
    upfrontPaymentMethod?: PaymentMethod;
    upfrontPaidAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    upfrontPaidBy?: { uid: string; email: string | null; name: string | null; } | null;
    upfrontPaymentsList?: UpfrontPayment[];
  }) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const isAirbnb = booking.source === 'AIRBNB';
      const dataToUpdate: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      
      if (updates.guestsCount !== undefined) {
        dataToUpdate.guestsCount = updates.guestsCount;
      }
      
      if (updates.stayTotal !== undefined) {
        if (isAirbnb) {
          const extraChargesDiff = updates.stayTotal - (booking.extraStayCharges || 0);
          dataToUpdate.extraStayCharges = updates.stayTotal;
          dataToUpdate.totalPrice = booking.totalPrice + extraChargesDiff;
        } else {
          dataToUpdate.totalPrice = updates.stayTotal;
        }
      }

      if (updates.upfrontPaid !== undefined) {
        dataToUpdate.upfrontPaid = updates.upfrontPaid;
      }
      if (updates.upfrontPaymentAmount !== undefined) {
        dataToUpdate.upfrontPaymentAmount = updates.upfrontPaymentAmount;
      }
      if (updates.upfrontPaymentMethod !== undefined) {
        dataToUpdate.upfrontPaymentMethod = updates.upfrontPaymentMethod;
      }
      if (updates.upfrontPaidAt !== undefined) {
        dataToUpdate.upfrontPaidAt = updates.upfrontPaidAt;
      }
      if (updates.upfrontPaidBy !== undefined) {
        dataToUpdate.upfrontPaidBy = updates.upfrontPaidBy;
      }
      if (updates.upfrontPaymentsList !== undefined) {
        dataToUpdate.upfrontPaymentsList = updates.upfrontPaymentsList;
      }

      await updateDoc(doc(db, 'bookings', bookingId), dataToUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const batch = writeBatch(db);

      batch.update(doc(db, 'bookings', bookingId), {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp()
      });

      // Log the status action
      const logRef = doc(collection(db, 'statusLogs'));
      batch.set(logRef, {
        id: logRef.id,
        bookingId: bookingId,
        previousStatus: booking.status || 'CONFIRMED',
        newStatus: 'CANCELLED',
        updatedBy: user ? {
          uid: user.uid || user.id || 'unknown',
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Desconhecido'
        } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' },
        timestamp: serverTimestamp()
      });

      batch.update(doc(db, 'rooms', booking.roomId), {
        status: 'AVAILABLE',
        guest: null
      });

      await batch.commit();
      
      if (selectedBooking?.id === bookingId) {
        setIsConsumptionModalOpen(false);
        setSelectedBooking(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleMoveGuest = async (bookingId: string, newRoomId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const oldRoomId = booking.roomId;
      const oldRoomObj = rooms.find(r => r.id === oldRoomId);
      const isCurrentlyOccupiedByThisGuest = oldRoomObj?.status === 'OCCUPIED' && oldRoomObj?.guest === booking.guestName;
      
      const batch = writeBatch(db);
      
      // Atualizar a Reserva para o novo quarto
      batch.update(doc(db, 'bookings', bookingId), { roomId: newRoomId });
      
      if (isCurrentlyOccupiedByThisGuest) {
        // Antigo quarto para CLEANING somente se estava ocupado por este hóspede
        batch.update(doc(db, 'rooms', oldRoomId), {
          status: 'CLEANING',
          guest: null,
          cleaningStartedAt: serverTimestamp()
        });
        
        // Novo quarto para OCCUPIED somente se o hóspede já estava no quarto antigo
        batch.update(doc(db, 'rooms', newRoomId), {
          status: 'OCCUPIED',
          guest: booking.guestName,
          cleaningStartedAt: null
        });
      }
      
      await batch.commit();
      
      // Confirm UI changes
      if (selectedBooking?.id === bookingId) {
        setIsConsumptionModalOpen(false);
        setSelectedBooking(null);
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm("Certeza que deseja excluir permanentemente este registro financeiro?")) {
      try {
        await deleteDoc(doc(db, 'bookings', bookingId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `bookings/${bookingId}`);
      }
    }
  };

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'ADMIN' | 'RECEPTIONIST'>('RECEPTIONIST');
  const [editUserStatus, setEditUserStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserName, setCreateUserName] = useState('');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'ADMIN' | 'RECEPTIONIST'>('RECEPTIONIST');
  const [createUserError, setCreateUserError] = useState('');
  const [isCreatingCollaborator, setIsCreatingCollaborator] = useState(false);

  const handleCreateCollaboratorSubmit = async () => {
    if (!createUserName || !createUserEmail || !createUserPassword) {
      setCreateUserError('Por favor, preencha todos os campos.');
      return;
    }
    if (createUserPassword.length < 6) {
      setCreateUserError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }
    setCreateUserError('');
    setIsCreatingCollaborator(true);
    try {
      const newUserRef = doc(collection(db, 'users'));
      await setDoc(newUserRef, {
        id: newUserRef.id,
        uid: newUserRef.id,
        email: createUserEmail,
        password: createUserPassword, // Plaintext password for this mockup
        name: createUserName,
        role: createUserRole,
        status: 'ACTIVE',
        createdAt: serverTimestamp()
      });
      setCreateUserName('');
      setCreateUserEmail('');
      setCreateUserPassword('');
      setCreateUserRole('RECEPTIONIST');
      setIsCreateUserModalOpen(false);
    } catch (err) {
      const error = err as Error;
      setCreateUserError(error.message || 'Erro ao criar colaborador.');
    } finally {
      setIsCreatingCollaborator(false);
    }
  };

  const handleOpenEditUser = (u: AppUser) => {
    setEditingUser(u);
    setEditUserName(u.name || '');
    setEditUserRole(u.role || 'RECEPTIONIST');
    setEditUserStatus(u.status || 'ACTIVE');
    setEditUserPassword('');
    setIsEditUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const updateData: Partial<AppUser & { password?: string }> = {
        name: editUserName,
        role: editUserRole,
        status: editUserStatus
      };
      if (editUserPassword) {
        updateData.password = editUserPassword;
      }
      await updateDoc(doc(db, 'users', editingUser.id), updateData);
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      setEditUserPassword('');
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao atualizar colaborador", error);
      alert("Erro ao atualizar o colaborador.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Deseja realmente remover este colaborador do sistema?")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        const error = err as Error;
        console.error("Erro ao deletar usuário", error);
      }
    }
  };

  const handleExportCSV = () => {
    const sortedAndFiltered = bookings
      .filter(b => b.status === 'CHECKED_OUT')
      .filter(b => {
        if (!b.checkedOutAt) return false;
        const checkoutDate = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
        const MatchesYear = checkoutDate.getFullYear() === financeYearFilter;
        const MatchesMonth = financeMonthFilter === -1 || checkoutDate.getMonth() === financeMonthFilter;
        return MatchesYear && MatchesMonth;
      })
      .sort((a, b) => (b.checkedOutAt?.toMillis() || 0) - (a.checkedOutAt?.toMillis() || 0));
    
    if (sortedAndFiltered.length === 0) {
      alert("Não há dados para exportar neste período.");
      return;
    }
    
    // Headers
    let csvContent = "Data de Saida,Hospede,Quarto,Recepcionista,Total Estadia,Total Consumo,Desconto,Total Pago,Metodo de Pagamento,Origem\n";
    
    sortedAndFiltered.forEach(b => {
      const room = rooms.find(r => r.id === b.roomId);
      const isAirbnb = b.source === 'AIRBNB';
      const stayTotal = isAirbnb ? (Number(b.extraStayCharges) || 0) : (Number(b.totalPrice) || 0);
      const consumptionTotal = b.consumptions?.reduce((acc, c) => acc + (c.price * c.quantity), 0) || 0;
      const discount = b.discount || 0;
      const finalTotal = b.finalTotal || Math.max(0, stayTotal + consumptionTotal - discount);
      
      const dateStr = b.checkedOutAt ? b.checkedOutAt.toDate().toLocaleDateString('pt-BR') : '';
      const guestName = `"${b.guestName}"`;
      const roomStr = `"${room ? room.number : '-'}"`;
      const receptionist = `"${b.createdBy?.name || '-'}"`;
      const stayTotalStr = stayTotal.toFixed(2).replace('.', ',');
      const consumptionTotalStr = consumptionTotal.toFixed(2).replace('.', ',');
      const discountStr = discount.toFixed(2).replace('.', ',');
      const finalTotalStr = finalTotal.toFixed(2).replace('.', ',');
      const paymentMethod = b.paymentMethod || '-';
      const source = b.source || '-';
      
      csvContent += `${dateStr},${guestName},${roomStr},${receptionist},${stayTotalStr},${consumptionTotalStr},${discountStr},${finalTotalStr},${paymentMethod},${source}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const monthNameForFile = financeMonthFilter === -1 ? 'ano' : monthsList[financeMonthFilter].toLowerCase();
    link.setAttribute("download", `financeiro_${monthNameForFile}_${financeYearFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      // Pricing rules: 1=139, 2=199.99, 3=279
      let pricePerNight = 139;
      if (data.guestsCount === 2) pricePerNight = 199.99;
      if (data.guestsCount === 3) pricePerNight = 279;
      if (data.guestsCount >= 4) pricePerNight = 279; // fallback

      // Airbnb is already paid, custom price per night represents the Platform payout (optional)
      if (data.source === 'AIRBNB') {
        pricePerNight = data.customPricePerNight || 0;
      } else if (data.guestsCount >= 4 && data.customPricePerNight !== undefined && data.customPricePerNight > 0) {
        // Direct or Booking with 4+ guests overrides the price
        pricePerNight = data.customPricePerNight;
      }

      const nights = Math.max(1, Math.round((new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
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
        createdAt: serverTimestamp(),
        createdBy: user ? {
          uid: user.uid || user.id || 'unknown',
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Desconhecido'
        } : undefined
      });

      // Log the initial status action
      const logRef = doc(collection(db, 'statusLogs'));
      batch.set(logRef, {
        id: logRef.id,
        bookingId: bookingRef.id,
        previousStatus: 'NONE',
        newStatus: 'CONFIRMED',
        updatedBy: user ? {
          uid: user.uid || user.id || 'unknown',
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Desconhecido'
        } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' },
        timestamp: serverTimestamp()
      });

      const today = getLocalDateString();
      const isActiveToday = data.checkIn <= today && data.checkOut >= today;

      if (isActiveToday) {
        batch.update(doc(db, 'rooms', data.roomId), {
          status: 'OCCUPIED',
          guest: data.guestName,
          cleaningStartedAt: null
        });
      }

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

  const filteredGuests = guests.filter(g =>
    (g.fullName && g.fullName.toLowerCase().includes(search.toLowerCase())) ||
    (g.email && g.email.toLowerCase().includes(search.toLowerCase())) ||
    (g.phone && g.phone.toLowerCase().includes(search.toLowerCase())) ||
    (g.document && g.document.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredProducts = products.filter(p =>
    (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredUsers = appUsers.filter(u =>
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredBookingsFinance = bookings
    .filter(b => b.status === 'CHECKED_OUT')
    .filter(b => {
      if (!b.checkedOutAt) return false;
      const checkoutDate = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
      const MatchesYear = checkoutDate.getFullYear() === financeYearFilter;
      const MatchesMonth = financeMonthFilter === -1 || checkoutDate.getMonth() === financeMonthFilter;
      return MatchesYear && MatchesMonth;
    })
    .filter(b => {
      const room = rooms.find(r => r.id === b.roomId);
      const roomNum = room?.number || '';
      return (
        (b.guestName && b.guestName.toLowerCase().includes(search.toLowerCase())) ||
        roomNum.includes(search) ||
        (b.paymentMethod && b.paymentMethod.toLowerCase().includes(search.toLowerCase())) ||
        (b.createdBy?.name && b.createdBy.name.toLowerCase().includes(search.toLowerCase()))
      );
    });

  const selectedMonthRevenue = bookings
    .filter(b => b.status === 'CHECKED_OUT')
    .filter(b => {
      if (!b.checkedOutAt) return false;
      const checkoutDate = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
      const MatchesYear = checkoutDate.getFullYear() === financeYearFilter;
      const MatchesMonth = financeMonthFilter === -1 || checkoutDate.getMonth() === financeMonthFilter;
      return MatchesYear && MatchesMonth;
    })
    .reduce((acc, b) => acc + getBookingFinalTotal(b), 0);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (!isLoginMode) {
        // Register local user
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const extSnap = await getDocs(q);
        if (!extSnap.empty) {
          throw new Error('E-mail já está em uso.');
        }

        const newUserRef = doc(collection(db, 'users'));
        const newUserData = {
          id: newUserRef.id,
          uid: newUserRef.id,
          email,
          password,
          name: displayName,
          role: 'ADMIN', // first created user or any UI registered user defaults to Admin/Recepcionist (we can set to ADMIN for simplicity in first setup)
          status: 'ACTIVE',
          createdAt: serverTimestamp()
        };
        await setDoc(newUserRef, newUserData);
        localStorage.setItem('lanzudos_user_id', newUserRef.id);
        const savedUser = newUserData as unknown as AppUser;
        setUser(savedUser);
        setCurrentUserProfile(savedUser);
      } else {
        // Login local user
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Usuário não encontrado.');
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as AppUser & { password?: string };
        
        if (userData.password !== password) {
          throw new Error('Senha incorreta.');
        }
        if (userData.status === 'INACTIVE') {
          throw new Error('Usuário inativo.');
        }
        
        localStorage.setItem('lanzudos_user_id', userDoc.id);
        setUser(userData);
        setCurrentUserProfile(userData);
      }
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message || 'Erro de autenticação');
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError('');
    try {
      const result = await signInWithGoogle();
      const googleUser = result.user;
      
      const userRef = doc(db, 'users', googleUser.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        const newProfile: AppUser = {
          id: googleUser.uid,
          uid: googleUser.uid,
          email: googleUser.email,
          name: googleUser.displayName || googleUser.email?.split('@')[0] || 'Desconhecido',
          role: 'ADMIN', // first created user or any UI registered user defaults to ADMIN
          status: 'ACTIVE'
        };
        await setDoc(userRef, newProfile);
        localStorage.setItem('lanzudos_user_id', googleUser.uid);
        setUser(newProfile);
        setCurrentUserProfile(newProfile);
      } else {
        const userData = { id: docSnap.id, ...docSnap.data() } as AppUser;
        if (userData.status === 'INACTIVE') {
          throw new Error('Usuário inativo.');
        }
        localStorage.setItem('lanzudos_user_id', googleUser.uid);
        setUser(userData);
        setCurrentUserProfile(userData);
      }
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message || 'Erro de autenticação com Google');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lanzudos_user_id');
    setUser(null);
    setCurrentUserProfile(null);
  };

  if (loading) {
    return (
      <div className="h-screen bg-transparent flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin mb-6 mx-auto"></div>
          <h1 className="text-3xl font-serif text-brand-gold italic font-bold tracking-tighter uppercase">Lanzudo's</h1>
          <p className="text-[10px] tracking-[0.4em] text-brand-cream uppercase font-black">Hotel Experience • 🇧🇷 ⚽</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-transparent flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 bg-brand-slate border border-white/5 rounded-[40px] text-center shadow-2xl relative"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-green/20 text-brand-gold border border-brand-green/35 rounded-full text-[10px] tracking-wider uppercase font-black mb-4 select-none">
              <span>🇧🇷 COPA DO MUNDO • HES ⚽</span>
            </div>
            <h1 className="text-4xl font-serif text-brand-gold italic font-bold tracking-tighter uppercase mb-2">Lanzudo's</h1>
            <p className="text-[10px] tracking-[0.4em] text-brand-cream uppercase font-black opacity-60">Hotel Experience PMS • Seleção 🏆</p>
          </div>
          
          <div className="space-y-6">
            <p className="text-slate-400 text-sm italic">
              {isLoginMode ? '"Acesso restrito a recepcionistas e gerência."' : '"Crie sua credencial de acesso ao sistema."'}
            </p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLoginMode && (
                <div>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nome do Recepcionista" 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white text-center"
                    required 
                  />
                </div>
              )}
              <div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email institucional" 
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white text-center"
                  required 
                />
              </div>
              <div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha" 
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-white text-center"
                  required 
                />
              </div>
              {authError && <p className="text-red-400 text-xs truncate">{authError}</p>}
              <button 
                type="submit"
                className="w-full bg-brand-gold hover:bg-brand-gold/80 text-brand-bg py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-brand-gold/20"
              >
                <LogIn size={20} />
                {isLoginMode ? 'Entrar no Sistema' : 'Criar Conta'}
              </button>
            </form>
            
            <button 
              onClick={handleGoogleAuth}
              className="w-full border border-white/10 hover:bg-white/5 text-white py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all text-xs"
            >
              Acessar com Google Auth
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (currentUserProfile?.status === 'INACTIVE') {
    return (
      <div className="h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 bg-brand-slate border border-white/5 rounded-[40px] shadow-2xl space-y-6"
        >
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/10">
            <Lock size={28} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif text-brand-gold">Acesso Bloqueado</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Lanzudo's Hotel Experience</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Seu acesso de colaborador está inativo ou aguardando liberação de privilégios. Por favor, entre em contato com o administrador do sistema.
          </p>
          <button
            onClick={handleLogout}
            className="w-full border border-white/10 hover:bg-white/5 text-slate-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all animate-pulse-subtle"
          >
            Sair e trocar de conta
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent text-slate-200 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userEmail={user?.email} userRole={currentUserProfile?.role} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto p-6 lg:p-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-serif text-brand-cream mb-2">
              {activeTab === 'dashboard' ? 'Painel Executivo' : 
               activeTab === 'rooms' ? 'Mapa de Unidades' : 
               activeTab === 'guests' ? 'Base de Hóspedes' : 
               activeTab === 'products' ? 'Catálogo de Produtos' : 
               activeTab === 'users-admin' ? 'Controle de Colaboradores' : 
               activeTab === 'cashier-closing' ? 'Fechamento de Caixa' : 'Financeiro'}
            </h2>
            <p className="text-slate-500 italic flex flex-wrap items-center gap-2">
              <span>"Excelência em cada detalhe da hospitalidade."</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-brand-green/20 text-brand-gold border border-brand-green/30 select-none uppercase">
                <span>Seleção Hexa 🇧🇷 ⚽</span>
              </span>
            </p>
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
                  {currentUserProfile?.name || user?.displayName || 'Colaborador'}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {currentUserProfile?.role === 'ADMIN' ? 'Administrador' : 'Recepcionista'}
                </span>
              </div>
              
              <button 
                onClick={handleLogout}
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
            <DashboardStats stats={stats} onStatClick={(label) => { if (label === 'Ocupação') setIsOccupancyModalOpen(true); }} />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif text-brand-cream">Status da Operação</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenBookingModal()}
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
                    {filteredGuests.map((guest) => {
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
                    {filteredGuests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-600 italic">
                          {search ? 'Nenhum hóspede correspondente à pesquisa.' : 'Nenhum hóspede cadastrado na base de dados.'}
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
                onClick={() => handleOpenBookingModal()}
                className="bg-gold-500 hover:bg-gold-600 text-black px-6 py-4 rounded-full text-[10px] font-black tracking-widest transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                AGENDAR AGORA
              </button>
            </div>
            
            <TimelineView 
              rooms={filteredRooms} 
              bookings={bookings}
              onAddBooking={(roomId) => {
                handleOpenBookingModal(roomId);
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
              {filteredProducts.map(prod => (
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
              
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-600 italic">
                  {search ? 'Nenhum produto correspondente à pesquisa.' : 'Nenhum produto cadastrado no catálogo.'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="bg-[#121214] rounded-3xl p-8 border border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Receita do Período</p>
                  <h3 className="text-4xl font-serif text-brand-gold">R$ {selectedMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">
                    {financeMonthFilter === -1 ? 'Todos os meses' : monthsList[financeMonthFilter]} de {financeYearFilter}
                  </p>
                </div>
                <div className="border-l border-white/10 pl-6 h-12 flex flex-col justify-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-0.5">Acumulado Geral</p>
                  <p className="text-sm font-bold text-slate-300">R$ {totalRevenueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                {/* Month Dropdown */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1.5 font-mono">Mês de Referência</span>
                  <select
                    value={financeMonthFilter}
                    onChange={(e) => setFinanceMonthFilter(Number(e.target.value))}
                    className="bg-[#1a1a1f] border border-white/5 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-gold/50 cursor-pointer text-xs text-brand-cream font-bold"
                  >
                    <option value={-1}>Todos os Meses</option>
                    {monthsList.map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Dropdown */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1.5 font-mono">Ano</span>
                  <select
                    value={financeYearFilter}
                    onChange={(e) => setFinanceYearFilter(Number(e.target.value))}
                    className="bg-[#1a1a1f] border border-white/5 rounded-xl py-2.5 px-4 focus:outline-none focus:border-brand-gold/50 cursor-pointer text-xs text-brand-cream font-bold"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Total Bookings Info */}
                <div className="text-right px-4">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1.5 font-mono">Reservas no Período</p>
                  <p className="text-lg text-emerald-500 font-bold leading-none py-1.5">{filteredBookingsFinance.length}</p>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="bg-brand-gold text-brand-bg px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-gold/10 hover:scale-105 transition-all self-end"
                >
                  <Download size={14} /> Exportar
                </button>
              </div>
            </div>
            
            <div className="h-64 flex items-end gap-2 px-4 bg-white/[0.01] rounded-2xl relative mb-12 border border-white/[0.02] pt-8">
              {/* Simple chart logic based on bookings per month */}
              {(() => {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const monthlyRevenue = Array(12).fill(0);
                
                bookings.filter(b => b.status === 'CHECKED_OUT' && b.checkedOutAt).forEach(b => {
                  const date = b.checkedOutAt.toDate ? b.checkedOutAt.toDate() : new Date(b.checkedOutAt);
                  if (date.getFullYear() === financeYearFilter) {
                    monthlyRevenue[date.getMonth()] += getBookingFinalTotal(b);
                  }
                });

                const maxRevenue = Math.max(...monthlyRevenue, 1000); // minimum scale of 1000

                return monthlyRevenue.map((rev, i) => {
                  const isActive = financeMonthFilter === i;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setFinanceMonthFilter(i)}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      title={`Clique para filtrar: ${monthsList[i]}`}
                    >
                      <div 
                        className={`w-full transition-all rounded-t-lg relative ${isActive ? 'bg-brand-gold shadow-lg shadow-brand-gold/30' : 'bg-brand-gold/20 group-hover:bg-brand-gold/50'}`} 
                        style={{ height: `${Math.max(5, (rev / maxRevenue) * 100)}%` }}
                      >
                        {rev > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-slate text-[8px] font-black p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono">
                            R$ {rev.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                      <span className={`mt-4 text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-brand-gold' : 'text-slate-600 group-hover:text-slate-400'}`}>
                        {months[i]}
                      </span>
                    </div>
                  );
                });
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
                      <th className="font-black py-4 px-4 whitespace-nowrap">Recepcionista</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Estadia</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Consumo</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Desconto</th>
                      <th className="font-black py-4 px-4 text-right whitespace-nowrap">Total Pago</th>
                      <th className="font-black py-4 px-4 whitespace-nowrap">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookingsFinance.sort((a, b) => (b.checkedOutAt?.toMillis() || 0) - (a.checkedOutAt?.toMillis() || 0)).map((b, idx) => {
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
                          <td className="py-4 px-4">
                            <span className="text-xs text-slate-400 capitalize">{b.createdBy?.name || '-'}</span>
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
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase tracking-widest font-black px-2 py-1 bg-white/5 rounded text-emerald-500 whitespace-nowrap">
                                {b.paymentMethod === 'PIX' ? 'PIX' : 
                                 b.paymentMethod === 'DINHEIRO' ? 'Dinheiro' : 
                                 b.paymentMethod === 'CREDITO' ? 'Crédito' : 
                                 b.paymentMethod === 'DEBITO' ? 'Débito' : '-'}
                              </span>
                              <button
                                onClick={() => b.id && handleDeleteBooking(b.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Excluir Permanentemente"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredBookingsFinance.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-600 italic text-sm">
                          {search ? 'Nenhum histórico correspondente à pesquisa.' : 'Nenhum histórico financeiro encontrado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users-admin' && user?.email?.toLowerCase() === 'jeffersonbala31@gmail.com' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-brand-slate border border-white/5 p-6 rounded-3xl">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Total de Colaboradores</p>
                <p className="text-3xl font-serif text-brand-gold">{appUsers.length}</p>
              </div>
              <div className="bg-brand-slate border border-white/5 p-6 rounded-3xl">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Colaboradores Ativos</p>
                <p className="text-3xl font-serif text-emerald-500">{appUsers.filter(u => u.status === 'ACTIVE').length}</p>
              </div>
              <div className="bg-brand-slate border border-white/5 p-6 rounded-3xl">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Contas Administrativas</p>
                <p className="text-3xl font-serif text-sky-400">{appUsers.filter(u => u.role === 'ADMIN').length}</p>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex border-b border-white/5 pb-1 gap-6">
              <button
                onClick={() => setAdminSubTab('users')}
                className={`pb-4 px-2 text-sm font-serif relative transition-all ${
                  adminSubTab === 'users' 
                    ? 'text-brand-gold font-bold' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Colaboradores
                {adminSubTab === 'users' && (
                  <motion.div 
                    layoutId="adminSubTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" 
                  />
                )}
              </button>
              <button
                onClick={() => setAdminSubTab('logs')}
                className={`pb-4 px-2 text-sm font-serif relative transition-all ${
                  adminSubTab === 'logs' 
                    ? 'text-brand-gold font-bold' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Auditoria de Status de Reservas
                {adminSubTab === 'logs' && (
                  <motion.div 
                    layoutId="adminSubTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" 
                  />
                )}
              </button>
            </div>

            {adminSubTab === 'users' ? (
              <div className="space-y-8">
                {/* Explanatory callout banner */}
                <div className="bg-brand-gold/5 border border-brand-gold/10 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h4 className="font-serif text-brand-gold text-lg mb-1">Como integrar novos colaboradores?</h4>
                    <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                      Para conceder acesso ao sistema a um novo recepcionista, peça para ele criar uma nova conta com e-mail e senha diretamente na tela de autenticação inicial. O perfil aparecerá de forma segura e instantânea na lista abaixo para liberação e edição.
                    </p>
                  </div>
                  <div className="bg-brand-gold/10 px-4 py-2 rounded-xl text-[10px] tracking-widest uppercase font-black text-brand-gold shrink-0">
                    PROCESSO DE CONTRATAÇÃO
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-brand-slate rounded-3xl p-8 border border-white/5">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-serif text-brand-cream">Registros de Acesso</h3>
                      <span className="text-xs text-slate-500">Controle e rastreabilidade de transações</span>
                    </div>
                    <button
                      onClick={() => {
                        setCreateUserError('');
                        setIsCreateUserModalOpen(true);
                      }}
                      className="bg-brand-gold text-brand-bg px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-gold/10 hover:scale-105 transition-all"
                    >
                      Novo Colaborador
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="font-black py-4 px-4 whitespace-nowrap">Colaborador</th>
                          <th className="font-black py-4 px-4 whitespace-nowrap">E-mail de Acesso</th>
                          <th className="font-black py-4 px-4 whitespace-nowrap">Cargo / Permissão</th>
                          <th className="font-black py-4 px-4 whitespace-nowrap">Status</th>
                          <th className="font-black py-4 px-4 text-right whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group align-middle">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold text-xs uppercase border border-brand-gold/10">
                                  {u.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-brand-cream">{u.name || 'Sem nome'}</p>
                                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{u.uid === user?.uid ? 'Sua sessão atual' : 'ID: ' + u.uid.substring(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-slate-400">
                              {u.email}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full ${
                                u.role === 'ADMIN' 
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                                  : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/10'
                              }`}>
                                {u.role === 'ADMIN' ? 'Administrador' : 'Recepcionista'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                                <span className="text-xs text-slate-400">{u.status === 'ACTIVE' ? 'Ativo' : 'Suspenso / Inativo'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-2 bg-white/5 hover:bg-brand-gold hover:text-brand-bg text-brand-cream rounded-xl transition-all"
                                  title="Editar Perfil"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={u.uid === user?.uid}
                                  className={`p-2 rounded-xl transition-all ${
                                    u.uid === user?.uid 
                                      ? 'text-slate-700 bg-white/[0.01] cursor-not-allowed' 
                                      : 'bg-white/5 text-slate-400 hover:bg-red-400 hover:text-white'
                                  }`}
                                  title={u.uid === user?.uid ? "Você não pode excluir sua própria conta" : "Remover Usuário"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-slate-600 italic">
                              {search ? 'Nenhum colaborador correspondente à pesquisa.' : 'Nenhum colaborador registrado.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-brand-slate rounded-3xl p-8 border border-white/5 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-2.5xl font-serif text-brand-cream flex items-center gap-2">
                      <History className="text-brand-gold" size={24} />
                      Logs Globais de Status
                    </h3>
                    <span className="text-xs text-slate-500">Rastreamento e auditoria em tempo real de cada ciclo de hospedagem</span>
                    {logsError && (
                      <p className="mt-2 text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{logsError}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex flex-col items-start space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Filtrar por Data</label>
                      <input
                        type="date"
                        value={logDateFilter}
                        onChange={(e) => setLogDateFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 text-brand-cream rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleGenerateMockLogs}
                      className="bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors h-[38px]"
                    >
                      Gerar Logs Dia 22/05
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5">
                        <th className="font-black py-4 px-4 whitespace-nowrap">Data / Hora</th>
                        <th className="font-black py-4 px-4 whitespace-nowrap">Quarto</th>
                        <th className="font-black py-4 px-4 whitespace-nowrap">Mudança de Status</th>
                        <th className="font-black py-4 px-4 whitespace-nowrap">Operador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStatusLogs.filter(log => {
                        if (!logDateFilter) return true;
                        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                        if (isNaN(date.getTime())) return false;
                        
                        // Local time match - format is YYYY-MM-DD
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const logDateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                        return logDateString === logDateFilter;
                      }).map((log) => {
                        const booking = bookings.find(b => b.id === log.bookingId);
                        const roomId = log.roomId || booking?.roomId;
                        const room = rooms.find(r => r.id === roomId);
                        
                        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                        const formattedTime = isNaN(date.getTime()) 
                          ? 'Sincronizando...' 
                          : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                        const getStatusBadge = (status: Booking['status'] | 'NONE') => {
                          switch (status) {
                            case 'CONFIRMED':
                              return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[9px] uppercase font-black px-2 py-0.5 rounded-full inline-block">Confirmada</span>;
                            case 'CHECKED_IN':
                              return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/15 text-[9px] uppercase font-black px-2 py-0.5 rounded-full inline-block">Em Uso</span>;
                            case 'CHECKED_OUT':
                              return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/15 text-[9px] uppercase font-black px-2 py-0.5 rounded-full inline-block">Encerrada</span>;
                            case 'CANCELLED':
                              return <span className="bg-red-500/10 text-red-400 border border-red-500/15 text-[9px] uppercase font-black px-2 py-0.5 rounded-full inline-block">Cancelada</span>;
                            case 'NONE':
                            default:
                              return <span className="bg-white/5 text-slate-500 border border-white/5 text-[9px] uppercase font-black px-2 py-0.5 rounded-full inline-block">Nenhum</span>;
                          }
                        };

                        return (
                          <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group align-middle text-sm">
                            <td className="py-4 px-4 font-mono text-xs text-slate-400">
                              {formattedTime}
                            </td>
                            <td className="py-4 px-4">
                              {log.type === 'CASHIER_CLOSING' ? (
                                <span className="font-mono text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded">
                                  Caixa
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-brand-gold bg-brand-gold/5 border border-brand-gold/10 px-2.5 py-1 rounded">
                                  Quarto {room?.number || '-'}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {log.type === 'CASHIER_CLOSING' ? (
                                <div className="text-xs font-medium text-brand-cream/90 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                                  <span className="text-slate-400">Fechamento Turno:</span>
                                  <span className="text-brand-gold font-bold">{log.shift === 'NOTURNO' ? '🌙 NOTURNO' : '☀️ DIURNO'}</span>
                                  <span className="text-slate-600">({log.date ? log.date.split('-').reverse().join('/') : ''})</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-emerald-400 font-bold">R$ {log.totalRevenue ? log.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {getStatusBadge(log.previousStatus || 'NONE')}
                                  <span className="text-slate-600 text-xs font-bold leading-none">➔</span>
                                  {getStatusBadge(log.newStatus || 'CONFIRMED')}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-xs font-bold text-slate-300 capitalize">{log.updatedBy?.name || 'Sistema'}</p>
                              <p className="text-[10px] text-slate-500 lowercase">{log.updatedBy?.email || '-'}</p>
                            </td>
                          </tr>
                        );
                      })}
                      {allStatusLogs.filter(log => {
                        if (!logDateFilter) return true;
                        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                        if (isNaN(date.getTime())) return false;
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` === logDateFilter;
                      }).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-20 text-center text-slate-600 text-sm italic">
                            Sem logs de auditoria registrados para a data selecionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'cashier-closing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CashierClosingView 
              bookings={bookings}
              currentUser={user}
              currentUserProfile={currentUserProfile}
            />
          </motion.div>
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
          onUpdateBooking={handleUpdateBooking}
          onCancelBooking={handleCancelBooking}
          rooms={rooms}
          onMoveGuest={handleMoveGuest}
          currentUser={user}
          users={appUsers}
        />

        <AddGuestModal
          isOpen={isAddGuestModalOpen}
          onClose={() => setIsAddGuestModalOpen(false)}
          onSave={handleAddGuest}
        />

        <OccupancyDetailModal
          isOpen={isOccupancyModalOpen}
          onClose={() => setIsOccupancyModalOpen(false)}
          rooms={rooms}
          bookings={bookings}
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

        {isEditUserModalOpen && editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-brand-slate border border-white/5 rounded-[40px] w-full max-w-lg p-10 relative overflow-hidden"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-serif text-brand-gold">Editar Colaborador</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Configurar credenciais e acessos</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Nome Completo</label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Cargo / Nível de Permissão</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as 'ADMIN' | 'RECEPTIONIST')}
                    className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                  >
                    <option value="RECEPTIONIST">Recepcionista (Acesso Geral)</option>
                    <option value="ADMIN">Administrador (Controle Total)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Status da Conta</label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                  >
                    <option value="ACTIVE">Ativo / Liberado</option>
                    <option value="INACTIVE">Suspenso / Bloqueado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Nova Senha</label>
                  <input
                    type="password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Somente preencha se desejar alterar a senha de acesso deste colaborador.
                  </p>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setIsEditUserModalOpen(false);
                      setEditingUser(null);
                      setEditUserPassword('');
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-brand-cream py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="flex-1 bg-brand-gold hover:bg-brand-gold/80 text-brand-bg py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-brand-gold/10"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isCreateUserModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-brand-slate border border-white/5 rounded-[40px] w-full max-w-lg p-10 relative overflow-hidden"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-serif text-brand-gold">Cadastrar Novo Colaborador</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Registrar credenciais institucionais</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Nome Completo</label>
                  <input
                    type="text"
                    value={createUserName}
                    onChange={(e) => setCreateUserName(e.target.value)}
                    placeholder="Ex: Maria Oliveira"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Email de Acesso</label>
                  <input
                    type="email"
                    value={createUserEmail}
                    onChange={(e) => setCreateUserEmail(e.target.value)}
                    placeholder="maria@lanzudos.com"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Senha Provisória</label>
                  <input
                    type="password"
                    value={createUserPassword}
                    onChange={(e) => setCreateUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2 block">Cargo / Nível de Permissão</label>
                  <select
                    value={createUserRole}
                    onChange={(e) => setCreateUserRole(e.target.value as 'ADMIN' | 'RECEPTIONIST')}
                    className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-gold/50 transition-all text-sm text-brand-cream"
                  >
                    <option value="RECEPTIONIST">Recepcionista (Acesso Geral)</option>
                    <option value="ADMIN">Administrador (Controle Total)</option>
                  </select>
                </div>

                {createUserError && (
                  <p className="text-red-400 text-xs italic bg-red-400/5 border border-red-400/10 p-3 rounded-xl">
                    {createUserError}
                  </p>
                )}

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setIsCreateUserModalOpen(false);
                      setCreateUserName('');
                      setCreateUserEmail('');
                      setCreateUserPassword('');
                      setCreateUserRole('RECEPTIONIST');
                      setCreateUserError('');
                    }}
                    disabled={isCreatingCollaborator}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-brand-cream py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateCollaboratorSubmit}
                    disabled={isCreatingCollaborator}
                    className="flex-1 bg-brand-gold hover:bg-brand-gold/80 text-brand-bg py-4 rounded-2xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-brand-gold/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingCollaborator ? 'Criando...' : 'Confirmar Cadastro'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
      <LanChatbot />
    </div>
  );
}
