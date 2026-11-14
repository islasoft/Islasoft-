import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  Users, FolderKanban, Clock, FileText, MessageSquare, CheckSquare,
  FileBarChart, Settings, Building2, Key, Shield, Bell, ChevronDown,
  ChevronRight, DollarSign, Mail, UserCheck, Package, Ticket,
  CreditCard, LayoutDashboard, BookOpen, Workflow, Menu, X,
  ReceiptText, UserCircle2, Gift, CalendarDays, GitBranch, BookMarked
} from 'lucide-react';
import FloatingAssistant from '@/components/help/FloatingAssistant';
import UserMenu from '@/components/auth/UserMenu';
import GlobalTimerWidget from '@/components/time/GlobalTimerWidget';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    ]
  },
  {
    label: 'CLIENTS & ENGAGEMENTS',
    items: [
      { name: 'Entity Clients', icon: Building2, page: 'Clients' },
      { name: 'Individuals', icon: UserCheck, page: 'IndividualClients' },
    ]
  },
  {
    label: "PROJECT'S LIFE",
    items: [
      { name: 'Projects', icon: FolderKanban, page: 'Projects' },
      { name: 'Tasks', icon: CheckSquare, page: 'Tasks' },
      { name: 'Time Entries', icon: Clock, page: 'TimeTracking' },
      { name: 'Invoices', icon: FileText, page: 'Invoices' },
    ]
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { name: 'Communications', icon: MessageSquare, page: 'Communications' },
      { name: 'Drive Portal', icon: BookOpen, page: 'ClientDrivePortal' },
      { name: 'Referral Program', icon: Gift, page: 'ReferralProgram' },
    ]
  },
  {
    label: 'TEAM',
    items: [
      { name: 'Tax Relationship Map', icon: GitBranch, page: 'TaxRelationshipMap' },
      { name: 'Team Members', icon: Users, page: 'Team' },
      { name: 'Deadlines', icon: CalendarDays, page: 'DeadlinesDashboard' },
      { name: 'Reports', icon: FileBarChart, page: 'Reports' },
      { name: 'Password Vault', icon: Key, page: 'PasswordVault' },
      { name: 'Audit Log', icon: Shield, page: 'AuditDashboard' },
      { name: 'Letter Templates', icon: BookOpen, page: 'EngagementLetterTemplates' },
      { name: 'App Guide', icon: BookMarked, page: 'AppDocumentation' },
    ]
  },
  {
    label: 'SETTINGS',
    items: [
      { name: 'Settings', icon: Settings, page: 'Settings' },
    ]
  },
];

function SidebarNav({ currentPageName, currentUser }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState({ SAAS: true });

  const isActive = (page) => {
    if (page === 'Dashboard') return location.pathname === '/' || location.pathname === '/Dashboard';
    return location.pathname === `/${page}` || currentPageName === page;
  };
  const canSeeFinanceAndSettings = currentUser?.role === 'admin' || currentUser?.team_category === 'senior_staff';
  const RESTRICTED_LABELS = ['FINANCE', 'SETTINGS'];

  const visibleGroups = canSeeFinanceAndSettings
    ? NAV_GROUPS
    : NAV_GROUPS.filter(g => !RESTRICTED_LABELS.includes(g.label));

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3">
      {visibleGroups.map((group) => {
        const isCollapsed = group.collapsible && collapsed[group.label];
        return (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => group.collapsible && setCollapsed(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
              className={`w-full flex items-center justify-between px-2 mt-4 mb-1 ${group.collapsible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
              <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                {group.label}
              </span>
              {group.collapsible && (
                isCollapsed
                  ? <ChevronRight className="w-3 h-3 text-slate-500" />
                  : <ChevronDown className="w-3 h-3 text-slate-500" />
              )}
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={item.page === 'Dashboard' ? '/' : createPageUrl(item.page)}
                      className={`nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        active
                          ? 'nav-item-active'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function TopLoadingBar() {
  const [visible, setVisible] = useState(true);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Animate from 0 → 80% quickly, then jump to 100% and fade out
    const t1 = setTimeout(() => setWidth(80), 50);
    const t2 = setTimeout(() => setWidth(100), 600);
    const t3 = setTimeout(() => setVisible(false), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
      <div
        className="h-full bg-sky-500 transition-all ease-out"
        style={{ width: `${width}%`, transitionDuration: width === 80 ? '500ms' : '250ms' }}
      />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated && !isLoadingAuth,
  });

  // Boot-time guard: redirect to registration if no tenant_id
  useEffect(() => {
    if (!loadingUser && currentUser && !currentUser.tenant_id) {
      window.location.href = '/Registration';
    }
  }, [currentUser, loadingUser]);

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1E293B' }}>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
          <ReceiptText className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-tight">IslaSoft</h1>
          <p className="text-slate-400 text-[10px] leading-tight">Practice Manager</p>
        </div>
      </div>

      {/* Nav */}
      <SidebarNav currentPageName={currentPageName} currentUser={currentUser} />

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-slate-700">
        <UserMenu user={currentUser} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-inter">
      <TopLoadingBar />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 shadow-lg" style={{ backgroundColor: '#1E293B' }}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative flex flex-col w-60 shadow-xl" style={{ backgroundColor: '#1E293B' }}>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{currentPageName || 'Dashboard'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GlobalTimerWidget />
            <button className="relative text-slate-500 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Floating AI Assistant */}
      <FloatingAssistant />
    </div>
  );
}