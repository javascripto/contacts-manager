export type ContactLabel = 'home' | 'work' | 'mobile' | 'other';

export type Phone = {
  value: string;
  normalized: string;
  label: ContactLabel;
};

export type Email = {
  value: string;
  normalized: string;
  label: ContactLabel;
};

export type Address = {
  label: ContactLabel;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

export type Website = {
  url: string;
  label?: string;
};

export type SocialProvider =
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'other';

export type Social = {
  provider: SocialProvider;
  url: string;
  handle?: string;
};

export type Contact = {
  id: string;
  name?: {
    prefix?: string;
    first?: string;
    middle?: string;
    last?: string;
    suffix?: string;
    display?: string;
  };
  phones: Phone[];
  emails: Email[];
  addresses: Address[];
  organization?: {
    company?: string;
    title?: string;
    department?: string;
  };
  websites: Website[];
  social: Social[];
  birthday?: string;
  notes?: string;
  tags: string[];
  dedupeKeys: string[];
  createdAt: number;
  updatedAt: number;
};

export type ContactDraft = Omit<
  Contact,
  'id' | 'createdAt' | 'updatedAt' | 'dedupeKeys'
>;

export type DeletedContact = {
  id: string;
  contact: Contact;
  deletedAt: number;
};
