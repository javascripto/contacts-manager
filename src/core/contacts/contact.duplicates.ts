import type { Contact } from '@/core/contacts/contact.types';

export type DuplicateGroup = {
  id: string;
  contacts: Contact[];
};

function normalizeName(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

class UnionFind {
  private parent = new Map<string, string>();

  makeSet(value: string) {
    if (!this.parent.has(value)) this.parent.set(value, value);
  }

  find(value: string): string {
    const parent = this.parent.get(value);
    if (!parent) {
      this.parent.set(value, value);
      return value;
    }
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    this.parent.set(rootB, rootA);
  }
}

export function groupPossibleDuplicateContacts(
  contacts: Contact[],
): DuplicateGroup[] {
  if (contacts.length < 2) return [];

  const byId = new Map(contacts.map(contact => [contact.id, contact]));
  const buckets = new Map<string, string[]>();
  const uf = new UnionFind();

  for (const contact of contacts) {
    uf.makeSet(contact.id);

    for (const dedupeKey of contact.dedupeKeys) {
      const bucketKey = `key:${dedupeKey}`;
      const list = buckets.get(bucketKey) ?? [];
      list.push(contact.id);
      buckets.set(bucketKey, list);
    }

    const displayName = normalizeName(
      contact.name?.display ??
        `${contact.name?.first ?? ''} ${contact.name?.last ?? ''}`,
    );
    if (displayName.length >= 4) {
      const bucketKey = `name:${displayName}`;
      const list = buckets.get(bucketKey) ?? [];
      list.push(contact.id);
      buckets.set(bucketKey, list);
    }
  }

  for (const ids of buckets.values()) {
    if (ids.length < 2) continue;
    const [first, ...rest] = ids;
    for (const id of rest) uf.union(first, id);
  }

  const groupsMap = new Map<string, string[]>();
  for (const contact of contacts) {
    const root = uf.find(contact.id);
    const list = groupsMap.get(root) ?? [];
    list.push(contact.id);
    groupsMap.set(root, list);
  }

  return [...groupsMap.values()]
    .filter(ids => ids.length > 1)
    .map(ids => {
      const contactsInGroup = ids
        .map(id => byId.get(id))
        .filter((contact): contact is Contact => Boolean(contact))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return {
        id: contactsInGroup
          .map(contact => contact.id)
          .sort()
          .join('|'),
        contacts: contactsInGroup,
      };
    })
    .sort((a, b) => b.contacts.length - a.contacts.length);
}
