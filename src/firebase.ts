import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface GoogleAuthResult {
  idToken: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export async function signInWithGooglePopup(): Promise<GoogleAuthResult> {
  const credential = await signInWithPopup(auth, googleProvider);
  const idToken = await credential.user.getIdToken();
  return {
    idToken,
    email: credential.user.email || '',
    displayName: credential.user.displayName || '',
    photoURL: credential.user.photoURL || '',
  };
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors if no active Firebase session
  }
}
