# Pingle

Send one message to many WhatsApp contacts, one swipe each.

The app opens with a short intro video that says "Welcome to Pingle". After that there's a single screen:

- **Top half:** type your message. `{name}` becomes each person's first name.
- **Bottom half:** search your contacts and tap to select them. Selected people move to the top of the list, in the order you picked them.
- **Swipe a selected contact to the right.** WhatsApp opens their chat with your message filled in. Tap **Send**, then press the phone's **Back** button to return to Pingle, where that contact gets a ✓.
- **Auto-next** (switch above the message box, on by default): when you come back to Pingle, a 3-second countdown card opens the next person's chat by itself, so each person is just Send → Back. **Pause** or tap the card to stop it, or **Open now** to skip the wait. It also pauses when you type, open the menu, or leave the app. The strip shows "7 of 20 sent" with a progress bar.
- **History** (☰ menu, top right): one entry per message, listing everyone it was sent to. Reuse or delete entries there.
- **Groups** (☰ menu): saved sets of contacts such as "Family". Tap a group to select its members. You can create, edit or delete groups, or tap **Save group** above your selected contacts.

Built with Expo SDK 57 and Expo Router. It runs in **Expo Go**. Everything stays on the phone.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your Android phone. WhatsApp must be installed on that phone.

## Why you press Back after Send

WhatsApp gives other apps no signal when you tap Send, and it doesn't return to the app that opened the chat. Pingle opens the chat with Android's share intent, aimed at the contact through WhatsApp's unofficial `jid` extra, and starts it from its own screen so that **Back** leads to Pingle. A contact is ticked when you come back to Pingle after its chat was opened. If the share intent can't be used, Pingle falls back to a `whatsapp://send` link. See `src/lib/whatsapp.ts`.

## Project layout

```
src/app/index.tsx          the main screen
src/app/history.tsx        messages sent, and to whom
src/app/groups.tsx         saved groups
src/app/group-edit.tsx     create / edit a group
src/app/_layout.tsx        fonts, splash, intro video
src/state/AppStore.tsx     message, selected contacts, sent ticks, history (saved on the phone)
src/components/            contact rows (swipe to send), intro video, UI kit
src/lib/                   contacts loading, phone numbers, {name}, WhatsApp
scripts/generate-assets.py renders the intro video, icons and background
```

## Notes

- **Country code:** numbers saved without a country code get +91 (`COUNTRY_CODE` in `src/state/AppStore.tsx`).
- **Contacts permission in Expo Go:** on Android, `expo-contacts`' own permission request never resolves inside Expo Go, so Pingle asks through React Native's `PermissionsAndroid`.
- **Regenerating the intro:** the voice is `assets/audio/welcome.wav`, generated with Windows text-to-speech. Run `python scripts/generate-assets.py` (needs `pillow numpy imageio imageio-ffmpeg`).
