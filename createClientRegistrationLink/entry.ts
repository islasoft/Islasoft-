import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can create registration links
    const isManager = user.role === 'admin' || user.team_category === 'cpa' || user.team_category === 'senior_staff';
    if (!isManager) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, name, clientType } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Create pending client record
    const client = await base44.asServiceRole.entities.Client.create({
      email,
      name: name || '',
      status: 'pending',
      registration_token: token,
      manager_id: user.id,
      manager_name: user.full_name
    });

    // Get company settings
    const companySettings = await base44.asServiceRole.entities.CompanySettings.list();
    const companyName = companySettings[0]?.company_name || 'Isla Accounting Corp';
    const companyPhone = companySettings[0]?.phone || '(305) 290-1145';
    const companyEmail = companySettings[0]?.email || 'info@islaccounting.com';

    // Generate registration link — always use the fixed app URL
    const registrationUrl = `https://cpa-practice-manager-isla.base44.app/ClientOnboarding?token=${token}`;

    // Simple plain-text style email message
    const firstName = (name || '').split(' ')[0] || 'there';
    const emailBody = `Hi ${firstName},\n\nWe have created a secure Client Data Intake form for you to fill out your information with ${companyName}.\n\nPlease click the link below to complete your information:\n\n<a href="${registrationUrl}">Client Data Intake Form</a>\n\nThis is a simple web form — no account needed. It takes just a few minutes to complete and your data is encrypted and secure.\n\nThank you,\n${companyName}`;

    // Send email using Base44 integration
    try {
      const fromEmail = companySettings[0]?.from_email || 'noreply@islaccounting.com';
      
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Action Required: Complete Your Client Data Intake Form — ${companyName}`,
        body: emailBody,
        from_name: companyName
      });
      
      console.log('✅ Registration email sent successfully to:', email);
      console.log('Registration URL:', registrationUrl);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // Don't fail the entire request if email fails - still return success
      console.warn('⚠️ Client created but email delivery failed');
    }

    return Response.json({ 
      success: true, 
      registrationUrl,
      clientId: client.id,
      emailSentTo: email,
      message: 'Registration link created and email sent successfully'
    });
  } catch (error) {
    console.error('Error creating registration link:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});