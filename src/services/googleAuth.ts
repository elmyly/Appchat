import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configured OAuth Scopes matching consent screen
export const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  if (scope !== 'openid') {
    provider.addScope(scope);
  }
});
provider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleAuthProfile {
  email: string;
  displayName: string;
  avatar?: string;
  googleId: string;
  idToken?: string;
  accessToken?: string;
}

/**
 * Triggers the authentic Google OAuth popup dialog with the user's consent screen.
 */
export const signInWithGoogle = async (): Promise<GoogleAuthProfile> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user: FirebaseUser = result.user;
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!user.email) {
      throw new Error('No email address provided by your Google account.');
    }

    return {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      avatar: user.photoURL || undefined,
      googleId: user.uid,
      idToken: credential?.idToken,
      accessToken: credential?.accessToken,
    };
  } catch (error: any) {
    console.error('Google Sign-In Popup error:', error);
    throw error;
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Google signout error:', err);
  }
};
