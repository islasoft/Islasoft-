import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ valid: false, message: 'No code provided' });

    // Query the IslaOps app PromoCode entity
    const islaOpsAppId = '69d9057e6c721531b9af7849';
    const apiUrl = `https://api.base44.com/api/apps/${islaOpsAppId}/entities/PromoCode/filter`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app-id': islaOpsAppId,
      },
      body: JSON.stringify({ code: code.toUpperCase() }),
    });

    if (!response.ok) {
      return Response.json({ valid: false, message: 'Could not verify code' });
    }

    const results = await response.json();
    const promo = Array.isArray(results) ? results[0] : null;

    if (!promo) return Response.json({ valid: false, message: 'Promo code not found' });
    if (promo.status !== 'active') return Response.json({ valid: false, message: 'Promo code is no longer active' });

    return Response.json({
      valid: true,
      code_type: promo.code_type, // '15days' or 'forever'
    });
  } catch (error) {
    return Response.json({ valid: false, message: error.message }, { status: 500 });
  }
});