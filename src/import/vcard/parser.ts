import {
  normalizeContact,
  splitWebsitesAndSocial,
} from '@/core/contacts/contact.normalize';
import type { Contact } from '@/core/contacts/contact.types';

function unfoldVcardLines(content: string): string[] {
  const rawLines = content.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.trim();
      continue;
    }
    lines.push(line);
  }

  return lines;
}

function parseVcardBlock(lines: string[]): Contact | null {
  const values: Record<string, string[]> = {};

  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;

    const rawKey = line.slice(0, separator).toUpperCase();
    const keyPart = rawKey.split(';')[0];
    const key = keyPart.includes('.')
      ? (keyPart.split('.').at(-1) ?? keyPart)
      : keyPart;
    const value = line.slice(separator + 1).trim();

    if (!values[key]) values[key] = [];
    values[key].push(value);
  }

  const display = values.FN?.[0] ?? '';
  const structuredName = values.N?.[0]?.split(';') ?? [];

  const phoneValues = (values.TEL ?? []).map(value => ({
    value,
    normalized: '',
    label: 'mobile' as const,
  }));

  const emailValues = (values.EMAIL ?? []).map(value => ({
    value,
    normalized: '',
    label: 'home' as const,
  }));

  const urls = values.URL ?? [];
  const { websites, social } = splitWebsitesAndSocial(urls);

  const contact = normalizeContact({
    name: {
      display,
      last: structuredName[0],
      first: structuredName[1],
      middle: structuredName[2],
      prefix: structuredName[3],
      suffix: structuredName[4],
    },
    phones: phoneValues,
    emails: emailValues,
    addresses: [],
    organization: {
      company: values.ORG?.[0],
      title: values.TITLE?.[0],
    },
    websites,
    social,
    birthday: values.BDAY?.[0],
    notes: values.NOTE?.[0],
    tags:
      values.CATEGORIES?.[0]
        ?.split(',')
        .map(item => item.trim())
        .filter(Boolean) ?? [],
  });

  if (
    !contact.name?.display &&
    !contact.phones.length &&
    !contact.emails.length
  ) {
    return null;
  }

  return contact;
}

export function parseVcard(content: string): Contact[] {
  const lines = unfoldVcardLines(content);
  const contacts: Contact[] = [];
  let currentBlock: string[] = [];
  let insideCard = false;

  for (const line of lines) {
    if (line.toUpperCase() === 'BEGIN:VCARD') {
      insideCard = true;
      currentBlock = [];
      continue;
    }

    if (line.toUpperCase() === 'END:VCARD') {
      if (insideCard) {
        const parsed = parseVcardBlock(currentBlock);
        if (parsed) contacts.push(parsed);
      }
      insideCard = false;
      currentBlock = [];
      continue;
    }

    if (insideCard) currentBlock.push(line);
  }

  return contacts;
}
