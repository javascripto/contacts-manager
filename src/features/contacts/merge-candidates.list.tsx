import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Merge, Phone } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DuplicateGroup } from '@/core/contacts/contact.duplicates';

type MergeCandidatesListProps = {
  groups: DuplicateGroup[];
  onMergeGroup: (ids: string[]) => void;
};

function formatPhoneForDisplay(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

export function MergeCandidatesList({
  groups,
  onMergeGroup,
}: MergeCandidatesListProps) {
  const [selectedByGroup, setSelectedByGroup] = useState<
    Record<string, string[]>
  >({});

  const toggleSelected = (
    groupId: string,
    contactId: string,
    checked: boolean,
  ) => {
    setSelectedByGroup(previous => {
      const current = previous[groupId] ?? [];
      if (checked) {
        if (current.includes(contactId)) return previous;
        return { ...previous, [groupId]: [...current, contactId] };
      }
      return { ...previous, [groupId]: current.filter(id => id !== contactId) };
    });
  };

  const clearGroupSelection = (groupId: string) => {
    setSelectedByGroup(previous => ({ ...previous, [groupId]: [] }));
  };

  if (groups.length === 0) {
    return (
      <div className="flex h-full w-full min-h-[18rem] items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum grupo duplicado encontrado automaticamente.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full max-h-[calc(100svh-18rem)] min-h-0 rounded-lg border">
      <div className="w-full space-y-3 p-3">
        <AnimatePresence initial={false}>
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: 8,
                scale: 0.98,
                transition: { duration: 0.2 },
              }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="w-full rounded-lg border p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Grupo {index + 1}</Badge>
                  <Badge variant="outline">
                    {group.contacts.length} contatos
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={(selectedByGroup[group.id]?.length ?? 0) < 2}
                      onClick={() => {
                        const ids = selectedByGroup[group.id] ?? [];
                        if (ids.length < 2) return;
                        onMergeGroup(ids);
                        clearGroupSelection(group.id);
                      }}
                    >
                      <Merge />
                      Mesclar selecionados
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onMergeGroup(group.contacts.map(c => c.id))
                      }
                    >
                      <Merge />
                      Mesclar grupo
                    </Button>
                  </motion.div>
                </div>
              </div>
              <div className="space-y-2">
                {group.contacts.map(contact => (
                  <div
                    key={contact.id}
                    className="rounded-md border bg-muted/30 p-2"
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={(selectedByGroup[group.id] ?? []).includes(
                          contact.id,
                        )}
                        onCheckedChange={checked =>
                          toggleSelected(group.id, contact.id, checked === true)
                        }
                        aria-label={`Selecionar ${contact.name?.display || 'contato sem nome'} para mesclar`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {contact.name?.display || 'Sem nome'}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3" />
                            {formatPhoneForDisplay(contact.phones[0]?.value) ||
                              'Sem telefone'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" />
                            {contact.emails[0]?.value || 'Sem email'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
