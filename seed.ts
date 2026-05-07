/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './src/lib/firebase';

const FIRST_FLOOR = ['14', '15', '16', '17', '18', '19', '20', '21', '22'];
const SECOND_FLOOR = ['23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36'];
const THIRD_FLOOR = ['35', '37', '38', '39', '40', '41', '44', '43', '46', '45', '47', '48', '49', '50'];

interface SeedRoom {
  number: string;
  type: string;
  status: string;
  guest: string | null;
  price: number;
  bedType: string;
}

const INITIAL_ROOMS: SeedRoom[] = [
  ...FIRST_FLOOR.map(n => ({ number: n, type: `Suíte - 1º Andar`, status: 'AVAILABLE', guest: null, price: 139, bedType: '1_CASAL' })),
  ...SECOND_FLOOR.map(n => ({ number: n, type: `Suíte - 2º Andar`, status: 'AVAILABLE', guest: null, price: 139, bedType: '1_CASAL_1_SOLTEIRO' })),
  ...THIRD_FLOOR.map(n => ({ number: n, type: `Suíte - 3º Andar`, status: 'AVAILABLE', guest: null, price: 139, bedType: '1_CASAL' })),
];

async function seed() {
  const roomsCol = collection(db, 'rooms');
  const snapshot = await getDocs(roomsCol);
  
  console.log('Cleaning existing rooms...');
  const deleteBatch = writeBatch(db);
  snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();

  console.log(`Seeding ${INITIAL_ROOMS.length} new suites...`);
  
  // Firestore batches have a limit of 500 operations, 34 is fine for one batch
  const writeTableBatch = writeBatch(db);
  INITIAL_ROOMS.forEach((room) => {
    const newDocRef = doc(roomsCol);
    writeTableBatch.set(newDocRef, room);
  });
  
  await writeTableBatch.commit();
  console.log('Seed complete!');

  // Seed products
  const prodCol = collection(db, 'products');
  const prodSnapshot = await getDocs(prodCol);
  
  console.log('Cleaning existing products...');
  const deleteProdBatch = writeBatch(db);
  prodSnapshot.docs.forEach(doc => deleteProdBatch.delete(doc.ref));
  await deleteProdBatch.commit();

  const NEW_PRODUCTS = [
    { name: 'Heineken garrafa', price: 12.00, description: 'Cervejas' },
    { name: 'Heineken Lata', price: 8.00, description: 'Cervejas' },
    { name: 'Amstel Lata', price: 6.00, description: 'Cervejas' },
    { name: 'Kaiser Lata', price: 5.00, description: 'Cervejas' },
    { name: 'Brahma Lata', price: 6.00, description: 'Cervejas' },
    { name: 'Skol Lata', price: 5.00, description: 'Cervejas' },
    { name: 'Coca-Cola Lata', price: 5.00, description: 'Refrigerantes' },
    { name: 'Coca-Cola Zero Lata', price: 5.00, description: 'Refrigerantes' },
    { name: 'Fanta Lata', price: 5.00, description: 'Refrigerantes' },
    { name: 'Guaraná Antarctica Lata', price: 4.00, description: 'Refrigerantes' },
    { name: 'Água 500ml', price: 2.00, description: 'Águas e Hidratação' },
    { name: 'Água com Gás', price: 4.00, description: 'Águas e Hidratação' },
    { name: 'Água Tônica 500ml', price: 8.00, description: 'Águas e Hidratação' },
    { name: 'Água de coco', price: 4.00, description: 'Águas e Hidratação' },
    { name: 'Gatorade', price: 10.00, description: 'Águas e Hidratação' },
    { name: 'Suco Del Valle', price: 4.00, description: 'Sucos e Energéticos' },
    { name: 'Suco Da fruit', price: 4.00, description: 'Sucos e Energéticos' },
    { name: 'Suco Guapo', price: 4.00, description: 'Sucos e Energéticos' },
    { name: 'Energético', price: 12.00, description: 'Sucos e Energéticos' },
    { name: 'Bebida Loc', price: 10.00, description: 'Sucos e Energéticos' },
    { name: 'Batata Pringles', price: 20.00, description: 'Snacks' },
    { name: 'Elma Chips', price: 20.00, description: 'Snacks' },
    { name: 'Salgadinho Anelito Cebola', price: 3.50, description: 'Snacks' },
    { name: 'Salgadinho Carne de Churrasco', price: 5.00, description: 'Snacks' },
    { name: 'H2O Limoneto', price: 6.00, description: 'Águas e Hidratação' },
    { name: 'Extra Power', price: 10.00, description: 'Sucos e Energéticos' },
    { name: 'Antarctica', price: 5.00, description: 'Cervejas' },
    { name: 'Kapo Laranja', price: 4.00, description: 'Sucos e Energéticos' },
    { name: 'Kapo Uva', price: 4.00, description: 'Sucos e Energéticos' },
    { name: 'Kapo Maracujá', price: 4.00, description: 'Sucos e Energéticos' },
  ];

  console.log(`Seeding ${NEW_PRODUCTS.length} new products...`);
  const prodBatch = writeBatch(db);
  NEW_PRODUCTS.forEach(product => {
    const newDocRef = doc(prodCol);
    prodBatch.set(newDocRef, product);
  });
  
  await prodBatch.commit();
  console.log('Product seed complete!');

  // Seed guests
  const guestCol = collection(db, 'guests');
  const guestSnapshot = await getDocs(guestCol);
  
  console.log('Cleaning existing guests...');
  const deleteGuestBatch = writeBatch(db);
  guestSnapshot.docs.forEach(doc => deleteGuestBatch.delete(doc.ref));
  await deleteGuestBatch.commit();

  const guests = [
    { fullName: 'valter souza neves', email: '', phone: '34997980666', document: '' },
    { fullName: 'Paulo gomes de souza junior', email: '', phone: '64 98126335', document: '' },
    { fullName: 'Jildo Almeida de Brito', email: '', phone: '64 992808218', document: '' },
    { fullName: 'Fabio morais da silva', email: '', phone: '', document: '' },
    { fullName: 'EDMAR HEILER', email: '', phone: '47 996339202', document: '' },
    { fullName: 'Daminhão Equivalde Dos Santos', email: '', phone: '61 995559569', document: '' },
    { fullName: 'adair francisco da cunha', email: '', phone: '62992512677', document: '' },
  ];

  console.log(`Seeding ${guests.length} new guests...`);
  const guestBatch = writeBatch(db);
  guests.forEach(g => {
    const gRef = doc(guestCol);
    guestBatch.set(gRef, g);
  });

  await guestBatch.commit();
  console.log('Guest seed complete!');

  // Clear bookings
  const bookingCol = collection(db, 'bookings');
  const bookingSnapshot = await getDocs(bookingCol);
  if (!bookingSnapshot.empty) {
    console.log('Cleaning existing bookings...');
    const deleteBookingBatch = writeBatch(db);
    bookingSnapshot.docs.forEach(doc => deleteBookingBatch.delete(doc.ref));
    await deleteBookingBatch.commit();
    console.log('Bookings cleared!');
  }
}

seed().catch(console.error);
