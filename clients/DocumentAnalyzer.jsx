import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2, Eye, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DocumentAnalyzer({ client, onClose, onDataExtracted }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('general');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editedData, setEditedData] = useState({});

  const documentTypes = [
    { value: 'general', label: 'General Document' },
    { value: 'tax_form', label: 'Tax Form (W-2, 1040, etc.)' },
    { value: 'income_statement', label: 'Income Statement / Pay Stub' },
    { value: 'business_document', label: 'Business Document' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'drivers_license', label: "Driver's License" }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setAnalysisResult(null);
        toast.success('File selected: ' + selectedFile.name);
      } else {
        toast.error('Please select an image (JPG, PNG) or PDF file');
      }
    }
  };

  const analyzeDocument = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setAnalyzing(true);

      // Upload file first
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult.file_url) {
        toast.error('Failed to upload file');
        return;
      }

      // Analyze document
      const response = await base44.functions.invoke('analyzeClientDocument', {
        file_url: uploadResult.file_url,
        document_type: documentType
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      const analysis = response.data.analysis;
      setAnalysisResult(analysis);
      setEditedData(analysis.extracted_data);
      
      toast.success('Document analyzed successfully!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze document: ' + (error.message || 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFieldEdit = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const applyToClient = async () => {
    try {
      if (!client?.id) {
        toast.error('No client selected');
        return;
      }

      // Update client with extracted data
      await base44.entities.Client.update(client.id, editedData);
      
      toast.success('Client record updated with extracted data');
      onDataExtracted?.(editedData);
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update client: ' + error.message);
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const fieldLabels = {
    name: 'First Name',
    middle_name: 'Middle Name',
    last_name: 'Last Name',
    company_name: 'Company Name',
    contact_person: 'Contact Person',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    state: 'State',
    zip_code: 'Zip Code',
    dob: 'Date of Birth',
    ssn: 'SSN',
    ein: 'EIN',
    filing_status: 'Filing Status',
    dependents: 'Dependents',
    dl_id: 'Driver License ID',
    dl_issued: 'DL Issue Date',
    dl_expire: 'DL Expiry Date',
    incorporated_as: 'Incorporated As',
    taxed_as: 'Taxed As',
    bank_name: 'Bank Name',
    bank_account: 'Account Number',
    bank_routing: 'Routing Number',
    account_type: 'Account Type'
  };

  return (
    <Card className="border-2 max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            AI Document Analyzer
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!analysisResult ? (
          <>
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
              <p className="font-medium mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Upload a client document (tax form, ID, bank statement, etc.)</li>
                <li>Select the document type for better accuracy</li>
                <li>AI will extract relevant information</li>
                <li>Review and edit the extracted data</li>
                <li>Apply to client record</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="doc-upload"
              />
              <label htmlFor="doc-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {file ? file.name : 'Click to upload document (Image or PDF)'}
                </p>
              </label>
            </div>

            {file && (
              <Button 
                onClick={analyzeDocument} 
                disabled={analyzing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Analyze Document
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Analysis Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Document Type Detected:</p>
                  <p className="text-lg">{analysisResult.document_type_detected}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Confidence Score:</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor(analysisResult.confidence_score)}`}>
                    {analysisResult.confidence_score}%
                  </p>
                </div>
              </div>
              
              <div>
                <Badge variant={analysisResult.client_type === 'individual' ? 'default' : 'secondary'}>
                  {analysisResult.client_type === 'individual' ? 'Individual Client' : 
                   analysisResult.client_type === 'entity' ? 'Business Entity' : 'Unknown Type'}
                </Badge>
              </div>

              {analysisResult.flags_for_review?.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Flags for Review:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {analysisResult.flags_for_review.map((flag, idx) => (
                      <li key={idx}>• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.additional_notes && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Notes:</strong> {analysisResult.additional_notes}
                </div>
              )}
            </div>

            {/* Extracted Data Fields */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Extracted Data (Review & Edit)
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {Object.entries(editedData).map(([field, value]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{fieldLabels[field] || field}</Label>
                    <Input
                      value={value || ''}
                      onChange={(e) => handleFieldEdit(field, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {analysisResult && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              setAnalysisResult(null);
              setFile(null);
              setEditedData({});
            }}
          >
            Analyze Another
          </Button>
          <Button 
            onClick={applyToClient}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Apply to Client Record
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}