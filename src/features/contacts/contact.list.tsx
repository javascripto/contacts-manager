import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBirthdayForDisplayBr } from '@/core/contacts/contact.birthday';
import type { Contact } from '@/core/contacts/contact.types';
import { useIsMobile } from '@/hooks/use-mobile';

export type ContactColumnKey =
  | 'name'
  | 'contact'
  | 'company'
  | 'birthday'
  | 'age'
  | 'social'
  | 'notes';

export const CONTACT_COLUMN_LABELS: Record<ContactColumnKey, string> = {
  name: 'Nome',
  contact: 'Contato',
  company: 'Empresa',
  birthday: 'Aniversário',
  age: 'Idade',
  social: 'Redes',
  notes: 'Notas',
};

export const DEFAULT_VISIBLE_COLUMNS: Record<ContactColumnKey, boolean> = {
  name: true,
  contact: true,
  company: true,
  birthday: true,
  age: false,
  social: true,
  notes: false,
};

type SortState = {
  key: ContactColumnKey;
  direction: 'asc' | 'desc';
};

type ContactListProps = {
  contacts: Contact[];
  visibleColumns: Record<ContactColumnKey, boolean>;
  columnOrder: ContactColumnKey[];
  selectedIds: Set<string>;
  emptyMessage?: string;
  onToggleSelectAll: (checked: boolean, visibleContactIds: string[]) => void;
  onToggleSelect: (contactId: string, checked: boolean) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
};

function formatBirthday(value: string | undefined): string {
  const formatted = formatBirthdayForDisplayBr(value);
  return formatted || '-';
}

function calculateAgeFromBirthday(
  value: string | undefined,
): number | undefined {
  if (!value || value.startsWith('--')) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return undefined;

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : undefined;
}

function formatAge(value: string | undefined): string {
  const age = calculateAgeFromBirthday(value);
  return age === undefined ? '-' : String(age);
}

function extractSocialHandle(url: string): string | undefined {
  try {
    const normalizedUrl =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;
    const parsed = new URL(normalizedUrl);
    const handle = parsed.pathname.split('/').filter(Boolean)[0];
    if (!handle) return undefined;
    return handle.startsWith('@') ? handle : `@${handle}`;
  } catch {
    return undefined;
  }
}

function formatSocialBadgeLabel(provider: string, url: string): string {
  const handle = extractSocialHandle(url);
  if (handle) return handle;
  return provider;
}

function formatPhoneForDisplay(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '-';

  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (local.length === 9)
      return `+55 (${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
    if (local.length === 8)
      return `+55 (${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

function getSortableValue(contact: Contact, key: ContactColumnKey): string {
  switch (key) {
    case 'name':
      return (
        contact.name?.display ??
        `${contact.name?.first ?? ''} ${contact.name?.last ?? ''}`
      )
        .trim()
        .toLowerCase();
    case 'contact':
      return `${contact.phones[0]?.value ?? ''} ${contact.emails[0]?.value ?? ''}`
        .trim()
        .toLowerCase();
    case 'company':
      return (contact.organization?.company ?? '').toLowerCase();
    case 'birthday':
      return (contact.birthday ?? '').toLowerCase();
    case 'age': {
      const age = calculateAgeFromBirthday(contact.birthday);
      return age === undefined ? '' : String(age).padStart(3, '0');
    }
    case 'social':
      return contact.social
        .map(item => item.provider)
        .join(' ')
        .toLowerCase();
    case 'notes':
      return (contact.notes ?? '').toLowerCase();
    default:
      return '';
  }
}

export const ContactList = memo(function ContactList({
  contacts,
  visibleColumns,
  columnOrder,
  selectedIds,
  emptyMessage,
  onToggleSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
}: ContactListProps) {
  const [sort, setSort] = useState<SortState>({
    key: 'name',
    direction: 'asc',
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isTableScrolled, setTableScrolled] = useState(false);
  const isMobile = useIsMobile();

  const sortedContacts = useMemo(() => {
    const list = [...contacts];
    list.sort((left, right) => {
      const a = getSortableValue(left, sort.key);
      const b = getSortableValue(right, sort.key);
      const result = a.localeCompare(b, 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      });
      return sort.direction === 'asc' ? result : -result;
    });
    return list;
  }, [contacts, sort]);

  const toggleSort = (key: ContactColumnKey) => {
    setSort(previous => {
      if (previous.key === key) {
        return {
          key,
          direction: previous.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortIcon = (key: ContactColumnKey) => {
    if (sort.key !== key) return <ArrowUpDown />;
    return sort.direction === 'asc' ? <ChevronUp /> : <ChevronDown />;
  };

  const orderedVisibleColumns = columnOrder.filter(
    column => visibleColumns[column],
  );
  const visibleContactIds = sortedContacts.map(contact => contact.id);
  const selectedVisibleCount = visibleContactIds.filter(id =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleContactIds.length > 0 &&
    selectedVisibleCount === visibleContactIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  if (contacts.length === 0) {
    return (
      <div className="flex h-full w-full min-h-[18rem] items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? 'Nenhum contato ainda.'}
      </div>
    );
  }

  return (
    <>
      <ScrollArea
        className="h-full max-h-[calc(100svh-18rem)] min-h-0 rounded-lg border"
        onViewportScroll={event => {
          const target = event.target as HTMLElement;
          setTableScrolled(target.scrollTop > 0);
        }}
      >
        <div
          className={`pointer-events-none sticky top-10 z-30 h-0 ${
            isTableScrolled ? 'block' : 'hidden'
          }`}
          aria-hidden="true"
        >
          <div className="h-px bg-border shadow-[0_8px_14px_-8px_rgba(0,0,0,0.55)]" />
        </div>
        <Table className="w-full table-fixed">
          <TableHeader
            className={
              isTableScrolled ? '[&_th]:border-b [&_th]:border-border' : ''
            }
          >
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={checked =>
                    onToggleSelectAll(checked === true, visibleContactIds)
                  }
                  aria-label="Selecionar todos os contatos visíveis"
                />
              </TableHead>
              {orderedVisibleColumns.map(column => (
                <TableHead key={column}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort(column)}
                  >
                    {CONTACT_COLUMN_LABELS[column]}
                    {sortIcon(column)}
                  </Button>
                </TableHead>
              ))}
              <TableHead className="w-16 min-w-16 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {sortedContacts.map(contact => (
                <motion.tr
                  key={contact.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
                  className="border-b transition-none hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                  onClick={() => {
                    if (isMobile) {
                      setSelectedContact(contact);
                      return;
                    }

                    onEdit(contact);
                  }}
                >
                  <TableCell onClick={event => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(contact.id)}
                      onCheckedChange={checked =>
                        onToggleSelect(contact.id, checked === true)
                      }
                      aria-label={`Selecionar ${contact.name?.display || 'contato sem nome'}`}
                    />
                  </TableCell>
                  {orderedVisibleColumns.map(column => {
                    if (column === 'name') {
                      return (
                        <TableCell
                          key={`${contact.id}-name`}
                          className="min-w-0"
                        >
                          <div className="truncate font-medium">
                            {contact.name?.display || 'Sem nome'}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {contact.name?.first} {contact.name?.last}
                          </div>
                        </TableCell>
                      );
                    }

                    if (column === 'contact') {
                      return (
                        <TableCell
                          key={`${contact.id}-contact`}
                          className="min-w-0"
                        >
                          <div className="truncate text-sm">
                            {formatPhoneForDisplay(contact.phones[0]?.value)}
                          </div>
                          <div className="truncate text-sm text-muted-foreground">
                            {contact.emails[0]?.value ?? ''}
                          </div>
                        </TableCell>
                      );
                    }

                    if (column === 'company') {
                      return (
                        <TableCell key={`${contact.id}-company`}>
                          {contact.organization?.company ?? '-'}
                        </TableCell>
                      );
                    }

                    if (column === 'birthday') {
                      return (
                        <TableCell key={`${contact.id}-birthday`}>
                          {formatBirthday(contact.birthday)}
                        </TableCell>
                      );
                    }

                    if (column === 'age') {
                      return (
                        <TableCell key={`${contact.id}-age`}>
                          {formatAge(contact.birthday)}
                        </TableCell>
                      );
                    }

                    if (column === 'social') {
                      return (
                        <TableCell key={`${contact.id}-social`}>
                          <div className="flex flex-wrap gap-1">
                            {contact.social.length === 0 ? (
                              <Badge variant="outline">-</Badge>
                            ) : null}
                            {contact.social.map(item => (
                              <a
                                key={`${contact.id}-${item.provider}-${item.url}`}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="cursor-pointer"
                                onClick={event => event.stopPropagation()}
                              >
                                <Badge variant="secondary">
                                  {formatSocialBadgeLabel(
                                    item.provider,
                                    item.url,
                                  )}
                                </Badge>
                              </a>
                            ))}
                          </div>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell
                        key={`${contact.id}-notes`}
                        className="max-w-[240px] truncate"
                      >
                        {contact.notes ?? '-'}
                      </TableCell>
                    );
                  })}

                  <TableCell className="w-16 min-w-16 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={event => {
                            event.stopPropagation();
                          }}
                        >
                          <MoreHorizontal />
                          <span className="sr-only">Abrir ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={event => {
                          event.stopPropagation();
                        }}
                      >
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={event => {
                            event.stopPropagation();
                            onEdit(contact);
                          }}
                        >
                          <Pencil />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={event => {
                            event.stopPropagation();
                            onDelete(contact.id);
                          }}
                        >
                          <Trash2 />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog
        open={Boolean(selectedContact)}
        onOpenChange={open => {
          if (!open) setSelectedContact(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-10">
              <div>
                <DialogTitle>
                  {selectedContact?.name?.display || 'Sem nome'}
                </DialogTitle>
                <DialogDescription>Detalhes do contato</DialogDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={event => {
                      event.stopPropagation();
                    }}
                  >
                    <MoreHorizontal />
                    <span className="sr-only">Ações do contato</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={event => {
                    event.stopPropagation();
                  }}
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={event => {
                      event.stopPropagation();
                      if (!selectedContact) return;
                      onEdit(selectedContact);
                      setSelectedContact(null);
                    }}
                  >
                    <Pencil />
                    <span>Editar</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={event => {
                      event.stopPropagation();
                      if (!selectedContact) return;
                      onDelete(selectedContact.id);
                      setSelectedContact(null);
                    }}
                  >
                    <Trash2 />
                    <span>Excluir</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          {selectedContact ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>
                  <strong>Telefone:</strong>{' '}
                  {formatPhoneForDisplay(selectedContact.phones[0]?.value)}
                </p>
                <p>
                  <strong>Email:</strong>{' '}
                  {selectedContact.emails[0]?.value ?? '-'}
                </p>
                <p>
                  <strong>Empresa:</strong>{' '}
                  {selectedContact.organization?.company ?? '-'}
                </p>
                <p>
                  <strong>Aniversário:</strong>{' '}
                  {formatBirthday(selectedContact.birthday)}
                </p>
                <p>
                  <strong>Notas:</strong> {selectedContact.notes ?? '-'}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
});
