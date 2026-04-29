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
}

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO';

export interface Booking {
  id: string;
  guestId?: string;
  guestName?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  totalPrice: number;
  guestsCount?: number;
  consumptions?: Consumption[];
  paymentMethod?: PaymentMethod;
  finalTotal?: number;
  discount?: number;
}
