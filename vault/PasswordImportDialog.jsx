import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PasswordImportDialog({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const csv = [
      ['name', 'username', 'password', 'date', 'security_questions', 'link', 'comments', 'contact_phone', 'category'].join(','),
      ['QuickBooks Online', 'user@example.com', 'password123', '2026-01-10', 'Q: Pet name? A: Fluffy', 'https://quickbooks.com', 'Main account', '555-1234', 'accounting_software'].join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password_vault_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setImporting(true);

      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from CSV
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  username: { type: 'string' },
                  password: { type: 'string' },
                  date: { type: 'string' },
                  security_questions: { type: 'string' },
                  link: { type: 'string' },
                  comments: { type: 'string' },
                  contact_phone: { type: 'string' },
                  category: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (result.status === 'error') {
        toast.error(result.details || 'Failed to parse CSV file');
        return;
      }

      const passwordsData = result.output?.data || result.output;
      
      if (!Array.isArray(passwordsData) || passwordsData.length === 0) {
        toast.error('No valid password data found in CSV');
        return;
      }

      // Filter out empty rows and ensure required fields
      const validPasswords = passwordsData.filter(pwd => pwd.name);

      if (validPasswords.length === 0) {
        toast.error('No valid passwords found. Ensure name field is provided.');
        return;
      }

      // Bulk create passwords
      await base44.entities.PasswordVault.bulkCreate(validPasswords);

      toast.success(`Successfully imported ${validPasswords.length} passwords`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import passwords');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-2 max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Import Passwords</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
          <p className="font-medium mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Download the CSV template</li>
            <li>Fill in your password data</li>
            <li>Upload the completed CSV file</li>
          </ol>
        </div>

        <Button
          onClick={downloadTemplate}
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>

        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {file ? file.name : 'Click to select CSV file'}
            </p>
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!file || importing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {importing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Import
        </Button>
      </CardFooter>
    </Card>
  );
}