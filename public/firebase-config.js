// Replace these values with your own project's web config
// (Firebase console → Project settings → Your apps → Web app).
// Web API keys are public identifiers, not secrets: access is controlled by firestore.rules.
export const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-cedar-market.firebaseapp.com',
  projectId: 'demo-cedar-market',
};

// On localhost the app talks to the local emulators instead of a real project.
export const useEmulators = ['localhost', '127.0.0.1'].includes(location.hostname);
