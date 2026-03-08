import { normalizeContact } from '@/core/contacts/contact.normalize';
import type { Contact, ContactDraft } from '@/core/contacts/contact.types';

function toContactDraft(input: Partial<Contact>): ContactDraft {
  return {
    name: input.name,
    phones: input.phones ?? [],
    emails: input.emails ?? [],
    addresses: input.addresses ?? [],
    organization: input.organization,
    websites: input.websites ?? [],
    social: input.social ?? [],
    birthday: input.birthday,
    notes: input.notes,
    tags: input.tags ?? [],
  };
}

function toContact(input: Partial<Contact>): Contact {
  const normalized = normalizeContact(toContactDraft(input), input.id);
  return {
    ...normalized,
    createdAt:
      typeof input.createdAt === 'number'
        ? input.createdAt
        : normalized.createdAt,
    updatedAt:
      typeof input.updatedAt === 'number'
        ? input.updatedAt
        : normalized.updatedAt,
  };
}

export function parseInternalJsonContacts(content: string): Contact[] {
  const parsed = JSON.parse(content) as unknown;

  const contactsRaw = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { contacts?: unknown }).contacts)
      ? (parsed as { contacts: unknown[] }).contacts
      : null;

  if (!contactsRaw) {
    throw new Error(
      "JSON inválido. Use um array de contatos ou objeto com chave 'contacts'.",
    );
  }

  return contactsRaw
    .filter(
      (item): item is Partial<Contact> =>
        typeof item === 'object' && item !== null,
    )
    .map(item => toContact(item));
}
