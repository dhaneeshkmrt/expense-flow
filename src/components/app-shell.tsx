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
import { LayoutDashboard, ReceiptText, Shapes, Shield, Building2, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import Link from 'next/link';

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
  const [openAdmin, setOpenAdmin] = useState(pathname.startsWith('/admin'));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              item.subItems ? (
                <Collapsible key={item.label} open={openAdmin} onOpenChange={setOpenAdmin}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            className="w-full justify-start"
                            variant={pathname.startsWith('/admin') ? 'default' : 'ghost'}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent>
                    <div className="flex flex-col gap-1 ml-7 pl-3 border-l">
                        {item.subItems.map(subItem => (
                             <SidebarMenuItem key={subItem.href}>
                                <Link href={subItem.href}>
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
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                   </Link>
                </SidebarMenuItem>
              )
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b md:justify-end">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
