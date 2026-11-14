import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Send, CheckCircle, AlertCircle, Loader2, FileText, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ESignature8879({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [fetchedFile, setFetchedFile] = useState(null);   // { id, name, webViewLink }
  const [fetchError, setFetchError] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  // Auto-fetch whenever client or year changes
  useEffect(() => {
    if (!selectedClientId || !year) {
      setFetchedFile(null);
      setFetchError('');
      return;
    }
    fetchFile();
  }, [selectedClientId, year]);

  const fetchFile = async () => {
    setLoadingFile(true);
    setFetchedFile(null);
    setFetchError('');
    try {
      const res = await base44.functions.invoke('fetch8879DriveFile', { client_id: selectedClientId, year });
      if (res.data?.file) {
        setFetchedFile(res.data.file);
      } else {
        setFetchError(res.data?.error || `No 8879 file found in Drive → Client → From Accountant → ${year}`);
      }
    } catch (e) {
      setFetchError(e.message || 'Failed to search Drive');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSend = async () => {
    if (!selectedClient || !fetchedFile || !year) return;
    if (!selectedClient.email) {
      toast.error('This client has no email address on file.');
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke('sendDocusealRequest', {
        clientId: selectedClient.id,
        clientName: selectedClient.company_name || `${selectedClient.name} ${selectedClient.last_name}`.trim(),
        clientEmail: selectedClient.email,
        driveFileId: fetchedFile.id,
        driveFileName: fetchedFile.name,
        year,
        preparerEmail: currentUser?.email,
        preparerName: currentUser?.full_name,
      });
      setSent(true);
      toast.success('Signature request sent successfully!');
    } catch (e) {
      toast.error('Failed to send: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSent(false);
    setSelectedClientId('');
    setFetchedFile(null);
    setFetchError('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSignature className="w-5 h-5 text-sky-600" />
          Form 8879 E-Signature Request
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Automatically fetches the 8879 from Drive → Client → From Accountant → Year → 8879_{'{year}'}_{'{clientCode}'}.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <h3 className="font-semibold text-lg">Signature Request Sent!</h3>
            <p className="text-sm text-muted-foreground">
              {selectedClient?.email} will receive an email to sign the Form 8879.
              Once signed, the document will be saved to Google Drive.
            </p>
            <Button variant="outline" onClick={reset}>Send Another</Button>
          </div>
        ) : (
          <>
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setFetchedFile(null); setFetchError(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || `${c.name || ''} ${c.last_name || ''}`.trim()} {c.client_number ? `(${c.client_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax Year */}
            <div className="space-y-1.5">
              <Label>Tax Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Client Email */}
            {selectedClient && (
              <div className="space-y-1.5">
                <Label>Client Email</Label>
                <div className={`text-sm px-3 py-2 rounded border ${selectedClient.email ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {selectedClient.email ? (
                    <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{selectedClient.email}</span>
                  ) : (
                    <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />No email on file</span>
                  )}
                </div>
              </div>
            )}

            {/* Drive File Status */}
            {selectedClientId && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Document from Drive
                </Label>

                {loadingFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 border rounded bg-slate-50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching Drive → From Accountant → {year}...
                  </div>
                )}

                {!loadingFile && fetchedFile && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 border rounded bg-green-50 border-green-200 text-green-800">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <a href={fetchedFile.webViewLink} target="_blank" rel="noopener noreferrer" className="underline truncate flex-1">
                      {fetchedFile.name}
                    </a>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  </div>
                )}

                {!loadingFile && fetchError && (
                  <div className="flex items-start gap-2 text-sm px-3 py-2 border rounded bg-amber-50 border-amber-200 text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{fetchError}</p>
                      <p className="text-xs mt-1 text-amber-600">Expected: From Accountant / {year} / 8879_{year}_{(selectedClient?.client_number || '').replace(/[^a-zA-Z0-9]/g, '')} </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={fetchFile}>Retry</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!selectedClientId || !fetchedFile || !year || sending || !selectedClient?.email}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {sending ? 'Sending Signature Request...' : 'Send Signature Request'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              The client will receive an email from DocuSeal to sign electronically. Once signed, both parties are notified and the PDF is saved to Drive.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}