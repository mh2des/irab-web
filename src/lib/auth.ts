/**
 * Auth helpers wrapping Firebase Auth (Email/password, Google, Apple) with
 * friendly bilingual error messages. Browser-only — used from <script> islands.
 */
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export type Lang = 'ar' | 'en';

export function onAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export function signInGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, p);
}

export function signInApple() {
  const p = new OAuthProvider('apple.com');
  p.addScope('email');
  p.addScope('name');
  return signInWithPopup(auth, p);
}

export async function signUpEmail(email: string, password: string, name?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name && cred.user) await updateProfile(cred.user, { displayName: name });
  if (cred.user) {
    try { await sendEmailVerification(cred.user); } catch { /* non-fatal */ }
  }
  return cred;
}

export const signInEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const resendVerification = (user: User) => sendEmailVerification(user);

export const logout = () => signOut(auth);

/** Map Firebase error codes to friendly AR/EN copy. */
export function authError(code: string, lang: Lang): string {
  const ar: Record<string, string> = {
    'auth/invalid-email': 'البريد الإلكتروني غير صالح.',
    'auth/user-disabled': 'هذا الحساب موقوف.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/email-already-in-use': 'هذا البريد مسجّل بالفعل. سجّل الدخول بدلاً من ذلك.',
    'auth/weak-password': 'كلمة المرور ضعيفة (٦ أحرف على الأقل).',
    'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقاً.',
    'auth/popup-closed-by-user': 'أُغلقت نافذة الدخول قبل الإكمال.',
    'auth/popup-blocked': 'منَع المتصفّح النافذة المنبثقة. اسمح بها وحاول مجدداً.',
    'auth/account-exists-with-different-credential':
      'لديك حساب بنفس البريد عبر طريقة دخول أخرى. جرّب تلك الطريقة.',
    'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة بعد.',
    'auth/unauthorized-domain': 'تسجيل الدخول من هذا النطاق غير مسموح بعد.',
    'auth/network-request-failed': 'تعذّر الاتصال بالشبكة.',
  };
  const en: Record<string, string> = {
    'auth/invalid-email': 'That email address is invalid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'That email is already registered — sign in instead.',
    'auth/weak-password': 'Password is too weak (at least 6 characters).',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/popup-closed-by-user': 'The sign-in window closed before finishing.',
    'auth/popup-blocked': 'Your browser blocked the popup. Allow it and retry.',
    'auth/account-exists-with-different-credential':
      'You already have an account with this email via another sign-in method.',
    'auth/operation-not-allowed': 'This sign-in method isn’t enabled yet.',
    'auth/unauthorized-domain': 'Sign-in from this domain isn’t allowed yet.',
    'auth/network-request-failed': 'Network error — check your connection.',
  };
  const table = lang === 'ar' ? ar : en;
  return table[code] || (lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.');
}
