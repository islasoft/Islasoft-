import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle, Video, FileText, Users, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export default function InterviewConfirm() {
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [attendee1Name, setAttendee1Name] = useState('');
  const [attendee1Email, setAttendee1Email] = useState('');
  const [attendee2Name, setAttendee2Name] = useState('');
  const [attendee2Email, setAttendee2Email] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError('Invalid or missing scheduling link.');
      setLoading(false);
      return;
    }
    loadInterview(token);
  }, []);

  const loadInterview = async (token) => {
    try {
      const result = await base44.functions.invoke('getInterviewByToken', { token });
      const found = result.data?.interview;
      if (!found) {
        setError('This scheduling link is invalid or has expired.');
        setLoading(false);
        return;
      }
      setInterview(found);
      // Pre-fill existing attendees if any
      if (found.client_additional_attendees?.length > 0) {
        setAttendee1Name(found.client_additional_attendees[0]?.name || '');
        setAttendee1Email(found.client_additional_attendees[0]?.email || '');
        setAttendee2Name(found.client_additional_attendees[1]?.name || '');
        setAttendee2Email(found.client_additional_attendees[1]?.email || '');
      }
      if (found.status === 'scheduled') setSubmitted(true);
    } catch (e) {
      setError('Failed to load appointment details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const additionalAttendees = [];
      if (attendee1Name) additionalAttendees.push({ name: attendee1Name, email: attendee1Email });
      if (attendee2Name) additionalAttendees.push({ name: attendee2Name, email: attendee2Email });

      const params = new URLSearchParams(window.location.search);
      await base44.functions.invoke('getInterviewByToken', {
        token: params.get('token'),
        additionalAttendees,
      });
      setSubmitted(true);
    } catch {
      toast.error('Failed to save your information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Unable to Load</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-2">Please contact your accountant for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="w-8 h-8" />
              <div>
                <CardTitle>You're Confirmed!</CardTitle>
                <CardDescription>Thank you for confirming your appointment details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {interview?.meeting_link && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Join your meeting:</p>
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline"
                >
                  <Video className="w-4 h-4" />
                  Schedule Your Appointment
                </a>
              </div>
            )}

            {/* Document Checklist */}
            {interview?.document_checklist?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-green-600" />
                  Please bring the following documents:
                </p>
                <ul className="space-y-1.5">
                  {interview.document_checklist.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-400' : 'bg-gray-300'}`} />
                      <span>
                        {doc.item}
                        {doc.required && <span className="ml-1 text-xs text-red-500 font-medium">(Required)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-500 border-t pt-3">
              If you need to make changes, please contact your accountant directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
            <Video className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Your Appointment</h1>
          <p className="text-gray-500 mt-1">Isla Accounting Corp — Initial Client Interview</p>
        </div>

        {/* Meeting Info */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            {interview.scheduled_date && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium">Proposed Date:</span>
                <span className="text-gray-600">{formatDate(interview.scheduled_date)}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium">Your Accountant:</span>
              <span className="text-gray-600">{interview.accountant_name}</span>
            </div>
            {interview.duration_minutes && (
              <div className="flex items-center gap-3 text-sm">
                <span className="w-4 h-4 flex-shrink-0" />
                <span className="text-gray-500">Duration: {interview.duration_minutes} minutes</span>
              </div>
            )}
            {interview.meeting_link && (
              <div className="pt-1">
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
                >
                  <Video className="w-4 h-4" />
                  Schedule Your Appointment
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Checklist */}
        {interview.document_checklist?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Documents to Prepare
              </CardTitle>
              <CardDescription>Please gather these documents before your interview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {interview.document_checklist.map((doc, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm py-1 border-b last:border-0">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-400' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <span className="text-gray-700">{doc.item}</span>
                      <span className="ml-2 text-xs text-gray-400">{doc.category}</span>
                    </div>
                    {doc.required && <span className="text-xs text-red-500 font-medium">Required</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Services Preview */}
        {interview.suggested_projects?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Services We'll Discuss
              </CardTitle>
              <CardDescription>Based on your intake form, we've prepared to discuss these services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {interview.suggested_projects.slice(0, 5).map((proj, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span>{(proj.project_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Attendees Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Additional Attendees (Optional)
            </CardTitle>
            <CardDescription>You may bring up to 2 additional people to the interview</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Attendee 1</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="a1name" className="text-xs">Full Name</Label>
                    <Input id="a1name" value={attendee1Name} onChange={e => setAttendee1Name(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div>
                    <Label htmlFor="a1email" className="text-xs">Email (optional)</Label>
                    <Input id="a1email" type="email" value={attendee1Email} onChange={e => setAttendee1Email(e.target.value)} placeholder="jane@example.com" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Attendee 2</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="a2name" className="text-xs">Full Name</Label>
                    <Input id="a2name" value={attendee2Name} onChange={e => setAttendee2Name(e.target.value)} placeholder="John Smith" />
                  </div>
                  <div>
                    <Label htmlFor="a2email" className="text-xs">Email (optional)</Label>
                    <Input id="a2email" type="email" value={attendee2Email} onChange={e => setAttendee2Email(e.target.value)} placeholder="john@example.com" />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Confirming…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm My Appointment</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}