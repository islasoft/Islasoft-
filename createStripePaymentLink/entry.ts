import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, client_name, client_email, description, amount } = await req.json();

    if (!amount || !description) {
      return Response.json({ error: 'amount and description are required' }, { status: 400 });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    const product = await stripe.products.create({
      name: description,
      metadata: { client_id: client_id || '' },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountInCents,
      currency: 'usd',
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { client_id: client_id || '', client_name: client_name || '' },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you for your payment, ${client_name || 'valued client'}!`,
        },
      },
    });

    return Response.json({
      payment_link_url: paymentLink.url,
      payment_link_id: paymentLink.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});