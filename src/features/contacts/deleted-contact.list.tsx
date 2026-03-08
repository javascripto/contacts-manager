import { RotateCcw, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DeletedContact } from '@/core/contacts/contact.types';

type DeletedContactListProps = {
  contacts: DeletedContact[];
  selectedIds: Set<string>;
  onToggleSelectAll: (checked: boolean, visibleContactIds: string[]) => void;
  onToggleSelect: (contactId: string, checked: boolean) => void;
  onRestore: (contactId: string) => void;
  onDeletePermanently: (contactId: string) => void;
};

function formatDeletedAt(value: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
}

function formatPhoneForDisplay(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';

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

export const DeletedContactList = memo(function DeletedContactList({
  contacts,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  onRestore,
  onDeletePermanently,
}: DeletedContactListProps) {
  const [selectedContact, setSelectedContact] = useState<DeletedContact | null>(
    null,
  );
  const [isTableScrolled, setTableScrolled] = useState(false);
  const visibleContactIds = contacts.map(contact => contact.id);
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
        Nenhum contato excluído ainda.
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
                  aria-label="Selecionar todos os contatos excluídos visíveis"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Excluído em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map(item => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => setSelectedContact(item)}
              >
                <TableCell onClick={event => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={checked =>
                      onToggleSelect(item.id, checked === true)
                    }
                    aria-label={`Selecionar ${item.contact.name?.display || 'contato sem nome'}`}
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <div className="truncate">
                    {item.contact.name?.display || 'Sem nome'}
                  </div>
                </TableCell>
                <TableCell className="min-w-0">
                  <div className="truncate text-sm">
                    {formatPhoneForDisplay(item.contact.phones[0]?.value)}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {item.contact.emails[0]?.value ?? ''}
                  </div>
                </TableCell>
                <TableCell>{formatDeletedAt(item.deletedAt)}</TableCell>
              </TableRow>
            ))}
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
            <DialogTitle>
              {selectedContact?.contact.name?.display || 'Sem nome'}
            </DialogTitle>
            <DialogDescription>
              Detalhes do contato excluído (somente leitura).
            </DialogDescription>
          </DialogHeader>

          {selectedContact ? (
            <div className="grid gap-2 text-sm">
              <p>
                <strong>Telefone:</strong>{' '}
                {formatPhoneForDisplay(
                  selectedContact.contact.phones[0]?.value,
                )}
              </p>
              <p>
                <strong>Email:</strong>{' '}
                {selectedContact.contact.emails[0]?.value ?? ''}
              </p>
              <p>
                <strong>Empresa:</strong>{' '}
                {selectedContact.contact.organization?.company ?? ''}
              </p>
              <p>
                <strong>Excluído em:</strong>{' '}
                {formatDeletedAt(selectedContact.deletedAt)}
              </p>
              <p>
                <strong>Aniversário:</strong>{' '}
                {selectedContact.contact.birthday ?? ''}
              </p>
              <p>
                <strong>Notas:</strong> {selectedContact.contact.notes ?? ''}
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                if (!selectedContact) return;
                onRestore(selectedContact.id);
                setSelectedContact(null);
              }}
            >
              <RotateCcw />
              Restaurar
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (!selectedContact) return;
                onDeletePermanently(selectedContact.id);
                setSelectedContact(null);
              }}
            >
              <Trash2 />
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
