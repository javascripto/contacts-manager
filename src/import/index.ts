import type { Contact } from '@/core/contacts/contact.types';
import { parseGoogleCsv } from '@/import/csv/google';
import { parseOutlookCsv } from '@/import/csv/outlook';
import { parseInternalJsonContacts } from '@/import/json/parser';
import { parseVcard } from '@/import/vcard/parser';

function detectCsvKind(headers: string[]): 'google' | 'outlook' {
  const normalized = headers.map(header => header.trim().toLowerCase());

  if (
    normalized.includes('given name') ||
    normalized.includes('e-mail 1 - value')
  ) {
    return 'google';
  }

  return 'outlook';
}

export function importContactsFromFile(
  content: string,
  fileName: string,
): Contact[] {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.vcf')) {
    return parseVcard(content);
  }

  if (lowerName.endsWith('.csv')) {
    const firstLine = content.split(/\r?\n/)[0] ?? '';
    const headers = firstLine.split(',');
    const kind = detectCsvKind(headers);
    return kind === 'google'
      ? parseGoogleCsv(content)
      : parseOutlookCsv(content);
  }

  if (lowerName.endsWith('.json')) {
    return parseInternalJsonContacts(content);
  }

  throw new Error('Formato de arquivo não suportado. Use CSV, VCF ou JSON.');
}
