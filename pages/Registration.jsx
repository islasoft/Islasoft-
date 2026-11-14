import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Tag, CreditCard, CheckCircle2, ExternalLink, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';

const TERMS = `TERMS OF SERVICE & END USER LICENSE AGREEMENT
Last Updated: April 2026

This Software as a Service Agreement ("Agreement") is entered into between Isla Advisory and Trust LLC ("Company", "we", "us", or "our") and you, the registered user or entity ("Client").

1. ACCEPTANCE OF TERMS
By activating, accessing, or using IslaSoft Practice Manager, you agree to be bound by these Terms of Service. If you do not agree, you may not use this software.

2. LICENSE GRANT
Isla Advisory and Trust LLC grants you a limited, non-exclusive, non-transferable, revocable license to access and use IslaSoft Practice Manager solely for your internal business purposes during your active subscription period.

3. SUBSCRIPTION & ACCESS
Access to the platform is contingent on maintaining an active subscription or valid promo/lifetime license. Trial periods are time-limited and may be revoked without notice. Lifetime ("forever") licenses are perpetual subject to acceptable use.

4. DATA SECURITY & PRIVACY
We implement industry-standard security measures including encrypted data storage, secure HTTPS connections, role-based access controls (RBAC), and regular security audits. Your client and financial data is stored securely and is never sold to third parties.

You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately of any unauthorized access at security@islaadvisory.com.

5. CONFIDENTIALITY
All client data entered into the platform is treated as confidential. We will not disclose your data to third parties except as required by law or as strictly necessary to provide the service (e.g., email delivery, cloud storage providers).

6. PROHIBITED USES
You may not: (a) reverse engineer, decompile, or copy the software; (b) resell or sublicense access to third parties; (c) use the platform for any unlawful purposes; (d) attempt to gain unauthorized access to other accounts or systems; (e) upload malicious code or interfere with platform operations.

7. INTELLECTUAL PROPERTY
All software, design, branding, features, and content of IslaSoft Practice Manager are the exclusive intellectual property of Isla Advisory and Trust LLC. All rights reserved. Unauthorized reproduction or distribution is strictly prohibited.

8. DATA RETENTION & DELETION
Upon termination of your account, your data will be retained for 30 days and then permanently deleted unless a longer retention period is required by law. You may request data export prior to deletion.

9. LIMITATION OF LIABILITY
To the maximum extent permitted by applicable law, Isla Advisory and Trust LLC shall not be liable for any indirect, incidental, special, punitive, or consequential damages arising from your use of or inability to use the software.

10. INDEMNIFICATION
You agree to indemnify and hold harmless Isla Advisory and Trust LLC and its officers, directors, and employees from any claims, damages, or expenses arising from your use of the platform or violation of these Terms.

11. TERMINATION
We reserve the right to suspend or terminate your account for violation of these terms, non-payment, fraudulent activity, or misuse, with or without notice.

12. GOVERNING LAW
This Agreement is governed by the laws of the State of Florida, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Miami-Dade County, Florida.

13. CHANGES TO TERMS
We reserve the right to update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the updated Terms.

14. CONTACT INFORMATION
For legal, privacy, or security inquiries:
  Isla Advisory and Trust LLC
  Email: legal@islaadvisory.com
  Website: www.islaadvisory.com`;

export default function Registration() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [firmName, setFirmName] = useState('');
  const [step, setStep] = useState('choose');
  const [loading, setLoading] = useState(false);
  const [promoResult, setPromoResult] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // On mount: check if user was invited — if so, auto-assign to existing firm
  useEffect(() => {
    const checkInvitation = async () => {
      try {
        const me = await base44.auth.me();
        if (me?.email) {
          const invitations = await base44.entities.PendingInvitation.filter({ email: me.email });
          const pending = invitations?.find(i => i.tenant_id && !i.processed);
          if (pending) {
            // Use the backend function to reliably set tenant_id on the user record
            await base44.functions.invoke('fixUserTenant', {
              target_email: me.email,
              tenant_id: pending.tenant_id,
              role: pending.role || 'user',
              team_category: pending.team_category || '',
            });
            await base44.entities.PendingInvitation.update(pending.id, { processed: true });
            toast.success('Welcome! Your account has been set up.');
            navigate('/');
            return;
          }
        }
      } catch (e) {
        // ignore, fall through to registration
      } finally {
        setChecking(false);
      }
    };
    checkInvitation();
  }, []);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('validatePromoCode', { code: promoCode.trim() });
      const data = res.data;
      if (!data.valid) {
        toast.error(data.message || 'Invalid or inactive promo code.');
        return;
      }
      setPromoResult(data);
      setStep('firm');
    } catch (e) {
      toast.error('Failed to validate promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!firmName.trim() || !agreedToTerms) return;
    setLoading(true);
    try {
      const now = new Date();
      const trialExpires = new Date(now);
      trialExpires.setDate(trialExpires.getDate() + 14);

      const settingsData = {
        company_name: firmName.trim(),
        subscription_tier: promoResult.code_type === 'forever' ? 'forever' : 'trial',
        ...(promoResult.code_type !== 'forever' && { trial_expires_at: trialExpires.toISOString() }),
      };

      const settings = await base44.entities.CompanySettings.create(settingsData);
      await base44.auth.updateMe({ tenant_id: settings.id, role: 'admin', team_category: 'internal' });
      toast.success(promoResult.code_type === 'forever' ? 'Lifetime access activated!' : '14-day trial activated!');
      navigate('/');
    } catch (e) {
      toast.error('Failed to activate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mx-auto mb-3">
            <ReceiptText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome to IslaSoft</h1>
          <p className="text-slate-500 mt-1">Let's get your firm set up</p>
        </div>

        {step === 'choose' && (
          <div className="space-y-3">
            <Card className="cursor-pointer hover:border-sky-400 transition-colors" onClick={() => setStep('promo')}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">I have a promo code</p>
                  <p className="text-sm text-slate-500">Enter your code to activate trial or lifetime access</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => setStep('stripe')}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Subscribe with Stripe</p>
                  <p className="text-sm text-slate-500">Get full access with a monthly subscription</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'promo' && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Promo Code</CardTitle>
              <CardDescription>Your code will be validated instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="e.g. ISLA2024"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidatePromo()}
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">Back</Button>
                <Button onClick={handleValidatePromo} disabled={loading || !promoCode.trim()} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate Code'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'firm' && promoResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-600 font-medium text-sm">
                  {promoResult.code_type === 'forever' ? 'Lifetime access unlocked!' : '14-day trial unlocked!'}
                </span>
              </div>
              <CardTitle>What's your firm name?</CardTitle>
              <CardDescription>This will appear on your invoices and documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="e.g. Acme Accounting Corp"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                autoFocus
              />
              <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer"
                />
                <label htmlFor="terms" className="cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-sky-600 underline font-medium">
                    Terms of Service & Legal Agreement
                  </button>
                  {' '}and acknowledge the data security and privacy practices of{' '}
                  <span className="font-semibold text-slate-700">Isla Advisory and Trust LLC</span>.
                </label>
              </div>
              <Button onClick={handleActivate} disabled={loading || !firmName.trim() || !agreedToTerms} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate & Enter App'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'stripe' && (
          <Card>
            <CardHeader>
              <CardTitle>Subscribe to IslaSoft</CardTitle>
              <CardDescription>Step 1 of 2 — Complete your subscription payment first</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
                <p className="font-semibold mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-emerald-700">
                  <li>Click the button below to open Stripe and complete payment</li>
                  <li>Return here and click "I've Completed Payment"</li>
                  <li>Enter your firm name to become the Master Admin</li>
                </ol>
              </div>
              <a
                href="https://buy.stripe.com/14A28s1B5a76gJI7ja0Ba01"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Payment Page
                </Button>
              </a>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setStep('stripe_confirm')}
              >
                I've Completed Payment →
              </Button>
              <Button variant="ghost" onClick={() => setStep('choose')} className="w-full text-slate-500">Back</Button>
            </CardContent>
          </Card>
        )}

        {step === 'stripe_confirm' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-600 font-medium text-sm">Step 2 of 2 — Set up your firm</span>
              </div>
              <CardTitle>You're the Master Admin</CardTitle>
              <CardDescription>Enter your firm name to complete registration. You'll have full control to add team members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="e.g. Acme Accounting Corp"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                autoFocus
              />
              <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <input
                  type="checkbox"
                  id="terms-stripe"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer"
                />
                <label htmlFor="terms-stripe" className="cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-sky-600 underline font-medium">
                    Terms of Service & Legal Agreement
                  </button>
                  {' '}and acknowledge the data security and privacy practices of{' '}
                  <span className="font-semibold text-slate-700">Isla Advisory and Trust LLC</span>.
                </label>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || !firmName.trim() || !agreedToTerms}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const settings = await base44.entities.CompanySettings.create({
                      company_name: firmName.trim(),
                      subscription_tier: 'paid',
                    });
                    await base44.auth.updateMe({ tenant_id: settings.id, role: 'admin', team_category: 'internal' });
                    toast.success('Welcome, Master Admin! Your firm is now active.');
                    navigate('/');
                  } catch (e) {
                    toast.error('Failed to activate. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate Firm & Enter App'}
              </Button>
              <Button variant="ghost" onClick={() => setStep('stripe')} className="w-full text-slate-500">Go back to payment</Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-8 space-y-1">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()}{' '}
            <span className="font-semibold text-slate-500">Isla Advisory and Trust LLC</span>.
            All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            IslaSoft Practice Manager is a proprietary software product.
          </p>
          <button
            onClick={() => setShowTerms(true)}
            className="text-xs text-sky-500 underline hover:text-sky-700"
          >
            Terms of Service &amp; Privacy Policy
          </button>
        </div>
      </div>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service &amp; Legal Agreement</DialogTitle>
          </DialogHeader>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{TERMS}</pre>
          <div className="pt-4 border-t text-center text-xs text-slate-500">
            © {new Date().getFullYear()} <strong>Isla Advisory and Trust LLC</strong>. All rights reserved.<br />
            IslaSoft Practice Manager is a proprietary software product owned and operated by Isla Advisory and Trust LLC.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}