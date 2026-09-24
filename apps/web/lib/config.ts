/**
 * Public runtime configuration. Credentials are supplied later (docs/REQUIREMENTS.md §12);
 * until then the app runs with local storage, a local guest identity and console analytics.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const amplitudeApiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? "";
export const isAmplitudeConfigured = Boolean(amplitudeApiKey);
