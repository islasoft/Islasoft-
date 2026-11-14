import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const clientId = Deno.env.get('QUICKBOOKS_PRODUCTION_CLIENT_ID');
    const clientSecret = Deno.env.get('QUICKBOOKS_PRODUCTION_CLIENT_SECRET');
    const appId = Deno.env.get('BASE44_APP_ID');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'QuickBooks credentials not configured' }, { status: 500 });
    }

    // Construct the callback URL
    const callbackUrl = `https://${appId}.base44.app/api/functions/quickbooksOAuthCallback`;

    console.log('QuickBooks Callback URL:', callbackUrl);
    console.log('Add this URL to QuickBooks Developer Portal -> Keys & credentials -> Redirect URIs');

    // QuickBooks OAuth2 authorization URL
    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
    authUrl.searchParams.set('state', user.id); // Use user ID as state for security
    authUrl.searchParams.set('prompt', 'login'); // Force login/company selection

    return Response.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('QuickBooks OAuth init error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});