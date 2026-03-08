import { formatBirthdayForVcard } from '@/core/contacts/contact.birthday';
import type { Contact } from '@/core/contacts/contact.types';

function escapeVcardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function exportContactsToVcard(contacts: Contact[]): string {
  return contacts
    .map(contact => {
      const display =
        contact.name?.display ??
        [contact.name?.first, contact.name?.last].filter(Boolean).join(' ');
      const nLine = [
        contact.name?.last ?? '',
        contact.name?.first ?? '',
        contact.name?.middle ?? '',
        contact.name?.prefix ?? '',
        contact.name?.suffix ?? '',
      ].join(';');

      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVcardValue(display)}`,
        `N:${escapeVcardValue(nLine)}`,
      ];

      for (const phone of contact.phones)
        lines.push(`TEL:${escapeVcardValue(phone.value)}`);
      for (const email of contact.emails)
        lines.push(`EMAIL:${escapeVcardValue(email.value)}`);
      if (contact.organization?.company)
        lines.push(`ORG:${escapeVcardValue(contact.organization.company)}`);
      if (contact.organization?.title)
        lines.push(`TITLE:${escapeVcardValue(contact.organization.title)}`);
      const birthday = formatBirthdayForVcard(contact.birthday);
      if (birthday) lines.push(`BDAY:${escapeVcardValue(birthday)}`);
      if (contact.notes) lines.push(`NOTE:${escapeVcardValue(contact.notes)}`);
      for (const website of contact.websites)
        lines.push(`URL:${escapeVcardValue(website.url)}`);

      lines.push('END:VCARD');

      return lines.join('\r\n');
    })
    .join('\r\n');
}
