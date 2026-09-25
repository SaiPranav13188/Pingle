/** A contact as read from the phone's address book. */
export type DeviceContact = {
  id: string;
  name: string;
  firstName: string | null;
  phones: { number: string; label: string }[];
  thumbnail: string | null;
};

/** A contact chosen to receive the message, with the one number that will be used. */
export type SelectedContact = {
  id: string;
  name: string;
  firstName: string | null;
  phone: string;
  thumbnail?: string | null;
};

export type HistoryRecipient = SelectedContact & { sentAt: number };

/** One message and everyone it has been sent to (a single entry per message text). */
export type HistoryEntry = {
  id: string;
  /** When this message was last sent to someone. */
  date: number;
  message: string;
  recipients: HistoryRecipient[];
};

/** A saved, reusable set of contacts (e.g. "Family"). */
export type ContactGroup = {
  id: string;
  name: string;
  contacts: SelectedContact[];
  updatedAt: number;
};
