
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, ReceiptText, Shapes, Shield, Building2, Settings, Landmark, Loader2, DatabaseBackup } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/provider';

const baseNavItemsTemplate = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/accounts', label: 'Accounts', icon: Landmark },
];

const settingsNavItem = { href: '/admin/settings', label: 'Settings', icon: Settings };

const adminNavItems = [
  { 
    label: 'Admin', 
    icon: Shield,
    subItems: [
        { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
        { href: '/admin/backup', label: 'Backup / Restore', icon: DatabaseBackup },
    ]
  },
];

export function AppShellNav() {
  const pathname = usePathname();
  const { isRootUser, isMainTenantUser, selectedTenantId, tenants } = useApp();
  const [openSections, setOpenSections] = useState({
      admin: false,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setOpenSections({
        admin: pathname.startsWith('/admin'),
    });
    // Reset navigation state when path changes
    setNavigatingTo(null);
  }, [pathname]);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  const navItems = useMemo(() => {
    let currentNavItems = [...baseNavItemsTemplate];
    
    if (isMainTenantUser) {
        currentNavItems.push(settingsNavItem);
    }
    
    if (isRootUser) {
        return [...currentNavItems, ...adminNavItems];
    }
    
    return currentNavItems;
  }, [isRootUser, isMainTenantUser]);
  
  const toggleSection = (section: 'admin') => {
      setOpenSections(prev => ({ ...prev, [section]: !prev[section]}));
  }
  
  if (!isMounted) {
      return null;
  }

  const handleNavClick = (href: string) => {
      if (pathname !== href) {
        setNavigatingTo(href);
      }
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const sectionKey = item.label.toLowerCase() as 'admin';
        const isNavigating = navigatingTo === item.href;

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
                  {item.subItems.map(subItem => {
                      const isSubItemNavigating = navigatingTo === subItem.href;
                      return (
                       <SidebarMenuItem key={subItem.href}>
                          <Link href={subItem.href} onClick={() => handleNavClick(subItem.href)}>
                              <SidebarMenuButton
                                  as="span"
                                  isActive={pathname === subItem.href}
                                  className="h-8"
                                  tooltip={subItem.label}
                                  disabled={isSubItemNavigating}
                              >
                                  {isSubItemNavigating ? <Loader2 className="animate-spin" /> : <subItem.icon />}
                                  <span>{subItem.label}</span>
                              </SidebarMenuButton>
                          </Link>
                       </SidebarMenuItem>
                      )
                  })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.href}>
             <Link href={item.href} onClick={() => handleNavClick(item.href)}>
                  <SidebarMenuButton
                      as="span"
                      isActive={pathname === item.href}
                      tooltip={item.label}
                      disabled={isNavigating}
                  >
                      {isNavigating ? <Loader2 className="animate-spin" /> : <item.icon />}
                       <span>{item.href === '/dashboard' && selectedTenant ? `Dashboard (${selectedTenant.name})` : item.label}</span>
                  </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  );
}
