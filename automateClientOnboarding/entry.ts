import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data, old_data } = payload;

        // Only proceed if status changed to 'active' from 'pending'
        if (event.type !== 'update' || data.status !== 'active' || old_data?.status !== 'pending') {
            return Response.json({ message: 'No onboarding needed', skipped: true });
        }

        const client = data;
        const isIndividual = client.name && client.last_name; // Has individual fields
        const clientType = isIndividual ? 'individual' : 'entity';
        const clientName = isIndividual 
            ? `${client.name} ${client.last_name}`
            : client.company_name;

        // Get company settings for email sender
        const settings = await base44.asServiceRole.entities.CompanySettings.list();
        const fromEmail = settings[0]?.from_email || settings[0]?.email || 'noreply@base44.app';
        const companyName = settings[0]?.company_name || 'Our Firm';

        // 1. Send welcome email
        const welcomeSubject = `Welcome to ${companyName}!`;
        const welcomeBody = `Dear ${clientName},

Welcome to ${companyName}! We're excited to begin working with you.

Your account has been activated and you'll soon receive access to our client portal where you can:
- View project progress
- Access important documents
- Communicate with your team
- Track invoices and payments

Our team will reach out shortly with next steps for your ${clientType === 'individual' ? 'tax preparation' : 'business services'}.

If you have any questions, please don't hesitate to contact us:
  Phone: (305) 954-4607
  Website: www.islaccounting.com
  Email: ${settings[0]?.email || 'info@islaccounting.com'}

Best regards,
${companyName} Team`;

        // Send via Gmail connector so external recipients are supported
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const profile = await profileRes.json();
        const senderEmail = profile.emailAddress;

        const emailLines = [
            `From: ${companyName} <${senderEmail}>`,
            `To: ${client.email}`,
            `Subject: ${welcomeSubject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=UTF-8`,
            ``,
            welcomeBody
        ];
        const raw = emailLines.join('\r\n');
        const encoded = btoa(unescape(encodeURIComponent(raw)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encoded }),
        });

        // Track email
        await base44.asServiceRole.entities.EmailTracking.create({
            client_id: client.id,
            client_name: clientName,
            recipient_email: client.email,
            subject: welcomeSubject,
            email_type: 'general',
            sent_by_id: 'system',
            sent_by_name: 'System',
            status: 'sent'
        });

        // 2. Create onboarding tasks based on client type
        const tasks = [];
        
        if (clientType === 'individual') {
            tasks.push(
                {
                    title: 'Collect Prior Year Tax Returns',
                    description: 'Request and review client\'s prior year tax returns',
                    priority: 'high',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                },
                {
                    title: 'Gather W-2s and 1099s',
                    description: 'Request all income documents from client',
                    priority: 'high',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                },
                {
                    title: 'Review Deductions and Credits',
                    description: 'Schedule call to discuss potential deductions',
                    priority: 'medium',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                }
            );
        } else {
            tasks.push(
                {
                    title: 'Review Business Structure',
                    description: 'Confirm entity type and tax classification',
                    priority: 'high',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                },
                {
                    title: 'Set Up QuickBooks Access',
                    description: 'Request accounting system credentials or invite',
                    priority: 'high',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                },
                {
                    title: 'Review Financial Statements',
                    description: 'Analyze P&L and Balance Sheet from prior period',
                    priority: 'medium',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                },
                {
                    title: 'Confirm Payroll Setup',
                    description: 'Verify payroll provider and tax deposits',
                    priority: 'medium',
                    status: 'todo',
                    client_id: client.id,
                    client_name: clientName,
                    source: 'ai_generated'
                }
            );
        }

        // Create all onboarding tasks
        for (const task of tasks) {
            await base44.asServiceRole.entities.Task.create(task);
        }

        // 3. Create client portal access
        const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        await base44.asServiceRole.entities.ClientPortalAccess.create({
            client_id: client.id,
            client_name: clientName,
            client_email: client.email,
            access_code: accessCode,
            is_active: true,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        });

        // 4. Create notification for admin/manager
        const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of adminUsers) {
            await base44.asServiceRole.entities.Notification.create({
                user_id: admin.id,
                user_email: admin.email,
                type: 'project_status_changed',
                title: 'New Client Onboarded',
                message: `${clientName} (${clientType}) has been activated and onboarding tasks created`,
                link: `/Clients`,
                related_id: client.id,
                related_type: 'Client',
                priority: 'medium'
            });
        }

        return Response.json({
            success: true,
            message: 'Client onboarding completed',
            clientName,
            clientType,
            tasksCreated: tasks.length,
            portalAccessCode: accessCode
        });

    } catch (error) {
        console.error('Onboarding error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});