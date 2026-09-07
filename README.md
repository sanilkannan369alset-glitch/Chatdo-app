# Connect — Firebase Social Chat

Features:
- Firebase email/password authentication
- Real-time Firestore 1-to-1 messaging
- Image uploads with Firebase Storage
- Message likes
- Stories with image uploads and likes
- WebRTC audio/video calls using a Firestore signaling room
- FCM web push token registration + foreground notifications
- Online/offline presence

## Setup

1. Create a Firebase project.
2. Enable Authentication → Email/Password.
3. Create Firestore Database.
4. Create Storage.
5. Enable Cloud Messaging and create a Web Push certificate/VAPID key.
6. Copy `.env.example` to `.env` and fill in your Firebase web-app config.
7. Run:
   npm install
   npm run dev

## Firebase rules

Publish `firestore.rules` and `storage.rules` with the Firebase CLI or paste them
into the Firebase console.

## Important production notes

- The sample WebRTC implementation uses Firestore as a minimal signaling channel.
  For production, use separate ICE candidate collections, call permissions,
  cleanup/expiry, TURN servers, and authentication/authorization checks.
- Browser push notifications need HTTPS (localhost is allowed for development).
- Background FCM delivery requires a service worker and a trusted backend/Cloud
  Function to send notifications.
- Do not ship permissive Firestore/Storage rules to production.
- Add moderation, rate limits, blocking/reporting, message pagination, deletion,
  and abuse protection before public launch.
