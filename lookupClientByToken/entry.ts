import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return Response.json({ client: null }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);
    const clients = await base44.asServiceRole.entities.Client.filter({ registration_token: token });

    if (!clients || clients.length === 0) {
      console.log('No client found for token:', token);
      return Response.json({ client: null }, { status: 200 });
    }

    const client = clients[0];
    console.log('Found client:', client.id, 'status:', client.status);

    // Check token expiry if set
    if (client.registration_token_expires_at && new Date(client.registration_token_expires_at) < new Date()) {
      console.log('Token expired for client:', client.id);
      return Response.json({ client: null }, { status: 200 });
    }

    // SECURITY: Return only non-sensitive fields needed for the onboarding form.
    return Response.json({
      client: {
        id: client.id,
        name: client.name,
        middle_name: client.middle_name,
        last_name: client.last_name,
        company_name: client.company_name,
        contact_person: client.contact_person,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        zip_code: client.zip_code,
        ein: client.ein,
        incorporated_as: client.incorporated_as,
        taxed_as: client.taxed_as,
        year_end: client.year_end,
        filing_status: client.filing_status,
        dependents: client.dependents,
        dl_id: client.dl_id,
        account_type: client.account_type,
        bank_name: client.bank_name,
        status: client.status,
      }
    });
  } catch (error) {
    console.error('lookupClientByToken error:', error.message);
    return Response.json({ error: error.message, client: null }, { status: 200 });
  }
});