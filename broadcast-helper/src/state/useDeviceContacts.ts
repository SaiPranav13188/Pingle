import { useCallback, useEffect, useState } from 'react';

import { fetchDeviceContacts } from '../lib/contacts';
import type { DeviceContact } from '../lib/types';
import { COUNTRY_CODE } from './AppStore';

export type ContactsPermission = 'loading' | 'granted' | 'denied';

/** Shared across screens so the address book is read once, not on every screen that lists contacts. */
let cache: DeviceContact[] | null = null;

/** The phone's contacts, loaded once (asking for permission the first time). */
export function useDeviceContacts() {
  const [contacts, setContacts] = useState<DeviceContact[]>(cache ?? []);
  const [perm, setPerm] = useState<ContactsPermission>(cache ? 'granted' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache && attempt === 0) return;
    let alive = true;
    fetchDeviceContacts(COUNTRY_CODE)
      .then((list) => {
        if (!alive) return;
        if (list) {
          cache = list;
          setContacts(list);
        }
        setPerm(list ? 'granted' : 'denied');
      })
      .catch((e) => {
        console.warn(e);
        if (alive) setPerm('denied');
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setPerm('loading');
    setAttempt((a) => a + 1);
  }, []);

  return { contacts, perm, retry };
}
