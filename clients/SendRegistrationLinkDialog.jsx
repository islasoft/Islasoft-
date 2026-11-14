import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Copy, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SendRegistrationLinkDialog({ onClose }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState('');

  const handleSend = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('createClientRegistrationLink', {
        email,
        name
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      setRegistrationUrl(response.data.registrationUrl);
      toast.success('Registration link sent successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send registration link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registrationUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Client Registration Link</DialogTitle>
        </DialogHeader>

        {!registrationUrl ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client Name (Optional)</Label>
              <Input
                id="client-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="client-email">Client Email *</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading || !email}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Link
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Link sent successfully!</span>
            </div>

            <div>
              <Label>Registration Link</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={registrationUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  size="icon"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                An email has been sent to {email} with this registration link.
              </p>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}