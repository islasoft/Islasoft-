import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Link, Send, Loader2, CheckCircle, User, Building2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuickIntakeLinkDialog({ open, onOpenChange }) {
  const [step, setStep] = useState('type'); // 'type' | 'details' | 'done'
  const [clientType, setClientType] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const reset = () => {
    setStep('type');
    setClientType('');
    setName('');
    setEmail('');
    setGeneratedLink('');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSelectType = (type) => {
    setClientType(type);
    setStep('details');
  };

  const handleGenerate = async () => {
    if (!email) { toast.error('Email is required to generate the intake link'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createClientRegistrationLink', { email, name, clientType });
      const link = res.data?.registrationUrl;
      if (!link) throw new Error('No link returned');
      setGeneratedLink(link);
      setStep('done');
      toast.success('Intake link created and sent to client!');
    } catch (err) {
      toast.error('Failed to generate link: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-sky-600" />
            Quick Client Intake
          </DialogTitle>
          {step === 'type' && (
            <DialogDescription>
              Select the type of client to generate the right intake form.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step 1: Choose type */}
        {step === 'type' && (
          <div className="space-y-3 pt-1">
            <button
              onClick={() => handleSelectType('individual')}
              className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-sky-400 hover:bg-sky-50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                <User className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Individual / Personal</p>
                <p className="text-sm text-slate-500">Personal tax returns, individual filings</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('entity')}
              className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Business / Entity</p>
                <p className="text-sm text-slate-500">LLC, Corporation, S-Corp, Partnership</p>
              </div>
            </button>

            <Button variant="outline" className="w-full mt-2" onClick={handleClose}>Cancel</Button>
          </div>
        )}

        {/* Step 2: Fill in details */}
        {step === 'details' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('type')}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {clientType === 'individual' ? 'Individual / Personal' : 'Business / Entity'}
            </button>

            <div className="space-y-1">
              <Label htmlFor="qi-name">Client Name <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input id="qi-name" placeholder={clientType === 'individual' ? 'Jane Doe' : 'Acme LLC'} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="qi-email">Email Address <span className="text-red-500">*</span></Label>
              <Input id="qi-email" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
              <Button
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white"
                onClick={handleGenerate}
                disabled={loading || !email}
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Send className="w-4 h-4 mr-2" />Send Intake Link</>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Intake link sent!</p>
                <p className="text-sm text-green-700">Email sent to <strong>{email}</strong>.</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-500">Or share the link manually</span>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
                <Copy className="w-3 h-3" /> Copy Link
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Send Another</Button>
              <Button className="flex-1" onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}