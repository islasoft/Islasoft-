import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.PromoCode.list();
    const existingCodes = existing.map(c => c.code);

    const codes = [
      { code: 'PARTNER1065FREE', description: 'Free partnership 1065 module — unlimited', discount_type: 'free', feature: 'partnership_1065', is_active: true, max_uses: 0, times_used: 0 },
      { code: 'ISLA1065', description: 'Free partnership 1065 module — 10 uses', discount_type: 'free', feature: 'partnership_1065', is_active: true, max_uses: 10, times_used: 0 },
      { code: '1065LAUNCH', description: 'Free partnership 1065 module — 5 uses', discount_type: 'free', feature: 'partnership_1065', is_active: true, max_uses: 5, times_used: 0 },
      { code: 'PARTNER50', description: '50% off partnership 1065 module', discount_type: 'percent', discount_value: 50, feature: 'partnership_1065', is_active: true, max_uses: 0, times_used: 0 },
      { code: 'CPAFRIEND', description: 'Free partnership 1065 module — 3 uses', discount_type: 'free', feature: 'partnership_1065', is_active: true, max_uses: 3, times_used: 0 },
      { code: 'EQUITY10FREE', description: 'Free equity split pro module — 5 uses', discount_type: 'free', feature: 'equity_split_pro', is_active: true, max_uses: 5, times_used: 0 },
    ];

    const toCreate = codes.filter(c => !existingCodes.includes(c.code));
    const created = [];
    for (const code of toCreate) {
      const result = await base44.asServiceRole.entities.PromoCode.create(code);
      created.push(result.code);
    }

    return Response.json({ created, skipped: codes.length - toCreate.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});