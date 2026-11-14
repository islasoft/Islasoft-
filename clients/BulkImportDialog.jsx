import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BulkImportDialog({ onClose, onSuccess, defaultClientType = 'entity' }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [clientType, setClientType] = useState(defaultClientType); // 'entity' or 'personal'

  const downloadTemplate = () => {
    let csv;
    
    if (clientType === 'personal') {
      csv = [
        ['client_number', 'status', 'name', 'middle_name', 'last_name', 'dob', 'ssn', 'filing_status', 'dependents', 'phone', 'email', 'address', 'city', 'state', 'zip_code', 'dl_id', 'dl_issued', 'dl_expire', 'bank_name', 'bank_account', 'bank_routing', 'account_type'].join(','),
        ['I-001', 'active', 'John', 'M', 'Doe', '1990-01-15', '123-45-6789', 'single', '0', '555-1234', 'john@example.com', '123 Main St', 'Miami', 'FL', '33101', 'D1234567', '2020-01-01', '2025-01-01', 'Chase Bank', '1234567890', '987654321', 'checking'].join(',')
      ].join('\n');
    } else {
      csv = [
        ['company_name', 'contact_person', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'ein', 'incorporated_as', 'taxed_as', 'status'].join(','),
        ['Example Corp', 'John Doe', 'john@example.com', '555-1234', '123 Main St', 'Miami', 'FL', '33101', '12-3456789', 'LLC', 'Partnership', 'active'].join(',')
      ].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${clientType}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Accept CSV files with various MIME types
      const isCSV = selectedFile.type === 'text/csv' || 
                    selectedFile.type === 'application/vnd.ms-excel' ||
                    selectedFile.name.endsWith('.csv');
      
      if (isCSV) {
        setFile(selectedFile);
        toast.success('File selected: ' + selectedFile.name);
      } else {
        toast.error('Please select a CSV file');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setImporting(true);

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        setImporting(false);
        return;
      }

      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult.file_url) {
        toast.error('Failed to upload file');
        setImporting(false);
        return;
      }

      const file_url = uploadResult.file_url;
      console.log('File uploaded successfully:', file_url);

      // Parse CSV using custom function
      const parseResponse = await base44.functions.invoke('parseCSVForClients', {
        file_url,
        client_type: clientType
      });

      if (parseResponse.data.error) {
        toast.error(parseResponse.data.error);
        setImporting(false);
        return;
      }

      const clientsData = parseResponse.data.clients || [];
      
      if (!Array.isArray(clientsData) || clientsData.length === 0) {
        toast.error('No valid client data found in CSV. Please check the file format matches the template.');
        setImporting(false);
        return;
      }
      
      console.log('Parsed clients:', clientsData.length);

      // Transform personal clients data to match Client entity schema
      const validClients = clientsData
        .filter(client => client.email)
        .map(client => {
          if (clientType === 'personal') {
            return {
              client_number: client.client_number,
              company_name: `${client.name || ''} ${client.middle_name || ''} ${client.last_name || ''}`.trim(),
              name: client.name,
              middle_name: client.middle_name,
              last_name: client.last_name,
              dob: client.dob,
              ssn: client.ssn,
              filing_status: client.filing_status,
              dependents: client.dependents ? parseFloat(client.dependents) || null : null,
              email: client.email,
              phone: client.phone,
              address: client.address,
              city: client.city,
              state: client.state,
              zip_code: client.zip_code,
              dl_id: client.dl_id,
              dl_issued: client.dl_issued,
              dl_expire: client.dl_expire,
              bank_name: client.bank_name,
              bank_account: client.bank_account,
              bank_routing: client.bank_routing,
              account_type: client.account_type,
              status: client.status || 'active',
              incorporated_as: '' // Empty to ensure it's classified as individual
            };
          } else {
            return {
              company_name: client.company_name,
              contact_person: client.contact_person,
              email: client.email,
              phone: client.phone,
              address: client.address,
              city: client.city,
              state: client.state,
              zip_code: client.zip_code,
              ein: client.ein,
              incorporated_as: client.incorporated_as,
              taxed_as: client.taxed_as,
              status: client.status || 'active'
            };
          }
        });

      if (validClients.length === 0) {
        toast.error('No valid clients found. Ensure email is provided for each client.');
        setImporting(false);
        return;
      }
      
      console.log('Creating clients:', validClients.length);

      // Bulk create clients using backend function
      const response = await base44.functions.invoke('importClients', { 
        clients: validClients 
      });

      if (response.data.error) {
        toast.error(response.data.error);
        setImporting(false);
        return;
      }

      toast.success(`Successfully imported ${response.data.count} clients`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to import clients';
      toast.error('Import failed: ' + errorMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-2 max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Import Clients</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-type-select">Client Type</Label>
          <Select value={clientType} onValueChange={setClientType}>
            <SelectTrigger id="client-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entity">Entity/Business</SelectItem>
              <SelectItem value="personal">Personal/Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
          <p className="font-medium mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Select client type (Entity or Personal)</li>
            <li>Download the corresponding CSV template</li>
            <li>Fill in your client data</li>
            <li>Upload the completed CSV file</li>
          </ol>
        </div>

        <Button
          onClick={downloadTemplate}
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download {clientType === 'personal' ? 'Personal' : 'Entity'} Template
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