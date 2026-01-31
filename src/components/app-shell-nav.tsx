
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, ReceiptText, Shapes, Shield, Building2, Settings, Landmark, Loader2, DatabaseBackup, Database, Wallet, Wand2, Calculator, BellReminder } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/provider';

type NavItemWithHref = {
  href: string;
  label: string;
  icon: React.ComponentType;
  featureFlag?: 'balanceSheet' | 'virtualAccounts' | 'yearlyReport' | 'aiImageStudio' | 'calculators' | 'admin' | 'reminders'
};

type NavItemWithSubItems = {
  label: string;
  icon: React.ComponentType;
  subItems: NavItemWithHref[];
  featureFlag?: 'calculators' | 'admin';
};

type NavItem = NavItemWithHref | NavItemWithSubItems;

function hasHref(item: NavItem): item is NavItemWithHref {
  return 'href' in item;
}

function hasSubItems(item: NavItem): item is NavItemWithSubItems {
  return 'subItems' in item;
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/reminders', label: 'Reminders', icon: BellReminder, featureFlag: 'reminders' },
  { href: '/accounts', label: 'Balance Sheet', icon: Landmark, featureFlag: 'balanceSheet' },
  { href: '/virtual-accounts', label: 'Virtual Accounts', icon: Wallet, featureFlag: 'virtualAccounts' },
  { href: '/yearly-report', label: 'Yearly Report', icon: Database, featureFlag: 'yearlyReport' },
  { href: '/ai-image-studio', label: 'AI Image Studio', icon: Wand2, featureFlag: 'aiImageStudio' },
  {
      label: 'Calculators',
      icon: Calculator,
      featureFlag: 'calculators',
      subItems: [
          { href: '/calculators/investment', label: 'Investment', icon: Building2 },
          { href: '/calculators/loan', label: 'Loan EMI', icon: DatabaseBackup },
          { href: '/calculators/returns', label: 'Returns', icon: DatabaseBackup },
      ]
  },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { 
    label: 'Admin', 
    icon: Shield,
    featureFlag: 'admin',
    subItems: [
        { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
        { href: '/admin/default-categories', label: 'Default Categories', icon: Shapes },
        { href: '/admin/backup', label: 'Backup / Restore', icon: DatabaseBackup },
    ]
  },
];


export function AppShellNav() {
  const pathname = usePathname();
  const { userTenant, isAdminUser } = useApp();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      admin: false,
      calculators: false,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setOpenSections({
        admin: pathname.startsWith('/admin'),
        calculators: pathname.startsWith('/calculators'),
    });
    setNavigatingTo(null);
  }, [pathname]);


  const navItems = useMemo(() => {
    if (!userTenant) return [];
    
    return allNavItems.filter(item => {
      // Default items are always shown
      if (!item.featureFlag) return true;
      
      // Use the isAdminUser flag (which checks both new and old properties) for the admin menu
      if (item.featureFlag === 'admin') {
        return isAdminUser;
      }
      
      // Items for main tenant user (Settings)
      if (item.href === '/admin/settings') {
        return true;
      }
      
      // Check feature flags for other items
      return userTenant.featureAccess?.[item.featureFlag] ?? false;
    });

  }, [userTenant, isAdminUser]);
  
  const toggleSection = (section: keyof typeof openSections) => {
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
        const sectionKey = item.label.toLowerCase() as keyof typeof openSections;
        const isNavigating = navigatingTo === (hasHref(item) ? item.href : undefined);

        return hasSubItems(item) ? (
          <Collapsible key={item.label} open={openSections[sectionKey]} onOpenChange={() => toggleSection(sectionKey)}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                      className="w-full justify-start"
                      variant={pathname.startsWith(`/${sectionKey}`) ? 'default' : 'outline'}
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
                  {item.subItems.map((subItem: NavItemWithHref) => {
                      const isSubItemNavigating = navigatingTo === subItem.href;
                      return (
                       <SidebarMenuItem key={subItem.href}>
                          <Link href={subItem.href} onClick={() => handleNavClick(subItem.href)}>
                              <SidebarMenuButton
                                  isActive={pathname === subItem.href}
                                  className="h-8"
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
             <Link href={hasHref(item) ? item.href : '#'} onClick={() => hasHref(item) && handleNavClick(item.href)}>
                  <SidebarMenuButton
                      isActive={hasHref(item) && pathname === item.href}
                      disabled={isNavigating}
                  >
                      {isNavigating ? <Loader2 className="animate-spin" /> : <item.icon />}
                       <span>{hasHref(item) && item.href === '/dashboard' && userTenant ? `Dashboard (${userTenant.name})` : item.label}</span>
                  </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  );
}
