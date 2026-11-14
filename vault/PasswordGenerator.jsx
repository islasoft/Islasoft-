import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Wand2, Copy, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PasswordGenerator({ onPasswordGenerated }) {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generating, setGenerating] = useState(false);

  const generatePassword = async () => {
    setGenerating(true);
    try {
      const criteria = [];
      if (includeUppercase) criteria.push('uppercase letters');
      if (includeLowercase) criteria.push('lowercase letters');
      if (includeNumbers) criteria.push('numbers');
      if (includeSymbols) criteria.push('special symbols');
      
      const prompt = `Generate a single strong, random password with exactly ${length} characters. 
      Include: ${criteria.join(', ')}.
      ${excludeAmbiguous ? 'Exclude ambiguous characters like 0, O, l, 1, I.' : ''}
      Return ONLY the password string, nothing else. No explanations, no quotes, just the raw password.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
      });

      const password = result.trim();
      setGeneratedPassword(password);
      toast.success('Password generated');
    } catch (error) {
      toast.error('Failed to generate password');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast.success('Password copied to clipboard');
  };

  const usePassword = () => {
    if (onPasswordGenerated) {
      onPasswordGenerated(generatedPassword);
      toast.success('Password applied to form');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-600" />
          AI Password Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Password Length: {length}</Label>
          <Slider
            value={[length]}
            onValueChange={(value) => setLength(value[0])}
            min={8}
            max={64}
            step={1}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="uppercase"
              checked={includeUppercase}
              onCheckedChange={setIncludeUppercase}
            />
            <Label htmlFor="uppercase" className="text-sm">Uppercase (A-Z)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowercase"
              checked={includeLowercase}
              onCheckedChange={setIncludeLowercase}
            />
            <Label htmlFor="lowercase" className="text-sm">Lowercase (a-z)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="numbers"
              checked={includeNumbers}
              onCheckedChange={setIncludeNumbers}
            />
            <Label htmlFor="numbers" className="text-sm">Numbers (0-9)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="symbols"
              checked={includeSymbols}
              onCheckedChange={setIncludeSymbols}
            />
            <Label htmlFor="symbols" className="text-sm">Symbols (!@#$%)</Label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="ambiguous"
            checked={excludeAmbiguous}
            onCheckedChange={setExcludeAmbiguous}
          />
          <Label htmlFor="ambiguous" className="text-sm">Exclude ambiguous characters (0, O, l, 1, I)</Label>
        </div>

        <Button
          onClick={generatePassword}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          Generate Password
        </Button>

        {generatedPassword && (
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <code className="text-sm font-mono break-all">{generatedPassword}</code>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copyPassword}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              {onPasswordGenerated && (
                <Button
                  onClick={usePassword}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Use This Password
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}