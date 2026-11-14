import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Upload, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractorOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    contractor_hourly_rate: '',
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    w9_file_url: '',
    policies_acknowledged: false,
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (currentUser && currentUser.contractor_onboarding_status === 'completed') {
      navigate('/Dashboard');
    }
  }, [currentUser, navigate]);

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.loading('Uploading W-9 form...');
      const fileUrl = await uploadFileMutation.mutateAsync(file);
      setFormData({ ...formData, w9_file_url: fileUrl });
      toast.dismiss();
      toast.success('W-9 uploaded successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload file');
    }
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        contractor_hourly_rate: parseFloat(formData.contractor_hourly_rate),
        bank_name: formData.bank_name,
        bank_routing: formData.bank_routing,
        bank_account: formData.bank_account,
        w9_file_url: formData.w9_file_url,
        contractor_onboarding_status: 'completed',
        contractor_onboarding_completed_date: new Date().toISOString(),
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Onboarding completed! Welcome aboard!');
      setTimeout(() => navigate('/Dashboard'), 1500);
    },
    onError: (error) => {
      toast.error('Failed to complete onboarding: ' + error.message);
    }
  });

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.contractor_hourly_rate || parseFloat(formData.contractor_hourly_rate) <= 0) {
        toast.error('Please enter a valid hourly rate');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.bank_name || !formData.bank_routing || !formData.bank_account) {
        toast.error('Please complete all bank details');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.w9_file_url) {
        toast.error('Please upload your W-9 form');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleComplete = () => {
    if (!formData.policies_acknowledged) {
      toast.error('Please acknowledge company policies');
      return;
    }
    completeOnboardingMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Set Your Rate', icon: DollarSign },
    { number: 2, title: 'Banking Details', icon: FileText },
    { number: 3, title: 'Upload W-9', icon: Upload },
    { number: 4, title: 'Policies', icon: CheckCircle }
  ];

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contractor Onboarding</h1>
          <p className="text-gray-600">Welcome! Let's get you set up to start working.</p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Progress value={progress} className="mb-4" />
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                return (
                  <div
                    key={step.number}
                    className={`text-center p-3 rounded-lg transition-colors ${
                      isActive ? 'bg-blue-100 border-2 border-blue-500' :
                      isCompleted ? 'bg-green-100' : 'bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${
                      isActive ? 'text-blue-600' :
                      isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className={`text-xs font-medium ${
                      isActive ? 'text-blue-900' :
                      isCompleted ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <><DollarSign className="w-6 h-6" /> Step 1: Set Your Hourly Rate</>}
              {currentStep === 2 && <><FileText className="w-6 h-6" /> Step 2: Banking Information</>}
              {currentStep === 3 && <><Upload className="w-6 h-6" /> Step 3: Upload W-9 Form</>}
              {currentStep === 4 && <><CheckCircle className="w-6 h-6" /> Step 4: Acknowledge Policies</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div>
                <Label htmlFor="rate">Your Hourly Rate ($)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                  value={formData.contractor_hourly_rate}
                  onChange={(e) => setFormData({ ...formData, contractor_hourly_rate: e.target.value })}
                  className="text-lg mt-2"
                />
                <p className="text-sm text-gray-600 mt-2">
                  This will be your payment rate for all hours worked. You can request changes later through your manager.
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    placeholder="Bank of America"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="routing">Routing Number</Label>
                  <Input
                    id="routing"
                    placeholder="123456789"
                    value={formData.bank_routing}
                    onChange={(e) => setFormData({ ...formData, bank_routing: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="account">Account Number</Label>
                  <Input
                    id="account"
                    placeholder="987654321"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    Your banking information is encrypted and will only be used for payment processing.
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Emergency Contact (Optional)</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emergency_name">Name</Label>
                      <Input
                        id="emergency_name"
                        placeholder="John Doe"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_phone">Phone</Label>
                      <Input
                        id="emergency_phone"
                        placeholder="(555) 123-4567"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Upload W-9 Form</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <label htmlFor="w9-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Click to upload
                      </span>
                      <span className="text-gray-600"> or drag and drop</span>
                      <input
                        id="w9-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">PDF, DOC, or image files accepted</p>
                  </div>
                  {formData.w9_file_url && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">W-9 form uploaded successfully</span>
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Don't have a W-9 form? <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer" className="underline font-medium">Download it here</a> from the IRS website.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold text-lg mb-4">Company Policies & Guidelines</h3>
                  
                  <div className="space-y-4 text-sm text-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">1. Time Tracking</h4>
                      <p>All contractors must accurately track and submit their time entries. Time must be logged for the actual date work was performed.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">2. Confidentiality</h4>
                      <p>All client information and company data must be kept strictly confidential. You may not share client information with any third parties.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">3. Payment Terms</h4>
                      <p>Payments are processed on a bi-weekly basis for all approved hours. Time entries must be submitted and approved before payment processing.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">4. Communication</h4>
                      <p>Contractors are expected to respond to messages and emails within 24 hours during business days.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">5. Quality Standards</h4>
                      <p>All work must meet company quality standards and professional accounting practices. Work may be reviewed and feedback provided.</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">6. Termination</h4>
                      <p>Either party may terminate the contractor relationship with 14 days notice. All pending payments will be processed for approved work.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg">
                  <Checkbox
                    id="policies"
                    checked={formData.policies_acknowledged}
                    onCheckedChange={(checked) => setFormData({ ...formData, policies_acknowledged: checked })}
                    className="mt-1"
                  />
                  <label htmlFor="policies" className="text-sm cursor-pointer">
                    I have read and agree to abide by the company policies and guidelines outlined above. I understand that violation of these policies may result in termination of my contractor agreement.
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              {currentStep < 4 ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={completeOnboardingMutation.isPending || !formData.policies_acknowledged}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completeOnboardingMutation.isPending ? 'Completing...' : 'Complete Onboarding'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}