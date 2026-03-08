import { CalendarIcon, Plus, X } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  formatBirthdayForDateInput,
  formatBirthdayForDisplayBr,
  maskBirthdayInputBr,
} from '@/core/contacts/contact.birthday';
import type { Contact, ContactDraft } from '@/core/contacts/contact.types';

type ContactFormProps = {
  initialContact?: Contact;
  onSubmit: (draft: ContactDraft) => void;
  onCancel: () => void;
};

type FormState = {
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  website: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  github: string;
  otherSocial: string;
  birthday: string;
  notes: string;
};

type SocialFieldKey =
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'otherSocial';

const SOCIAL_FIELD_CONFIG: Array<{
  key: SocialFieldKey;
  label: string;
  placeholder: string;
}> = [
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/usuario',
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    placeholder: 'https://x.com/usuario',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/usuario',
  },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/usuario' },
  {
    key: 'otherSocial',
    label: 'Outra rede social',
    placeholder: 'https://t.me/usuario',
  },
];

function toFormState(contact?: Contact): FormState {
  const findSocial = (
    provider: 'instagram' | 'twitter' | 'linkedin' | 'github',
  ) => contact?.social.find(item => item.provider === provider)?.url ?? '';

  const knownSocialUrls = new Set(
    contact?.social
      .filter(item => item.provider !== 'other')
      .map(item => item.url.trim().toLowerCase()) ?? [],
  );

  const otherSocial =
    contact?.social.find(item => item.provider === 'other')?.url ??
    contact?.websites.find(
      item => !knownSocialUrls.has(item.url.trim().toLowerCase()),
    )?.url ??
    '';

  return {
    displayName: contact?.name?.display ?? '',
    firstName: contact?.name?.first ?? '',
    lastName: contact?.name?.last ?? '',
    phone: contact?.phones[0]?.value ?? '',
    email: contact?.emails[0]?.value ?? '',
    company: contact?.organization?.company ?? '',
    title: contact?.organization?.title ?? '',
    website: contact?.websites[0]?.url ?? '',
    instagram: findSocial('instagram'),
    twitter: findSocial('twitter'),
    linkedin: findSocial('linkedin'),
    github: findSocial('github'),
    otherSocial,
    birthday: formatBirthdayForDisplayBr(contact?.birthday),
    notes: contact?.notes ?? '',
  };
}

export function ContactForm({
  initialContact,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    toFormState(initialContact),
  );
  const [isBirthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [visibleSocialFields, setVisibleSocialFields] = useState<
    Record<SocialFieldKey, boolean>
  >(() => ({
    instagram: Boolean(form.instagram.trim()),
    twitter: Boolean(form.twitter.trim()),
    linkedin: Boolean(form.linkedin.trim()),
    github: Boolean(form.github.trim()),
    otherSocial: Boolean(form.otherSocial.trim()),
  }));

  const title = useMemo(
    () => (initialContact ? 'Editar contato' : 'Novo contato'),
    [initialContact],
  );

  const updateField = (key: keyof FormState, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const handleBirthdayMaskedChange = (value: string) => {
    updateField('birthday', maskBirthdayInputBr(value));
  };

  const handleBirthdayDateChange = (value: string) => {
    if (!value) {
      updateField('birthday', '');
      return;
    }

    updateField('birthday', formatBirthdayForDisplayBr(value));
  };

  const showSocialField = (field: SocialFieldKey) => {
    setVisibleSocialFields(previous => ({ ...previous, [field]: true }));
  };

  const hideSocialField = (field: SocialFieldKey) => {
    updateField(field, '');
    setVisibleSocialFields(previous => ({ ...previous, [field]: false }));
  };

  const birthdayDateValue = (() => {
    const iso = formatBirthdayForDateInput(form.birthday);
    if (!iso) return undefined;

    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) return undefined;

    return new Date(year, month - 1, day);
  })();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const socialEntries = [
      { provider: 'instagram' as const, url: form.instagram.trim() },
      { provider: 'twitter' as const, url: form.twitter.trim() },
      { provider: 'linkedin' as const, url: form.linkedin.trim() },
      { provider: 'github' as const, url: form.github.trim() },
      { provider: 'other' as const, url: form.otherSocial.trim() },
    ].filter(entry => entry.url.length > 0);

    const websites = [
      form.website.trim(),
      ...socialEntries.map(entry => entry.url),
    ]
      .filter(Boolean)
      .map(url => ({ url }))
      .filter(
        (item, index, list) =>
          list.findIndex(
            x => x.url.toLowerCase() === item.url.toLowerCase(),
          ) === index,
      );

    onSubmit({
      name: {
        display: form.displayName.trim(),
        first: form.firstName.trim(),
        last: form.lastName.trim(),
      },
      phones: form.phone.trim()
        ? [{ value: form.phone.trim(), normalized: '', label: 'mobile' }]
        : [],
      emails: form.email.trim()
        ? [{ value: form.email.trim(), normalized: '', label: 'home' }]
        : [],
      addresses: [],
      organization: {
        company: form.company.trim(),
        title: form.title.trim(),
      },
      websites,
      social: socialEntries.map(entry => ({
        provider: entry.provider,
        url: entry.url,
      })),
      birthday: form.birthday.trim(),
      notes: form.notes.trim(),
      tags: [],
    });
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={handleSubmit}
    >
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="grid gap-2">
        <Label htmlFor="displayName">Nome de exibição</Label>
        <Input
          id="displayName"
          placeholder="Ex.: João Silva"
          value={form.displayName}
          onChange={event => updateField('displayName', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">Primeiro nome</Label>
          <Input
            id="firstName"
            placeholder="Ex.: João"
            value={form.firstName}
            onChange={event => updateField('firstName', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input
            id="lastName"
            placeholder="Ex.: Silva"
            value={form.lastName}
            onChange={event => updateField('lastName', event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            placeholder="Ex.: +55 11 99999-9999"
            value={form.phone}
            onChange={event => updateField('phone', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Ex.: joao@email.com"
            value={form.email}
            onChange={event => updateField('email', event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            placeholder="Ex.: Google"
            value={form.company}
            onChange={event => updateField('company', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Cargo</Label>
          <Input
            id="title"
            placeholder="Ex.: Product Manager"
            value={form.title}
            onChange={event => updateField('title', event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            placeholder="Ex.: https://linkedin.com/in/usuario"
            value={form.website}
            onChange={event => updateField('website', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="birthday">Aniversário</Label>
          <div className="relative">
            <Input
              id="birthday"
              className="pr-10"
              placeholder="DD/MM/AAAA"
              value={form.birthday}
              onChange={event => handleBirthdayMaskedChange(event.target.value)}
            />
            <Popover
              open={isBirthdayPickerOpen}
              onOpenChange={setBirthdayPickerOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                >
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <span className="sr-only">
                    Abrir calendário de aniversário
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={birthdayDateValue}
                  onSelect={date => {
                    if (!date) return;
                    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    handleBirthdayDateChange(iso);
                    setBirthdayPickerOpen(false);
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label>Redes sociais</Label>
          {SOCIAL_FIELD_CONFIG.filter(
            field => !visibleSocialFields[field.key],
          ).map(field => (
            <Button
              key={field.key}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => showSocialField(field.key)}
            >
              <Plus />
              {field.label}
            </Button>
          ))}
        </div>

        {SOCIAL_FIELD_CONFIG.filter(
          field => visibleSocialFields[field.key],
        ).map(field => (
          <div
            key={field.key}
            className="grid gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => hideSocialField(field.key)}
              >
                <X />
                <span className="sr-only">Remover {field.label}</span>
              </Button>
            </div>
            <Input
              id={field.key}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChange={event => updateField(field.key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Observações importantes sobre o contato..."
          value={form.notes}
          onChange={event => updateField('notes', event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
