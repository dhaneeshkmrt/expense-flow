
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
import { LayoutDashboard, ReceiptText, Shapes, Shield, Building2, Settings, ChevronsUpDown, Check, Landmark, LogOut } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/provider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const baseNavItemsTemplate = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/accounts', label: 'Accounts', icon: Landmark },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
  { 
    label: 'Admin', 
    icon: Shield,
    subItems: [
        { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
    ]
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenants, selectedTenantId, setSelectedTenantId, loadingTenants, user, signOut, userTenant, isRootUser, isMainTenantUser } = useApp();
  const [openSections, setOpenSections] = useState({
      admin: false,
      test: false,
  });
  const [tenantPopoverOpen, setTenantPopoverOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setOpenSections({
        admin: pathname.startsWith('/admin'),
        test: pathname.startsWith('/test'),
    });
  }, [pathname]);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  const navItems = useMemo(() => {
    let currentNavItems = [...baseNavItemsTemplate];

    if (!isMainTenantUser) {
        currentNavItems = currentNavItems.filter(item => item.href !== '/categories' && item.href !== '/admin/settings');
    }
    
    if (isRootUser) {
        return [...currentNavItems, ...adminNavItems];
    }
    return currentNavItems;
  }, [isRootUser, isMainTenantUser]);
  
  const toggleSection = (section: 'admin' | 'test') => {
      setOpenSections(prev => ({ ...prev, [section]: !prev[section]}));
  }
  
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
    router.push('/login');
  };
  
  if (!isMounted) {
      return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const sectionKey = item.label.toLowerCase() as 'admin' | 'test';

              return item.subItems ? (
                <Collapsible key={item.label} open={openSections[sectionKey]} onOpenChange={() => toggleSection(sectionKey)}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="w-full justify-start"
                            variant={pathname.startsWith(`/${sectionKey}`) ? 'default' : 'ghost'}
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
                            tooltip={item.label}
                        >
                            <item.icon />
                             <span>{item.href === '/dashboard' && selectedTenant ? `Dashboard (${selectedTenant.name})` : item.label}</span>
                        </SidebarMenuButton>
                   </Link>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2">
              <div className='flex-grow'>
                <p className='font-semibold'>{user?.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                <LogOut />
              </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
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
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
