'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, RefreshCw, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

export function PromptEditor() {
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current prompt on mount
  useEffect(() => {
    fetchPrompt();
  }, []);

  const fetchPrompt = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/prompts/brief-generation');
      const data = await response.json();

      if (data.success) {
        setPrompt(data.prompt);
        setOriginalPrompt(data.prompt);
        setIsDefault(data.isDefault);
        setLastUpdated(data.updated_at);
        setUpdatedBy(data.updated_by);
      } else {
        setMessage({ type: 'error', text: 'Failed to load prompt' });
      }
    } catch (error) {
      console.error('Error fetching prompt:', error);
      setMessage({ type: 'error', text: 'Failed to load prompt' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/prompts/brief-generation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalPrompt(prompt);
        setIsDefault(false);
        setLastUpdated(data.updated_at);
        setUpdatedBy(data.updated_by);
        setMessage({ type: 'success', text: 'Prompt saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save prompt' });
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setMessage({ type: 'error', text: 'Failed to save prompt' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(originalPrompt);
    setMessage(null);
  };

  const hasChanges = prompt !== originalPrompt;
  const charCount = prompt.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 text-white p-2 rounded-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Brief Generation Prompt</CardTitle>
              <CardDescription>
                Edit the Claude Sonnet 4 prompt used to generate daily brief dialogue scripts
              </CardDescription>
            </div>
          </div>
          {isDefault && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              Using Default
            </Badge>
          )}
        </div>

        {/* Metadata */}
        {lastUpdated && updatedBy && (
          <div className="mt-3 text-xs text-muted-foreground">
            Last updated: {new Date(lastUpdated).toLocaleString()} by {updatedBy}
          </div>
        )}

        {/* Message Banner */}
        {message && (
          <div
            className={`mt-3 p-3 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Prompt Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Prompt Template</label>
                <span className="text-xs text-muted-foreground">
                  {charCount.toLocaleString()} characters
                </span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Enter your prompt template here..."
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Template Variables:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{policy_areas}}'}</code> - User's policy interests</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{breaking_news}}'}</code> - Breaking news section</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{top_stories}}'}</code> - Top stories section</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{quick_hits}}'}</code> - Quick hits section</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                disabled={!hasChanges || saving}
              >
                Reset
              </Button>

              <Button
                onClick={fetchPrompt}
                variant="ghost"
                disabled={loading || saving}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
