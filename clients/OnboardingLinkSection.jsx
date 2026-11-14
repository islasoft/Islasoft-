import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, MessageCircle, Mail, RefreshCw, AlertTriangle, Link } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OnboardingLinkSection({ client, currentUser, onTokenRegenerated }) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Only visible to admin, cpa, senior_staff
  const canView = currentUser?.role === 'admin' ||
    currentUser?.team_category === 'cpa' ||
    currentUser?.team_category === 'senior_staff';

  if (!canView) return null;

  const token = client?.registration_token;
  const onboardingUrl = token
    ? `${window.location.origin}/ClientOnboarding?token=${token}`
    : null;

  // Display name for WhatsApp greeting
  const firstName = client?.name || client?.contact_person?.split(' ')[0] || client?.company_name || 'there';

  const handleCopy = () => {
    navigator.clipboard.writeText(onboardingUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = `Hi ${firstName}, please complete your onboarding with Isla Accompting Corp here: ${onboardingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleWhatsAppIntakeChat = async () => {
    const url = base44.agents.getWhatsAppConnectURL('client_intake');
    navigator.clipboard.writeText(url);
    toast.success('ISLA intake chat link copied! Share it with your prospective client.');
  };

  const handleEmail = () => {
    const subject = 'Complete Your Onboarding — Isla Accompting Corp';
    const body = `Hi ${firstName},\n\nPlease complete your onboarding with Isla Accompting Corp by clicking the link below:\n\n${onboardingUrl}\n\nIf you have any questions, please contact us at (305) 954-4607.\n\nThank you,\nIsla Accompting Corp`;
    window.open(`mailto:${client?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleGenerateToken = async () => {
    setGenerating(true);
    try {
      const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      await base44.entities.Client.update(client.id, { registration_token: newToken });
      toast.success('Token generated successfully!');
      if (onTokenRegenerated) onTokenRegenerated(newToken);
    } catch {
      toast.error('Failed to generate token');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-blue-600" />
        <Label className="text-blue-800 font-semibold text-sm">Onboarding Link</Label>
      </div>

      {!token ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>No token yet — generate one first to create the onboarding link.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateToken}
            disabled={generating}
            className="border-blue-400 text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Token'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={onboardingUrl}
              className="text-xs bg-white font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy link"
              className="flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="border-green-500 text-green-700 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send via WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsAppIntakeChat}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium"
              title="Copy ISLA AI intake chat link to share with prospective clients"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Copy ISLA Intake Chat Link
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEmail}
              className="border-blue-400 text-blue-700 hover:bg-blue-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send via Email
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateToken}
              disabled={generating}
              className="text-gray-500 hover:bg-gray-50"
              title="Regenerate token (invalidates old link)"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Regenerating...' : 'Regenerate Token'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}