import { Cake, CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeBirthdayToInternal } from '@/core/contacts/contact.birthday';
import type { Contact } from '@/core/contacts/contact.types';
import { contactsRepo } from '@/storage/contacts.repo';

type BirthdayEntry = {
  id: string;
  displayName: string;
  month: number;
  day: number;
  label: string;
};

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

function getContactDisplayName(contact: Contact): string {
  return (
    contact.name?.display ??
    [contact.name?.first, contact.name?.middle, contact.name?.last]
      .filter(Boolean)
      .join(' ') ??
    'Sem nome'
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toBirthdayEntry(
  contact: Contact,
  currentYear: number,
): BirthdayEntry | null {
  const normalized = normalizeBirthdayToInternal(contact.birthday);
  if (!normalized) return null;

  if (normalized.startsWith('--')) {
    const partial = normalized.match(/^--(\d{2})-(\d{2})$/);
    if (!partial) return null;

    const month = Number(partial[1]);
    const day = Number(partial[2]);
    const displayName = getContactDisplayName(contact);

    return {
      id: contact.id,
      displayName,
      month,
      day,
      label: `${displayName} ${pad2(day)}/${pad2(month)}`,
    };
  }

  const full = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!full) return null;

  const year = Number(full[1]);
  const month = Number(full[2]);
  const day = Number(full[3]);
  const displayName = getContactDisplayName(contact);
  const age = currentYear - year;

  return {
    id: contact.id,
    displayName,
    month,
    day,
    label: `${displayName} ${pad2(day)}/${pad2(month)} (comemora ${age} anos)`,
  };
}

export function BirthdaysPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    void (async () => {
      setContacts(await contactsRepo.list());
    })();
  }, []);

  const monthGroups = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const entries = contacts
      .map(contact => toBirthdayEntry(contact, currentYear))
      .filter((entry): entry is BirthdayEntry => Boolean(entry));

    return MONTHS.map((name, index) => {
      const month = index + 1;
      const items = entries
        .filter(entry => entry.month === month)
        .sort((left, right) => {
          if (left.day !== right.day) return left.day - right.day;
          return left.displayName.localeCompare(right.displayName, 'pt-BR');
        });

      return {
        month,
        name,
        items,
      };
    });
  }, [contacts]);

  const totalBirthdays = useMemo(
    () => monthGroups.reduce((sum, group) => sum + group.items.length, 0),
    [monthGroups],
  );

  const handleSidebarSelect = (
    key: 'contacts' | 'birthdays' | 'merge' | 'deleted' | 'import' | 'export',
  ) => {
    if (key === 'contacts') {
      navigate('/contacts');
      return;
    }

    if (key === 'birthdays') {
      navigate('/contacts/birthdays');
      return;
    }

    if (key === 'merge') {
      navigate('/contacts/merge');
      return;
    }

    if (key === 'deleted') {
      navigate('/contacts/deleted');
    }
  };

  return (
    <AppLayout
      activeKey="birthdays"
      onSelect={handleSidebarSelect}
    >
      <div
        className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 md:py-6"
        style={{ height: 'calc(100dvh - 3.5rem)' }}
      >
        <Card className="overflow-hidden border-border/70 bg-card/95">
          <CardHeader className="relative gap-4 overflow-hidden border-b bg-linear-to-r from-amber-100/70 via-background to-rose-100/60 dark:from-slate-900 dark:via-slate-950 dark:to-amber-950/60">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.22),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_55%)] md:block" />
            <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground">
                  <Cake className="size-3.5" />
                  Agenda anual
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl md:text-3xl">
                    Aniversariantes
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm md:text-base">
                    Calendário anual com os aniversários organizados por mês.
                    Quando o contato tem ano de nascimento, a idade exibida é a
                    que ele completa na data deste ano.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start rounded-2xl border bg-background/85 px-4 py-3 shadow-xs">
                <CalendarDays className="size-4 text-amber-600" />
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Total mapeado
                  </div>
                  <div className="text-lg font-semibold">{totalBirthdays}</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="mt-4 min-h-0 flex-1 overflow-hidden border-border/70 bg-card/80 shadow-xs">
          <CardContent className="h-full p-0">
            <ScrollArea className="h-full min-h-0 px-1 py-3 pr-3">
              <div className="grid gap-4 px-1 py-1 md:grid-cols-2 2xl:grid-cols-3">
                {monthGroups.map(group => (
                  <Card
                    key={group.month}
                    className={
                      group.month === currentMonth
                        ? 'flex min-h-72 flex-col border-amber-300/70 bg-amber-50/80 shadow-sm ring-1 ring-amber-300/50 dark:border-amber-700/70 dark:bg-amber-950/20 dark:ring-amber-700/50'
                        : 'flex min-h-72 flex-col border-border/70 bg-card/95 shadow-xs'
                    }
                  >
                    <CardHeader
                      className={
                        group.month === currentMonth
                          ? 'border-b bg-linear-to-r from-amber-100/80 to-rose-100/60 dark:from-amber-950/60 dark:to-slate-900'
                          : 'border-b bg-muted/30'
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">
                            {group.name}
                          </CardTitle>
                          <CardDescription>
                            {group.items.length === 0
                              ? 'Nenhum aniversariante'
                              : `${group.items.length} aniversariante${group.items.length > 1 ? 's' : ''}`}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            group.month === currentMonth
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {group.month === currentMonth
                            ? `${pad2(group.month)} • atual`
                            : pad2(group.month)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="min-h-0 flex-1 p-0">
                      <ScrollArea className="h-full">
                        {group.items.length === 0 ? (
                          <div className="flex h-full min-h-44 items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
                            Nenhum contato com aniversário cadastrado neste mês.
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {group.items.map(item => (
                              <div
                                key={item.id}
                                className="border-b px-5 py-2 last:border-b-0"
                              >
                                <p className="text-sm leading-5">
                                  {item.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
