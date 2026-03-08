import { mergeContacts } from '@/core/contacts/contact.normalize';
import type { Contact, DeletedContact } from '@/core/contacts/contact.types';
import { db } from '@/storage/db';

export const contactsRepo = {
  async list(): Promise<Contact[]> {
    return db.contacts.orderBy('updatedAt').reverse().toArray();
  },

  async listDeleted(): Promise<DeletedContact[]> {
    return db.deletedContacts.orderBy('deletedAt').reverse().toArray();
  },

  async save(contact: Contact): Promise<void> {
    await db.contacts.put({ ...contact, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.contacts, db.deletedContacts, async () => {
      const contact = await db.contacts.get(id);
      if (!contact) return;

      await db.deletedContacts.put({
        id: contact.id,
        contact,
        deletedAt: Date.now(),
      });
      await db.contacts.delete(id);
    });
  },

  async restoreDeleted(id: string): Promise<void> {
    await db.transaction('rw', db.contacts, db.deletedContacts, async () => {
      const deleted = await db.deletedContacts.get(id);
      if (!deleted) return;

      await db.contacts.put({
        ...deleted.contact,
        updatedAt: Date.now(),
      });
      await db.deletedContacts.delete(id);
    });
  },

  async deleteDeletedPermanently(id: string): Promise<void> {
    await db.deletedContacts.delete(id);
  },

  async mergeMany(ids: string[]): Promise<Contact | undefined> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length < 2) return undefined;

    return db.transaction('rw', db.contacts, async () => {
      const loaded = await Promise.all(
        uniqueIds.map(id => db.contacts.get(id)),
      );
      const contacts = loaded.filter((contact): contact is Contact =>
        Boolean(contact),
      );
      if (contacts.length < 2) return undefined;

      const [base, ...rest] = [...contacts].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      const merged = rest.reduce(
        (acc, contact) => mergeContacts(acc, contact),
        base,
      );

      await db.contacts.put(merged);
      await Promise.all(
        rest
          .map(contact => contact.id)
          .filter(id => id !== merged.id)
          .map(id => db.contacts.delete(id)),
      );

      return merged;
    });
  },

  async clear(): Promise<void> {
    await db.contacts.clear();
  },

  async importWithDedupe(
    incomingContacts: Contact[],
  ): Promise<{ inserted: number; merged: number }> {
    const existing = await db.contacts.toArray();
    const byKey = new Map<string, Contact>();

    for (const contact of existing) {
      for (const key of contact.dedupeKeys) {
        byKey.set(key, contact);
      }
    }

    let inserted = 0;
    let merged = 0;

    for (const incoming of incomingContacts) {
      const match = incoming.dedupeKeys
        .map(key => byKey.get(key))
        .find(Boolean);

      if (match) {
        const mergedContact = mergeContacts(match, incoming);
        await db.contacts.put(mergedContact);
        for (const key of mergedContact.dedupeKeys) {
          byKey.set(key, mergedContact);
        }
        merged += 1;
      } else {
        await db.contacts.put(incoming);
        for (const key of incoming.dedupeKeys) {
          byKey.set(key, incoming);
        }
        inserted += 1;
      }
    }

    return { inserted, merged };
  },
};
