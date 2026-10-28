'use client';

import { useState } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  en: string;
  kn: string;
}

interface Props {
  id: string;
  value?: string;
  options: SelectOption[];
  onChange(value: string): void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
}

/** Searchable combobox. Every option reads "English / ಕನ್ನಡ"; typing in either script filters. */
export function SearchableSelect({ id, value, options, onChange, placeholder, searchPlaceholder, emptyText, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          !chosen && 'text-muted-foreground',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {chosen ? (
            <>
              {chosen.en} / <span lang="kn">{chosen.kn}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-60 p-1">
        <Command>
          <div className="flex items-center gap-2 border-b px-2">
            <SearchIcon aria-hidden className="size-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              autoFocus
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-11 w-full bg-transparent text-base outline-hidden placeholder:text-muted-foreground md:text-sm"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={`${o.en} ${o.kn} ${o.value}`}
                data-checked={o.value === value}
                className="min-h-11"
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="flex-1">
                  {o.en} / <span lang="kn">{o.kn}</span>
                </span>
                {o.value === value && <CheckIcon aria-hidden className="size-4" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
