import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user ID
    const realmId = url.searchParams.get('realmId'); // QuickBooks company ID

    if (!code || !realmId) {
      return new Response(
        '<html><body><h1>Error</h1><p>Authorization failed. Please try again.</p><script>setTimeout(() => window.close(), 3000);</script></body></html>',
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const clientId = Deno.env.get('QUICKBOOKS_PRODUCTION_CLIENT_ID');
    const clientSecret = Deno.env.get('QUICKBOOKS_PRODUCTION_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response('<h1>Error: QuickBooks credentials not configured</h1>', {
        headers: { 'Content-Type': 'text/html' },
        status: 500
      });
    }
    const appId = Deno.env.get('BASE44_APP_ID');
    const callbackUrl = `https://${appId}.base44.app/api/functions/quickbooksOAuthCallback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: callbackUrl
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        '<html><body><h1>Error</h1><p>Failed to connect to QuickBooks. Please try again.</p><script>setTimeout(() => window.close(), 3000);</script></body></html>',
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    const tokens = await tokenResponse.json();

    // Use service role to store tokens in CompanySettings
    const base44 = createClientFromRequest(req);
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    
    const settingsData = {
      quickbooks_realm_id: realmId,
      quickbooks_access_token: tokens.access_token,
      quickbooks_refresh_token: tokens.refresh_token,
      quickbooks_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      quickbooks_connected: true,
      quickbooks_connected_at: new Date().toISOString()
    };

    if (settingsList.length > 0) {
      await base44.asServiceRole.entities.CompanySettings.update(settingsList[0].id, settingsData);
    } else {
      await base44.asServiceRole.entities.CompanySettings.create(settingsData);
    }

    // Automatically sync items from QuickBooks
    try {
      await base44.asServiceRole.functions.invoke('syncQuickBooksItems', {});
    } catch (error) {
      console.error('Failed to sync items:', error);
      // Don't fail the connection if item sync fails
    }

    return new Response(
      '<html><body><h1>Success!</h1><p>QuickBooks connected successfully. You can close this window.</p><script>setTimeout(() => window.close(), 2000);</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('QuickBooks OAuth callback error:', error);
    return new Response(
      '<html><body><h1>Error</h1><p>An error occurred. Please try again.</p><script>setTimeout(() => window.close(), 3000);</script></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
});