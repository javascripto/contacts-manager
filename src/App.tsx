import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { BirthdaysPage } from '@/features/contacts/birthdays.page';
import { ContactsPage } from '@/features/contacts/contacts.page';

export default function App() {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="vite-ui-theme"
    >
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to="/contacts"
                replace
              />
            }
          />
          <Route
            path="/contacts"
            element={<ContactsPage view="contacts" />}
          />
          <Route
            path="/contacts/birthdays"
            element={<BirthdaysPage />}
          />
          <Route
            path="/contacts/merge"
            element={<ContactsPage view="merge" />}
          />
          <Route
            path="/contacts/deleted"
            element={<ContactsPage view="deleted" />}
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/contacts"
                replace
              />
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  );
}
