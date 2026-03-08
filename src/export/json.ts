import type { Contact } from '@/core/contacts/contact.types';

export function exportContactsToJson(contacts: Contact[]): string {
  return JSON.stringify(contacts, null, 2);
}
