import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

const WHATSAPP_PACKAGES = ['com.whatsapp', 'com.whatsapp.w4b'];

/** 'opened': WhatsApp is showing the chat. 'failed': WhatsApp couldn't be opened. */
export type SendResult = 'opened' | 'failed';

/**
 * Opens `waNumber`'s WhatsApp chat with `text` filled in.
 *
 * On Android this uses a share (ACTION_SEND) intent aimed at the chat via WhatsApp's `jid`
 * extra, launched from Pingle's own screen so the phone's Back button returns to Pingle.
 * WhatsApp does NOT return by itself after Send, and it reports "done" as soon as the chat
 * opens, so callers must not treat this promise as "sent". `jid` is unofficial: if it stops
 * working WhatsApp shows its chat picker instead, still pre-filled.
 */
export async function sendViaWhatsApp(waNumber: string, text: string): Promise<SendResult> {
  if (Platform.OS === 'android') {
    for (const packageName of WHATSAPP_PACKAGES) {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
          packageName,
          type: 'text/plain',
          extra: {
            'android.intent.extra.TEXT': text,
            jid: `${waNumber}@s.whatsapp.net`,
          },
        });
        return 'opened';
      } catch {
        // this WhatsApp variant isn't installed — try the next one
      }
    }
  }
  return openWhatsAppLink(waNumber, text);
}

async function openWhatsAppLink(waNumber: string, text: string): Promise<SendResult> {
  const encoded = encodeURIComponent(text);
  try {
    await Linking.openURL(`whatsapp://send?phone=${waNumber}&text=${encoded}`);
    return 'opened';
  } catch {
    // scheme blocked or WhatsApp missing — try the universal link
  }
  try {
    await Linking.openURL(`https://wa.me/${waNumber}?text=${encoded}`);
    return 'opened';
  } catch {
    return 'failed';
  }
}
