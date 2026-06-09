/*
  Cross-device saving needs Firebase Realtime Database.

  1. Create a Firebase project.
  2. Create a web app in that project.
  3. Paste the Firebase config values below.
  4. Set firebaseEnabled to true.
  5. Create a Realtime Database in Firebase.

  This file is safe to publish to GitHub Pages. Firebase web config is public
  by design; protect the database with Realtime Database rules.
*/
export const firebaseEnabled = false;

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Everyone opening the same GitHub Pages site will share this same checklist.
export const checklistDatabasePath = "checklists/flat-cleaning-checklist";
