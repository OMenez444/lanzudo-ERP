import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, query, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const q = query(collectionGroup(db, 'statusLogs'));
    const snapshot = await getDocs(q);
    console.log("Docs found:", snapshot.size);
    snapshot.forEach(doc => {
      console.log(doc.data().timestamp);
    })
  } catch (error) {
    console.error("Error querying:");
    console.error(error.message);
  }
}
test();
