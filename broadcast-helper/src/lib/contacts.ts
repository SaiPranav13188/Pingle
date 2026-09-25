import * as Contacts from 'expo-contacts';
import { PermissionsAndroid, Platform } from 'react-native';

import { firstNameOf } from './message';
import { uniquePhones } from './phone';
import type { DeviceContact } from './types';

/**
 * On Android, expo-contacts' requestPermissionsAsync never resolves inside Expo Go (SDK 57),
 * so we use React Native's own permission API there. It's the same READ_CONTACTS permission.
 */
async function ensureContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
      title: 'Contacts access',
      message: 'Pingle needs your contacts so you can pick who receives your WhatsApp message.',
      buttonPositive: 'Allow',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return (await Contacts.requestPermissionsAsync()).granted;
}

/** Asks for contacts permission and loads name/phone/photo for every contact. Null when denied. */
export async function fetchDeviceContacts(countryCode: string): Promise<DeviceContact[] | null> {
  if (!(await ensureContactsPermission())) return null;
  const details = await Contacts.Contact.getAllDetails([
    Contacts.ContactField.FULL_NAME,
    Contacts.ContactField.GIVEN_NAME,
    Contacts.ContactField.PHONES,
    Contacts.ContactField.THUMBNAIL,
  ]);
  return details
    .map((d) => ({
      id: d.id,
      name: d.fullName?.trim() || d.givenName?.trim() || d.phones?.[0]?.number || 'Unknown',
      firstName: firstNameOf(d.givenName, d.fullName),
      phones: uniquePhones(d.phones, countryCode),
      thumbnail: d.thumbnail ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
