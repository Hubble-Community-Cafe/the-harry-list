import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Save, Loader2, AlertCircle, CheckCircle, Pencil, Send, Upload, Trash2, FileText } from 'lucide-react';
import { fetchWithAuth, fetchEmailAttachments, uploadEmailAttachment, deleteEmailAttachment, toggleEmailAttachmentActive } from '../lib/api';
import type { EmailAttachment } from '../types/reservation';
import { HelpGuide } from '../components/HelpGuide';
import { emailTemplatesGuide } from '../lib/guideContent';

interface EmailTemplateDto {
  templateType: string;
  displayName: string;
  description: string;
  subject: string;
  bodyTemplate: string;
  customized: boolean;
  updatedAt: string | null;
  availableVariables: string[];
}

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

  // Attachment management state
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplates();
    loadAttachments();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/admin/email-templates');
      if (!response.ok) throw new Error('Failed to load email templates');
      const data: EmailTemplateDto[] = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }

  function openEditor(template: EmailTemplateDto) {
    if (expandedType === template.templateType) {
      setExpandedType(null);
      return;
    }
    setExpandedType(template.templateType);
    setEditSubject(template.subject);
    setEditBody(template.bodyTemplate);
    setSaveSuccess(false);
    setTestResult(null);
  }

  async function saveTemplate(templateType: string) {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const response = await fetchWithAuth(`/api/admin/email-templates/${templateType}`, {
        method: 'PUT',
        body: JSON.stringify({ subject: editSubject, bodyTemplate: editBody }),
      });
      if (!response.ok) throw new Error('Failed to save template');
      const updated: EmailTemplateDto = await response.json();
      setTemplates(prev => prev.map(t => t.templateType === templateType ? updated : t));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail(templateType: string) {
    if (!testEmail.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const response = await fetchWithAuth(`/api/admin/email-templates/${templateType}/test`, {
        method: 'POST',
        body: JSON.stringify({
          toEmail: testEmail,
          subject: editSubject,
          bodyTemplate: editBody,
        }),
      });
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : 'Failed to send test email' });
    } finally {
      setSendingTest(false);
    }
  }

  async function resetTemplate(templateType: string) {
    if (!confirm('Reset this template to the built-in default? This cannot be undone.')) return;
    setResetting(true);
    try {
      const response = await fetchWithAuth(`/api/admin/email-templates/${templateType}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to reset template');
      // Reload to get default values back
      await loadTemplates();
      setExpandedType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset template');
    } finally {
      setResetting(false);
    }
  }

  async function loadAttachments() {
    try {
      setLoadingAttachments(true);
      const data = await fetchEmailAttachments();
      setAttachments(data);
    } catch {
      // Non-blocking — attachments section will show empty
    } finally {
      setLoadingAttachments(false);
    }
  }

  async function handleUploadAttachment() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !newAttachmentName.trim()) return;

    setUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const uploaded = await uploadEmailAttachment(file, newAttachmentName.trim());
      setAttachments(prev => [...prev, uploaded]);
      setNewAttachmentName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(id: number) {
    if (!confirm('Delete this attachment? This cannot be undone.')) return;
    try {
      await deleteEmailAttachment(id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleToggleAttachmentActive(id: number, active: boolean) {
    try {
      const updated = await toggleEmailAttachmentActive(id, active);
      setAttachments(prev => prev.map(a => a.id === id ? updated : a));
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-2">{error}</p>
        <button onClick={loadTemplates} className="text-hubble-400 hover:text-hubble-300 text-sm underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-white">Email Templates</h1>
          <p className="text-dark-400 font-light">Customise the emails sent to customers and staff</p>
        </div>
        <HelpGuide title="Email Templates Guide" sections={emailTemplatesGuide} />
      </div>

      {/* Info card */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
        <p className="text-sm text-dark-300">
          Use <code className="bg-dark-800 text-hubble-400 px-1.5 py-0.5 rounded font-mono text-xs">{'{{variable}}'}</code> placeholders in your templates.
          Available variables are listed per template. Templates not yet customised use the built-in default.
        </p>
      </div>

      {/* Template cards */}
      <div className="space-y-3">
        {templates.map((template) => {
          const isExpanded = expandedType === template.templateType;
          return (
            <div
              key={template.templateType}
              className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() => openEditor(template)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${template.customized ? 'bg-hubble-400' : 'bg-dark-600'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{template.displayName}</span>
                      {template.customized && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-hubble-500/20 text-hubble-400 font-medium">
                          Customised
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-400 mt-0.5">{template.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-dark-400 shrink-0 ml-4">
                  {template.updatedAt && (
                    <span className="text-xs hidden sm:block">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                  <Pencil className="w-4 h-4" />
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Editor */}
              {isExpanded && (
                <div className="border-t border-dark-800 p-5 space-y-5">
                  {/* Available variables */}
                  <div>
                    <p className="text-xs font-medium text-dark-400 mb-2 uppercase tracking-wider">Available variables</p>
                    <div className="flex flex-wrap gap-1.5">
                      {template.availableVariables.map((v) => (
                        <code
                          key={v}
                          className="text-xs bg-dark-800 text-hubble-400 px-2 py-0.5 rounded font-mono cursor-pointer hover:bg-dark-700 transition-colors"
                          onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                          title="Click to copy"
                        >
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="label">Subject line</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="input-field w-full mt-1 font-mono text-sm"
                      placeholder="Subject..."
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="label">Email body (HTML)</label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={20}
                      className="input-field w-full mt-1 font-mono text-xs leading-relaxed resize-y"
                      placeholder="HTML email body..."
                      spellCheck={false}
                    />
                  </div>

                  {/* Test email */}
                  <div className="border border-dark-700 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">Send test email</p>
                    <p className="text-xs text-dark-500">Sends the current subject and body (including unsaved changes) to the address below, using sample placeholder data.</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="input-field flex-1 text-sm"
                      />
                      <button
                        onClick={() => sendTestEmail(template.templateType)}
                        disabled={sendingTest || !testEmail.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send test
                      </button>
                    </div>
                    {testResult && (
                      <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                        testResult.status === 'sent' ? 'bg-green-500/10 text-green-400' :
                        testResult.status === 'disabled' ? 'bg-dark-800 text-dark-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {testResult.status === 'sent' && <CheckCircle className="w-4 h-4 shrink-0" />}
                        {testResult.status === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                        {testResult.message}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => resetTemplate(template.templateType)}
                      disabled={resetting || !template.customized}
                      className="flex items-center gap-2 text-sm text-dark-400 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to default
                    </button>

                    <div className="flex items-center gap-3">
                      {saveSuccess && (
                        <span className="flex items-center gap-1.5 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Saved
                        </span>
                      )}
                      <button
                        onClick={() => saveTemplate(template.templateType)}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save template
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PDF Attachments section */}
      <div>
        <h2 className="text-xl font-title font-bold text-white mb-1">PDF Attachments</h2>
        <p className="text-dark-400 font-light text-sm mb-4">Manage PDF files that can be attached to catering option emails</p>

        {/* Upload form */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newAttachmentName}
              onChange={(e) => setNewAttachmentName(e.target.value)}
              placeholder="Display name (e.g. Catering Menu 2026)"
              className="input-field flex-1 text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="text-sm text-dark-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-dark-800 file:text-white hover:file:bg-dark-700 file:cursor-pointer file:transition-colors"
            />
            <button
              onClick={handleUploadAttachment}
              disabled={uploadingAttachment || !newAttachmentName.trim()}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2 shrink-0"
            >
              {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
          {attachmentError && (
            <div className="flex items-center gap-2 text-sm text-red-400 mt-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {attachmentError}
            </div>
          )}
        </div>

        {/* Attachment list */}
        {loadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-hubble-400 animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 text-center">
            <FileText className="w-10 h-10 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">No PDF attachments uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="bg-dark-900 border border-dark-800 rounded-xl px-5 py-3 flex items-center gap-4"
              >
                <FileText className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{attachment.name}</div>
                  <div className="text-xs text-dark-500 truncate">
                    {attachment.filename}
                    {attachment.createdAt && ` \u00b7 ${new Date(attachment.createdAt).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleAttachmentActive(attachment.id, !attachment.active)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                    attachment.active
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                  }`}
                >
                  {attachment.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete attachment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
