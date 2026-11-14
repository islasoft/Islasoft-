import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PasswordAnalyzer({ passwords }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzePasswords = async () => {
    if (!passwords || passwords.length === 0) {
      toast.error('No passwords to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const passwordList = passwords
        .filter(p => p.password)
        .map((p, idx) => `${idx + 1}. ${p.name}: ${p.password}`)
        .join('\n');

      const prompt = `Analyze these passwords for security weaknesses and patterns:

${passwordList}

Provide a comprehensive security analysis in JSON format with:
1. overall_security_score (0-100)
2. critical_issues (array of passwords with severe weaknesses)
3. weak_passwords (array of passwords that need improvement)
4. common_patterns (array of identified patterns like repeated characters, dictionary words, etc.)
5. recommendations (array of specific improvement suggestions)
6. strong_passwords (array of passwords that are secure)

Return ONLY valid JSON, no markdown, no explanations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_security_score: { type: 'number' },
            critical_issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  issue: { type: 'string' }
                }
              }
            },
            weak_passwords: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  weakness: { type: 'string' }
                }
              }
            },
            common_patterns: {
              type: 'array',
              items: { type: 'string' }
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' }
            },
            strong_passwords: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success('Analysis complete');
    } catch (error) {
      toast.error('Failed to analyze passwords');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: 'Strong', className: 'bg-green-600' };
    if (score >= 60) return { label: 'Moderate', className: 'bg-yellow-600' };
    return { label: 'Weak', className: 'bg-red-600' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          AI Security Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={analyzePasswords}
          disabled={analyzing || !passwords || passwords.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          Analyze All Passwords
        </Button>

        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            {/* Overall Score */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Overall Security Score</div>
              <div className={`text-4xl font-bold ${getScoreColor(analysis.overall_security_score)}`}>
                {analysis.overall_security_score}/100
              </div>
              <Badge className={`mt-2 ${getScoreBadge(analysis.overall_security_score).className}`}>
                {getScoreBadge(analysis.overall_security_score).label}
              </Badge>
            </div>

            {/* Critical Issues */}
            {analysis.critical_issues && analysis.critical_issues.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600 font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  Critical Issues ({analysis.critical_issues.length})
                </div>
                {analysis.critical_issues.map((issue, idx) => (
                  <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="font-medium text-red-900">{issue.name}</div>
                    <div className="text-sm text-red-700 mt-1">{issue.issue}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Weak Passwords */}
            {analysis.weak_passwords && analysis.weak_passwords.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-600 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Weak Passwords ({analysis.weak_passwords.length})
                </div>
                {analysis.weak_passwords.map((weak, idx) => (
                  <div key={idx} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="font-medium text-yellow-900">{weak.name}</div>
                    <div className="text-sm text-yellow-700 mt-1">{weak.weakness}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Strong Passwords */}
            {analysis.strong_passwords && analysis.strong_passwords.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  Strong Passwords ({analysis.strong_passwords.length})
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700">
                    {analysis.strong_passwords.join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Common Patterns */}
            {analysis.common_patterns && analysis.common_patterns.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700">Common Patterns Detected</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {analysis.common_patterns.map((pattern, idx) => (
                    <li key={idx}>{pattern}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700">Recommendations</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}