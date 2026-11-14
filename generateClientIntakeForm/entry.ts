import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.team_category !== 'cpa' && user.team_category !== 'senior_staff')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { clientType, clientName, clientEmail } = await req.json();

        if (!clientType || !clientName || !clientEmail) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Define standard intake questions based on client type
        const questions = clientType === 'individual' ? [
            { label: 'Full Name', required: true },
            { label: 'Email', required: true },
            { label: 'Phone', required: true },
            { label: 'Address', required: true },
            { label: 'Date of Birth', required: true },
            { label: 'SSN', required: true },
            { label: 'Filing Status', required: true },
            { label: 'Number of Dependents', required: false },
            { label: 'Employer/Income Source', required: false },
            { label: 'Bank Name', required: false },
            { label: 'Bank Account Number', required: false },
            { label: 'Bank Routing Number', required: false }
        ] : [
            { label: 'Company Name', required: true },
            { label: 'Email', required: true },
            { label: 'Phone', required: true },
            { label: 'Address', required: true },
            { label: 'EIN', required: true },
            { label: 'Business Structure', required: true },
            { label: 'Contact Person', required: true },
            { label: 'Year End Date', required: false },
            { label: 'Bank Name', required: false },
            { label: 'Bank Account Number', required: false },
            { label: 'Bank Routing Number', required: false }
        ];

        // Get Google Sheets access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });

        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        // Get or create master intake sheet
        const companySettings = await base44.asServiceRole.entities.CompanySettings.list();
        let spreadsheetId = companySettings[0]?.client_intake_sheet_id;
        let spreadsheetUrl;

        if (!spreadsheetId) {
            // Create master sheet
            const createResponse = await sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: 'Client Intake Forms - Master Sheet'
                    },
                    sheets: [{
                        properties: {
                            title: 'Clients',
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        }
                    }]
                }
            });

            spreadsheetId = createResponse.data.spreadsheetId;
            spreadsheetUrl = createResponse.data.spreadsheetUrl;

            // Save to company settings
            if (companySettings.length > 0) {
                await base44.asServiceRole.entities.CompanySettings.update(companySettings[0].id, {
                    client_intake_sheet_id: spreadsheetId
                });
            }

            // Create header row
            const headers = [['Client Name', 'Email', 'Type', 'Date Sent', 'Status', ...questions.map(q => q.label)]];
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Clients!A1',
                valueInputOption: 'RAW',
                requestBody: { values: headers }
            });

            // Format header
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                                }
                            },
                            fields: 'userEnteredFormat'
                        }
                    }]
                }
            });
        } else {
            // Get existing sheet URL
            const sheetData = await sheets.spreadsheets.get({ spreadsheetId });
            spreadsheetUrl = sheetData.data.spreadsheetUrl;
        }

        // Add client row
        const newRow = [
            clientName,
            clientEmail,
            clientType,
            new Date().toLocaleDateString(),
            'Pending',
            ...questions.map(() => '')
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Clients!A:A',
            valueInputOption: 'RAW',
            requestBody: { values: [newRow] }
        });

        // Share with client email (if not already shared)
        try {
            await drive.permissions.create({
                fileId: spreadsheetId,
                requestBody: {
                    type: 'user',
                    role: 'writer',
                    emailAddress: clientEmail
                },
                sendNotificationEmail: false
            });
        } catch (e) {
            // Already shared, ignore
        }

        // Create or find client record
        const existingClients = await base44.asServiceRole.entities.Client.filter({ email: clientEmail });
        let client;
        
        if (existingClients.length > 0) {
            client = existingClients[0];
            await base44.asServiceRole.entities.Client.update(client.id, {
                notes: `Intake form sent on ${new Date().toLocaleDateString()}\n\n${client.notes || ''}`
            });
        } else {
            // Generate client number
            const allClients = await base44.asServiceRole.entities.Client.list();
            const lastNumber = allClients
                .map(c => c.client_number)
                .filter(n => n && (n.startsWith('I-') || n.startsWith('E-')))
                .map(n => parseInt(n.split('-')[1]))
                .sort((a, b) => b - a)[0] || 0;
            
            const nextNumber = lastNumber + 1;
            const prefix = clientType === 'entity' ? 'E' : 'I';
            
            // Generate registration token
            const registrationToken = crypto.randomUUID();
            
            client = await base44.asServiceRole.entities.Client.create({
                client_number: `${prefix}-${String(nextNumber).padStart(3, '0')}`,
                company_name: clientType === 'entity' ? clientName : undefined,
                name: clientType === 'individual' ? clientName : undefined,
                email: clientEmail,
                status: 'pending',
                manager_id: user.id,
                manager_name: user.full_name,
                registration_token: registrationToken,
                notes: `Intake form sent on ${new Date().toLocaleDateString()}`
            });
        }

        // Get company settings for email
        const companySettings2 = await base44.asServiceRole.entities.CompanySettings.list();
        const companyName = companySettings2[0]?.company_name || 'Isla Accounting Corp';
        const companyEmail = companySettings2[0]?.email || 'info@islaccounting.com';
        const companyPhone = companySettings2[0]?.phone || '(305) 290-1145';

        // Generate intake form link
        const appUrl = `https://${req.headers.get('host')}`;
        const intakeFormUrl = `${appUrl}/ClientIntakeForm?token=${client.registration_token}&type=${clientType}`;

        // Send email to client
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: companyName,
            to: clientEmail,
            subject: `Complete Your Client Intake Form - ${companyName}`,
            body: `
                <h2>Welcome, ${clientName}!</h2>
                <p>Thank you for choosing ${companyName}. To get started, please complete your client intake information.</p>
                <p><strong><a href="${intakeFormUrl}" style="background: #4169E1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Intake Form</a></strong></p>
                <p>This secure form will collect all the necessary information we need to serve you better.</p>
                <p>If you have any questions, please contact us.</p>
                <p>Best regards,<br>${companyName} Team<br>
                Email: ${companyEmail}<br>
                Phone: ${companyPhone}</p>
            `
        });

        // Track email in EmailTracking entity
        await base44.asServiceRole.entities.EmailTracking.create({
            client_id: client.id,
            client_name: clientName,
            recipient_email: clientEmail,
            subject: `Complete Your Client Intake Form - ${companyName}`,
            email_type: 'client_intake',
            sent_date: new Date().toISOString(),
            sent_by_id: user.id,
            sent_by_name: user.full_name,
            status: 'sent'
        });

        return Response.json({
            success: true,
            spreadsheetId,
            spreadsheetUrl,
            questionsCount: questions.length
        });

    } catch (error) {
        console.error('Error generating intake form:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});