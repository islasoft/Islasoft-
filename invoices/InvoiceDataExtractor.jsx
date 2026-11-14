import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scan, Upload, Loader2, Check, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function InvoiceDataExtractor({ onDataExtracted }) {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
    }
  };

  const extractInvoiceData = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setExtracting(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data using AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            vendor_name: { type: 'string' },
            vendor_address: { type: 'string' },
            invoice_number: { type: 'string' },
            invoice_date: { type: 'string' },
            due_date: { type: 'string' },
            total_amount: { type: 'number' },
            tax_amount: { type: 'number' },
            subtotal: { type: 'number' },
            line_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unit_price: { type: 'number' },
                  amount: { type: 'number' },
                  category: { type: 'string' }
                }
              }
            },
            payment_terms: { type: 'string' },
            notes: { type: 'string' }
          }
        }
      });

      if (result.status === 'error') {
        toast.error(result.details || 'Failed to extract invoice data');
        return;
      }

      const data = result.output;
      setExtractedData(data);
      toast.success('Invoice data extracted successfully');
      
      if (onDataExtracted) {
        onDataExtracted(data);
      }
    } catch (error) {
      toast.error('Failed to extract invoice data');
      console.error(error);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-blue-600" />
          AI Invoice Data Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Upload Invoice (PDF, PNG, JPG)</Label>
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          {file && (
            <p className="text-sm text-gray-600">Selected: {file.name}</p>
          )}
        </div>

        <Button
          onClick={extractInvoiceData}
          disabled={!file || extracting}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {extracting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Scan className="w-4 h-4 mr-2" />
          )}
          Extract Invoice Data
        </Button>

        {extractedData && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-green-600 font-semibold">
              <Check className="w-4 h-4" />
              Data Extracted Successfully
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Vendor:</span>
                <p className="font-medium">{extractedData.vendor_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Invoice #:</span>
                <p className="font-medium">{extractedData.invoice_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{extractedData.invoice_date || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>
                <p className="font-medium">${extractedData.total_amount?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {extractedData.line_items && extractedData.line_items.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Line Items:</p>
                <div className="space-y-2">
                  {extractedData.line_items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-gray-600 flex justify-between">
                        <span>Qty: {item.quantity || 1}</span>
                        <span>${item.amount?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}