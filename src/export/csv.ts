import Papa from 'papaparse';
import { formatBirthdayForGoogleCsv } from '@/core/contacts/contact.birthday';
import type { Contact } from '@/core/contacts/contact.types';

export function exportContactsToCsv(contacts: Contact[]): string {
  const rows = contacts.map(contact => ({
    Name:
      contact.name?.display ??
      [contact.name?.first, contact.name?.last].filter(Boolean).join(' '),
    'Given Name': contact.name?.first ?? '',
    'Family Name': contact.name?.last ?? '',
    'E-mail 1 - Value': contact.emails[0]?.value ?? '',
    'E-mail 2 - Value': contact.emails[1]?.value ?? '',
    'Phone 1 - Value': contact.phones[0]?.value ?? '',
    'Phone 2 - Value': contact.phones[1]?.value ?? '',
    'Organization 1 - Name': contact.organization?.company ?? '',
    'Organization 1 - Title': contact.organization?.title ?? '',
    'Website 1 - Value': contact.websites[0]?.url ?? '',
    Birthday: formatBirthdayForGoogleCsv(contact.birthday),
    Notes: contact.notes ?? '',
  }));

  return Papa.unparse(rows);
}
