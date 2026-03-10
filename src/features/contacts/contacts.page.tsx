import { Reorder } from 'framer-motion';
import {
  Columns3,
  FileJson,
  FileSpreadsheet,
  GripVertical,
  IdCard,
  Merge,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { groupPossibleDuplicateContacts } from '@/core/contacts/contact.duplicates';
import {
  normalizeContact,
  normalizePhone,
} from '@/core/contacts/contact.normalize';
import type {
  Contact,
  ContactDraft,
  DeletedContact,
} from '@/core/contacts/contact.types';
import { exportContactsToCsv } from '@/export/csv';
import { exportContactsToJson } from '@/export/json';
import { exportContactsToVcard } from '@/export/vcard';
import { ContactForm } from '@/features/contacts/contact.form';
import {
  CONTACT_COLUMN_LABELS,
  type ContactColumnKey,
  ContactList,
  DEFAULT_VISIBLE_COLUMNS,
} from '@/features/contacts/contact.list';
import { DeletedContactList } from '@/features/contacts/deleted-contact.list';
import { MergeCandidatesList } from '@/features/contacts/merge-candidates.list';
import { importContactsFromFile } from '@/import';
import { contactsRepo } from '@/storage/contacts.repo';

const COLUMNS_STORAGE_KEY = 'contacts-table-visible-columns';
const COLUMNS_ORDER_STORAGE_KEY = 'contacts-table-columns-order';
const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function getDefaultVisibleColumnsForViewport(): Record<
  ContactColumnKey,
  boolean
> {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia(MOBILE_MEDIA_QUERY).matches
  ) {
    return {
      name: true,
      contact: false,
      company: false,
      birthday: false,
      age: false,
      social: false,
      notes: false,
    };
  }

  return DEFAULT_VISIBLE_COLUMNS;
}

function downloadTextFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

function isSupportedContactFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.csv') || lower.endsWith('.vcf') || lower.endsWith('.json')
  );
}

function hasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return [...dataTransfer.types].includes('Files');
}

type ContactsPageProps = {
  view: 'contacts' | 'merge' | 'deleted';
};

export function ContactsPage({ view }: ContactsPageProps) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deletedContacts, setDeletedContacts] = useState<DeletedContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDeletedContactIds, setSelectedDeletedContactIds] = useState<
    Set<string>
  >(new Set());
  const [query, setQuery] = useState('');
  const [deletedQuery, setDeletedQuery] = useState('');
  const [isDragOver, setDragOver] = useState(false);
  const [isContactDialogOpen, setContactDialogOpen] = useState(false);
  const [isColumnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [pendingDroppedFiles, setPendingDroppedFiles] = useState<File[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [pendingMergeIds, setPendingMergeIds] = useState<string[]>([]);
  const [pendingMergeGroupBatches, setPendingMergeGroupBatches] = useState<
    string[][]
  >([]);
  const [pendingRestoreDeletedIds, setPendingRestoreDeletedIds] = useState<
    string[]
  >([]);
  const [pendingPermanentDeleteIds, setPendingPermanentDeleteIds] = useState<
    string[]
  >([]);
  const [visibleColumns, setVisibleColumns] = useState<
    Record<ContactColumnKey, boolean>
  >(getDefaultVisibleColumnsForViewport);
  const [columnOrder, setColumnOrder] = useState<ContactColumnKey[]>(
    () => Object.keys(CONTACT_COLUMN_LABELS) as ContactColumnKey[],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    void (async () => {
      const [active, deleted] = await Promise.all([
        contactsRepo.list(),
        contactsRepo.listDeleted(),
      ]);
      setContacts(active);
      setDeletedContacts(deleted);
    })();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!saved) {
      setVisibleColumns(getDefaultVisibleColumnsForViewport());
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<
        Record<ContactColumnKey, boolean>
      >;
      setVisibleColumns({
        ...getDefaultVisibleColumnsForViewport(),
        ...parsed,
      });
    } catch {
      setVisibleColumns(getDefaultVisibleColumnsForViewport());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    const saved = localStorage.getItem(COLUMNS_ORDER_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as ContactColumnKey[];
      const allColumns = Object.keys(
        CONTACT_COLUMN_LABELS,
      ) as ContactColumnKey[];
      const valid = parsed.filter((item): item is ContactColumnKey =>
        allColumns.includes(item),
      );
      const missing = allColumns.filter(column => !valid.includes(column));
      setColumnOrder([...valid, ...missing]);
    } catch {
      setColumnOrder(Object.keys(CONTACT_COLUMN_LABELS) as ContactColumnKey[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      COLUMNS_ORDER_STORAGE_KEY,
      JSON.stringify(columnOrder),
    );
  }, [columnOrder]);

  const filteredContacts = useMemo(() => {
    const normalizedText = query.trim().toLowerCase();
    const normalizedPhoneQuery = normalizePhone(query);
    if (!normalizedText && !normalizedPhoneQuery) return contacts;

    return contacts.filter(contact => {
      const textPieces = [
        contact.name?.display,
        contact.name?.first,
        contact.name?.last,
        contact.emails[0]?.value,
        contact.organization?.company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchText = normalizedText
        ? textPieces.includes(normalizedText)
        : false;
      const matchPhone = normalizedPhoneQuery
        ? contact.phones.some(phone =>
            phone.normalized.includes(normalizedPhoneQuery),
          )
        : false;

      return matchText || matchPhone;
    });
  }, [contacts, query]);
  const filteredDeletedContacts = useMemo(() => {
    const normalizedText = deletedQuery.trim().toLowerCase();
    const normalizedPhoneQuery = normalizePhone(deletedQuery);
    if (!normalizedText && !normalizedPhoneQuery) return deletedContacts;

    return deletedContacts.filter(item => {
      const contact = item.contact;
      const textPieces = [
        contact.name?.display,
        contact.name?.first,
        contact.name?.last,
        contact.emails[0]?.value,
        contact.organization?.company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchText = normalizedText
        ? textPieces.includes(normalizedText)
        : false;
      const matchPhone = normalizedPhoneQuery
        ? contact.phones.some(phone =>
            phone.normalized.includes(normalizedPhoneQuery),
          )
        : false;

      return matchText || matchPhone;
    });
  }, [deletedContacts, deletedQuery]);
  const duplicateGroups = useMemo(
    () => groupPossibleDuplicateContacts(contacts),
    [contacts],
  );
  const selectedContacts = useMemo(
    () => contacts.filter(contact => selectedContactIds.has(contact.id)),
    [contacts, selectedContactIds],
  );

  useEffect(() => {
    const visibleIds = new Set(contacts.map(contact => contact.id));
    setSelectedContactIds(previous => {
      const next = new Set([...previous].filter(id => visibleIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [contacts]);

  useEffect(() => {
    const visibleIds = new Set(deletedContacts.map(contact => contact.id));
    setSelectedDeletedContactIds(previous => {
      const next = new Set([...previous].filter(id => visibleIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [deletedContacts]);

  const emptyContactsMessage =
    contacts.length === 0
      ? 'Nenhum contato ainda.'
      : 'Nenhum contato encontrado para este filtro.';

  const reloadContacts = async () => {
    const data = await contactsRepo.list();
    setContacts(data);
  };

  const reloadDeletedContacts = async () => {
    const data = await contactsRepo.listDeleted();
    setDeletedContacts(data);
  };

  const reloadAllContacts = async () => {
    await Promise.all([reloadContacts(), reloadDeletedContacts()]);
  };

  const importFiles = async (files: File[]) => {
    const validFiles = files.filter(file => isSupportedContactFile(file.name));
    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo válido. Use CSV, VCF ou JSON.');
      return;
    }

    let importedTotal = 0;
    let insertedTotal = 0;
    let mergedTotal = 0;
    const errors: string[] = [];

    for (const file of validFiles) {
      try {
        const text = await file.text();
        const imported = importContactsFromFile(text, file.name);
        const result = await contactsRepo.importWithDedupe(imported);

        importedTotal += imported.length;
        insertedTotal += result.inserted;
        mergedTotal += result.merged;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'Erro inesperado.';
        errors.push(`${file.name}: ${reason}`);
      }
    }

    await reloadAllContacts();

    if (errors.length > 0 && importedTotal === 0) {
      toast.error(`Falha ao importar (${errors.length} arquivo(s)).`);
      return;
    }

    const base = `Importados: ${importedTotal}. Novos: ${insertedTotal}. Mesclados: ${mergedTotal}.`;
    if (errors.length > 0) {
      toast.warning(`${base} Falhas em ${errors.length} arquivo(s).`);
      return;
    }

    toast.success(base);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    await importFiles(files);
    event.target.value = '';
  };

  useEffect(() => {
    const onDragEnter = (event: globalThis.DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragCounterRef.current += 1;
      setDragOver(true);
    };

    const onDragOver = (event: globalThis.DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      setDragOver(true);
    };

    const onDragLeave = (event: globalThis.DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setDragOver(false);
      }
    };

    const onDrop = (event: globalThis.DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragCounterRef.current = 0;
      setDragOver(false);
      const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
      if (droppedFiles.length === 0) return;
      setPendingDroppedFiles(droppedFiles);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const openCreate = useCallback(() => {
    setEditingContact(undefined);
    setContactDialogOpen(true);
  }, []);

  const openEdit = useCallback((contact: Contact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  }, []);

  const handleSave = async (draft: ContactDraft) => {
    const normalized = normalizeContact(draft, editingContact?.id);
    const contactToSave: Contact = editingContact
      ? {
          ...normalized,
          createdAt: editingContact.createdAt,
          updatedAt: Date.now(),
        }
      : normalized;

    await contactsRepo.save(contactToSave);
    await reloadContacts();
    setContactDialogOpen(false);
    toast.success(editingContact ? 'Contato atualizado' : 'Contato criado');
  };

  const requestDelete = useCallback((contactId: string) => {
    setPendingDeleteIds([contactId]);
  }, []);

  const requestBulkDelete = () => {
    if (selectedContactIds.size === 0) return;
    setPendingDeleteIds([...selectedContactIds]);
  };

  const requestBulkMerge = () => {
    if (selectedContactIds.size < 2) return;
    setPendingMergeIds([...selectedContactIds]);
  };

  const handleDelete = async () => {
    if (pendingDeleteIds.length === 0) return;
    const deletedCount = pendingDeleteIds.length;
    await Promise.all(
      pendingDeleteIds.map(contactId => contactsRepo.delete(contactId)),
    );
    await reloadAllContacts();
    setSelectedContactIds(new Set());
    setPendingDeleteIds([]);
    toast.success(
      deletedCount > 1
        ? `${deletedCount} contatos excluídos`
        : 'Contato excluído',
    );
  };

  const confirmMergeContacts = async () => {
    if (pendingMergeIds.length < 2) return;
    const mergeCount = pendingMergeIds.length;
    const merged = await contactsRepo.mergeMany(pendingMergeIds);
    await reloadContacts();
    setPendingMergeIds([]);
    // In merge view we avoid leaking selection state into the contacts table route.
    if (view === 'contacts') {
      setSelectedContactIds(merged ? new Set([merged.id]) : new Set());
    } else {
      setSelectedContactIds(new Set());
    }
    toast.success(`${mergeCount} contatos mesclados em 1`);
  };

  const requestMergeAllGroups = () => {
    const batches = duplicateGroups
      .map(group => group.contacts.map(contact => contact.id))
      .filter(ids => ids.length > 1);

    if (batches.length === 0) {
      toast.info('Nenhum grupo disponível para mesclagem em lote.');
      return;
    }

    setPendingMergeGroupBatches(batches);
  };

  const confirmMergeAllGroups = async () => {
    if (pendingMergeGroupBatches.length === 0) return;

    const totalGroups = pendingMergeGroupBatches.length;

    for (const ids of pendingMergeGroupBatches) {
      await contactsRepo.mergeMany(ids);
    }

    await reloadContacts();
    setPendingMergeGroupBatches([]);
    setSelectedContactIds(new Set());
    toast.success(`${totalGroups} grupos mesclados.`);
  };

  const confirmRestoreDeleted = async () => {
    if (pendingRestoreDeletedIds.length === 0) return;
    const restoreCount = pendingRestoreDeletedIds.length;
    await Promise.all(
      pendingRestoreDeletedIds.map(contactId =>
        contactsRepo.restoreDeleted(contactId),
      ),
    );
    await reloadAllContacts();
    setSelectedDeletedContactIds(previous => {
      const next = new Set(previous);
      pendingRestoreDeletedIds.forEach(id => next.delete(id));
      return next;
    });
    setPendingRestoreDeletedIds([]);
    toast.success(
      restoreCount > 1
        ? `${restoreCount} contatos restaurados`
        : 'Contato restaurado',
    );
  };

  const requestRestoreDeleted = useCallback((contactId: string) => {
    setPendingRestoreDeletedIds([contactId]);
  }, []);

  const requestBulkRestoreDeleted = () => {
    if (selectedDeletedContactIds.size === 0) return;
    setPendingRestoreDeletedIds([...selectedDeletedContactIds]);
  };

  const requestPermanentDeleteDeleted = useCallback((contactId: string) => {
    setPendingPermanentDeleteIds([contactId]);
  }, []);

  const requestBulkPermanentDeleteDeleted = () => {
    if (selectedDeletedContactIds.size === 0) return;
    setPendingPermanentDeleteIds([...selectedDeletedContactIds]);
  };

  const confirmPermanentDeleteDeleted = async () => {
    if (pendingPermanentDeleteIds.length === 0) return;
    const deletedCount = pendingPermanentDeleteIds.length;
    await Promise.all(
      pendingPermanentDeleteIds.map(contactId =>
        contactsRepo.deleteDeletedPermanently(contactId),
      ),
    );
    await reloadDeletedContacts();
    setSelectedDeletedContactIds(previous => {
      const next = new Set(previous);
      pendingPermanentDeleteIds.forEach(id => next.delete(id));
      return next;
    });
    setPendingPermanentDeleteIds([]);
    toast.success(
      deletedCount > 1
        ? `${deletedCount} contatos removidos definitivamente`
        : 'Contato removido definitivamente',
    );
  };

  const clearDeleteFlow = () => {
    setPendingDeleteIds([]);
  };

  const clearDroppedFilesFlow = () => {
    setPendingDroppedFiles([]);
  };

  const confirmDroppedFilesImport = async () => {
    if (pendingDroppedFiles.length === 0) return;
    await importFiles(pendingDroppedFiles);
    clearDroppedFilesFlow();
  };

  const handleToggleSelectAll = useCallback(
    (checked: boolean, visibleContactIds: string[]) => {
      setSelectedContactIds(previous => {
        const next = new Set(previous);
        if (checked) {
          visibleContactIds.forEach(id => next.add(id));
        } else {
          visibleContactIds.forEach(id => next.delete(id));
        }
        return next;
      });
    },
    [],
  );

  const handleToggleSelect = useCallback(
    (contactId: string, checked: boolean) => {
      setSelectedContactIds(previous => {
        const next = new Set(previous);
        if (checked) {
          next.add(contactId);
        } else {
          next.delete(contactId);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleSelectAllDeleted = useCallback(
    (checked: boolean, visibleContactIds: string[]) => {
      setSelectedDeletedContactIds(previous => {
        const next = new Set(previous);
        if (checked) {
          visibleContactIds.forEach(id => next.add(id));
        } else {
          visibleContactIds.forEach(id => next.delete(id));
        }
        return next;
      });
    },
    [],
  );

  const handleToggleSelectDeleted = useCallback(
    (contactId: string, checked: boolean) => {
      setSelectedDeletedContactIds(previous => {
        const next = new Set(previous);
        if (checked) {
          next.add(contactId);
        } else {
          next.delete(contactId);
        }
        return next;
      });
    },
    [],
  );

  const handleExportCsv = (targetContacts: Contact[], scopeLabel: string) => {
    if (targetContacts.length === 0) {
      toast.info('Nenhum contato selecionado para exportar.');
      return;
    }
    downloadTextFile(
      exportContactsToCsv(targetContacts),
      'contacts-export.csv',
      'text/csv;charset=utf-8',
    );
    toast.success(`Exportação CSV gerada (${scopeLabel}).`);
  };

  const handleExportVcf = (targetContacts: Contact[], scopeLabel: string) => {
    if (targetContacts.length === 0) {
      toast.info('Nenhum contato selecionado para exportar.');
      return;
    }
    downloadTextFile(
      exportContactsToVcard(targetContacts),
      'contacts-export.vcf',
      'text/vcard;charset=utf-8',
    );
    toast.success(`Exportação VCF gerada (${scopeLabel}).`);
  };

  const handleExportJson = (targetContacts: Contact[], scopeLabel: string) => {
    if (targetContacts.length === 0) {
      toast.info('Nenhum contato selecionado para exportar.');
      return;
    }
    downloadTextFile(
      exportContactsToJson(targetContacts),
      'contacts-export.json',
      'application/json;charset=utf-8',
    );
    toast.success(`Exportação JSON gerada (${scopeLabel}).`);
  };

  const openExportDialog = () => {
    if (contacts.length === 0) {
      toast.info('Nenhum contato para exportar.');
      return;
    }
    setExportDialogOpen(true);
  };

  const toggleColumn = (column: ContactColumnKey) => {
    setVisibleColumns(previous => ({
      ...previous,
      [column]: !previous[column],
    }));
  };

  const clearQuery = () => {
    setQuery('');
  };

  const handleQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clearQuery();
    }
  };

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
      return;
    }

    if (key === 'import') {
      handleUploadClick();
      return;
    }

    if (key === 'export') {
      openExportDialog();
    }
  };

  return (
    <AppLayout
      activeKey={view}
      onSelect={handleSidebarSelect}
    >
      {isDragOver ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-6 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-dashed border-primary bg-card p-8 text-center shadow-lg">
            <p className="text-lg font-semibold">
              Solte os arquivos para importar
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Formatos suportados: CSV, VCF e JSON.
            </p>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:px-8 md:py-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.vcf,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {view === 'merge' ? (
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="gap-3">
              <CardTitle>Mesclar contatos</CardTitle>
              <CardDescription>
                Grupos com possíveis duplicidades detectados por telefone, email
                e nome similar.
              </CardDescription>
              <div>
                <Badge variant="secondary">
                  {duplicateGroups.length} grupos encontrados
                </Badge>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={duplicateGroups.length === 0}
                  onClick={requestMergeAllGroups}
                >
                  <Merge />
                  Mesclar todos os grupos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 overflow-hidden">
              <MergeCandidatesList
                groups={duplicateGroups}
                onMergeGroup={setPendingMergeIds}
              />
            </CardContent>
          </Card>
        ) : view === 'deleted' ? (
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="gap-3">
              <CardTitle>Contatos excluídos</CardTitle>
              <CardDescription>
                Registro de contatos removidos e data/hora da exclusão.
              </CardDescription>
              <div>
                <Badge variant="secondary">
                  {deletedQuery.trim()
                    ? `${filteredDeletedContacts.length} de ${deletedContacts.length} excluídos`
                    : `${deletedContacts.length} excluídos`}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                <Input
                  placeholder="Filtrar excluídos por nome, email, telefone..."
                  value={deletedQuery}
                  onChange={event => setDeletedQuery(event.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  {selectedDeletedContactIds.size > 0 ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={requestBulkRestoreDeleted}
                          >
                            <RotateCcw />
                            <span className="sr-only">
                              Restaurar selecionados
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Restaurar selecionados (
                          {selectedDeletedContactIds.size})
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={requestBulkPermanentDeleteDeleted}
                          >
                            <Trash2 />
                            <span className="sr-only">
                              Excluir definitivamente selecionados
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Excluir definitivamente (
                          {selectedDeletedContactIds.size})
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 overflow-hidden">
              <DeletedContactList
                contacts={filteredDeletedContacts}
                selectedIds={selectedDeletedContactIds}
                onToggleSelectAll={handleToggleSelectAllDeleted}
                onToggleSelect={handleToggleSelectDeleted}
                onRestore={requestRestoreDeleted}
                onDeletePermanently={requestPermanentDeleteDeleted}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="gap-3">
              <CardTitle>Offline Contacts Manager</CardTitle>
              <CardDescription>
                Importe de Google/Outlook/VCF, normalize no modelo interno e
                mantenha tudo local no IndexedDB.
              </CardDescription>
              <div>
                <Badge variant="secondary">
                  {query.trim()
                    ? `${filteredContacts.length} de ${contacts.length} contatos`
                    : `${contacts.length} contatos`}
                </Badge>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_auto]">
                  <div className="relative col-span-2 md:col-span-1">
                    <Input
                      placeholder="Buscar por nome, email, telefone..."
                      className="pr-9"
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      onKeyDown={handleQueryKeyDown}
                    />
                    {query ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                        onClick={clearQuery}
                      >
                        <X />
                        <span className="sr-only">Limpar filtro</span>
                      </Button>
                    ) : null}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                    {selectedContactIds.size > 0 ? (
                      <>
                        {selectedContactIds.size > 1 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-10 justify-center gap-2 md:size-9 md:h-9 md:px-0"
                                onClick={requestBulkMerge}
                              >
                                <Merge />
                                <span className="md:sr-only">
                                  Mesclar selecionados
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Mesclar selecionados ({selectedContactIds.size})
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-10 justify-center gap-2 md:size-9 md:h-9 md:px-0"
                              onClick={requestBulkDelete}
                            >
                              <Trash2 />
                              <span className="md:sr-only">
                                Excluir selecionados
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Excluir selecionados ({selectedContactIds.size})
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-10 justify-center gap-2 md:size-9 md:h-9 md:px-0"
                              onClick={() => setColumnsDialogOpen(true)}
                            >
                              <Columns3 />
                              <span className="md:sr-only">Colunas</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Escolher colunas da tabela
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-10 justify-center gap-2 md:size-9 md:h-9 md:px-0"
                              onClick={openCreate}
                            >
                              <Plus />
                              <span className="md:sr-only">Novo</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Criar contato manualmente
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 overflow-hidden">
              <div className="min-h-0 w-full flex-1">
                <ContactList
                  contacts={filteredContacts}
                  visibleColumns={visibleColumns}
                  columnOrder={columnOrder}
                  selectedIds={selectedContactIds}
                  emptyMessage={emptyContactsMessage}
                  onToggleSelectAll={handleToggleSelectAll}
                  onToggleSelect={handleToggleSelect}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={isColumnsDialogOpen}
          onOpenChange={setColumnsDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Colunas da tabela</DialogTitle>
              <DialogDescription className="sr-only">
                Selecione quais colunas devem aparecer na tabela de contatos.
              </DialogDescription>
            </DialogHeader>
            <Reorder.Group
              axis="y"
              values={columnOrder}
              onReorder={nextOrder =>
                setColumnOrder(nextOrder as ContactColumnKey[])
              }
              className="flex flex-col gap-3"
            >
              {columnOrder.map(key => (
                <Reorder.Item
                  key={key}
                  value={key}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                  }}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <GripVertical className="cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <Checkbox
                    id={`column-${key}`}
                    checked={visibleColumns[key]}
                    onCheckedChange={checked => {
                      const nextChecked = checked === true;
                      if (nextChecked !== visibleColumns[key]) {
                        toggleColumn(key);
                      }
                    }}
                  />
                  <Label
                    htmlFor={`column-${key}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {CONTACT_COLUMN_LABELS[key]}
                  </Label>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isExportDialogOpen}
          onOpenChange={setExportDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escolha o formato de exportação</DialogTitle>
              <DialogDescription className="sr-only">
                Escolha o formato do arquivo para exportar os contatos
                armazenados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Todos os contatos
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleExportCsv(contacts, 'todos');
                      setExportDialogOpen(false);
                    }}
                  >
                    <FileSpreadsheet />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleExportVcf(contacts, 'todos');
                      setExportDialogOpen(false);
                    }}
                  >
                    <IdCard />
                    VCF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleExportJson(contacts, 'todos');
                      setExportDialogOpen(false);
                    }}
                  >
                    <FileJson />
                    JSON
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Somente selecionados ({selectedContacts.length})
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    disabled={selectedContacts.length === 0}
                    onClick={() => {
                      handleExportCsv(selectedContacts, 'selecionados');
                      setExportDialogOpen(false);
                    }}
                  >
                    <FileSpreadsheet />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    disabled={selectedContacts.length === 0}
                    onClick={() => {
                      handleExportVcf(selectedContacts, 'selecionados');
                      setExportDialogOpen(false);
                    }}
                  >
                    <IdCard />
                    VCF
                  </Button>
                  <Button
                    variant="outline"
                    disabled={selectedContacts.length === 0}
                    onClick={() => {
                      handleExportJson(selectedContacts, 'selecionados');
                      setExportDialogOpen(false);
                    }}
                  >
                    <FileJson />
                    JSON
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={pendingDroppedFiles.length > 0}
          onOpenChange={open => {
            if (!open) clearDroppedFilesFlow();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <FileSpreadsheet />
                Confirmar importação
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deseja importar {pendingDroppedFiles.length}{' '}
                {pendingDroppedFiles.length > 1 ? 'arquivos' : 'arquivo'}{' '}
                arrastados para a tela?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={clearDroppedFilesFlow}>
                <span className="inline-flex items-center gap-2">
                  <X />
                  Cancelar
                </span>
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void confirmDroppedFilesImport()}
              >
                <span className="inline-flex items-center gap-2">
                  <FileSpreadsheet />
                  Importar arquivos
                </span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={pendingDeleteIds.length > 0}
          onOpenChange={open => {
            if (!open) clearDeleteFlow();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert />
                Confirmar exclusão
              </DialogTitle>
              <DialogDescription>
                O contato será movido para excluídos e poderá ser restaurado
                depois. Deseja excluir{' '}
                {pendingDeleteIds.length > 1
                  ? `${pendingDeleteIds.length} contatos`
                  : 'este contato'}
                ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={clearDeleteFlow}
              >
                <span className="inline-flex items-center gap-2">
                  <X />
                  Cancelar
                </span>
              </Button>
              <Button onClick={() => void handleDelete()}>
                <span className="inline-flex items-center gap-2">
                  <Trash2 />
                  Excluir definitivamente
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={pendingMergeIds.length > 1}
          onOpenChange={open => {
            if (!open) setPendingMergeIds([]);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Merge />
                Confirmar mesclagem
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deseja mesclar {pendingMergeIds.length} contatos selecionados em
                um único contato?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingMergeIds([])}>
                <span className="inline-flex items-center gap-2">
                  <X />
                  Cancelar
                </span>
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmMergeContacts()}>
                <span className="inline-flex items-center gap-2">
                  <Merge />
                  Mesclar contatos
                </span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={pendingMergeGroupBatches.length > 0}
          onOpenChange={open => {
            if (!open) setPendingMergeGroupBatches([]);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Merge />
                Confirmar mesclagem em lote
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deseja mesclar {pendingMergeGroupBatches.length} grupos de
                duplicados? Cada grupo será mesclado separadamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setPendingMergeGroupBatches([])}
              >
                <span className="inline-flex items-center gap-2">
                  <X />
                  Cancelar
                </span>
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmMergeAllGroups()}>
                <span className="inline-flex items-center gap-2">
                  <Merge />
                  Mesclar grupos
                </span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={pendingRestoreDeletedIds.length > 0}
          onOpenChange={open => {
            if (!open) setPendingRestoreDeletedIds([]);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RotateCcw />
                Confirmar restauração
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingRestoreDeletedIds.length > 1
                  ? `Deseja restaurar ${pendingRestoreDeletedIds.length} contatos para a lista principal?`
                  : 'Deseja restaurar este contato para a lista principal?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setPendingRestoreDeletedIds([])}
              >
                <span className="inline-flex items-center gap-2">
                  <X />
                  Cancelar
                </span>
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmRestoreDeleted()}>
                <span className="inline-flex items-center gap-2">
                  <RotateCcw />
                  Restaurar
                </span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={pendingPermanentDeleteIds.length > 0}
          onOpenChange={open => {
            if (!open) setPendingPermanentDeleteIds([]);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 />
                Excluir definitivamente
              </DialogTitle>
              <DialogDescription>
                {pendingPermanentDeleteIds.length > 1
                  ? `${pendingPermanentDeleteIds.length} contatos serão removidos de forma permanente da lista de excluídos. Deseja continuar?`
                  : 'Este contato será removido de forma permanente da lista de excluídos. Deseja continuar?'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingPermanentDeleteIds([])}
              >
                <span className="inline-flex items-center gap-2">
                  <X />
                  Cancelar
                </span>
              </Button>
              <Button onClick={() => void confirmPermanentDeleteDeleted()}>
                <span className="inline-flex items-center gap-2">
                  <Trash2 />
                  Excluir definitivamente
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isContactDialogOpen}
          onOpenChange={setContactDialogOpen}
        >
          <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Editar contato' : 'Criar contato'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Formulário para {editingContact ? 'editar' : 'criar'} um
                contato.
              </DialogDescription>
            </DialogHeader>
            <ContactForm
              initialContact={editingContact}
              onSubmit={handleSave}
              onCancel={() => setContactDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
