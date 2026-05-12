const checkInDate = new Date("2026-05-11");
const oldCheckOutDate = new Date("2026-05-15");
const newCheckOutDate = new Date("2026-05-16");
console.log((oldCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
console.log((newCheckOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
