/**
 * Auth helpers wrapping Firebase Auth (Email/password, Google, Apple) with
 * friendly bilingual error messages. Browser-only: used from <script> islands.
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
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export type Lang = 'ar' | 'en';

export function onAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, (u) => {
    // Keep the PostHog person in step with the account: identify(uid) on
    // sign-in (same uid as the app, RevenueCat and Paddle), reset on sign-out.
    // Lazy import: analytics is a no-op until BaseLayout has booted it.
    import('./analytics').then((m) => m.syncIdentity(u)).catch(() => {});
    // Paddle Retain: a web buyer whose card failed sees Paddle's "update your
    // card" notice. Only subscribers are looked up; see lib/paddle-retain.ts.
    if (u) import('./paddle-retain').then((m) => m.syncRetain(u)).catch(() => {});
    cb(u);
  });
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

/** Whoever is signed in right now, without subscribing to auth state. */
export const currentUser = (): User | null => auth.currentUser;

/** How this account signs in: 'google.com', 'apple.com' or 'password'. */
export const signInProvider = (user: User): string =>
  user.providerData.map((d) => d?.providerId ?? '').find(Boolean) || 'password';

/**
 * Firebase deletes an account only soon after a sign-in. The same check the
 * app makes before it touches anything (auth_service.dart deleteAccount):
 * both times come from the server's token, never the device clock. Fails
 * open, so Firebase stays the authority at user.delete().
 */
export async function needsRecentLogin(user: User): Promise<boolean> {
  try {
    const t = await user.getIdTokenResult(true);
    const signedIn = Date.parse(t.authTime);
    const issued = Date.parse(t.issuedAtTime);
    return Number.isFinite(signedIn) && Number.isFinite(issued) && issued - signedIn > 5 * 60_000;
  } catch {
    return false;
  }
}

/** Sign in again as the same account: a popup for Google and Apple, the password otherwise. */
export function reauthenticate(user: User, password = '') {
  const provider = signInProvider(user);
  if (provider === 'google.com') {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return reauthenticateWithPopup(user, p);
  }
  if (provider === 'apple.com') return reauthenticateWithPopup(user, new OAuthProvider('apple.com'));
  return reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password));
}

export const logout = async () => {
  await signOut(auth);
  import('./analytics').then((m) => m.syncIdentity(null)).catch(() => {});
};

/**
 * Map Firebase error codes to friendly AR/EN copy.
 *
 * `provider` names the social provider when the failure came from one. Several
 * codes (invalid-credential above all) are shared between email/password and
 * OAuth sign-in, and their default wording assumes a password was typed. After
 * a failed Apple sign-in "Email or password is incorrect" is worse than vague:
 * it sends the user to check a password they never entered.
 */
/** Codes whose stock copy talks about a typed password. */
const PASSWORD_SHAPED = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
]);

export function authError(code: string, lang: Lang, provider?: string): string {
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
    'auth/user-mismatch': 'هذا حساب آخر. اختر الحساب الذي أنت داخل به الآن.',
    'auth/requires-recent-login': 'للأمان، سجّل الدخول مرة أخرى ثم أعد المحاولة.',
  };
  const en: Record<string, string> = {
    'auth/invalid-email': 'That email address is invalid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'That email is already registered: sign in instead.',
    'auth/weak-password': 'Password is too weak (at least 6 characters).',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/popup-closed-by-user': 'The sign-in window closed before finishing.',
    'auth/popup-blocked': 'Your browser blocked the popup. Allow it and retry.',
    'auth/account-exists-with-different-credential':
      'You already have an account with this email via another sign-in method.',
    'auth/operation-not-allowed': 'This sign-in method isn’t enabled yet.',
    'auth/unauthorized-domain': 'Sign-in from this domain isn’t allowed yet.',
    'auth/network-request-failed': 'Network error: check your connection.',
    'auth/user-mismatch': "That's a different account. Choose the one you are signed in with.",
    'auth/requires-recent-login': 'For your security, sign in again and retry.',
  };
  if (provider && PASSWORD_SHAPED.has(code)) {
    return lang === 'ar'
      ? `تعذّر إكمال الدخول عبر ${provider}. حاول مرة أخرى، أو استخدم بريدك الإلكتروني.`
      : `We couldn't complete ${provider} sign-in. Try again, or use your email instead.`;
  }
  const table = lang === 'ar' ? ar : en;
  return table[code] || (lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.');
}
