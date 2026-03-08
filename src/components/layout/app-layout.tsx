import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

type NavKey = 'contacts' | 'merge' | 'deleted' | 'import' | 'export';

type AppLayoutProps = {
  children: ReactNode;
  activeKey: NavKey;
  onSelect: (key: NavKey) => void;
};

function HeaderBar() {
  const { state, toggleSidebar, isMobile } = useSidebar();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {state === 'expanded' || isMobile ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          {state === 'expanded' ? <PanelLeftClose /> : <PanelLeftOpen />}
          <span className="sr-only">Alternar menu lateral</span>
        </Button>
      ) : null}
      <span className="text-sm text-muted-foreground">
        Offline Contacts Manager
      </span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

export function AppLayout({ children, activeKey, onSelect }: AppLayoutProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar
          activeKey={activeKey}
          onSelect={onSelect}
        />
        <SidebarInset>
          <HeaderBar />
          <main className="flex min-h-0 flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
