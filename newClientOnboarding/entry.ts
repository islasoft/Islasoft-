import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data } = payload;

        if (event.type !== 'create') {
            return Response.json({ message: 'Not a create event', skipped: true });
        }

        const client = data;

        // Skip if no email (can't send anything useful)
        if (!client.email) {
            return Response.json({ message: 'No email on client, skipping', skipped: true });
        }

        const isIndividual = !client.incorporated_as || client.incorporated_as === 'Sole Proprietorship';
        const clientName = isIndividual
            ? [client.name, client.middle_name, client.last_name].filter(Boolean).join(' ')
            : client.company_name;

        if (!clientName) {
            return Response.json({ message: 'No client name, skipping', skipped: true });
        }

        // Get company settings
        const settings = await base44.asServiceRole.entities.CompanySettings.list();
        const companyName = settings[0]?.company_name || 'ISLA Accounting Corp';
        const companyPhone = settings[0]?.phone || '(305) 290-1145';
        const companyEmail = settings[0]?.email || 'info@islaccounting.com';
        const companyAddress = [settings[0]?.address, settings[0]?.city, settings[0]?.state, settings[0]?.zip_code].filter(Boolean).join(', ');

        // ─── 1. ENGAGEMENT LETTER EMAIL ───────────────────────────────
        // Fetch engagement letter templates applicable to this client type
        const entityType = client.incorporated_as || (isIndividual ? 'Individual' : 'all');
        const allTemplates = await base44.asServiceRole.entities.EngagementLetterTemplate.filter({ is_active: true });

        const applicableTemplates = allTemplates
            .filter(t => {
                const types = t.applicable_entity_types || [];
                return types.includes('all') || types.includes(entityType) || types.includes('Individual');
            })
            .sort((a, b) => (a.sort_order || 100) - (b.sort_order || 100));

        // Build clause sections from templates
        const clausesByType = {};
        for (const t of applicableTemplates) {
            if (!clausesByType[t.clause_type]) clausesByType[t.clause_type] = [];
            clausesByType[t.clause_type].push(t.content);
        }

        const getClause = (type, defaultText) => {
            return clausesByType[type]?.join('\n\n') || defaultText;
        };

        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const clientAddress = [client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', ');

        const engagementLetterBody = `
${companyName}
${companyAddress}
${companyPhone} | ${companyEmail}

${today}

${clientName}
${clientAddress || ''}

Dear ${clientName},

We are pleased to engage your services and confirm our mutual understanding of the terms of our professional relationship.

1. SCOPE OF SERVICES
${getClause('scope_of_services', `We will provide professional accounting and ${isIndividual ? 'tax preparation' : 'business advisory'} services tailored to your needs.`)}

2. CLIENT RESPONSIBILITIES
${getClause('client_responsibilities', `You agree to provide complete, accurate, and timely information necessary for us to perform our services. You are responsible for maintaining sound accounting records and internal controls.`)}

3. FEES AND PAYMENT TERMS
${getClause('fees_and_payment', `Our services are billed at our standard rates: CPA $200/hr, Senior Staff $125/hr. Invoices are due upon presentation. Accounts delinquent after 30 days; work suspended after 45 days. Accepted payment: check, bank transfer, Zelle (${companyEmail}). Credit card/PayPal incurs a 3% processing fee.`)}

4. ENGAGEMENT PERIOD
${getClause('engagement_period', `This engagement begins on ${today} and continues until terminated by either party with written notice. Both parties have the right to terminate at any time, subject to payment for services rendered through the termination date.`)}

5. PROFESSIONAL STANDARDS
${getClause('professional_standards', `We will perform all services in accordance with applicable AICPA standards, IRS regulations, Florida Board of Accountancy rules (Fla. Stat. § 473.315), and professional ethics requirements.`)}

6. CONFIDENTIALITY
${getClause('confidentiality', `All information provided will be kept strictly confidential except as required by law, Florida Statutes, or applicable professional standards.`)}

7. LIMITATION OF LIABILITY
${getClause('limitation_of_liability', `Our liability to you arising from this engagement shall be limited to the fees paid by you for the specific services giving rise to the claim.`)}

8. FLORIDA-SPECIFIC DISCLOSURES
${getClause('florida_specific', `This engagement is subject to the laws of the State of Florida. Any disputes shall be resolved in Broward County, Florida. We are licensed by the Florida Board of Accountancy.`)}

9. AGREEMENT
Please sign and return this letter to indicate your acceptance of these terms. This engagement letter supersedes any prior agreements.

For ${companyName}:

_______________________________
Lilian Gonzalez Diaz, CPA, CFE
Director

Accepted and Agreed:

_______________________________
Name:
Title:
Company: ${clientName}
Date:

---
© ${new Date().getFullYear()} Isla Advisory and Trust LLC. All rights reserved.
`.trim();

        // Send engagement letter via Gmail connector
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const profile = await profileRes.json();
        const senderEmail = profile.emailAddress;

        const emailSubject = `Engagement Letter – ${companyName} & ${clientName}`;
        const emailLines = [
            `From: ${companyName} <${senderEmail}>`,
            `To: ${client.email}`,
            `Subject: ${emailSubject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=UTF-8`,
            ``,
            `Dear ${clientName},`,
            ``,
            `Please find below your Engagement Letter from ${companyName}. Review it carefully and reply to this email to confirm your acceptance.`,
            ``,
            `─────────────────────────────────────────`,
            engagementLetterBody,
            `─────────────────────────────────────────`,
            ``,
            `If you have any questions, please contact us:`,
            `📞 ${companyPhone}`,
            `📧 ${companyEmail}`,
            ``,
            `Best regards,`,
            `${companyName} Team`
        ];

        const raw = emailLines.join('\r\n');
        const encoded = btoa(unescape(encodeURIComponent(raw)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encoded }),
        });

        // Track email (best-effort)
        try {
            await base44.asServiceRole.entities.EmailTracking.create({
                client_id: client.id,
                client_name: clientName,
                recipient_email: client.email,
                subject: emailSubject,
                email_type: 'engagement_letter',
                sent_by_id: 'system',
                sent_by_name: 'System (Auto)',
                status: 'sent'
            });
        } catch (_) { /* non-fatal */ }

        // ─── 2. PERSONALIZED ONBOARDING CHECKLIST ───────────────────
        const tasks = [];

        // Universal tasks
        tasks.push({
            title: `Send Signed Engagement Letter – ${clientName}`,
            description: 'Follow up to confirm client has signed and returned the engagement letter.',
            priority: 'high',
            status: 'todo',
            client_id: client.id,
            client_name: clientName,
            source: 'ai_generated'
        });

        if (isIndividual) {
            const filingStatus = client.filing_status || 'single';
            const hasDependents = (client.dependents || 0) > 0;

            tasks.push(
                {
                    title: 'Collect Prior Year Tax Returns (1040)',
                    description: 'Request last 2 years of federal and state returns.',
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Gather W-2s and 1099s',
                    description: 'Request all income documents for the current tax year.',
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Collect ID / Driver\'s License',
                    description: 'Obtain a copy of government-issued photo ID.',
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                }
            );

            if (filingStatus === 'married_joint' || filingStatus === 'married_separate') {
                tasks.push({
                    title: 'Collect Spouse Information & Documents',
                    description: 'Request spouse SSN, income documents, and ID.',
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                });
            }

            if (hasDependents) {
                tasks.push({
                    title: 'Collect Dependent Information',
                    description: `Client has ${client.dependents} dependent(s). Collect SSNs, DOBs, and childcare receipts.`,
                    priority: 'medium', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                });
            }

            tasks.push(
                {
                    title: 'Review Deductions & Credits',
                    description: 'Mortgage interest, charitable contributions, medical expenses, education credits.',
                    priority: 'medium', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Verify Bank Account for Refund/Payment',
                    description: 'Confirm routing and account number for direct deposit or tax payment.',
                    priority: 'medium', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                }
            );

        } else {
            // Entity client tasks
            const entityStructure = client.incorporated_as || 'LLC';
            const taxedAs = client.taxed_as || entityStructure;

            tasks.push(
                {
                    title: `Verify Entity Structure – ${entityStructure} taxed as ${taxedAs}`,
                    description: 'Confirm incorporation documents, EIN, state registration, and tax election.',
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Collect Prior Year Business Returns',
                    description: `Request last 2 years of ${taxedAs === 'S-Corporation' ? '1120-S' : taxedAs === 'Partnership' ? '1065' : taxedAs === 'C-Corporation' ? '1120' : 'business'} returns.`,
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Set Up Accounting System Access',
                    description: 'Request QuickBooks or bookkeeping platform login credentials or invite.',
                    priority: 'high', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Review Financial Statements (P&L + Balance Sheet)',
                    description: 'Analyze most recent financials to understand the business picture.',
                    priority: 'medium', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Confirm Payroll Provider & Tax Deposits',
                    description: 'Verify payroll setup, EFTPS enrollment, and quarterly 941 filings.',
                    priority: 'medium', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                },
                {
                    title: 'Obtain Bank Statements (Last 3 Months)',
                    description: 'Request all business bank and credit card statements.',
                    priority: 'medium', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                }
            );

            if (client.ein) {
                tasks.push({
                    title: 'Verify EIN on File',
                    description: `Confirm EIN ${client.ein} matches IRS records and SS-4 is on file.`,
                    priority: 'low', status: 'todo',
                    client_id: client.id, client_name: clientName, source: 'ai_generated'
                });
            }
        }

        // Create all tasks
        for (const task of tasks) {
            await base44.asServiceRole.entities.Task.create(task);
        }

        // ─── 3. CLIENT PORTAL ACCESS ──────────────────────────────────
        // Check if portal access already exists
        const existingAccess = await base44.asServiceRole.entities.ClientPortalAccess.filter({ client_id: client.id });
        let portalAccessCode = null;

        if (existingAccess.length === 0) {
            portalAccessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            try {
                await base44.asServiceRole.entities.ClientPortalAccess.create({
                    client_id: client.id,
                    client_name: clientName,
                    client_email: client.email,
                    access_code: portalAccessCode,
                    is_active: true,
                    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                });
            } catch (_) { portalAccessCode = null; /* non-fatal, skip portal email */ }

            // Email portal access to client (only if creation succeeded)
            if (portalAccessCode) {
                const portalUrl = `${req.headers.get('origin') || 'https://app.islaccounting.com'}/MyPortal?code=${portalAccessCode}`;
                const portalEmailLines = [
                    `From: ${companyName} <${senderEmail}>`,
                    `To: ${client.email}`,
                    `Subject: Your Client Portal Access – ${companyName}`,
                    `MIME-Version: 1.0`,
                    `Content-Type: text/plain; charset=UTF-8`,
                    ``,
                    `Dear ${clientName},`,
                    ``,
                    `Your secure client portal has been set up! You can now access your documents, project status, messages, and invoices online.`,
                    ``,
                    `🔗 Portal Link: ${portalUrl}`,
                    `🔑 Access Code: ${portalAccessCode}`,
                    ``,
                    `Your portal access is valid for 1 year.`,
                    ``,
                    `If you have any questions, contact us:`,
                    `📞 ${companyPhone}`,
                    `📧 ${companyEmail}`,
                    ``,
                    `Best regards,`,
                    `${companyName} Team`
                ];
                const portalRaw = portalEmailLines.join('\r\n');
                const portalEncoded = btoa(unescape(encodeURIComponent(portalRaw)))
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ raw: portalEncoded }),
                });
            }
        }

        // ─── 4. AUTO-CREATE GOOGLE DRIVE FOLDERS ─────────────────────
        let driveFolders = null;
        try {
            const { accessToken: driveToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
            const driveSettings = settings[0];
            const rootFolderId = driveSettings?.drive_root_folder_id;

            // Build folder name: e.g. "I08 - Sandy Lopez Oliva"
            const rawNum = client.client_number || client.id;
            const numFormatted = rawNum.replace(/^([A-Z]+)-0*(\d+)$/, (_, prefix, num) => `${prefix}${String(parseInt(num)).padStart(2, '0')}`);
            const folderLabel = `${numFormatted} - ${clientName}`;

            const mainFolderBody = { name: folderLabel, mimeType: 'application/vnd.google-apps.folder' };
            if (rootFolderId) mainFolderBody.parents = [rootFolderId];

            const mainFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { Authorization: `Bearer ${driveToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(mainFolderBody),
            });
            const mainFolder = await mainFolderRes.json();

            if (mainFolderRes.ok) {
                const subfolders = [
                    { name: 'For Accountant', key: 'for_accountant', role: 'writer' },
                    { name: 'From Accountant', key: 'from_accountant', role: 'reader' },
                    { name: 'Permanent', key: 'permanent', role: null },
                ];

                const folderIds = { main: mainFolder.id };

                for (const sub of subfolders) {
                    const subRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${driveToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: sub.name,
                            mimeType: 'application/vnd.google-apps.folder',
                            parents: [mainFolder.id],
                        }),
                    });
                    const subData = await subRes.json();
                    if (subRes.ok) {
                        folderIds[sub.key] = subData.id;
                        // Share folder with client if they have email and role is set
                        if (sub.role && client.email) {
                            await fetch(`https://www.googleapis.com/drive/v3/files/${subData.id}/permissions`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${driveToken}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'user', role: sub.role, emailAddress: client.email }),
                            });
                        }
                    }
                }

                // Save folder IDs to client record
                await base44.asServiceRole.entities.Client.update(client.id, {
                    drive_folder_id: mainFolder.id,
                    drive_folder_ids: folderIds,
                });
                driveFolders = folderIds;
                console.log('✅ Drive folders created for client:', client.id, folderIds);
            } else {
                console.warn('⚠️ Drive folder creation failed:', mainFolder);
            }
        } catch (driveError) {
            console.error('Drive folder creation error (non-fatal):', driveError.message);
        }

        // ─── 5. NOTIFY ADMINS ─────────────────────────────────────────
        const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of adminUsers) {
            await base44.asServiceRole.entities.Notification.create({
                user_id: admin.id,
                user_email: admin.email,
                type: 'project_status_changed',
                title: '🆕 New Client Added – Onboarding Started',
                message: `${clientName} was added. Engagement letter emailed, ${tasks.length} checklist tasks created, portal access set up${driveFolders ? ', and Google Drive folders created' : ''}.`,
                link: isIndividual ? '/IndividualClients' : '/Clients',
                related_id: client.id,
                related_type: 'Client',
                priority: 'medium'
            });
        }

        return Response.json({
            success: true,
            clientName,
            clientType: isIndividual ? 'individual' : 'entity',
            engagementLetterSent: true,
            tasksCreated: tasks.length,
            portalAccessCode: portalAccessCode || 'already_existed',
            portalEmailSent: !!portalAccessCode,
            driveFoldersCreated: !!driveFolders,
            driveFolders
        });

    } catch (error) {
        console.error('[newClientOnboarding] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});