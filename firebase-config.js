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
export const firebaseEnabled = true;

export const firebaseConfig = {
  apiKey: "",
  authDomain: "cleaning-checklist-f5663.firebaseapp.com",
  databaseURL: "https://cleaning-checklist-f5663-default-rtdb.firebaseio.com/",
  projectId: "cleaning-checklist-f5663",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Everyone opening the same GitHub Pages site will share this same checklist.
export const checklistDatabasePath = "checklists/flat-cleaning-checklist";

// Discord events are written here for a Firebase Cloud Function to forward.
export const discordEventsDatabasePath = "discord-events";

// Optional shared Discord webhook setting. This is readable by the website.
export const discordSettingsDatabasePath = "discord-settings";
