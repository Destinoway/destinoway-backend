import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export function getFirebaseMessaging() {
  const app = getApps().some(({ name }) => name === "[DEFAULT]")
    ? getApp()
    : initializeApp({ credential: applicationDefault() });

  return getMessaging(app);
}
