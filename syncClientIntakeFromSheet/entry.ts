import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@144.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && user.team_category !== 'cpa' && user.team_category !== 'senior_staff')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { spreadsheetId, clientId } = await req.json();

        if (!spreadsheetId) {
            return Response.json({ error: 'Missing spreadsheetId' }, { status: 400 });
        }

        // Get Google Sheets access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });

        const sheets = google.sheets({ version: 'v4', auth });

        // Read data from the sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Client Information!A7:B1000' // Start after header row
        });

        const rows = response.data.values || [];
        
        if (rows.length === 0) {
            return Response.json({ error: 'No data found in sheet' }, { status: 400 });
        }

        // Parse the Q&A pairs into a structured object
        const clientData = {};
        const fieldMapping = {
            'full name': 'name',
            'first name': 'name',
            'last name': 'last_name',
            'middle name': 'middle_name',
            'email': 'email',
            'phone': 'phone',
            'address': 'address',
            'city': 'city',
            'state': 'state',
            'zip': 'zip_code',
            'zip code': 'zip_code',
            'date of birth': 'dob',
            'dob': 'dob',
            'ssn': 'ssn',
            'social security': 'ssn',
            'company name': 'company_name',
            'business name': 'company_name',
            'ein': 'ein',
            'filing status': 'filing_status',
            'dependents': 'dependents',
            'incorporated as': 'incorporated_as',
            'taxed as': 'taxed_as',
            'bank name': 'bank_name',
            'routing number': 'bank_routing',
            'account number': 'bank_account',
            'contact person': 'contact_person'
        };

        rows.forEach(row => {
            if (row.length >= 2 && row[0] && row[1]) {
                const question = row[0].toLowerCase().trim();
                const answer = row[1].trim();
                
                if (answer) {
                    // Try to map to known fields
                    for (const [key, field] of Object.entries(fieldMapping)) {
                        if (question.includes(key)) {
                            clientData[field] = answer;
                            break;
                        }
                    }
                }
            }
        });

        // Determine client type and set status
        const isEntity = clientData.company_name || clientData.ein;
        
        if (isEntity && !clientData.company_name && clientData.name) {
            clientData.company_name = clientData.name;
        }

        // Convert dependents to number if present
        if (clientData.dependents) {
            clientData.dependents = parseInt(clientData.dependents) || 0;
        }

        // Set status and manager
        clientData.status = 'pending';
        clientData.manager_id = user.id;
        clientData.manager_name = user.full_name;

        // Store sheet reference in notes
        clientData.notes = `Intake form: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n\n${clientData.notes || ''}`;

        // Create or update client
        let savedClient;
        if (clientId) {
            savedClient = await base44.asServiceRole.entities.Client.update(clientId, clientData);
        } else {
            // Generate client number
            const allClients = await base44.asServiceRole.entities.Client.list();
            const lastNumber = allClients
                .map(c => c.client_number)
                .filter(n => n && (n.startsWith('I-') || n.startsWith('E-')))
                .map(n => parseInt(n.split('-')[1]))
                .sort((a, b) => b - a)[0] || 0;
            
            const nextNumber = lastNumber + 1;
            const prefix = isEntity ? 'E' : 'I';
            clientData.client_number = `${prefix}-${String(nextNumber).padStart(3, '0')}`;

            savedClient = await base44.asServiceRole.entities.Client.create(clientData);
        }

        return Response.json({
            success: true,
            client: savedClient,
            fieldsImported: Object.keys(clientData).length
        });

    } catch (error) {
        console.error('Error syncing from sheet:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});