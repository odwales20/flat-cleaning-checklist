# Flat Cleaning Checklist

A plain HTML, CSS, and vanilla JavaScript checklist app for GitHub Pages.

## Files

- `index.html` - page structure
- `style.css` - screen and A4 print styles
- `app.js` - checklist rendering, points, reset buttons, saving, and optional cloud sync
- `firebase-config.js` - Firebase settings for global cross-device saving
- `.nojekyll` - tells GitHub Pages to serve the files exactly as they are

## Points

- Daily tick: 1 point
- Weekly tick: 5 points

The page shows daily points, weekly points, total points, completed ticks, and progress.

## Global Saving Across Devices

GitHub Pages is static hosting, so it cannot store shared state by itself. For global saving across phones, tablets, and computers, this site supports Firebase Firestore.

1. Go to <https://console.firebase.google.com/>.
2. Create a project.
3. Add a web app.
4. Copy the Firebase config into `firebase-config.js`.
5. Set `firebaseEnabled` to `true`.
6. Create a Firestore database.
7. Use Firestore rules that allow the checklist document to be read and written by the people who should use it.

Simple open rules for a private/unlisted household link:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /checklists/flat-cleaning-checklist {
      allow read, write: if true;
    }
  }
}
```

These rules make the checklist editable by anyone with the link. For a public site, use Firebase Authentication and stricter rules.

## GitHub Pages

In the GitHub repository:

1. Open Settings.
2. Open Pages.
3. Set Source to `Deploy from a branch`.
4. Choose `main` and `/root`.
5. Save.

The site will be available at:

```txt
https://USERNAME.github.io/REPOSITORY-NAME/
```
