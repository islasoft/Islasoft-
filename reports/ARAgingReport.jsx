import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ARAgingReport() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['qbARReport', refreshKey],
    queryFn: async () => {
      const response = await base44.functions.invoke('getQuickBooksARReport', {});
      return response.data;
    },
    enabled: true
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Refreshing AR Aging Report...');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">Loading AR Aging Report...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !reportData?.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-red-600">
            {error?.message || reportData?.error || 'Failed to load report'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const report = reportData.report;
  const columns = report?.Columns?.Column || [];
  const rows = report?.Rows?.Row || [];

  // Find the data rows (skip header and section rows)
  const dataRows = rows.filter(row => row.type === 'Data' && row.ColData);
  
  // Find the total row
  const totalRow = rows.find(row => row.type === 'Section' && row.Summary);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Accounts Receivable Aging
            </CardTitle>
            <CardDescription>
              {report?.Header?.ReportName} - As of {report?.Header?.Time || 'Today'}
            </CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                {columns.slice(1).map((col, idx) => (
                  <th key={idx} className="text-right py-3 px-4 font-semibold text-sm">
                    {col.ColTitle}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b hover:bg-gray-50">
                  {row.ColData.map((cell, cellIdx) => (
                    <td 
                      key={cellIdx} 
                      className={`py-2 px-4 text-sm ${cellIdx === 0 ? 'text-left' : 'text-right'}`}
                    >
                      {cell.value || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {totalRow && (
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  {totalRow.Summary.ColData.map((cell, cellIdx) => (
                    <td 
                      key={cellIdx} 
                      className={`py-3 px-4 text-sm ${cellIdx === 0 ? 'text-left' : 'text-right'}`}
                    >
                      {cell.value}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}