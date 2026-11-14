import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, interviewId } = await req.json();

    // Fetch client data
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    // Build context about the client
    const isIndividual = !client.incorporated_as || client.incorporated_as === 'Sole Proprietorship';
    const entityType = client.incorporated_as || 'Individual';
    const services = client.notes || '';
    const taxedAs = client.taxed_as || '';

    const prompt = `You are a CPA at Isla Accounting Corp. A client is about to have their initial interview.

Client Details:
- Name: ${client.company_name || [client.name, client.last_name].filter(Boolean).join(' ')}
- Type: ${isIndividual ? 'Individual' : `Business (${entityType})`}
${!isIndividual ? `- Taxed As: ${taxedAs}` : ''}
${client.filing_status ? `- Filing Status: ${client.filing_status}` : ''}
${client.dependents ? `- Dependents: ${client.dependents}` : ''}
${services ? `- Notes/Services Requested: ${services}` : ''}

Generate:
1. A list of 4-8 suggested projects/services for this client based on their profile.
2. A document checklist of items they should bring to the interview.

Return JSON with this exact structure:
{
  "suggested_projects": [
    {
      "project_type": "individual_tax_1040",
      "project_category": "tax_compliance",
      "description": "Brief description of why this service is recommended",
      "priority": "high"
    }
  ],
  "document_checklist": [
    {
      "item": "Document name",
      "category": "Tax Documents",
      "required": true
    }
  ]
}

Project types must be from: individual_tax_1040, business_tax_1120, s_corp_tax_1120s, partnership_tax_1065, amended_tax_1040x, extension_filing, estimated_tax_quarterly, k1_preparation, tax_planning_session, entity_formation, s_corp_election_2553, entity_classification_8832, entity_conversion, operating_agreement_bylaws, dissolution_closure, sunbiz_annual_report, monthly_bookkeeping, quarterly_bookkeeping, annual_bookkeeping, bank_reconciliations, chart_of_accounts_setup, financial_statement_prep, quickbooks_setup, payroll_setup, payroll_processing, quarterly_payroll_941, annual_payroll_w2, 1099_preparation, sales_tax_registration, monthly_sales_tax, irs_notice_review, penalty_abatement, irs_account_reconciliation, eftps_setup, power_of_attorney_2848, installment_agreement, cash_flow_analysis, budgeting_forecasting, cfo_services, tax_optimization_review, client_onboarding.

Project categories: tax_compliance, entity_structuring, bookkeeping_accounting, payroll_employment, sales_local_tax, irs_representation, advisory_cfo, audit_assurance, systems_internal.

Priority must be: low, medium, high, or urgent.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggested_projects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                project_type: { type: 'string' },
                project_category: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' }
              }
            }
          },
          document_checklist: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                category: { type: 'string' },
                required: { type: 'boolean' }
              }
            }
          }
        }
      }
    });

    // Update the interview record with the generated prep materials
    if (interviewId) {
      await base44.asServiceRole.entities.ClientInterview.update(interviewId, {
        suggested_projects: result.suggested_projects || [],
        document_checklist: result.document_checklist || [],
        prep_generated_at: new Date().toISOString(),
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});