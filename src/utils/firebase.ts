import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Utility function to convert VAPID key to Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const firebaseConfig = {
    apiKey: "AIzaSyC4ntyxT8hglnD_EO1wUN2-Irz36LBcVrU",
    authDomain: "guardian-angel-20c2b.firebaseapp.com",
    projectId: "guardian-angel-20c2b",
    storageBucket: "guardian-angel-20c2b.firebasestorage.app",
    messagingSenderId: "802763272390",
    appId: "1:802763272390:web:a3d5a24d9acee1a4b167c7",
    measurementId: "G-4JP5J1RN0S"
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Function to get messaging instance (client-side only)
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Error getting messaging instance:', error);
    return null;
  }
};

// Export other functions for client-side use
export { getToken, onMessage }; 