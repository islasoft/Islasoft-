import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Loader2, Copy, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OnboardingChecklistGenerator({ client, onClose }) {
  const [services, setServices] = useState([]);
  const [clientType, setClientType] = useState('');
  const [generating, setGenerating] = useState(false);
  const [checklist, setChecklist] = useState(null);

  const serviceOptions = [
    'Bookkeeping', 'Tax Preparation', 'Payroll', 'CFO Services',
    'Tax Planning', 'Audit', 'Compilation', 'Entity Formation'
  ];

  const generateChecklist = async () => {
    if (!clientType || services.length === 0) {
      toast.error('Please select client type and services');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Generate a comprehensive onboarding checklist for a new client at Isla Accompting Corp.

CLIENT: ${client.company_name}
CLIENT TYPE: ${clientType}
SERVICES: ${services.join(', ')}

Create a detailed onboarding checklist organized into phases:
1. Initial Setup (Week 1)
2. Document Collection (Week 1-2)
3. System Setup (Week 2-3)
4. Kickoff Meeting (Week 3)
5. Ongoing Requirements

For each item:
- Clear task description
- Responsible party (Client or Isla Accounting)
- Priority (High/Medium/Low)
- Timeline
- Any special notes

Include all necessary documents, setup tasks, and compliance requirements specific to the services selected.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  phase_name: { type: 'string' },
                  timeline: { type: 'string' },
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        task: { type: 'string' },
                        responsible_party: { type: 'string' },
                        priority: { type: 'string' },
                        notes: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            summary: { type: 'string' }
          }
        }
      });

      setChecklist(result);
      toast.success('Onboarding checklist generated');
    } catch (error) {
      toast.error('Failed to generate checklist');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const copyChecklist = () => {
    if (!checklist) return;
    
    let text = `ONBOARDING CHECKLIST - ${client.company_name}\n\n`;
    text += `${checklist.summary}\n\n`;
    
    checklist.phases.forEach(phase => {
      text += `${phase.phase_name} (${phase.timeline})\n`;
      text += '─'.repeat(50) + '\n';
      phase.tasks.forEach((task, idx) => {
        text += `${idx + 1}. ${task.task}\n`;
        text += `   Responsible: ${task.responsible_party} | Priority: ${task.priority}\n`;
        if (task.notes) text += `   Notes: ${task.notes}\n`;
        text += '\n';
      });
      text += '\n';
    });
    
    navigator.clipboard.writeText(text);
    toast.success('Checklist copied to clipboard');
  };

  const getPriorityColor = (priority) => {
    if (priority?.toLowerCase().includes('high')) return 'bg-red-100 text-red-800';
    if (priority?.toLowerCase().includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-600" />
            Generate Onboarding Checklist - {client.company_name}
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {!checklist ? (
            <>
              <div className="space-y-2">
                <Label>Client Type</Label>
                <Select value={clientType} onValueChange={setClientType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_business">New Business</SelectItem>
                    <SelectItem value="established_business">Established Business</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Services Needed</Label>
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map(service => (
                    <div key={service} className="flex items-center gap-2">
                      <Checkbox
                        checked={services.includes(service)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setServices([...services, service]);
                          } else {
                            setServices(services.filter(s => s !== service));
                          }
                        }}
                      />
                      <Label className="cursor-pointer">{service}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateChecklist}
                disabled={generating || !clientType || services.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ListChecks className="w-4 h-4 mr-2" />
                )}
                Generate Checklist
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyChecklist}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" onClick={() => setChecklist(null)}>
                  Generate New
                </Button>
              </div>

              {checklist.summary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">{checklist.summary}</p>
                </div>
              )}

              {checklist.phases?.map((phase, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{phase.phase_name}</span>
                      <Badge variant="outline">{phase.timeline}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {phase.tasks.map((task, taskIdx) => (
                      <div key={taskIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Checkbox />
                        <div className="flex-1">
                          <p className="font-medium">{task.task}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {task.responsible_party}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                          {task.notes && (
                            <p className="text-sm text-gray-600 mt-2">{task.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}