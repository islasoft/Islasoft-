import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { paymentId } = await req.json();

        if (!paymentId) {
            return Response.json({ error: 'Missing paymentId' }, { status: 400 });
        }

        // Get payment record
        const payment = await base44.entities.ContractorPayment.filter({ id: paymentId });
        if (!payment || payment.length === 0) {
            return Response.json({ error: 'Payment not found' }, { status: 404 });
        }

        const paymentData = payment[0];

        // Get time entries
        const timeEntries = await base44.entities.TimeEntry.list();
        const approvedEntries = timeEntries.filter(entry => 
            paymentData.time_entry_ids.includes(entry.id)
        );

        // Get company settings
        const companySettings = await base44.entities.CompanySettings.list();
        const company = companySettings[0] || {};

        // Create PDF
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text(company.company_name || 'Isla Accounting Corp', 20, 20);
        
        doc.setFontSize(10);
        doc.text(`${company.address || '2325 Wiley St'}`, 20, 28);
        doc.text(`${company.city || 'Hollywood'}, ${company.state || 'FL'} ${company.zip_code || '33020'}`, 20, 33);
        doc.text(`Phone: ${company.phone || '(305) 290-1145'}`, 20, 38);

        // Title
        doc.setFontSize(16);
        doc.text('Contractor Payment Report', 20, 55);

        // Payment Info
        doc.setFontSize(12);
        doc.text(`Contractor: ${paymentData.contractor_name}`, 20, 65);
        doc.text(`Period: ${new Date(paymentData.period_start).toLocaleDateString()} - ${new Date(paymentData.period_end).toLocaleDateString()}`, 20, 72);
        doc.text(`Approved: ${new Date(paymentData.created_date).toLocaleDateString()}`, 20, 79);
        doc.text(`Approved By: ${paymentData.approved_by_name}`, 20, 86);

        // Summary Box
        doc.setFillColor(240, 249, 255);
        doc.rect(20, 92, 170, 20, 'F');
        doc.setFontSize(14);
        doc.text(`Total Hours: ${paymentData.total_hours.toFixed(2)}`, 25, 100);
        doc.text(`Rate: $${paymentData.hourly_rate}/hr`, 90, 100);
        doc.text(`Total: $${paymentData.total_amount.toFixed(2)}`, 140, 100);

        // Table Header
        doc.setFontSize(10);
        doc.setFillColor(220, 220, 220);
        doc.rect(20, 118, 170, 8, 'F');
        doc.text('Date', 22, 123);
        doc.text('Project', 45, 123);
        doc.text('Client', 95, 123);
        doc.text('Hours', 140, 123);
        doc.text('Amount', 165, 123);

        // Table Content
        let y = 133;
        approvedEntries.forEach((entry) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const amount = (entry.hours || 0) * paymentData.hourly_rate;
            
            doc.text(new Date(entry.date).toLocaleDateString(), 22, y);
            doc.text((entry.project_name || 'N/A').substring(0, 25), 45, y);
            doc.text((entry.client_name || 'N/A').substring(0, 25), 95, y);
            doc.text((entry.hours || 0).toFixed(2), 140, y);
            doc.text(`$${amount.toFixed(2)}`, 165, y);
            
            y += 7;
        });

        // Footer Line
        doc.setLineWidth(0.5);
        doc.line(20, y + 5, 190, y + 5);
        
        // Totals
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL:', 140, y + 12);
        doc.text(`${paymentData.total_hours.toFixed(2)} hrs`, 140, y + 19);
        doc.text(`$${paymentData.total_amount.toFixed(2)}`, 165, y + 19);

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Contractor-Payment-${paymentData.contractor_name}-${paymentData.period_start}.pdf"`
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});