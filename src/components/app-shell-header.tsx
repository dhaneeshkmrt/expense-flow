
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChevronsUpDown, Check } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/lib/provider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';

export function AppShellHeader() {
  const { tenants, selectedTenantId, setSelectedTenantId, loadingTenants, isRootUser } = useApp();
  const [tenantPopoverOpen, setTenantPopoverOpen] = useState(false);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        {isRootUser && (
          <Popover open={tenantPopoverOpen} onOpenChange={setTenantPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tenantPopoverOpen}
                className="w-[200px] justify-between"
                disabled={loadingTenants}
              >
                {selectedTenant ? selectedTenant.name : "Select tenant..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search tenant..." />
                <CommandList>
                  <CommandEmpty>No tenant found.</CommandEmpty>
                  <CommandGroup>
                    {tenants.map((tenant) => (
                      <CommandItem
                        key={tenant.id}
                        value={tenant.id}
                        onSelect={(currentValue) => {
                          setSelectedTenantId(currentValue);
                          setTenantPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTenantId === tenant.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tenant.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
