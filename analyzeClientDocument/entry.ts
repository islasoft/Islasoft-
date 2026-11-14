import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, document_type } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Define extraction prompt based on document type
    const prompts = {
      tax_form: `Analyze this tax document and extract all relevant information. Look for:
- Personal information (name, SSN, DOB, address)
- Income information
- Filing status
- Dependents
- Any other tax-related details
Return the data in a structured format matching the provided schema.`,
      
      income_statement: `Analyze this income statement/pay stub and extract:
- Employee/individual name
- Employer information
- Income amounts (gross, net)
- Tax withholdings
- Pay period and dates
- Any banking information (account numbers for direct deposit)
Return the data in a structured format.`,
      
      business_document: `Analyze this business document and extract:
- Company/business name
- EIN (Employer Identification Number)
- Business address
- Contact information
- Entity type (LLC, Corporation, etc.)
- Tax classification
- Any banking or financial information
Return the data in a structured format.`,
      
      bank_statement: `Analyze this bank statement and extract:
- Account holder name
- Bank name
- Account number
- Routing number
- Account type (checking/savings)
- Any address information
Return the data in a structured format.`,
      
      drivers_license: `Analyze this driver's license and extract:
- Full name (first, middle, last)
- Date of birth
- License number
- Issue date
- Expiration date
- Address
Return the data in a structured format.`,
      
      general: `Analyze this document and extract any client-relevant information including:
- Names (individual or business)
- Contact information (phone, email, address)
- Tax identification numbers (SSN, EIN)
- Financial information
- Entity information
- Any other relevant details for a client record
Return the data in a structured format.`
    };

    const prompt = prompts[document_type] || prompts.general;

    // Schema for structured extraction
    const response_json_schema = {
      type: "object",
      properties: {
        document_type_detected: { type: "string" },
        client_type: { 
          type: "string",
          enum: ["individual", "entity", "unknown"]
        },
        extracted_data: {
          type: "object",
          properties: {
            // Individual fields
            name: { type: "string" },
            middle_name: { type: "string" },
            last_name: { type: "string" },
            dob: { type: "string" },
            ssn: { type: "string" },
            filing_status: { type: "string" },
            dependents: { type: "number" },
            dl_id: { type: "string" },
            dl_issued: { type: "string" },
            dl_expire: { type: "string" },
            
            // Entity fields
            company_name: { type: "string" },
            contact_person: { type: "string" },
            ein: { type: "string" },
            incorporated_as: { type: "string" },
            taxed_as: { type: "string" },
            
            // Common fields
            email: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zip_code: { type: "string" },
            
            // Banking
            bank_name: { type: "string" },
            bank_account: { type: "string" },
            bank_routing: { type: "string" },
            account_type: { type: "string" }
          }
        },
        confidence_score: { 
          type: "number",
          description: "0-100, how confident the AI is in the extraction"
        },
        flags_for_review: {
          type: "array",
          items: { type: "string" },
          description: "Issues or uncertainties that need human review"
        },
        additional_notes: { type: "string" }
      },
      required: ["document_type_detected", "client_type", "extracted_data", "confidence_score"]
    };

    console.log('🔍 Analyzing document with AI...');

    // Call LLM with vision capability
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema
    });

    console.log('✅ Document analyzed successfully');

    // Clean up extracted data - remove empty strings and nulls
    const cleanedData = {};
    for (const [key, value] of Object.entries(result.extracted_data)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value;
      }
    }

    return Response.json({
      success: true,
      analysis: {
        ...result,
        extracted_data: cleanedData
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing document:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze document'
    }, { status: 500 });
  }
});