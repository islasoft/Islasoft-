import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2, Copy, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EmailResponseSuggester() {
  const [emailContent, setEmailContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState('');

  const analyzeEmail = async () => {
    if (!emailContent.trim()) {
      toast.error('Please enter email content');
      return;
    }

    setAnalyzing(true);
    try {
      const prompt = `You are an AI assistant for Isla Accompting Corp, a professional CPA firm.

Analyze this incoming client email and provide response suggestions:

EMAIL CONTENT:
${emailContent}

Provide a JSON response with:
1. sentiment (positive/neutral/negative/urgent)
2. main_topics (array of key topics/concerns)
3. requires_action (boolean - does this need immediate action?)
4. priority (high/medium/low)
5. suggested_responses (array of 2-3 different response options, each with a "tone" and "content")

Each suggested response should be professional, address the client's concerns, and maintain Isla Accompting Corp's friendly yet professional tone.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string' },
            main_topics: {
              type: 'array',
              items: { type: 'string' }
            },
            requires_action: { type: 'boolean' },
            priority: { type: 'string' },
            suggested_responses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tone: { type: 'string' },
                  content: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success('Email analyzed');
    } catch (error) {
      toast.error('Failed to analyze email');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyResponse = (response) => {
    navigator.clipboard.writeText(response);
    toast.success('Response copied to clipboard');
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-blue-100 text-blue-800',
      negative: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
    };
    return colors[sentiment?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-600',
      medium: 'bg-yellow-600',
      low: 'bg-green-600',
    };
    return colors[priority?.toLowerCase()] || 'bg-gray-600';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Email Response Suggester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Paste Client Email Content</Label>
            <Textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Paste the email content you received from the client here..."
              rows={12}
            />
          </div>

          <Button
            onClick={analyzeEmail}
            disabled={analyzing || !emailContent.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4 mr-2" />
            )}
            Analyze & Suggest Responses
          </Button>

          {analysis && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getSentimentColor(analysis.sentiment)}>
                  {analysis.sentiment}
                </Badge>
                <Badge className={getPriorityColor(analysis.priority)}>
                  {analysis.priority} priority
                </Badge>
                {analysis.requires_action && (
                  <Badge className="bg-orange-600">Requires Action</Badge>
                )}
              </div>

              {analysis.main_topics && analysis.main_topics.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Key Topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.main_topics.map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Responses</CardTitle>
        </CardHeader>
        <CardContent>
          {!analysis ? (
            <div className="text-center py-12 text-gray-400">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Analyze an email to see suggested responses</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analysis.suggested_responses?.map((response, idx) => (
                <Card key={idx} className="border-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-blue-100 text-blue-800">
                        {response.tone}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyResponse(response.content)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={response.content}
                      readOnly
                      rows={8}
                      className="text-sm"
                    />
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