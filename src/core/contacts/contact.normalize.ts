import { normalizeBirthdayToInternal } from './contact.birthday';
import type { Contact, ContactDraft, SocialProvider } from './contact.types';

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function scoreNameCompleteness(name: Contact['name'] | undefined): number {
  const display = name?.display?.trim() ?? '';
  const first = name?.first?.trim() ?? '';
  const last = name?.last?.trim() ?? '';
  const middle = name?.middle?.trim() ?? '';

  // Prefer richer names (more parts + longer display).
  const partsScore = [first, middle, last].filter(Boolean).length * 10;
  const displayScore = display.length;
  return partsScore + displayScore;
}

function mergeName(
  existing: Contact['name'] | undefined,
  incoming: Contact['name'] | undefined,
): Contact['name'] | undefined {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const preferred =
    scoreNameCompleteness(incoming) > scoreNameCompleteness(existing)
      ? incoming
      : existing;
  const fallback = preferred === incoming ? existing : incoming;

  return {
    prefix: preferred.prefix ?? fallback.prefix,
    first: preferred.first ?? fallback.first,
    middle: preferred.middle ?? fallback.middle,
    last: preferred.last ?? fallback.last,
    suffix: preferred.suffix ?? fallback.suffix,
    display: preferred.display ?? fallback.display,
  };
}

function inferSocialProvider(url: string): SocialProvider {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('twitter.com') || lower.includes('x.com'))
    return 'twitter';
  if (lower.includes('linkedin.com')) return 'linkedin';
  if (lower.includes('github.com')) return 'github';
  return 'other';
}

export function splitWebsitesAndSocial(
  urls: string[],
): Pick<Contact, 'websites' | 'social'> {
  const websites: Contact['websites'] = [];
  const social: Contact['social'] = [];

  for (const rawUrl of urls) {
    const url = clean(rawUrl);
    if (!url) continue;

    const provider = inferSocialProvider(url);
    websites.push({ url });
    if (provider !== 'other') {
      social.push({ provider, url });
    }
  }

  return { websites, social };
}

export function buildDedupeKeys(
  contact: Pick<Contact, 'phones' | 'emails'>,
): string[] {
  const keys = new Set<string>();

  for (const phone of contact.phones) {
    if (phone.normalized) keys.add(`phone:${phone.normalized}`);
  }

  for (const email of contact.emails) {
    if (email.normalized) keys.add(`email:${email.normalized}`);
  }

  return [...keys];
}

export function normalizeContact(
  draft: ContactDraft,
  fixedId?: string,
): Contact {
  const now = Date.now();

  const phones = draft.phones
    .map(phone => {
      const normalized = normalizePhone(phone.value);
      return {
        ...phone,
        value: normalized,
        normalized,
      };
    })
    .filter(phone => phone.normalized.length > 0);

  const emails = draft.emails
    .map(email => {
      const normalized = normalizeEmail(email.value);
      return {
        ...email,
        value: email.value.trim(),
        normalized,
      };
    })
    .filter(email => email.value.length > 0);

  const contact: Contact = {
    id: fixedId ?? crypto.randomUUID(),
    name: draft.name,
    phones,
    emails,
    addresses: draft.addresses,
    organization: draft.organization,
    websites: draft.websites,
    social: draft.social,
    birthday: normalizeBirthdayToInternal(draft.birthday),
    notes: clean(draft.notes),
    tags: draft.tags,
    dedupeKeys: [],
    createdAt: now,
    updatedAt: now,
  };

  contact.dedupeKeys = buildDedupeKeys(contact);

  return contact;
}

export function mergeContacts(existing: Contact, incoming: Contact): Contact {
  const mergeByValue = <T>(
    left: T[],
    right: T[],
    keyFn: (value: T) => string,
  ): T[] => {
    const map = new Map<string, T>();
    for (const item of [...left, ...right]) {
      map.set(keyFn(item), item);
    }
    return [...map.values()];
  };

  const merged: Contact = {
    ...existing,
    name: mergeName(existing.name, incoming.name),
    phones: mergeByValue(
      existing.phones,
      incoming.phones,
      phone => phone.normalized,
    ),
    emails: mergeByValue(
      existing.emails,
      incoming.emails,
      email => email.normalized,
    ),
    addresses: [...existing.addresses, ...incoming.addresses],
    organization: incoming.organization?.company
      ? incoming.organization
      : existing.organization,
    websites: mergeByValue(existing.websites, incoming.websites, website =>
      website.url.toLowerCase(),
    ),
    social: mergeByValue(existing.social, incoming.social, item =>
      item.url.toLowerCase(),
    ),
    birthday: incoming.birthday ?? existing.birthday,
    notes: incoming.notes ?? existing.notes,
    tags: [...new Set([...existing.tags, ...incoming.tags])],
    updatedAt: Date.now(),
    createdAt: existing.createdAt,
    dedupeKeys: [],
  };

  merged.dedupeKeys = buildDedupeKeys(merged);

  return merged;
}
