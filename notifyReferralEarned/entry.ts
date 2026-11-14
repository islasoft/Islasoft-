import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reward_id } = await req.json();
    if (!reward_id) return Response.json({ error: 'reward_id required' }, { status: 400 });

    const reward = await base44.asServiceRole.entities.ReferralReward.get(reward_id);
    if (!reward) return Response.json({ error: 'Reward not found' }, { status: 404 });

    // Get the referring client's email
    const referrerClient = await base44.asServiceRole.entities.Client.get(reward.referrer_client_id);
    if (!referrerClient?.email) {
      return Response.json({ error: 'Referrer has no email on file' }, { status: 400 });
    }

    const rewardLabel = {
      credit: 'Account Credit',
      discount: 'Discount',
      gift_card: 'Gift Card',
      cash: 'Cash',
    }[reward.reward_type] || reward.reward_type;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: referrerClient.email,
      from_name: 'Isla Accounting Corp',
      subject: `🎉 Your Referral Reward Has Been Earned!`,
      body: `Dear ${referrerClient.company_name || referrerClient.name || 'Valued Client'},

Great news! Your referral reward has been approved and is ready to be redeemed.

Referred Client: ${reward.referred_client_name}
Reward: ${rewardLabel} — $${reward.reward_value}
Status: Earned ✓

To redeem your reward, please contact our office and we'll apply it to your next invoice or arrange payment.

Thank you for referring ${reward.referred_client_name} to us — we truly appreciate your trust and support!

Warm regards,
Isla Accounting Corp`,
    });

    return Response.json({ success: true, sent_to: referrerClient.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});