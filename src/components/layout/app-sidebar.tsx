import {
  Download,
  FileUser,
  type LucideIcon,
  Merge,
  PanelLeftOpen,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

type NavKey = 'contacts' | 'merge' | 'deleted' | 'import' | 'export';

type AppSidebarProps = {
  activeKey: NavKey;
  onSelect: (key: NavKey) => void;
};

const navigation: Array<{
  label: string;
  items: Array<{ key: NavKey; title: string; icon: LucideIcon }>;
}> = [
  {
    label: 'Geral',
    items: [
      { key: 'contacts', title: 'Contatos', icon: FileUser },
      { key: 'merge', title: 'Mesclar contatos', icon: Merge },
      { key: 'deleted', title: 'Contatos excluídos', icon: Trash2 },
    ],
  },
  {
    label: 'Ações',
    items: [
      { key: 'import', title: 'Importar arquivos', icon: Upload },
      { key: 'export', title: 'Exportar contatos', icon: Download },
    ],
  },
];

export function AppSidebar({ activeKey, onSelect }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b px-4 py-3 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-1">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <span className="truncate text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Contacts
          </span>
          {state === 'collapsed' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
            >
              <PanelLeftOpen />
              <span className="sr-only">Expandir menu lateral</span>
            </Button>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={activeKey === item.key}
                      tooltip={item.title}
                      onClick={() => onSelect(item.key)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
