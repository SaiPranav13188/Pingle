# WhatsApp Broadcast Helper — Implementation Prompt

Build a standalone Android app ("WhatsApp Broadcast Helper") using Expo (managed workflow, Expo Go — no native modules or EAS Dev Build required for this app). Purpose: let the user paste one message once, select multiple contacts, and send that message to each of them on WhatsApp with minimal manual work — pre-filling each contact's chat automatically and using tap-to-advance notifications instead of manually returning to the app between each send.

## Core flow

### 1. Compose screen
- A text input where the user pastes/types the message once.
- Support a `{name}` placeholder inside the message (e.g., "Hey {name}, reminder about tomorrow's meeting") that automatically substitutes each selected contact's first name before their chat is opened, so broadcasts feel personalized rather than identical copy-pasted text. If a contact has no retrievable first name, fall back to the raw message with the placeholder removed (not left as literal "{name}" text).
- Support saving this as a reusable "template" (see Templates section) so frequently sent messages don't need retyping.

### 2. Contact selection screen
- Use `expo-contacts` to fetch the device's contact list.
- Multi-select UI (checkboxes) with a search bar to filter by name.
- Show a running count ("7 contacts selected").
- Support saving the selected set as a named "group" (e.g., "Family," "Work Team") for reuse next time, stored locally via `AsyncStorage` or `expo-sqlite`.

### 3. Review screen
- Show the message text and the full list of selected contacts before starting.
- Let the user set the delay between each contact (default 5 seconds, adjustable 3–15 seconds via a slider).
- "Start Sending" button.

### 4. Sending flow (the core mechanic)
On "Start Sending":

1. Immediately open WhatsApp pre-filled for contact #1, first substituting any `{name}` placeholder in the message with that contact's first name, using:
   ```
   Linking.openURL(`whatsapp://send?phone=${countryCode}${number}&text=${encodeURIComponent(personalizedMessage)}`)
   ```
   (fall back to the `wa.me` web link format if the `whatsapp://` scheme fails to open, in case WhatsApp isn't installed or the scheme is blocked on some devices).
2. The user manually taps Send inside WhatsApp (unavoidable — no public API allows the app to trigger this itself).
3. After the chosen delay, schedule and immediately fire a local notification (`expo-notifications`) titled "Send to [Contact 2] →" (or similar), timed to appear right after the delay window.
4. Tapping that notification opens WhatsApp pre-filled for contact #2, using the same deep link pattern.
5. Repeat for every remaining selected contact — each contact gets its own scheduled notification, chained by the same delay interval.

Track progress in-app: maintain a state list of contacts with status "pending" / "opened" (mark "opened" when the deep link fires — note: the app cannot verify WhatsApp's Send was actually tapped, only that the chat was opened, so label this honestly in the UI as "opened," not "sent").

Show a live progress indicator (e.g., "3 of 10 opened") on a persistent in-app screen or notification, so the user can track where they are in the sequence even if they get distracted mid-way.

On completion (last contact's notification fired), show a final "All contacts opened ✅" notification/toast.

### 5. Templates screen
- List of saved message templates (name + preview text).
- Tap to load a template into the Compose screen instantly.
- Edit/delete existing templates.

### 6. Groups screen
- List of saved contact groups (name + contact count).
- Tap to load a group directly into the Contact Selection screen.
- Edit (add/remove contacts) or delete existing groups.

### 7. History screen (optional but recommended)
- Log each broadcast run: date/time, message preview, number of contacts, how many were marked "opened."
- Store this locally (`expo-sqlite`/`AsyncStorage`) — no backend needed for a personal-use tool like this.
- Include a "Repeat Last Broadcast" button on the home screen (and on each history entry) that reloads that run's exact message (with its `{name}` placeholder intact) and contact group back into the Compose/Review flow, since many broadcasts (family updates, work reminders) repeat weekly/monthly with only minor tweaks.

## Technical notes

- No backend/server is required for this app — everything (contacts, templates, groups, history) can live entirely on-device using `expo-sqlite` or `AsyncStorage`, since there's no multi-user or cross-device sync requirement for this specific tool. Only add a Supabase-backed sync layer later if the user wants their templates/groups to carry across multiple devices.
- Request `expo-contacts` permission on first use of the Contact Selection screen.
- Request notification permission on first use of the Sending flow (needed for the tap-to-advance mechanism).
- Handle the case where WhatsApp is not installed: check with `Linking.canOpenURL('whatsapp://send')` before attempting to open, and show a clear error if it's unavailable.
- Handle the case where a selected contact has no phone number, or multiple numbers: prompt the user to pick which number to use, or skip that contact with a warning shown in the progress list.
- Country code handling: default to a configurable country code (e.g., +91) if the stored contact number doesn't already include one, since WhatsApp's deep link requires the full international format.

## Explicit limitation to surface in the UI (do not attempt to bypass)

The app can pre-fill and open each WhatsApp chat automatically via notification taps, but the user must personally tap "Send" inside WhatsApp for each contact — this is a permanent WhatsApp platform restriction (no public API for personal chat sending), not a limitation of this app's implementation. State this clearly on the Review screen before the user starts a broadcast, so expectations are set correctly (e.g., "You'll need to tap Send in WhatsApp for each of your 10 contacts — this app handles finding them and filling the message for you").

## Non-functional requirements

- Keep the delay slider's minimum high enough (3+ seconds) that the user realistically has time to glance at the pre-filled message and tap Send before the next notification fires.
- If the user misses a notification (doesn't tap it in time), it should remain in the notification tray so they can tap it later without losing their place in the sequence — do not auto-dismiss missed notifications.
- Provide a "Cancel Broadcast" option on the progress screen to stop the remaining scheduled notifications if the user wants to abort mid-sequence.

## v2 ideas (not part of the initial build, worth considering later)

- **Manual "sent" confirmation checklist** — a tap-to-confirm checkbox per contact in the progress screen (e.g., "✅ Sent to Raj") so the user has an honest, self-reported completion tracker distinct from the automatic "opened" status, useful for resuming a broadcast that was interrupted partway through.
- **Scheduled broadcasts** — let the user pick a future date/time to start a broadcast (using `expo-notifications`' scheduled trigger) rather than only "send right now," useful for recurring reminders (rent due, meeting prep).
- **Import contacts from an existing WhatsApp group** — since there's no API to read WhatsApp group membership automatically, this would mean manually selecting a group's members once and saving them as a reusable app-side "group," recreating group-like convenience without a real API integration.
- **Character count / length warning** — flag unusually long messages, since very long pasted text can occasionally get cut oddly in the deep-link pre-fill on some devices.
- **Dark mode** — match the phone's system theme via `useColorScheme()`, low effort for a tool used often.
- **Home screen widget** — a one-tap "Repeat Last Broadcast" widget that skips opening the app entirely. Requires native Android App Widget support, so this would need an EAS Dev Build rather than plain Expo Go.
