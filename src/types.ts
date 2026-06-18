/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';

export type BedType = '1_CASAL' | '1_CASAL_1_SOLTEIRO' | '1_SOLTEIRO' | '2_SOLTEIRO';

export interface Room {
  id: string;
  number: string;
  type: string;
  status: RoomStatus;
  guest: string | null;
  price: number;
  bedType?: BedType;
  cleaningStartedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface Stat {
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down';
}

export interface Guest {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  document?: string;
}

export interface Consumption {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  timestamp: string;
  createdBy?: {
    uid: string;
    email: string | null;
    name: string | null;
  } | null;
  isPaidImmediate?: boolean;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  paidBy?: {
    uid: string;
    email: string | null;
    name: string | null;
  } | null;
}

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO';

export interface UpfrontPayment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  paidBy: {
    uid: string;
    email: string | null;
    name: string | null;
  };
}

export interface Booking {
  id: string;
  guestId?: string;
  guestName?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  source?: 'DIRECT' | 'AIRBNB' | 'BOOKING';
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  totalPrice: number;
  guestsCount?: number;
  consumptions?: Consumption[];
  paymentMethod?: PaymentMethod;
  finalTotal?: number;
  discount?: number;
  extraStayCharges?: number;
  checkedOutAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  checkedOutBy?: {
    uid: string;
    email: string | null;
    name: string | null;
  };
  createdBy?: {
    uid: string;
    email: string | null;
    name: string | null;
  };
  upfrontPaid?: boolean;
  upfrontPaymentAmount?: number;
  upfrontPaymentMethod?: PaymentMethod;
  upfrontPaidAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  upfrontPaidBy?: {
    uid: string;
    email: string | null;
    name: string | null;
  };
  upfrontPaymentsList?: UpfrontPayment[];
}

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  name: string | null;
  role: 'ADMIN' | 'RECEPTIONIST';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: unknown;
}

export interface BookingStatusLog {
  id: string;
  bookingId?: string;
  roomId?: string;
  previousStatus?: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NONE';
  newStatus?: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  type?: 'STATUS_CHANGE' | 'CASHIER_CLOSING';
  shift?: 'DIURNO' | 'NOTURNO';
  date?: string;
  totalRevenue?: number;
  updatedBy: {
    uid: string;
    email: string | null;
    name: string | null;
  };
  timestamp: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface CashierClosing {
  id?: string;
  date: string; // YYYY-MM-DD
  shift: 'DIURNO' | 'NOTURNO';
  closedByUid: string;
  closedByName: string;
  closedByEmail: string | null;
  closedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  totalRevenue: number;
  totalCash: number;
  totalPix: number;
  totalDebit: number;
  totalCredit: number;
  wasZero: boolean;
  observations?: string;
}



