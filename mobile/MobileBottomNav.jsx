import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { LayoutDashboard, FolderKanban, Building2, DollarSign, Menu } from 'lucide-react';

// Tab root paths — used to decide which tab "owns" a given route
const TAB_ROOTS = {
  Dashboard: ['/', '/Dashboard'],
  Projects:  ['/Projects', '/ProjectDetails'],
  Clients:   ['/Clients', '/IndividualClients', '/ClientPortal', '/ClientDrivePortal', '/ClientOnboarding', '/ClientRegistration', '/ProspectiveIntake', '/ProspectiveClientIntake'],
  Invoices:  ['/Invoices', '/InvoiceHistory'],
  Settings:  ['/Settings', '/Team', '/Reports', '/TimeTracking', '/Tasks', '/TaskDetails', '/Communications', '/DeadlinesDashboard', '/AuditDashboard', '/PasswordVault', '/NotificationSettings', '/ReminderSettings'],
};

/** Returns the tab key that owns the current pathname, or null */
function getOwningTab(pathname) {
  for (const [tab, roots] of Object.entries(TAB_ROOTS)) {
    if (roots.some(r => pathname === r || pathname.startsWith(r + '/'))) return tab;
  }
  return null;
}

/** Persist the current deep path for a tab so we can restore it */
function saveTabPath(tabKey, pathname, search = '') {
  if (pathname && pathname !== '/') {
    sessionStorage.setItem(`tabPath:${tabKey}`, pathname + search);
  }
}

/** Retrieve the last path the user was at in a given tab */
function getTabPath(tabKey, defaultPath) {
  return sessionStorage.getItem(`tabPath:${tabKey}`) || defaultPath;
}

export default function MobileBottomNav({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isManager = currentUser?.role === 'admin' || currentUser?.team_category === 'cpa' || currentUser?.team_category === 'senior_staff';

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', root: '/' },
    { name: 'Projects',  icon: FolderKanban,   page: 'Projects',  root: createPageUrl('Projects') },
    { name: 'Clients',   icon: Building2,       page: isManager ? 'Clients' : 'Projects', root: createPageUrl(isManager ? 'Clients' : 'Projects') },
    { name: 'Invoices',  icon: DollarSign,      page: 'Invoices',  root: createPageUrl('Invoices') },
    { name: 'More',      icon: Menu,            page: 'Settings',  root: createPageUrl('Settings') },
  ];

  // Keep tab path storage up-to-date as the user navigates within a tab
  useEffect(() => {
    const owning = getOwningTab(location.pathname);
    if (owning) {
      saveTabPath(owning, location.pathname, location.search);
      // Also persist scroll position
      sessionStorage.setItem(`scrollPos:${location.pathname}`, String(window.scrollY));
    }
  }, [location.pathname, location.search]);

  const handleTabPress = (tab) => {
    const currentTab = getOwningTab(location.pathname);

    // Tapping the active tab → scroll to top (same UX as native apps)
    if (currentTab === tab.page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Save scroll of current page before leaving
    sessionStorage.setItem(`scrollPos:${location.pathname}`, String(window.scrollY));

    // Navigate to the last deep path the user visited in the target tab
    const restoredPath = getTabPath(tab.page, tab.root);
    navigate(restoredPath);

    // Restore scroll position after navigation
    requestAnimationFrame(() => {
      const savedScroll = sessionStorage.getItem(`scrollPos:${restoredPath}`);
      if (savedScroll) window.scrollTo({ top: parseInt(savedScroll, 10) });
    });
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const currentTab = getOwningTab(location.pathname);
          const isActive = currentTab === tab.page;

          return (
            <button
              key={tab.page}
              onClick={() => handleTabPress(tab)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] w-full ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
