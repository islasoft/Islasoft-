import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamImportDialog({ onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      'full_name',
      'email',
      'phone',
      'team_category',
      'hourly_rate',
      'employment_type'
    ];
    
    const sampleData = [
      'John Doe,john@example.com,(305) 123-4567,cpa,150,employee',
      'Jane Smith,jane@example.com,(305) 987-6543,senior_staff,100,contractor',
      'Bob Johnson,bob@example.com,(305) 555-1234,staff,75,employee'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid');
        setImporting(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const teamMembers = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const member = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            member[header] = values[index];
          }
        });

        if (member.email && member.full_name) {
          // Send invitation for each team member
          try {
            await base44.users.inviteUser(member.email, 'user');
            
            // Send welcome email with form requirement
            const employmentType = member.employment_type?.toLowerCase() || 'employee';
            const formType = employmentType === 'contractor' ? 'W-9 (Independent Contractor)' : 'W-4 (Employee)';
            
            await base44.integrations.Core.SendEmail({
              to: member.email,
              subject: 'Welcome to Isla Accompting Corp - Action Required',
              body: `Dear ${member.full_name},\n\nWelcome to Isla Accompting Corp!\n\nYou have been added to our team. Please:\n1. Check your email for the invitation link\n2. Sign in with your Google account (${member.email})\n3. Complete and sign the required ${formType}\n\nYour profile details:\n- Category: ${member.team_category || 'To be assigned'}\n- Hourly Rate: $${member.hourly_rate || 'To be determined'}\n\nYour access will be activated after you complete the onboarding process.\n\nFor questions, contact us at (305) 290-1145 or info@islaccounting.com.\n\nBest regards,\nIsla Accompting Corp Team`,
              from_name: 'Isla Accompting Corp'
            });
            
            teamMembers.push(member);
          } catch (error) {
            console.error(`Failed to invite ${member.email}:`, error);
          }
        }
      }

      toast.success(`Successfully invited ${teamMembers.length} team members`);
      onImportComplete?.();
      onClose();
    } catch (error) {
      toast.error('Import failed. Please check your CSV format.');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          Import Team Members
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
          <p className="text-sm text-blue-900 font-medium">Import Instructions:</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Download the template CSV file below</li>
            <li>Fill in team member information</li>
            <li>Each member will receive an invitation email</li>
            <li>They'll log in with their Google account</li>
            <li>Required forms (W-9/W-4) will be sent based on employment type</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Upload CSV File</label>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
          <p className="font-medium mb-1">CSV Format:</p>
          <p>full_name, email, phone, team_category (cpa/senior_staff/staff), hourly_rate, employment_type (employee/contractor)</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!file || importing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {importing ? (
            <>Importing...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import Team
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}