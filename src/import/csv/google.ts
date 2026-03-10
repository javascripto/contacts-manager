import Papa from 'papaparse';
import {
  normalizeContact,
  splitWebsitesAndSocial,
} from '@/core/contacts/contact.normalize';
import type { Contact } from '@/core/contacts/contact.types';

type GoogleCsvRow = {
  Name?: string;
  'Given Name'?: string;
  'Additional Name'?: string;
  'Family Name'?: string;
  'E-mail 1 - Value'?: string;
  'E-mail 2 - Value'?: string;
  'Phone 1 - Value'?: string;
  'Phone 2 - Value'?: string;
  'Organization 1 - Name'?: string;
  'Organization 1 - Title'?: string;
  Birthday?: string;
  Notes?: string;
  'Website 1 - Value'?: string;
  'Website 2 - Value'?: string;
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function buildNormalizedRow(
  row: Record<string, string | undefined>,
): Map<string, string> {
  const normalized = new Map<string, string>();

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== 'string') continue;

    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey || normalized.has(normalizedKey)) continue;

    normalized.set(normalizedKey, value);
  }

  return normalized;
}

function getFirstValue(
  row: Map<string, string>,
  aliases: string[],
): string | undefined {
  for (const alias of aliases) {
    const value = row.get(normalizeHeader(alias))?.trim();
    if (value) return value;
  }

  return undefined;
}

export function parseGoogleCsv(content: string): Contact[] {
  const result = Papa.parse<GoogleCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .map(row => {
      const normalizedRow = buildNormalizedRow(
        row as Record<string, string | undefined>,
      );
      const first = getFirstValue(normalizedRow, [
        'Given Name',
        'First Name',
        'Nome',
        'Primeiro nome',
        'Nome próprio',
      ]);
      const middle = getFirstValue(normalizedRow, [
        'Additional Name',
        'Middle Name',
        'Nome do meio',
        'Nome adicional',
      ]);
      const last = getFirstValue(normalizedRow, [
        'Family Name',
        'Last Name',
        'Sobrenome',
      ]);
      const display =
        getFirstValue(normalizedRow, ['Name', 'Full Name', 'Nome completo']) ??
        [first, middle, last].filter(Boolean).join(' ');
      const urls = [
        getFirstValue(normalizedRow, ['Website 1 - Value', 'Website']),
        getFirstValue(normalizedRow, ['Website 2 - Value']),
      ].filter(Boolean) as string[];
      const { websites, social } = splitWebsitesAndSocial(urls);

      return normalizeContact({
        name: {
          display,
          first,
          middle,
          last,
        },
        phones: [
          {
            value:
              getFirstValue(normalizedRow, [
                'Phone 1 - Value',
                'Mobile Phone',
                'Phone',
                'Telefone',
                'Celular',
              ]) ?? '',
            label: 'mobile',
            normalized: '',
          },
          {
            value:
              getFirstValue(normalizedRow, [
                'Phone 2 - Value',
                'Business Phone',
                'Home Phone',
                'Other Phone',
              ]) ?? '',
            label: 'other',
            normalized: '',
          },
        ],
        emails: [
          {
            value:
              getFirstValue(normalizedRow, [
                'E-mail 1 - Value',
                'E-mail Address',
                'Email 1 - Value',
                'Email',
              ]) ?? '',
            label: 'home',
            normalized: '',
          },
          {
            value:
              getFirstValue(normalizedRow, [
                'E-mail 2 - Value',
                'E-mail 2 Address',
                'Email 2 - Value',
              ]) ?? '',
            label: 'work',
            normalized: '',
          },
        ],
        addresses: [],
        organization: {
          company: getFirstValue(normalizedRow, [
            'Organization 1 - Name',
            'Company',
            'Organization',
            'Empresa',
            'Companhia',
          ]),
          title: getFirstValue(normalizedRow, [
            'Organization 1 - Title',
            'Job Title',
            'Title',
            'Cargo',
          ]),
        },
        websites,
        social,
        birthday: getFirstValue(normalizedRow, [
          'Birthday',
          'Birth Date',
          'Aniversário',
          'Data de nascimento',
        ]),
        notes: getFirstValue(normalizedRow, ['Notes', 'Note', 'Observações']),
        tags: [],
      });
    })
    .filter(contact =>
      Boolean(
        contact.name?.display || contact.phones.length || contact.emails.length,
      ),
    );
}
