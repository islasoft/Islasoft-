/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditDashboard from './pages/AuditDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ClientDrivePortal from './pages/ClientDrivePortal';
import ClientIntakeForm from './pages/ClientIntakeForm';
import ClientPortal from './pages/ClientPortal';
import ClientRegistration from './pages/ClientRegistration';
import Clients from './pages/Clients';
import Communications from './pages/Communications';
import ContractorOnboarding from './pages/ContractorOnboarding';
import Dashboard from './pages/Dashboard';
import Help from './pages/Help';
import IndividualClients from './pages/IndividualClients';
import InvoiceHistory from './pages/InvoiceHistory';
import Invoices from './pages/Invoices';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import PasswordVault from './pages/PasswordVault';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import ReminderSettings from './pages/ReminderSettings';
import Reports from './pages/Reports';
import SaaSBilling from './pages/SaaSBilling';
import SaaSCustomers from './pages/SaaSCustomers';
import SaaSDashboard from './pages/SaaSDashboard';
import Settings from './pages/Settings';
import SupportTickets from './pages/SupportTickets';
import TaskDetails from './pages/TaskDetails';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import TeamChat from './pages/TeamChat';
import TimeTracking from './pages/TimeTracking';
import ReferralProgram from './pages/ReferralProgram';
import DeadlinesDashboard from './pages/DeadlinesDashboard';
import EngagementLetterTemplates from './pages/EngagementLetterTemplates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditDashboard": AuditDashboard,
    "ClientDashboard": ClientDashboard,
    "ClientDrivePortal": ClientDrivePortal,
    "ClientIntakeForm": ClientIntakeForm,
    "ClientPortal": ClientPortal,
    "ClientRegistration": ClientRegistration,
    "Clients": Clients,
    "Communications": Communications,
    "ContractorOnboarding": ContractorOnboarding,
    "Dashboard": Dashboard,
    "Help": Help,
    "IndividualClients": IndividualClients,
    "InvoiceHistory": InvoiceHistory,
    "Invoices": Invoices,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "PasswordVault": PasswordVault,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "ReminderSettings": ReminderSettings,
    "Reports": Reports,
    "SaaSBilling": SaaSBilling,
    "SaaSCustomers": SaaSCustomers,
    "SaaSDashboard": SaaSDashboard,
    "Settings": Settings,
    "SupportTickets": SupportTickets,
    "TaskDetails": TaskDetails,
    "Tasks": Tasks,
    "Team": Team,
    "TeamChat": TeamChat,
    "TimeTracking": TimeTracking,
    "ReferralProgram": ReferralProgram,
    "DeadlinesDashboard": DeadlinesDashboard,
    "EngagementLetterTemplates": EngagementLetterTemplates,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};