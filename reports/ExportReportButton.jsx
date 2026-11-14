import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logAudit } from '../security/AuditLogger';

export default function ExportReportButton({ reportData, reportTitle, reportType }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToGoogleSheets = async () => {
    setIsExporting(true);
    try {
      logAudit('export_report', 'Report', reportType, `${reportTitle} - Google Sheets`);
      const response = await base44.functions.invoke('exportToGoogleSheets', {
        reportData,
        reportTitle,
        reportType
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success('Report exported to Google Sheets');
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export to Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToGoogleDocs = async () => {
    setIsExporting(true);
    try {
      logAudit('export_report', 'Report', reportType, `${reportTitle} - Google Docs`);
      const response = await base44.functions.invoke('exportToGoogleDocs', {
        reportData,
        reportTitle,
        reportType
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success('Report exported to Google Docs');
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export to Google Docs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || !reportData || reportData.length === 0}>
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToGoogleSheets}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export to Google Sheets
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToGoogleDocs}>
          <FileText className="w-4 h-4 mr-2" />
          Export to Google Docs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}