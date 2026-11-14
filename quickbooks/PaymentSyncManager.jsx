import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { RefreshCw, DollarSign, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handlePullPayments = async () => {
    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('pullQuickBooksPayments');
      
      if (response.data.success) {
        toast.success(
          `Synced ${response.data.updated_invoices} invoices and created ${response.data.created_payments} payment records`
        );
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Payment sync error:', error);
      toast.error('Failed to sync payments: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Payment Status Sync
        </CardTitle>
        <CardDescription>
          Pull payment status from QuickBooks and automatically update invoice statuses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Fetches recent payments from QuickBooks (last 90 days)</li>
            <li>• Matches payments to synced invoices</li>
            <li>• Automatically marks invoices as paid</li>
            <li>• Creates payment records in your system</li>
            <li>• Real-time updates via QuickBooks webhooks</li>
          </ul>
        </div>

        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            Last synced: {lastSync.toLocaleString()}
          </div>
        )}

        <Button
          onClick={handlePullPayments}
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Syncing Payments...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Pull Payment Updates from QuickBooks
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 Tip: Payments are automatically synced via webhooks when they occur in QuickBooks.</p>
          <p>Use this button to pull any missed updates or for initial sync.</p>
        </div>
      </CardContent>
    </Card>
  );
}