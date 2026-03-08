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

export function parseGoogleCsv(content: string): Contact[] {
  const result = Papa.parse<GoogleCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .map(row => {
      const urls = [row['Website 1 - Value'], row['Website 2 - Value']].filter(
        Boolean,
      ) as string[];
      const { websites, social } = splitWebsitesAndSocial(urls);

      return normalizeContact({
        name: {
          display: row.Name,
          first: row['Given Name'],
          middle: row['Additional Name'],
          last: row['Family Name'],
        },
        phones: [
          {
            value: row['Phone 1 - Value'] ?? '',
            label: 'mobile',
            normalized: '',
          },
          {
            value: row['Phone 2 - Value'] ?? '',
            label: 'other',
            normalized: '',
          },
        ],
        emails: [
          {
            value: row['E-mail 1 - Value'] ?? '',
            label: 'home',
            normalized: '',
          },
          {
            value: row['E-mail 2 - Value'] ?? '',
            label: 'work',
            normalized: '',
          },
        ],
        addresses: [],
        organization: {
          company: row['Organization 1 - Name'],
          title: row['Organization 1 - Title'],
        },
        websites,
        social,
        birthday: row.Birthday,
        notes: row.Notes,
        tags: [],
      });
    })
    .filter(contact =>
      Boolean(
        contact.name?.display || contact.phones.length || contact.emails.length,
      ),
    );
}
