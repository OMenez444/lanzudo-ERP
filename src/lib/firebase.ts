/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// Connection test as per instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. You may be offline or the project is misconfigured.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function createCollaborator(email: string, pass: string, name: string, role: 'ADMIN' | 'RECEPTIONIST') {
  const apiKey = firebaseConfig.apiKey;
  
  // 1. Create user via Identity Toolkit REST API
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: pass,
      returnSecureToken: true
    })
  });

  const signUpData = await signUpRes.json();
  if (!signUpRes.ok) {
    const errMsg = signUpData.error?.message || '';
    if (errMsg.includes('OPERATION_NOT_ALLOWED')) {
      throw new Error('A autenticação por E-mail/Senha não está habilitada. Acesse o Console do Firebase > Authentication > Sign-in method e ative "Email/Password" para cadastrar colaboradores.');
    } else if (errMsg.includes('EMAIL_EXISTS')) {
      throw new Error('Já existe um usuário registrado com este e-mail.');
    }
    throw new Error(errMsg || 'Erro ao criar usuário.');
  }

  const { localId: uid, idToken } = signUpData;

  // 2. Update profile (displayName)
  const updateRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      displayName: name,
      returnSecureToken: false
    })
  });

  if (!updateRes.ok) {
    const updateData = await updateRes.json();
    console.error('Failed to update profile:', updateData);
    // Continue anyway since user is created
  }

  // 3. Save to Firestore
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    id: uid,
    uid,
    email,
    name,
    role,
    status: 'ACTIVE'
  });
}

