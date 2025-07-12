
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LayoutDashboard, ReceiptText, Shapes, Shield, Building2, Settings, ChevronsUpDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/provider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { 
    label: 'Admin', 
    icon: Shield,
    subItems: [
        { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
        { href: '/admin/settings', label: 'Settings', icon: Settings }
    ]
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenants, selectedTenantId, setSelectedTenantId, loadingTenants } = useApp();
  const [openAdmin, setOpenAdmin] = useState(pathname.startsWith('/admin'));
  const [tenantPopoverOpen, setTenantPopoverOpen] = useState(false);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const isDashboard = item.label === 'Dashboard';
              const label = isDashboard && selectedTenant ? `Dashboard - ${selectedTenant.name}` : item.label;

              return item.subItems ? (
                <Collapsible key={item.label} open={openAdmin} onOpenChange={setOpenAdmin}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="w-full justify-start"
                            variant={pathname.startsWith('/admin') ? 'default' : 'ghost'}
                        >
                          <>
                            <item.icon />
                            <span>{item.label}</span>
                          </>
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent>
                    <div className="flex flex-col gap-1 ml-7 pl-3 border-l">
                        {item.subItems.map(subItem => (
                             <SidebarMenuItem key={subItem.href}>
                                <Link href={subItem.href} legacyBehavior={false}>
                                    <SidebarMenuButton
                                        isActive={pathname === subItem.href}
                                        className="h-8"
                                        tooltip={subItem.label}
                                    >
                                        <subItem.icon />
                                        <span>{subItem.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                             </SidebarMenuItem>
                        ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.href}>
                   <Link href={item.href}>
                        <SidebarMenuButton
                            isActive={pathname === item.href}
                            tooltip={label}
                        >
                            <item.icon />
                            <span>{label}</span>
                        </SidebarMenuButton>
                   </Link>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1" />
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
                        value={tenant.name}
                        onSelect={() => {
                          setSelectedTenantId(tenant.id);
                          setTenantPopoverOpen(false);
                        }}
                      >
                        {tenant.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
