import { Moon, Sun } from 'lucide-react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <SwitchPrimitive.Root
      checked={isDark}
      onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-300',
        'data-checked:bg-primary data-unchecked:bg-input',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none flex size-5.5 items-center justify-center rounded-full bg-background shadow-md',
          'data-checked:translate-x-5.5 data-unchecked:translate-x-0.5',
        )}
      >
        <Sun
          className={cn(
            'absolute size-3.5 transition-all duration-300',
            isDark
              ? 'scale-0 rotate-90 opacity-0'
              : 'scale-100 rotate-0 opacity-100',
          )}
        />
        <Moon
          className={cn(
            'absolute size-3.5 transition-all duration-300',
            isDark
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 -rotate-90 opacity-0',
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
