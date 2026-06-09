/*
  Cross-device saving needs Firebase Firestore.

  1. Create a Firebase project.
  2. Create a web app in that project.
  3. Paste the Firebase config values below.
  4. Set firebaseEnabled to true.

  This file is safe to publish to GitHub Pages. Firebase web config is public
  by design; protect the database with Firestore security rules.
*/
export const firebaseEnabled = false;

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Everyone opening the same GitHub Pages site will share this same checklist.
export const checklistDocumentPath = "checklists/flat-cleaning-checklist";
