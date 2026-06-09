# Flat Cleaning Checklist

A plain HTML, CSS, and vanilla JavaScript checklist app for GitHub Pages.

## Files

- `index.html` - page structure
- `style.css` - screen and A4 print styles
- `app.js` - checklist rendering, points, reset buttons, saving, and optional cloud sync
- `firebase-config.js` - Firebase settings for global cross-device saving
- `discord-config.js` - optional Discord webhook settings
- `.nojekyll` - tells GitHub Pages to serve the files exactly as they are

## Points

- Daily tick: 1 point
- Weekly tick: 5 points

The page shows daily points, weekly points, total points, completed ticks, and progress.

## Monthly Reset

When the site is opened on the last day of the month, it automatically resets all checklist ticks once for that month. The reset marker is saved with the shared Firebase checklist state so it does not keep resetting again and again on the same day.

## Global Saving Across Devices

GitHub Pages is static hosting, so it cannot store shared state by itself. For global saving across phones, tablets, and computers, this site supports Firebase Realtime Database.

1. Go to <https://console.firebase.google.com/>.
2. Create a project.
3. Add a web app.
4. Copy the Firebase config into `firebase-config.js`.
5. Set `firebaseEnabled` to `true`.
6. Create a Realtime Database.
7. Use Realtime Database rules that allow the checklist path to be read and written by the people who should use it.

Simple open rules for a private/unlisted household link:

```txt
{
  "rules": {
    "checklists": {
      "flat-cleaning-checklist": {
        ".read": true,
        ".write": true
      }
    },
    "discord-settings": {
      ".read": true,
      ".write": true
    },
    "discord-events": {
      ".read": false,
      ".write": true
    }
  }
}
```

These rules make the checklist editable by anyone with the link. For a public site, use Firebase Authentication and stricter rules.

## Discord Updates

The site can send updates to a Discord webhook when a task is ticked or reset.

For safety, do not put a real Discord webhook URL into a public GitHub Pages repository or a public-readable database path. Anyone who can view the page source or read the database could copy it and post to your Discord channel.

The site can store the webhook in Firebase Realtime Database at `discord-settings/webhookUrl` so every device uses the same webhook. To enable that, open the checklist, expand `Discord updates`, paste the webhook URL, and press `Save webhook to Firebase`.

The safer global setup is:

1. The website writes Discord event messages to Firebase Realtime Database at `discord-events`.
2. A Firebase Cloud Function reads those events.
3. The Cloud Function sends the message to Discord using a server-side `DISCORD_WEBHOOK_URL` secret.

Deploy the function:

```txt
cd functions
npm install
copy .env.example .env
```

Put the real webhook URL in `functions/.env`, then deploy with Firebase CLI:

```txt
firebase deploy --only functions
```

Add this Realtime Database rule so the website can queue Discord events:

```txt
{
  "rules": {
    "checklists": {
      "flat-cleaning-checklist": {
        ".read": true,
        ".write": true
      }
    },
    "discord-settings": {
      ".read": true,
      ".write": true
    },
    "discord-events": {
      ".read": false,
      ".write": true
    }
  }
}
```

The old browser-only webhook option still exists for testing on one device:

Use the Discord updates panel on the page instead:

1. Open the checklist.
2. Open `Discord updates`.
3. Paste the webhook URL.
4. Press `Save webhook on this device`.

The webhook is saved only in that browser. If you pasted a real webhook into chat or source code, delete it in Discord and create a new one.

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
