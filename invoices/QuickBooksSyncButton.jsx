import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function QuickBooksSyncButton({ invoice, onSyncComplete }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [needsClientSync, setNeedsClientSync] = useState(false);
  const [clientId, setClientId] = useState(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data } = await base44.functions.invoke('syncInvoiceToQuickBooks', {
        invoice_id: invoice.id
      });

      if (data.needs_sync) {
        // Client needs to be synced first
        setNeedsClientSync(true);
        setClientId(data.client_id);
        setShowDialog(true);
      } else if (data.success) {
        toast.success('Invoice synced to QuickBooks!');
        if (onSyncComplete) onSyncComplete();
      } else if (data.error) {
        toast.error('Sync failed: ' + data.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      const errorMsg = error?.message || 'Unknown error';
      toast.error('Failed to sync: ' + errorMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncClient = async () => {
    if (!clientId) return;
    
    try {
      const { data } = await base44.functions.invoke('syncClientToQuickBooks', {
        client_id: clientId
      });

      if (data.success) {
        toast.success('Client synced to QuickBooks!');
        setShowDialog(false);
        // Now sync the invoice
        setTimeout(() => handleSync(), 500);
      } else if (data.error) {
        toast.error('Failed to sync client: ' + data.error);
      }
    } catch (error) {
      console.error('Client sync error:', error);
      toast.error('Failed to sync client: ' + (error?.message || 'Unknown error'));
    }
  };

  const isSynced = !!invoice.quickbooks_invoice_id;

  return (
    <>
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant={isSynced ? "outline" : "default"}
        size="sm"
        className="gap-2"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Syncing...
          </>
        ) : isSynced ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Re-sync to QB
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Push to QuickBooks
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Client Sync Required
            </DialogTitle>
            <DialogDescription>
              This client needs to be synced to QuickBooks before the invoice can be sent.
              Would you like to sync the client now?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSyncClient}>
              Sync Client & Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}