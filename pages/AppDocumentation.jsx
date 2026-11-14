import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Users, FolderKanban, Clock, FileText, MessageSquare, CheckSquare,
  FileBarChart, Settings, Key, Shield, Bell, DollarSign, Building2, UserCheck,
  ChevronDown, ChevronRight, Search, ArrowRight, Zap, Lock, Database,
  Mail, Phone, Globe, GitBranch, Gift, CalendarDays, AlertTriangle,
  CheckCircle, Info, Terminal, Workflow, BookMarked, LayoutDashboard
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// ----- DATA -----
const CHAPTERS = [
  {
    id: 'overview',
    icon: LayoutDashboard,
    color: 'sky',
    title: '1. System Overview',
    subtitle: 'Architecture, roles & access control',
    sections: [
      {
        title: 'What is IslaSoft?',
        content: `IslaSoft Practice Manager is a full-stack accounting firm management platform built for Isla Accounting Corp. It consolidates client management, project tracking, time logging, invoicing, document sharing, team communications, and compliance workflows into a single application.

The system is built on the Base44 platform (React + Deno backend), which provides:
• Real-time database with row-level security (RLS)
• OAuth integrations (Google Drive, Gmail, Google Sheets, Google Docs, Google Calendar)
• Backend functions (serverless Deno handlers)
• AI agents for client intake and engagement letters
• Automated scheduled tasks`
      },
      {
        title: 'User Roles',
        content: `The system uses two permission layers: platform role and team_category.

PLATFORM ROLES:
• admin — Full access to all data, settings, billing, audit logs, and all operations.
• user — Access restricted by team_category.

TEAM CATEGORIES (stored on the User entity):
• cpa — CPAs: read/write clients, projects, invoices, engagement letters, password vault.
• senior_staff — Senior Staff: same as CPA minus some admin-level operations.
• staff — Staff: read clients/projects, log time, manage tasks assigned to them.
• (blank) — Client portal users: can only see their own records.

IMPORTANT: All database operations enforce RLS. A staff member cannot read records they are not assigned to, even if they know the record ID.`
      },
      {
        title: 'Navigation Structure',
        content: `Left sidebar is divided into sections:

OVERVIEW → Dashboard (KPIs, urgent items, recent activity)

CLIENTS & ENGAGEMENTS:
  → Entity Clients (businesses: LLCs, Corps, S-Corps, etc.)
  → Individuals (personal tax clients)

PROJECT'S LIFE:
  → Projects (all work units)
  → Tasks (granular action items)
  → Time Entries (hours logged per project)
  → Invoices (billing)

COMMUNICATIONS:
  → Communications (emails, messages, e-signatures)
  → Drive Portal (Google Drive document management)
  → Referral Program

TEAM:
  → Tax Relationship Map
  → Team Members
  → Deadlines Dashboard
  → Reports
  → Password Vault
  → Audit Log
  → Letter Templates

SETTINGS → Company settings, integrations, subscriptions`
      }
    ]
  },
  {
    id: 'clients',
    icon: Building2,
    color: 'blue',
    title: '2. Client Management',
    subtitle: 'Entity clients, individuals, onboarding & intake',
    sections: [
      {
        title: 'Two Client Types',
        content: `The system differentiates two client types by the presence of the "incorporated_as" field:

ENTITY CLIENTS (pages/Clients):
• LLCs, Corporations, S-Corps, Partnerships, Nonprofits, Sole Proprietorships
• Identified by company_name + incorporated_as field
• Client numbers prefixed with "E-" (e.g. E-001)
• Store: EIN, fiscal year end, taxed_as, contact person, bank info, EFTPS credentials

INDIVIDUAL CLIENTS (pages/IndividualClients):
• Personal tax clients (no incorporated_as, or Sole Proprietorship)
• Identified by name + last_name
• Client numbers prefixed with "I-" (e.g. I-042)
• Store: SSN, DOB, filing status, dependents, driver's license info, bank info

Both types share: email, phone, address, manager_id, status, notes, Google Drive folder IDs.`
      },
      {
        title: 'Client Status Lifecycle',
        content: `Clients move through three statuses:

pending → active → inactive

PENDING: Default status when a client self-registers via the onboarding link or WhatsApp intake form. Staff must review and approve before the client appears in active lists.

ACTIVE: Normal working client. Visible in all project/invoice/task dropdowns.

INACTIVE: Offboarded client. Still in the system for historical records but excluded from active workflows.

Staff Workflow for Pending Clients:
1. Pending clients appear in the "Pending Client Approvals" card at the top of both Clients pages.
2. Click "Review" to see a full detail dialog (all submitted fields, SSN masked to last 4, bank numbers masked).
3. Click "Approve & Activate" to set status = active.
4. Click "Reject & Delete" to permanently remove the registration.`
      },
      {
        title: 'Client Onboarding Flow',
        content: `New clients can submit their own information via a secure onboarding link.

STEP 1 — Generate a Registration Link:
Go to the client's card → click the 🔗 link icon → "Onboarding Link" section.
If no token exists, click "Generate Token". Copy the link or send via WhatsApp/email.

STEP 2 — Client Fills the Form (pages/ClientOnboarding):
Accessible publicly at: /ClientOnboarding?token=XXXX
The form auto-detects client type (individual vs entity) and shows relevant fields:
• Individuals: personal info, DOB, SSN, filing status, DL details, banking
• Entities: company info, EIN, incorporation type, banking
The form includes a security banner explaining encryption and a "pending review" notice.

STEP 3 — Staff Reviews & Approves:
Pending card appears on both Clients pages (see above).

WHATSAPP INTAKE (AI-Driven):
Click "Send Intake Link" → Opens SendWhatsAppIntakeDialog.
This sends a WhatsApp message with a link to the ISLA AI intake chatbot.
The AI agent (agents/client_intake) collects data conversationally and creates a pending client record.

CLIENT NUMBER AUTO-GENERATION:
Client numbers are auto-generated via lib/clientNumberGenerator.js.
Format: I-001 for individuals, E-001 for entities, sequential and zero-padded.`
      },
      {
        title: 'Client Profile Fields Reference',
        content: `KEY FIELDS ON THE CLIENT ENTITY:

Personal/Contact:
  name, middle_name, last_name, company_name, contact_person
  email, phone, address, city, state, zip_code
  dob (date of birth), ssn, filing_status, dependents

Driver's License:
  dl_id, dl_issued, dl_expire

Entity-specific:
  ein, incorporated_as, taxed_as, year_end, document_number

Banking:
  bank_name, bank_routing, bank_account, account_type, bank_username, bank_password

Government Portals:
  eftps_number, eftps_pin, eftps_password
  rt_account, rt_username, rt_password
  eserv_fl_username, eserv_fl_password, business_partner_number

System Fields:
  client_number, status, manager_id, manager_name
  registration_token (for onboarding link)
  user_id (linked Base44 user for portal access)
  drive_folder_ids (main, for_accountant, from_accountant, permanent)
  referral_code, referred_by_client_id`
      },
      {
        title: 'Google Drive Folder Structure',
        content: `Each client can have an automatically-created Google Drive folder tree.

SETUP: Settings → set Drive Root Folder ID.

FOLDER STRUCTURE PER CLIENT:
  [Root Folder]
    └── [Client Name] (main folder)
          ├── For Accountant    ← client uploads documents here
          ├── From Accountant   ← staff shares documents here
          └── Permanent         ← permanent records (signed returns, etc.)

HOW TO CREATE FOLDERS:
Client card → Drive icon → "Setup Folders" button.
This calls the setupClientDriveFolders backend function.

After setup, folder IDs are stored on the Client entity:
  drive_folder_ids.main
  drive_folder_ids.for_accountant
  drive_folder_ids.from_accountant
  drive_folder_ids.permanent

Staff can upload documents to any folder via the Drive Portal page.
Clients can upload via their Client Status Portal (/MyPortal).`
      }
    ]
  },
  {
    id: 'projects',
    icon: FolderKanban,
    color: 'violet',
    title: '3. Projects',
    subtitle: 'Work units, deadlines, categories & lifecycle',
    sections: [
      {
        title: 'Project Structure',
        content: `A Project represents a unit of billable work for a client.

REQUIRED FIELDS:
  client_id, project_category, project_type, assigned_to_id, due_date

KEY FIELDS:
  project_type — One of 80+ specific service types (individual_tax_1040, monthly_bookkeeping, payroll_processing, etc.)
  project_category — One of 9 high-level groups (tax_compliance, bookkeeping_accounting, payroll_employment, etc.)
  status — not_started | in_progress | waiting | on_hold | completed
  priority — low | medium | high | urgent
  budget_hours, budget_amount, actual_cost, completion_percentage
  is_recurring + recurrence_frequency (weekly/biweekly/monthly/quarterly/annual)
  extension_filed, extension_deadline — For tax projects with IRS extensions
  milestones — Array of milestone objects with name, due_date, completed`
      },
      {
        title: 'Project Categories Reference',
        content: `tax_compliance → Individual/business tax returns, K-1, amendments, extensions, tax planning
entity_structuring → LLC/Corp formation, S-Corp elections, conversions, operating agreements, dissolution
bookkeeping_accounting → Monthly/quarterly/annual bookkeeping, bank reconciliations, financial statements, QuickBooks setup
payroll_employment → Payroll setup/processing, quarterly 941, annual W-2, 1099 prep, payroll audits
sales_local_tax → Sales tax registration/filing, Florida DR-405, state & local filings
irs_representation → IRS notices, penalty abatement, installment agreements, audit representation, POA (Form 2848)
advisory_cfo → Cash flow, budgeting/forecasting, CFO services, profitability analysis, tax optimization
audit_assurance → Compilation, review, agreed-upon procedures, forensic accounting, fraud examination
systems_internal → Client onboarding/offboarding, document management, practice management, automations`
      },
      {
        title: 'Project Deadlines & Extensions',
        content: `DEADLINE TRACKING:
Projects with due_date approaching are highlighted in the Deadlines Dashboard and Dashboard urgency widgets.

COLOR CODING (applies throughout the UI):
  🔴 Red — Overdue (past due_date or extension_deadline)
  🟠 Orange — Due within 7 days
  🟡 Yellow — Due within 14 days
  🟢 Green — Due in 15+ days

TAX EXTENSIONS:
When extension_filed = true, set extension_deadline.
The system uses extension_deadline instead of due_date for urgency calculations when an extension has been filed.

AUTOMATED DEADLINE CHECK:
A scheduled backend function (checkTaxDeadlineReminders) runs daily and sends email reminders for approaching deadlines.`
      },
      {
        title: 'Recurring Projects',
        content: `For ongoing services (bookkeeping, payroll, quarterly filings):
Set is_recurring = true and choose recurrence_frequency.

The system can auto-generate recurring invoices (functions/generateRecurringInvoices).
Recurring project cards show a 🔄 indicator in the UI.

BEST PRACTICE: Create one project per service period (e.g., "Monthly Bookkeeping — Jan 2025"). Recurring projects help forecast workload and auto-bill clients.`
      }
    ]
  },
  {
    id: 'time',
    icon: Clock,
    color: 'amber',
    title: '4. Time Tracking',
    subtitle: 'Timers, manual entries, submission & billing',
    sections: [
      {
        title: 'How Time Tracking Works',
        content: `Time entries link a staff member to a project for a specific date.

ENTITY: TimeEntry
Key fields: project_id, client_id, staff_id, date, hours, billable, submitted
Timer fields: timer_start (Unix timestamp ms when timer started), timer_accumulated (total seconds logged)

TIME TRACKING PAGE (pages/TimeTracking):
• Select a date on the calendar to view/log entries for that day.
• Search for a project to start a live timer.
• Run multiple timers simultaneously (one per project).
• Use "Manual Entry" to log hours directly without a timer.`
      },
      {
        title: 'Timer Lifecycle',
        content: `START TIMER:
Search for a project → click play → timer_start = Date.now(), timer_accumulated = 0.
The amber panel appears at the top showing all running/paused timers.

STOP TIMER:
Click Stop → calculates elapsed = (Date.now() - timer_start) / 1000.
Total = timer_accumulated + elapsed.
Rounds UP to nearest 5-minute increment (e.g. 23 min → 25 min).
Sets timer_start = null, updates hours = totalSeconds / 3600.

PAUSE & RESUME:
Stop freezes the timer (accumulates seconds). Resume sets a new timer_start.
Multiple pauses/resumes accumulate correctly in timer_accumulated.

RELEASE ALL FOR TODAY:
Stops all running timers, applies rounding, marks submitted = true.
Released entries cannot be edited by staff (only admins can edit submitted entries).

AUTO-STOP AT MIDNIGHT:
Backend function (autoStopTimersAtMidnight) runs nightly and stops any timers that are still running, preventing overnight runaway hours.`
      },
      {
        title: 'Global Timer Widget',
        content: `A persistent widget in the top-right header shows live time for any running timer.
Click it to navigate directly to the Time Tracking page.
It polls the runningTimer query every 10 seconds to stay current.
The widget is visible from all pages in the app.`
      },
      {
        title: 'Submitting & Invoicing Time',
        content: `SUBMIT DAY: Marks all unsubmitted entries for the selected date as submitted = true.
Submitted entries appear in the Invoices module and can be billed.

INVOICING TIME ENTRIES:
Go to Invoices → Create Invoice → select client → the system pulls all billable, submitted, un-invoiced time entries for that client.
After invoicing, time entries are marked invoiced = true and linked to the invoice via invoice_id.

BILLABLE FLAG:
Each entry has a billable boolean (default true). Non-billable entries (internal admin, training) can be toggled off so they don't appear in invoice line items.`
      }
    ]
  },
  {
    id: 'invoices',
    icon: FileText,
    color: 'emerald',
    title: '5. Invoices',
    subtitle: 'Billing, reminders, QuickBooks sync & payments',
    sections: [
      {
        title: 'Invoice Lifecycle',
        content: `draft → sent → paid / overdue / cancelled

DRAFT: Invoice created but not sent. Can be freely edited.
SENT: Emailed to client. Reminder countdown begins.
PAID: Marked manually or synced from QuickBooks.
OVERDUE: Auto-calculated when due_date has passed and status is still "sent".
CANCELLED: Voided invoice.`
      },
      {
        title: 'Creating an Invoice',
        content: `Go to Invoices → "+ Create Invoice"

1. Select client — pulls all their submitted, billable, uninvoiced time entries.
2. Add expense line items manually if needed (description, category, date, amount).
3. Set hourly_rate, apply merchant_fee (3% option), set due_date.
4. Optionally add a CPA Charge payment URL.
5. Save as Draft or send immediately.

INVOICE FIELDS:
  invoice_number (auto-generated), client_id, project_id
  line_items (time-based), expense_items (manual)
  subtotal, merchant_fee, tax_rate, tax_amount, total
  status, issue_date, due_date
  is_recurring + recurrence_frequency + next_invoice_date`
      },
      {
        title: 'Automated Reminders',
        content: `Configure reminder schedules at Settings → Reminder Settings.

The backend function (checkOverdueInvoices) runs on a schedule and sends email reminders to clients with overdue invoices.

Each reminder is tracked in:
  reminder_count (total reminders sent)
  last_reminder_sent (timestamp of last email)
  reminder_history (array of {sent_date, sent_by, reminder_type})

Staff can manually trigger reminders from the invoice detail panel.`
      },
      {
        title: 'QuickBooks Integration',
        content: `CONNECT: Settings → QuickBooks section → Connect (OAuth flow).
After connecting, quickbooks_realm_id, access/refresh tokens are stored on CompanySettings.

SYNC OPERATIONS:
  Sync Client → creates/updates customer in QuickBooks
  Sync Invoice → pushes invoice to QuickBooks, stores quickbooks_invoice_id
  Sync Payments → pulls payments from QuickBooks and marks invoices paid
  Sync All → runs all operations in sequence

TOKENS: QuickBooks tokens expire every 60 days. The system auto-refreshes using the refresh token. If refresh fails, reconnect from Settings.

AI INVOICE GENERATOR: The AIInvoiceGenerator component can draft invoice line items using LLM based on project descriptions.`
      }
    ]
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    color: 'rose',
    title: '6. Tasks',
    subtitle: 'Task management, assignments & AI generation',
    sections: [
      {
        title: 'Task Structure',
        content: `Tasks are granular action items linked to a client and/or project.

KEY FIELDS:
  title, description, client_id, project_id
  assigned_to_id, assigned_to_name
  priority (low/medium/high/urgent)
  status (todo/in_progress/waiting/completed)
  due_date, estimated_hours, time_logged
  parent_task_id (for subtasks), blocked_by_ids (dependency tracking)
  source (manual/email/message/ai_generated)
  tags (array of strings)

ACCESS: Staff can only see tasks assigned to them or linked to their projects. CPAs and senior staff see all tasks.`
      },
      {
        title: 'Kanban Board',
        content: `Tasks page offers a Kanban view (drag-and-drop) organized by status columns:
  TODO | IN PROGRESS | WAITING | COMPLETED

Drag a card between columns to update status instantly.
Uses @hello-pangea/dnd library for drag-and-drop.

Filter tasks by: client, assignee, priority, due date.
AI Task Generator can create tasks from a plain-language description using InvokeLLM.`
      }
    ]
  },
  {
    id: 'communications',
    icon: MessageSquare,
    color: 'purple',
    title: '7. Communications',
    subtitle: 'Email, e-signatures, engagement letters & DocuSeal',
    sections: [
      {
        title: 'Email System',
        content: `Emails are sent via GMAIL_USER / GMAIL_APP_PASSWORD credentials stored as secrets.

OUTGOING EMAILS:
  • Invoice reminders (automated)
  • Client onboarding links
  • Engagement letter notifications
  • Custom emails via Send Email dialog
  • Document sharing notifications

From address can be customized in Settings → from_email field on CompanySettings.

EMAIL TRACKING: The EmailTracking entity records sent emails with status (sent/delivered/opened/bounced). Staff can see communication history per client.`
      },
      {
        title: 'Engagement Letters',
        content: `Engagement letters are formal agreements sent to clients before work begins.

WORKFLOW:
1. Go to client profile → Engagement Letters tab → "Create Letter".
2. The AI agent (agents/engagement_letter_generator) drafts the letter based on client type and selected services.
3. Letter goes through statuses: draft → pending_review → approved → sent → signed / declined.
4. Approved letters are sent via DocuSeal for electronic signature.
5. DocuSeal returns a submission ID and signer link. Client signs electronically.
6. Webhook (functions/docusealWebhook) receives completion event and marks letter "signed".
7. Signed PDF is optionally uploaded to client's Google Drive "Permanent" folder.

TEMPLATES: Manage reusable clause templates at Team → Letter Templates (pages/EngagementLetterTemplates). Clauses are categorized by type and applicable entity types.`
      },
      {
        title: 'Tax Authorization — Form 8879',
        content: `Form 8879 is the IRS e-file Authorization form. Clients must sign before their return is electronically filed.

HOW TO SEND:
1. Open client profile → click the 🔏 icon → "Request Tax Signature".
2. In the TaxAuthorizationDialog: select tax year, enter Google Drive file ID of the 8879 PDF.
3. Click "Send for Signature" → calls functions/sendDocusealRequest.
4. DocuSeal sends the signing link to the client's email.
5. Signature status updates automatically via webhook.

SIGNATURE STATUS BADGE:
Each client card shows a colored badge with the engagement letter/document signature status.
Colors: gray=none, yellow=draft, orange=sent, green=signed, red=declined.`
      },
      {
        title: 'Internal Team Messaging',
        content: `Team members can message each other within the app.
Go to Communications → Internal Messaging tab.
Messages are stored in the TeamMessage entity.

CLIENT MESSAGING:
Clients with portal access can send messages via their portal.
Messages appear in Communications → Client Messages.
Staff can reply directly from the app.`
      }
    ]
  },
  {
    id: 'drive',
    icon: BookOpen,
    color: 'teal',
    title: '8. Drive Portal',
    subtitle: 'Google Drive integration & document management',
    sections: [
      {
        title: 'Drive Portal Overview',
        content: `The Drive Portal (pages/ClientDrivePortal) is a built-in Google Drive browser inside the app.

Staff can:
• Browse all client folders without leaving the app
• Upload documents directly to client folders
• Download or preview files
• Sync folder structure for all clients

SETUP REQUIRED:
1. Connect Google Drive at Settings → Google Drive section.
2. Set Drive Root Folder ID (the parent folder in your Drive where client folders live).
3. For each client, click Setup Folders to create the subfolder structure.`
      },
      {
        title: 'Document Upload Flow',
        content: `FROM STAFF (uploading to client):
Drive Portal → select client → select "From Accountant" folder → Upload.
This calls functions/uploadToClientDrive which uses the Google Drive API.

FROM CLIENT (client uploads documents):
Clients can upload via their portal (/MyPortal) → Documents tab.
Files go to the "For Accountant" folder in their Drive.

TAX DOCUMENT UPLOADER:
A specialized uploader (components/clients/TaxDocumentUploader) allows staff to upload tax-specific documents with type labels (W-2, 1099, etc.) and have them auto-organized.

REAL-TIME SYNC:
A connector automation (onClientDriveUpload) listens for Google Drive changes via webhook and updates the SharedDocument entity when new files are detected in client folders.`
      }
    ]
  },
  {
    id: 'team',
    icon: Users,
    color: 'indigo',
    title: '9. Team Management',
    subtitle: 'Users, roles, contractors & time reporting',
    sections: [
      {
        title: 'Adding Team Members',
        content: `Go to Team → click "Invite User".
Enter email and select role (admin or user).
The invitation is sent via email. The user registers and their team_category can be set afterward.

TEAM CATEGORIES (set after registration):
  cpa, senior_staff, staff — for internal employees
  contractor — for 1099 contractors (triggers different onboarding flow)

CONTRACTOR ONBOARDING:
If user.contractor_form = true, the system redirects them to /ContractorOnboarding on login.
They must complete the contractor onboarding before accessing the main app.`
      },
      {
        title: 'Tax Relationship Map',
        content: `The Tax Relationship Map (pages/TaxRelationshipMap) is a visual org chart showing relationships between:
• Clients and their managers (CPAs/Senior Staff)
• Projects assigned to each staff member
• Workload distribution across the team

Useful for capacity planning and ensuring no client is unmanaged.`
      },
      {
        title: 'Reports',
        content: `Reports page (pages/Reports) provides:

TIME & BILLING:
  • Time Utilization Report — hours by staff member
  • Unbilled Time Report — submitted but not invoiced time
  • Time Entry Summary — detailed time log

PROJECT REPORTS:
  • Project Status Report — all projects by status/client
  • Project Profitability — budget vs actual
  • Capacity Planning — team availability

FINANCIAL:
  • AR Aging Report — outstanding invoices by age
  • Invoice Aging — overdue analysis
  • QuickBooks Sync Report — sync status and discrepancies

TEAM:
  • Team Performance Report — per-staff productivity
  • User Utilization — billable % by staff

CLIENT INSIGHTS:
  • Client Insights Report — revenue per client, top clients
  • Contractor Payment Report — 1099 contractor amounts

All reports support export to Google Sheets and PDF.`
      }
    ]
  },
  {
    id: 'portal',
    icon: Globe,
    color: 'cyan',
    title: '10. Client Portal',
    subtitle: 'Client self-service, document access & status tracking',
    sections: [
      {
        title: 'Client Status Portal',
        content: `Clients can access their own portal at /MyPortal (no login required — accessed via secure access code).

PORTAL FEATURES:
  • View project statuses and progress
  • View and download invoices
  • Upload documents to their "For Accountant" Drive folder
  • View and download documents shared by staff
  • Send messages to the accounting team
  • View and sign engagement letters

HOW TO GRANT ACCESS:
Client card → Portal tab → "Setup Client Portal" → system creates a ClientPortalAccess record with a unique access_code.
Client receives an email with their portal link.`
      },
      {
        title: 'Client Onboarding Workflow',
        content: `The OnboardingWorkflow entity tracks a checklist of onboarding steps per client:
  • Engagement letter signed
  • IRS POA (Form 2848) submitted
  • Prior year returns received
  • Organizer sent
  • Bank info collected
  • Portal access granted

Staff can view and check off items in the client's "Onboarding" tab.
The AITaskGenerator can auto-generate onboarding tasks based on the client type.`
      }
    ]
  },
  {
    id: 'security',
    icon: Shield,
    color: 'slate',
    title: '11. Security & Audit',
    subtitle: 'Audit logging, password vault & data protection',
    sections: [
      {
        title: 'Audit Log',
        content: `All sensitive operations are logged to the AuditLog entity.

LOGGED ACTIONS:
  view_client, edit_client, delete_client
  view_invoice, create_invoice
  view_report, export_report
  view_password (password vault access)
  access_portal, login, logout

STORED DATA:
  user_id, user_email, user_name
  action_type, resource_type, resource_id, resource_name
  ip_address, user_agent, details, timestamp

Access: Admin-only. View at Team → Audit Log.

HOW TO LOG (for developers):
  import { logAudit } from '../components/security/AuditLogger';
  logAudit('view_client', 'Client', client.id, client.company_name);`
      },
      {
        title: 'Password Vault',
        content: `Stores credentials for external services used by the firm (not client passwords).

CATEGORIES:
  accounting_software, tax_software, banking, government_portal, client_portal, other

FIELDS: name, username, password, link, contact_phone, security_questions, comments, category

ACCESS: Admin, CPA, Senior Staff only. Each view of a password is audit-logged.

USAGE: Store credentials for IRS e-services, FL e-services, state tax portals, bank login, software licenses, etc.

SECURITY NOTE: Passwords in the vault are stored in the Base44 database. Do not store passwords for systems that have API alternatives. Use the OAuth connectors for Google/QuickBooks.`
      },
      {
        title: 'Row-Level Security (RLS)',
        content: `Every entity has RLS rules defined in its JSON schema.

EXAMPLE — Client entity read rule:
  Admin → can read all clients
  CPA → can read all clients
  Senior Staff → can read all clients
  Staff → can read all clients
  User → can only read clients where data.manager_id == user.id OR data.user_id == user.id

This means:
• A staff member without CPA/Senior role cannot see clients they don't manage.
• A client portal user can only see their own record.

TO ADD A NEW ENTITY: Always define RLS rules. If you forget, the entity defaults to no access for non-admins.`
      }
    ]
  },
  {
    id: 'settings',
    icon: Settings,
    color: 'gray',
    title: '12. Settings & Integrations',
    subtitle: 'Company settings, OAuth connectors & secrets',
    sections: [
      {
        title: 'Company Settings',
        content: `Settings page manages the CompanySettings entity (single record per firm).

GENERAL:
  company_name, tagline, logo_url, qr_code_image_url
  address, city, state, zip_code, phone, email, from_email, website

INTEGRATIONS:
  client_intake_sheet_id — Google Sheets ID for master client intake form
  drive_root_folder_id / drive_root_folder_name — Google Drive root for client folders
  quickbooks_realm_id + tokens — QuickBooks connection

SUBSCRIPTION:
  subscription_tier (trial/paid/forever/expired), trial_expires_at`
      },
      {
        title: 'Connected OAuth Services',
        content: `The app has the following OAuth connectors pre-authorized:

GOOGLE DRIVE (googledrive):
  Scopes: drive.file (read/write files the app created), userinfo.email
  Used for: client folder management, document upload/download
  Webhook: Listens for file changes in client folders

GMAIL (gmail):
  Scopes: gmail.send, userinfo.email
  Used for: sending emails on behalf of the firm

GOOGLE CALENDAR (googlecalendar):
  Scopes: calendar.events
  Used for: syncing project deadlines to calendar

GOOGLE SHEETS (googlesheets):
  Scopes: spreadsheets, drive.file
  Used for: exporting reports, client intake sync

GOOGLE DOCS (googledocs):
  Scopes: documents, drive.file
  Used for: generating formatted reports and letters`
      },
      {
        title: 'Environment Secrets',
        content: `Secrets are stored in the platform (never in code).

CURRENT SECRETS:
  DOCUSEAL_API_KEY — DocuSeal e-signature service
  STRIPE_SECRET_KEY — Stripe payment processing
  STRIPE_WEBHOOK_SECRET — Stripe webhook validation
  GMAIL_USER — Sending email address (e.g. info@islaaccounting.com)
  GMAIL_APP_PASSWORD — Gmail App Password for SMTP
  QUICKBOOKS_PRODUCTION_CLIENT_ID — QuickBooks OAuth app ID
  QUICKBOOKS_PRODUCTION_CLIENT_SECRET — QuickBooks OAuth app secret

TO ADD A SECRET: Dashboard → Settings → Environment Variables → Add Secret.
Access in backend functions: Deno.env.get("SECRET_NAME")`
      },
      {
        title: 'Scheduled Automations',
        content: `The following backend functions run on automated schedules:

DAILY:
  checkTaxDeadlineReminders — Emails staff about approaching tax deadlines
  checkOverdueInvoices — Sends payment reminders for overdue invoices
  checkOverdueItems — General overdue project/task alerts
  checkProjectDeadlines — Project deadline notifications
  checkCommunicationFollowups — Flags unanswered client messages
  autoStopTimersAtMidnight — Stops all running timers at midnight
  generateRecurringInvoices — Creates recurring invoices on schedule

WEEKLY:
  syncAllQuickBooks — Full QuickBooks sync (clients + invoices + payments)

CONNECTOR-TRIGGERED:
  onClientDriveUpload — Fires when a file is added to a client Drive folder

All automations can be managed at Dashboard → Code → Automations.`
      }
    ]
  },
  {
    id: 'referral',
    icon: Gift,
    color: 'pink',
    title: '13. Referral Program',
    subtitle: 'Client referrals, codes & rewards',
    sections: [
      {
        title: 'Referral System Overview',
        content: `Each client has a unique referral_code stored on their Client record.

HOW IT WORKS:
1. Client shares their referral code with someone.
2. New client enters the code during onboarding.
3. System matches referred_by_client_id to the referrer.
4. A ReferralReward record is created with status = pending.
5. Once the referred client makes their first payment, reward status changes to earned.
6. Staff can apply the reward as a credit on the next invoice.

REWARD TYPES: credit, discount, gift_card
REWARD VALUE: Configured by staff (dollar amount).

VIEW REFERRALS: Pages/ReferralProgram — shows all referral records, earnings, and redemptions.`
      }
    ]
  },
  {
    id: 'backend',
    icon: Terminal,
    color: 'zinc',
    title: '14. Backend Functions Reference',
    subtitle: 'All serverless functions and their purposes',
    sections: [
      {
        title: 'Client & Onboarding Functions',
        content: `createClientRegistrationLink — Generates a unique registration token and saves it on the Client record.

completeClientOnboarding — Called when a client submits the onboarding form. Updates the client record with submitted data, sets status = pending.

newClientOnboarding — Alternative onboarding entry point (used by AI agent intake).

lookupClientByToken — Public endpoint. Takes a token and returns the client's non-sensitive data for pre-filling the onboarding form.

automateClientOnboarding — Runs a checklist of automation steps for a newly approved client (Drive folder creation, portal access, etc.).

submitClientRegistration — Handles the final submission of client-submitted data.`
      },
      {
        title: 'Document & Drive Functions',
        content: `setupClientDriveFolders — Creates the 4-folder structure (main, for_accountant, from_accountant, permanent) in Google Drive for a given client.

uploadToClientDrive — Uploads a file (base64 or URL) to a specified client Drive folder.

listClientDriveFiles — Lists files in a client's Drive folder by folder type.

uploadTaxDocument — Specialized uploader for tax documents with type metadata.

fetch8879DriveFile — Fetches a Form 8879 PDF from Drive for DocuSeal submission.

onClientDriveUpload — Connector webhook handler: fires on Drive file changes, updates SharedDocument records.`
      },
      {
        title: 'Email & Communication Functions',
        content: `sendClientEmail — Sends a custom email to a client. Uses Gmail connector or GMAIL credentials.

sendInvoiceEmail — Sends an invoice PDF to client with payment link.

notifyClientNewDocument — Notifies client by email when staff shares a document.

notifyClientStatusChange — Emails client when their project status changes.

notifyReferralEarned — Notifies referrer when their referral reward is earned.`
      },
      {
        title: 'DocuSeal / E-Signature Functions',
        content: `sendDocusealRequest — Sends a document (by Drive file ID) to DocuSeal for electronic signature. Creates a submission and stores the submission_id and signer_link on the EngagementLetter/record.

sendEngagementLetterDocuseal — Specifically sends engagement letters through DocuSeal.

docusealWebhook — Receives completion events from DocuSeal. Updates engagement letter status to "signed". Optionally downloads the signed PDF back to Google Drive.`
      },
      {
        title: 'QuickBooks Functions',
        content: `quickbooksOAuthInit — Initiates the QuickBooks OAuth flow.
quickbooksOAuthCallback — Handles the OAuth callback, stores tokens.
syncClientToQuickBooks — Creates or updates a customer in QuickBooks.
syncInvoiceToQuickBooks — Pushes an invoice to QuickBooks.
syncCustomersFromQuickBooks — Pulls all QB customers and matches to clients.
pullQuickBooksPayments — Fetches payments from QB and marks invoices as paid.
syncAllQuickBooks — Orchestrates a full sync run.
quickbooksWebhook — Receives QB webhook events for real-time updates.
getQuickBooksARReport — Pulls the AR Aging report from QuickBooks.
syncQuickBooksItems — Syncs QB service items (for invoice line items).`
      },
      {
        title: 'Reporting & Export Functions',
        content: `exportToGoogleSheets — Exports any dataset to a new Google Sheet.
exportInvoicesToGoogleSheets — Specifically exports invoice data.
exportToGoogleDocs — Creates a formatted Google Doc report.
generateInvoicePDF — Generates a PDF invoice using jsPDF.
generateContractorPaymentPDF — Creates 1099-style payment PDFs.
generateClientIntakeForm — Creates a client intake Google Form via Sheets API.
parseCSVForClients — Parses a CSV file for bulk client import.
importClients — Bulk-inserts clients from parsed CSV data.`
      }
    ]
  }
];

// ----- COMPONENT -----

function ChapterCard({ chapter, onClick, isActive }) {
  const colorMap = {
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    zinc: 'bg-zinc-50 border-zinc-200 text-zinc-700',
  };
  const Icon = chapter.icon;
  const cls = colorMap[chapter.color] || colorMap.slate;

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl border-2 p-4 transition-all hover:shadow-md ${isActive ? 'ring-2 ring-offset-1 ring-slate-800 shadow-md' : ''} ${cls}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm leading-tight">{chapter.title}</p>
          <p className="text-xs opacity-70 mt-0.5">{chapter.subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function Section({ section, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 text-left"
      >
        <span className="font-semibold text-slate-800 text-sm">{section.title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed">{section.content}</pre>
        </div>
      )}
    </div>
  );
}

export default function AppDocumentation() {
  const [activeChapter, setActiveChapter] = useState(CHAPTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim().length > 1
    ? CHAPTERS.flatMap(ch => ch.sections
        .filter(s =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(s => ({ chapter: ch, section: s }))
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
          <BookMarked className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IslaSoft — Technical Reference Guide</h1>
          <p className="text-slate-500 text-sm">Complete documentation for staff and administrators</p>
        </div>
        <Badge className="ml-auto bg-slate-800 text-white">v2026</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search across all documentation…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search results */}
      {searchQuery.trim().length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Results ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 && <p className="text-sm text-slate-500">No results found.</p>}
            {filtered.map(({ chapter, section }, i) => (
              <button
                key={i}
                onClick={() => { setActiveChapter(chapter); setSearchQuery(''); }}
                className="w-full text-left border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{section.title}</p>
                  <p className="text-xs text-slate-400">{chapter.title}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main grid */}
      {!searchQuery && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* TOC sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Chapters</p>
            {CHAPTERS.map(ch => (
              <ChapterCard
                key={ch.id}
                chapter={ch}
                onClick={() => setActiveChapter(ch)}
                isActive={activeChapter.id === ch.id}
              />
            ))}
          </div>

          {/* Content area */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              {React.createElement(activeChapter.icon, { className: 'w-6 h-6 text-slate-700' })}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{activeChapter.title}</h2>
                <p className="text-sm text-slate-500">{activeChapter.subtitle}</p>
              </div>
            </div>
            <div className="space-y-3">
              {activeChapter.sections.map((section, i) => (
                <Section key={i} section={section} index={i} />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-slate-200">
              {CHAPTERS.findIndex(c => c.id === activeChapter.id) > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setActiveChapter(CHAPTERS[CHAPTERS.findIndex(c => c.id === activeChapter.id) - 1])}>
                  ← Previous
                </Button>
              ) : <div />}
              {CHAPTERS.findIndex(c => c.id === activeChapter.id) < CHAPTERS.length - 1 ? (
                <Button variant="outline" size="sm" onClick={() => setActiveChapter(CHAPTERS[CHAPTERS.findIndex(c => c.id === activeChapter.id) + 1])}>
                  Next →
                </Button>
              ) : <div />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}