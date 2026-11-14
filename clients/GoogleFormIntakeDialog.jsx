import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, FileSpreadsheet, Send, Copy } from 'lucide-react';

export default function GoogleFormIntakeDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientType: 'individual'
  });
  const [generatedUrl, setGeneratedUrl] = useState('');

  const handleGenerate = async () => {
    if (!formData.clientName || !formData.clientEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateClientIntakeForm', {
        clientType: formData.clientType,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail
      });

      if (response.data.success) {
        setGeneratedUrl(response.data.spreadsheetUrl);
        toast.success('Intake form created and sent to client!');
      } else {
        toast.error('Failed to generate form');
      }
    } catch (error) {
      console.error('Error generating form:', error);
      toast.error('Failed to generate intake form');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleReset = () => {
    setFormData({ clientName: '', clientEmail: '', clientType: 'individual' });
    setGeneratedUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            AI-Powered Client Intake
          </DialogTitle>
          <DialogDescription>
            Generate a custom Google Sheets intake form tailored to your client. They'll fill it out and data syncs back automatically.
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientType">Client Type</Label>
              <select
                id="clientType"
                value={formData.clientType}
                onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="individual">Individual Tax Client</option>
                <option value="entity">Business Entity</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="John Doe or ABC Corp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="client@example.com"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating AI Form...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate & Send Form
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                ✅ Form created and sent to {formData.clientEmail}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                The client will receive an email with a link to their personalized intake form.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Google Sheet Link</Label>
              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Create Another
              </Button>
              <Button
                onClick={() => {
                  window.open(generatedUrl, '_blank');
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Open Sheet
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}