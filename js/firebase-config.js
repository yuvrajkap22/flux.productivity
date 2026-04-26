export const firebaseConfig = {
  apiKey: 'AIzaSyDu9AMuAlTk7cHVn99NNlXgaZq4wNoBfWo',
  authDomain: 'flux-productivity-39c09.firebaseapp.com',
  projectId: 'flux-productivity-39c09',
  storageBucket: 'flux-productivity-39c09.appspot.com',
  messagingSenderId: '652388421500',
  appId: '1:652388421500:web:7900788548c47c86509ef9',
};

export function isFirebaseConfigured(config = firebaseConfig) {
  const required = [config?.apiKey, config?.authDomain, config?.projectId, config?.appId];
  if (required.some((value) => !value || String(value).trim() === '')) return false;

  // Treat template placeholders as non-configured values.
  return required.every((value) => !String(value).startsWith('YOUR_'));
}