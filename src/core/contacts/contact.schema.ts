import { normalizeContact } from './contact.normalize';
import type { Contact } from './contact.types';

export function createEmptyContact(): Contact {
  return normalizeContact({
    name: { display: '' },
    phones: [],
    emails: [],
    addresses: [],
    websites: [],
    social: [],
    tags: [],
    notes: '',
  });
}
