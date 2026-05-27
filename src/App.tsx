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
import { TimelineView } from './components/TimelineView';
import { BookingModal } from './components/BookingModal';
import { EditRoomModal } from './components/EditRoomModal';
import { EditProductModal } from './components/EditProductModal';
import { AddProductModal } from './components/AddProductModal';
import { ConsumptionModal } from './components/ConsumptionModal';
import { AddGuestModal } from './components/AddGuestModal';
import { PaymentModal } from './components/PaymentModal';
import { Room, Stat, Product, Booking, Consumption, Guest, PaymentMethod, AppUser, BookingStatusLog } from './types';
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
  serverTimestamp,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth, signInWithGoogle, createCollaborator } from './lib/firebase';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'logs'>('users');
  const [allStatusLogs, setAllStatusLogs] = useState<BookingStatusLog[]>([]);
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logsError, setLogsError] = useState('');

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
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          const newProfile: AppUser = {
            id: currentUser.uid,
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Desconhecido',
            role: 'ADMIN', // default first user or anyone to Admin role initially for user management
            status: 'ACTIVE'
          };
          await setDoc(userRef, newProfile);
          setCurrentUserProfile(newProfile);
        } else {
          setCurrentUserProfile({ id: docSnap.id, ...docSnap.data() } as AppUser);
        }
      } else {
        setCurrentUserProfile(null);
        setAppUsers([]);
      }
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

      // 3. Log the status action
      const logRef = doc(collection(db, 'statusLogs'));
      batch.set(logRef, {
        id: logRef.id,
        bookingId: activeBooking.id,
        previousStatus: activeBooking.status || 'CONFIRMED',
        newStatus: 'CHECKED_OUT',
        updatedBy: user ? {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Desconhecido'
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
      
      const oldNights = Math.max(1, Math.round((oldCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
      const newNights = Math.max(1, Math.round((newCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
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

  const handleUpdateBooking = async (bookingId: string, updates: { guestsCount?: number; stayTotal?: number }) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const isAirbnb = booking.source === 'AIRBNB';
      const dataToUpdate: Record<string, number> = {};
      
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
          uid: user.uid,
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
      
      const batch = writeBatch(db);
      
      // Atualizar a Reserva para o novo quarto
      batch.update(doc(db, 'bookings', bookingId), { roomId: newRoomId });
      
      // Antigo quarto para CLEANING
      batch.update(doc(db, 'rooms', oldRoomId), {
        status: 'CLEANING',
        guest: null
      });
      
      // Novo quarto para OCCUPIED
      batch.update(doc(db, 'rooms', newRoomId), {
        status: 'OCCUPIED',
        guest: booking.guestName
      });
      
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
      await createCollaborator(createUserEmail, createUserPassword, createUserName, createUserRole);
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
    setIsEditUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editUserName,
        role: editUserRole,
        status: editUserStatus
      });
      setIsEditUserModalOpen(false);
      setEditingUser(null);
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
    const checkedOutBookings = bookings.filter(b => b.status === 'CHECKED_OUT').sort((a, b) => (b.checkedOutAt?.toMillis() || 0) - (a.checkedOutAt?.toMillis() || 0));
    
    if (checkedOutBookings.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    
    // Headers
    let csvContent = "Data de Saida,Hospede,Quarto,Recepcionista,Total Estadia,Total Consumo,Desconto,Total Pago,Metodo de Pagamento,Origem\n";
    
    checkedOutBookings.forEach(b => {
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
    link.setAttribute("download", `financeiro_${new Date().toISOString().split('T')[0]}.csv`);
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
      // Pricing rules: 1=139, 2=189, 3=279
      let pricePerNight = 139;
      if (data.guestsCount === 2) pricePerNight = 189;
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
          uid: user.uid,
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
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Desconhecido'
        } : { uid: 'system', email: 'system@hotel.com', name: 'Sistema' },
        timestamp: serverTimestamp()
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        // Force refresh user to reflect changes
        setUser({ ...userCredential.user, displayName });
      }
    } catch (err) {
      const error = err as Error;
      setAuthError(error.message || 'Erro de autenticação');
    }
  };

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
          className="w-full max-w-md p-12 bg-brand-slate border border-white/5 rounded-[40px] text-center shadow-2xl relative"
        >
          <div className="mb-8">
            <h1 className="text-4xl font-serif text-brand-gold italic font-bold tracking-tighter uppercase mb-2">Lanzudo's</h1>
            <p className="text-[10px] tracking-[0.4em] text-brand-cream uppercase font-black opacity-60">Hotel Experience PMS</p>
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
              onClick={signInWithGoogle}
              className="w-full border border-white/10 hover:bg-white/5 text-white py-4 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all text-xs"
            >
              Acessar com Google Auth
            </button>
            
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }}
              className="mt-6 text-[10px] text-brand-gold uppercase font-black tracking-tighter hover:text-brand-gold/70 transition-colors"
            >
              {isLoginMode ? 'Precisa de acesso? Criar conta' : 'Já tem acesso? Entrar'}
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
            onClick={() => signOut(auth)}
            className="w-full border border-white/10 hover:bg-white/5 text-slate-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all animate-pulse-subtle"
          >
            Sair e trocar de conta
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg text-slate-200 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userEmail={user?.email} />

      <main className="flex-1 overflow-y-auto p-6 lg:p-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-serif text-brand-cream mb-2">
              {activeTab === 'dashboard' ? 'Painel Executivo' : 
               activeTab === 'rooms' ? 'Mapa de Unidades' : 
               activeTab === 'guests' ? 'Base de Hóspedes' : 
               activeTab === 'products' ? 'Catálogo de Produtos' : 
               activeTab === 'users-admin' ? 'Controle de Colaboradores' : 'Financeiro'}
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
                  {currentUserProfile?.name || user?.displayName || 'Colaborador'}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {currentUserProfile?.role === 'ADMIN' ? 'Administrador' : 'Recepcionista'}
                </span>
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
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Total de Reservas</p>
                  <p className="text-lg text-emerald-500 font-bold">{bookings.filter(b => b.status === 'CHECKED_OUT').length}</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="bg-brand-gold text-brand-bg px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-gold/10 hover:scale-105 transition-all"
                >
                  <Download size={16} /> Exportar
                </button>
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
                      <th className="font-black py-4 px-4 whitespace-nowrap">Recepcionista</th>
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
                        {appUsers.map((u) => (
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
                        {appUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-slate-600 italic">
                              Nenhum colaborador registrado.
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
                              <span className="font-mono text-xs text-brand-gold bg-brand-gold/5 border border-brand-gold/10 px-2.5 py-1 rounded">
                                Quarto {room?.number || '-'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {getStatusBadge(log.previousStatus)}
                                <span className="text-slate-600 text-xs font-bold leading-none">➔</span>
                                {getStatusBadge(log.newStatus)}
                              </div>
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

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setIsEditUserModalOpen(false);
                      setEditingUser(null);
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
    </div>
  );
}
