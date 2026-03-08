import Papa from 'papaparse';
import {
  normalizeContact,
  splitWebsitesAndSocial,
} from '@/core/contacts/contact.normalize';
import type { Contact } from '@/core/contacts/contact.types';

type OutlookCsvRow = {
  'First Name'?: string;
  'Middle Name'?: string;
  'Last Name'?: string;
  'E-mail Address'?: string;
  'E-mail 2 Address'?: string;
  'Mobile Phone'?: string;
  'Business Phone'?: string;
  'Home Phone'?: string;
  Company?: string;
  'Job Title'?: string;
  'Web Page'?: string;
  Notes?: string;
  Birthday?: string;
};

export function parseOutlookCsv(content: string): Contact[] {
  const result = Papa.parse<OutlookCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .map(row => {
      const display = [row['First Name'], row['Middle Name'], row['Last Name']]
        .filter(Boolean)
        .join(' ');
      const urls = [row['Web Page']].filter(Boolean) as string[];
      const { websites, social } = splitWebsitesAndSocial(urls);

      return normalizeContact({
        name: {
          display,
          first: row['First Name'],
          middle: row['Middle Name'],
          last: row['Last Name'],
        },
        phones: [
          { value: row['Mobile Phone'] ?? '', label: 'mobile', normalized: '' },
          { value: row['Business Phone'] ?? '', label: 'work', normalized: '' },
          { value: row['Home Phone'] ?? '', label: 'home', normalized: '' },
        ],
        emails: [
          { value: row['E-mail Address'] ?? '', label: 'home', normalized: '' },
          {
            value: row['E-mail 2 Address'] ?? '',
            label: 'work',
            normalized: '',
          },
        ],
        addresses: [],
        organization: {
          company: row.Company,
          title: row['Job Title'],
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
