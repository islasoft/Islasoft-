import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { RefreshCw, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickBooksSyncAll() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const { data } = await base44.functions.invoke('syncAllQuickBooks', {});
      
      if (data.success) {
        setLastSync(new Date());
        
        if (data.has_errors) {
          toast.warning(
            <div>
              <p className="font-semibold">Sync completed with some errors</p>
              <p className="text-sm">{data.summary}</p>
              {data.results.errors.length > 0 && (
                <div className="mt-2 text-xs">
                  {data.results.errors.slice(0, 3).map((err, idx) => (
                    <p key={idx} className="text-red-600">• {err}</p>
                  ))}
                </div>
              )}
            </div>,
            { duration: 8000 }
          );
        } else {
          toast.success(
            <div>
              <p className="font-semibold">QuickBooks sync completed!</p>
              <p className="text-sm">{data.summary}</p>
            </div>,
            { duration: 5000 }
          );
        }
      } else {
        toast.error('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync QuickBooks: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          QuickBooks Sync
        </CardTitle>
        <CardDescription>
          Sync all data between your app and QuickBooks in one click
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">What gets synced:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Pulls latest customers, items, and payments from QuickBooks</li>
            <li>• Pushes new clients and invoices to QuickBooks</li>
            <li>• Updates existing records with latest information</li>
          </ul>
        </div>

        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Last synced: {lastSync.toLocaleString()}
          </div>
        )}

        <Button 
          onClick={handleSyncAll} 
          disabled={isSyncing}
          className="w-full gap-2"
          size="lg"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sync All QuickBooks Data
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          This may take a few moments depending on the amount of data
        </p>
      </CardContent>
    </Card>
  );
}