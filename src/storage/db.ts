import Dexie, { type Table } from 'dexie';
import type { Contact, DeletedContact } from '@/core/contacts/contact.types';

export class ContactsDb extends Dexie {
  contacts!: Table<Contact, string>;
  deletedContacts!: Table<DeletedContact, string>;

  constructor() {
    super('contacts-db');
    this.version(1).stores({
      contacts: 'id,updatedAt,*dedupeKeys',
    });
    this.version(2).stores({
      contacts: 'id,updatedAt,*dedupeKeys',
      deletedContacts: 'id,deletedAt',
    });
  }
}

export const db = new ContactsDb();
