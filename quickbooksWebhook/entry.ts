import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // For webhooks, use service role since QuickBooks calls this endpoint
    const body = await req.json();
    
    console.log('QuickBooks webhook received:', JSON.stringify(body, null, 2));

    // QuickBooks sends an array of event notifications
    if (!body.eventNotifications || body.eventNotifications.length === 0) {
      return Response.json({ received: true });
    }

    // Get company settings
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0];

    if (!settings?.quickbooks_access_token) {
      console.error('QuickBooks not connected');
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }

    // Process each notification
    for (const notification of body.eventNotifications) {
      const realmId = notification.realmId;
      
      // Check for Payment events
      if (notification.dataChangeEvent?.entities) {
        for (const entity of notification.dataChangeEvent.entities) {
          if (entity.name === 'Payment' && entity.operation === 'Create') {
            // A payment was created - fetch payment details to find linked invoice
            const paymentId = entity.id;
            
            const paymentResponse = await fetch(
              `https://quickbooks.api.intuit.com/v3/company/${realmId}/payment/${paymentId}`,
              {
                headers: {
                  'Authorization': `Bearer ${settings.quickbooks_access_token}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              const payment = paymentData.Payment;

              // Find which invoice(s) this payment is linked to
              if (payment.Line && payment.Line.length > 0) {
                for (const line of payment.Line) {
                  if (line.LinkedTxn && line.LinkedTxn.length > 0) {
                    for (const linkedTxn of line.LinkedTxn) {
                      if (linkedTxn.TxnType === 'Invoice') {
                        const qbInvoiceId = linkedTxn.TxnId;
                        
                        // Find our invoice by QuickBooks ID
                        const invoices = await base44.asServiceRole.entities.Invoice.filter({
                          quickbooks_invoice_id: qbInvoiceId
                        });

                        if (invoices.length > 0) {
                          const invoice = invoices[0];
                          
                          // Update invoice status to paid
                          await base44.asServiceRole.entities.Invoice.update(invoice.id, {
                            status: 'paid',
                            quickbooks_payment_received_at: new Date().toISOString()
                          });

                          console.log(`Invoice ${invoice.invoice_number} marked as paid from QuickBooks webhook`);
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Handle Item updates
          if (entity.name === 'Item' && (entity.operation === 'Create' || entity.operation === 'Update')) {
            const qbItemId = entity.id;
            
            // Fetch item from QuickBooks
            const itemResponse = await fetch(
              `https://quickbooks.api.intuit.com/v3/company/${realmId}/item/${qbItemId}`,
              {
                headers: {
                  'Authorization': `Bearer ${settings.quickbooks_access_token}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (itemResponse.ok) {
              const itemData = await itemResponse.json();
              const qbItem = itemData.Item;
              
              const existingItems = await base44.asServiceRole.entities.QuickBooksItem.filter({
                quickbooks_item_id: qbItemId
              });

              const itemPayload = {
                quickbooks_item_id: qbItem.Id,
                name: qbItem.Name,
                description: qbItem.Description || '',
                type: qbItem.Type,
                unit_price: qbItem.UnitPrice || 0,
                income_account_ref: qbItem.IncomeAccountRef?.value,
                active: qbItem.Active !== false,
                taxable: qbItem.Taxable === true,
                synced_at: new Date().toISOString()
              };

              if (existingItems.length > 0) {
                await base44.asServiceRole.entities.QuickBooksItem.update(existingItems[0].id, itemPayload);
              } else {
                await base44.asServiceRole.entities.QuickBooksItem.create(itemPayload);
              }
              
              console.log(`Item ${qbItem.Name} synced from QuickBooks webhook`);
            }
          }

          // Handle Customer updates
          if (entity.name === 'Customer' && entity.operation === 'Update') {
            const qbCustomerId = entity.id;
            
            // Find our client
            const clients = await base44.asServiceRole.entities.Client.filter({
              quickbooks_customer_id: qbCustomerId
            });

            if (clients.length > 0) {
              const client = clients[0];
              
              // Fetch updated customer from QuickBooks
              const customerResponse = await fetch(
                `https://quickbooks.api.intuit.com/v3/company/${realmId}/customer/${qbCustomerId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${settings.quickbooks_access_token}`,
                    'Accept': 'application/json'
                  }
                }
              );

              if (customerResponse.ok) {
                const customerData = await customerResponse.json();
                const qbCustomer = customerData.Customer;
                
                // Update client with QuickBooks changes
                const updateData = {
                  quickbooks_last_synced: new Date().toISOString()
                };

                if (qbCustomer.PrimaryEmailAddr?.Address) {
                  updateData.email = qbCustomer.PrimaryEmailAddr.Address;
                }
                if (qbCustomer.PrimaryPhone?.FreeFormNumber) {
                  updateData.phone = qbCustomer.PrimaryPhone.FreeFormNumber;
                }
                if (qbCustomer.BillAddr) {
                  if (qbCustomer.BillAddr.Line1) updateData.address = qbCustomer.BillAddr.Line1;
                  if (qbCustomer.BillAddr.City) updateData.city = qbCustomer.BillAddr.City;
                  if (qbCustomer.BillAddr.CountrySubDivisionCode) updateData.state = qbCustomer.BillAddr.CountrySubDivisionCode;
                  if (qbCustomer.BillAddr.PostalCode) updateData.zip_code = qbCustomer.BillAddr.PostalCode;
                }

                await base44.asServiceRole.entities.Client.update(client.id, updateData);
                console.log(`Client ${client.company_name || client.name} updated from QuickBooks webhook`);
              }
            }
          }

          // Handle Invoice updates
          if (entity.name === 'Invoice' && (entity.operation === 'Update' || entity.operation === 'Delete')) {
            const qbInvoiceId = entity.id;
            
            // Find our invoice
            const invoices = await base44.asServiceRole.entities.Invoice.filter({
              quickbooks_invoice_id: qbInvoiceId
            });

            if (invoices.length > 0) {
              const invoice = invoices[0];
              
              if (entity.operation === 'Update') {
                // Fetch updated invoice from QuickBooks
                const invoiceResponse = await fetch(
                  `https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${qbInvoiceId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${settings.quickbooks_access_token}`,
                      'Accept': 'application/json'
                    }
                  }
                );

                if (invoiceResponse.ok) {
                  const invoiceData = await invoiceResponse.json();
                  const qbInvoice = invoiceData.Invoice;
                  
                  // Update invoice with QuickBooks changes
                  const updateData = {
                    quickbooks_last_synced: new Date().toISOString()
                  };

                  // Update status based on balance
                  if (qbInvoice.Balance === 0) {
                    updateData.status = 'paid';
                    updateData.quickbooks_payment_received_at = new Date().toISOString();
                  } else if (qbInvoice.Balance < qbInvoice.TotalAmt) {
                    // Partial payment - keep as sent or overdue
                    updateData.status = invoice.status === 'overdue' ? 'overdue' : 'sent';
                  }

                  // Update dates if changed
                  if (qbInvoice.TxnDate && qbInvoice.TxnDate !== invoice.issue_date) {
                    updateData.issue_date = qbInvoice.TxnDate;
                  }
                  if (qbInvoice.DueDate && qbInvoice.DueDate !== invoice.due_date) {
                    updateData.due_date = qbInvoice.DueDate;
                  }

                  // Update total if changed
                  if (qbInvoice.TotalAmt && Math.abs(qbInvoice.TotalAmt - invoice.total) > 0.01) {
                    updateData.total = qbInvoice.TotalAmt;
                  }

                  // Update notes
                  if (qbInvoice.CustomerMemo?.value) {
                    updateData.notes = qbInvoice.CustomerMemo.value;
                  }

                  await base44.asServiceRole.entities.Invoice.update(invoice.id, updateData);
                  console.log(`Invoice ${invoice.invoice_number} updated from QuickBooks webhook`);
                }
              } else if (entity.operation === 'Delete') {
                // Mark invoice as cancelled or handle deletion
                await base44.asServiceRole.entities.Invoice.update(invoice.id, {
                  status: 'cancelled',
                  notes: (invoice.notes || '') + '\n[Deleted in QuickBooks]'
                });
              }
            }
          }
        }
      }
    }

    return Response.json({ received: true, processed: body.eventNotifications.length });

  } catch (error) {
    console.error('QuickBooks webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});