/**
 * Firebase client init (browser only: import from <script> islands, never
 * from .astro frontmatter, which runs at build time with no `window`).
 *
 * The web config is PUBLIC by design: Firebase security comes from Auth
 * authorized domains + Firestore/Storage rules, not from hiding these keys
 * (they ship in every Firebase web app's bundle). Same project as the mobile
 * app (arabic-grammar-app-43de9), so accounts + subscriptions are shared.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAMdgmQFdoiHmkMacLjsyaQvw0rufOmTYo',
  // Our own domain, not <project>.firebaseapp.com. signInWithPopup sends the
  // user to https://<authDomain>/__/auth/handler, and Google's consent screen
  // prints that host: on the default domain it read "to continue to
  // arabic-grammar-app-43de9.firebaseapp.com". Firebase Hosting already serves
  // the auth helper under /__ on irab.app, the domain is authorised in Firebase
  // Auth, and https://irab.app/__/auth/handler is registered on the OAuth client
  // (Cloud console -> Credentials). Running the popup on our own origin also
  // avoids the third-party-cookie limits that break it on *.firebaseapp.com.
  authDomain: 'irab.app',
  projectId: 'arabic-grammar-app-43de9',
  storageBucket: 'arabic-grammar-app-43de9.firebasestorage.app',
  messagingSenderId: '662899626810',
  appId: '1:662899626810:web:6b08be0faa8fee333cb603',
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
