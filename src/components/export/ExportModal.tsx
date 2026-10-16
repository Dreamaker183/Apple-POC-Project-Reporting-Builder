/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDialogFocus } from '../common/useDialogFocus';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { metricGraphText } from '../../lib/export/metricGraphs';
import { ReportProject, SnippetCard, ExportDestination } from '../../types/report';
import { exportReportToMarkdown } from '../../lib/export/markdownExport';
import { exportReportToJson } from '../../lib/export/jsonExport';
import { exportReportToHtml } from '../../lib/export/htmlExport';
import { 
  formatForExecutiveEmail, 
  formatForSlack, 
  formatForTeams, 
  formatForWeeklyStatusMemo,
  formatSlackWebhookPayload,
  formatTeamsWebhookPayload,
  formatGoogleChatWebhookPayload,
  formatDiscordWebhookPayload
} from '../../lib/export/destinationFormatters';
import { copyToClipboard, downloadFile } from '../../lib/export/clipboard';
import {
  createMailtoLink,
  createGmailComposeLink,
  createOutlookComposeLink,
  createWhatsAppShareLink,
  createTelegramShareLink,
  dispatchToSlackWebhook,
  dispatchToTeamsWebhook,
  dispatchToGoogleChatWebhook,
  dispatchToDiscordWebhook,
  simulateWebhookDispatch,
  loadSavedWebhooks,
  saveWebhooks,
  loadDispatchAuditLog,
  clearDispatchAuditLog,
  DispatchResult,
  DispatchAuditEntry,
} from '../../lib/integrations/messageDispatch';
import { 
  X, 
  Copy, 
  Download, 
  Printer, 
  Mail, 
  MessageSquare, 
  FileCode, 
  FileText, 
  Check, 
  ExternalLink,
  Code2, 
  Send, 
  Sparkles, 
  Zap, 
  History,
  Trash2,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export type MessageToolId = 'email' | 'slack' | 'teams' | 'google_chat' | 'discord' | 'mobile' | 'audit_log';

interface Props {
  project: ReportProject;
  selectedCards: SnippetCard[];
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  initialMode?: 'formats' | 'tools';
  initialTool?: MessageToolId;
}

export const ExportModal: React.FC<Props> = ({
  project,
  selectedCards,
  isOpen,
  onClose,
  onNotify,
  initialMode = 'formats',
  initialTool = 'email',
}) => {
  useDialogFocus(isOpen, onClose);
  const { t } = useLanguage();
  const [modalMode, setModalMode] = useState<'formats' | 'tools'>(initialMode);
  const [destination, setDestination] = useState<ExportDestination>('executive_email');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>(
    selectedCards.length > 0 ? 'selected' : 'all'
  );
  const [copied, setCopied] = useState(false);
  const [copiedRawHtml, setCopiedRawHtml] = useState(false);

  // Message Tool Integration State
  const [selectedTool, setSelectedTool] = useState<MessageToolId>(initialTool);
  const [emailTo, setEmailTo] = useState('executive-review@acme.corp');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState(
    `[Status Report] ${project.title}${project.reportingPeriod ? ` (${project.reportingPeriod})` : ''}`
  );
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannelName, setSlackChannelName] = useState('#executive-updates');
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [teamsChannelName, setTeamsChannelName] = useState('Executive Briefing Channel');
  const [googleChatWebhookUrl, setGoogleChatWebhookUrl] = useState('');
  const [googleChatSpaceName, setGoogleChatSpaceName] = useState('Product Leadership Space');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [discordChannelName, setDiscordChannelName] = useState('#status-reports');

  const [dispatchStatus, setDispatchStatus] = useState<DispatchResult | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showPayloadInspector, setShowPayloadInspector] = useState(false);
  const [auditLogs, setAuditLogs] = useState<DispatchAuditEntry[]>([]);

  // Sync mode and tool when opened
  useEffect(() => {
    if (isOpen) {
      setModalMode(initialMode);
      setSelectedTool(initialTool);
      setExportScope(selectedCards.length > 0 ? 'selected' : 'all');
      setEmailSubject(`[Status Report] ${project.title}${project.reportingPeriod ? ` (${project.reportingPeriod})` : ''}`);
      
      // Load saved configurations
      const saved = loadSavedWebhooks();
      if (saved.emailTo) setEmailTo(saved.emailTo);
      if (saved.emailCc) setEmailCc(saved.emailCc);
      if (saved.slack) setSlackWebhookUrl(saved.slack);
      if (saved.teams) setTeamsWebhookUrl(saved.teams);
      if (saved.googleChat) setGoogleChatWebhookUrl(saved.googleChat);
      if (saved.discord) setDiscordWebhookUrl(saved.discord);

      // Refresh audit logs
      setAuditLogs(loadDispatchAuditLog());
    }
  }, [isOpen, initialMode, initialTool, selectedCards.length, project.title, project.reportingPeriod]);

  // Persist webhook changes
  const handleSaveSettings = (updates: Partial<{ emailTo: string; emailCc: string; slack: string; teams: string; googleChat: string; discord: string }>) => {
    const current = loadSavedWebhooks();
    const merged = { ...current, ...updates };
    saveWebhooks(merged);
  };

  if (!isOpen) return null;

  const cardsToExport = exportScope === 'selected' && selectedCards.length > 0 
    ? selectedCards 
    : project.cards;

  const destinationsList: Array<{
    id: ExportDestination;
    name: string;
    icon: React.ReactNode;
    description: string;
    ext?: string;
    mime?: string;
  }> = [
    {
      id: 'executive_email',
      name: t('export.destEmail'),
      icon: <Mail className="w-4 h-4 text-[#0071E3]" />,
      description: t('export.destEmailDesc'),
      ext: 'html',
      mime: 'text/html',
    },
    {
      id: 'slack',
      name: t('export.destSlack'),
      icon: <MessageSquare className="w-4 h-4 text-[#E01E5A]" />,
      description: t('export.destSlackDesc'),
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'teams',
      name: t('export.destTeams'),
      icon: <MessageSquare className="w-4 h-4 text-[#6264A7]" />,
      description: t('export.destTeamsDesc'),
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'weekly_status',
      name: t('export.destWeekly'),
      icon: <FileText className="w-4 h-4 text-[#107C41]" />,
      description: t('export.destWeeklyDesc'),
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'markdown',
      name: t('export.destMarkdown'),
      icon: <FileCode className="w-4 h-4 text-[#1F1F1F]" />,
      description: t('export.destMarkdownDesc'),
      ext: 'md',
      mime: 'text/markdown',
    },
    {
      id: 'json',
      name: t('export.destJson'),
      icon: <FileCode className="w-4 h-4 text-[#F59E0B]" />,
      description: t('export.destJsonDesc'),
      ext: 'json',
      mime: 'application/json',
    },
    {
      id: 'html',
      name: t('export.destHtml'),
      icon: <FileCode className="w-4 h-4 text-[#0071E3]" />,
      description: t('export.destHtmlDesc'),
      ext: 'html',
      mime: 'text/html',
    },
  ];

  const getExportContent = (): { plainText: string; htmlText?: string } => {
    switch (destination) {
      case 'executive_email': {
        const html = formatForExecutiveEmail(project, cardsToExport);
        return { plainText: exportReportToMarkdown(project, cardsToExport), htmlText: html };
      }
      case 'slack':
        return { plainText: formatForSlack(project, cardsToExport) };
      case 'teams':
        return { plainText: formatForTeams(project, cardsToExport) };
      case 'weekly_status':
        return { plainText: formatForWeeklyStatusMemo(project, cardsToExport) };
      case 'markdown':
        return { plainText: exportReportToMarkdown(project, cardsToExport) };
      case 'json':
        return { plainText: exportReportToJson(project, cardsToExport) };
      case 'html': {
        const fullHtml = exportReportToHtml(project, cardsToExport);
        return { plainText: fullHtml, htmlText: fullHtml };
      }
      default:
        return { plainText: '' };
    }
  };

  const { plainText, htmlText } = getExportContent();
  const emailHtml = formatForExecutiveEmail(project, cardsToExport);
  const emailText = exportReportToMarkdown(project, cardsToExport);
  const dispatchGraphs = cardsToExport.filter(c => c.type === 'kpi_metric').map(c => ({ label: c.label, graph: metricGraphText(c) })).filter(c => c.graph);
  const handleCopyEmail = async () => {
    const result = await copyToClipboard(emailText, emailHtml);
    onNotify(result.success ? t('export.copiedEmail') : t('export.copyFailEmail'), result.success ? 'success' : 'error');
  };

  const handleCopy = async () => {
    const res = await copyToClipboard(plainText, htmlText);
    if (res.success) {
      setCopied(true);
      onNotify(t('export.copiedContent'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify(res.error || t('export.copyFail'), 'error');
    }
  };

  const handleCopyRawHtml = async () => {
    if (!htmlText) return;
    const res = await copyToClipboard(htmlText);
    if (res.success) {
      setCopiedRawHtml(true);
      onNotify(t('export.copiedHtml'), 'success');
      setTimeout(() => setCopiedRawHtml(false), 2000);
    } else {
      onNotify(t('export.copyHtmlFail'), 'error');
    }
  };

  const handleDownload = () => {
    const current = destinationsList.find((d) => d.id === destination);
    const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.${current?.ext || 'txt'}`;
    downloadFile(filename, destination === 'executive_email' ? emailHtml : plainText, current?.mime || 'text/plain');
    onNotify(t('export.downloaded', { file: filename }), 'success');
  };

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Tool Dispatches
  const handleOpenMailto = () => {
    handleSaveSettings({ emailTo, emailCc });
    const link = createMailtoLink(emailTo, emailSubject, emailText, emailCc);
    window.location.href = link;
    onNotify(t('export.openMail'), 'info');
  };

  const handleOpenGmailWeb = () => {
    handleSaveSettings({ emailTo, emailCc });
    const link = createGmailComposeLink(emailTo, emailSubject, emailText, emailCc);
    window.open(link, '_blank');
    onNotify(t('export.openGmail'), 'info');
  };

  const handleOpenOutlookWeb = () => {
    handleSaveSettings({ emailTo });
    const link = createOutlookComposeLink(emailTo, emailSubject, emailText);
    window.open(link, '_blank');
    onNotify(t('export.openOutlook'), 'info');
  };

  const handleOpenWhatsApp = () => {
    const summary = `${project.title}\n${plainText.slice(0, 1500)}`;
    const link = createWhatsAppShareLink(summary);
    window.open(link, '_blank');
    onNotify(t('export.openWhatsApp'), 'info');
  };

  const handleOpenTelegram = () => {
    const summary = `${project.title}\n${plainText.slice(0, 1500)}`;
    const link = createTelegramShareLink(summary);
    window.open(link, '_blank');
    onNotify(t('export.openTelegram'), 'info');
  };

  const handleDispatchSlack = async (isTest: boolean) => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ slack: slackWebhookUrl });
    const payload = formatSlackWebhookPayload(project, cardsToExport);

    let res: DispatchResult;
    if (isTest || !slackWebhookUrl.trim()) {
      res = await simulateWebhookDispatch('Slack', slackChannelName || '#executive-updates', payload.text);
    } else {
      res = await dispatchToSlackWebhook(slackWebhookUrl, payload);
    }

    setIsDispatching(false);
    setDispatchStatus(res);
    setAuditLogs(loadDispatchAuditLog());
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleDispatchTeams = async (isTest: boolean) => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ teams: teamsWebhookUrl });
    const payload = formatTeamsWebhookPayload(project, cardsToExport);

    let res: DispatchResult;
    if (isTest || !teamsWebhookUrl.trim()) {
      res = await simulateWebhookDispatch('Microsoft Teams', teamsChannelName || 'Executive Briefing Channel');
    } else {
      res = await dispatchToTeamsWebhook(teamsWebhookUrl, payload);
    }

    setIsDispatching(false);
    setDispatchStatus(res);
    setAuditLogs(loadDispatchAuditLog());
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleDispatchGoogleChat = async (isTest: boolean) => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ googleChat: googleChatWebhookUrl });
    const payload = formatGoogleChatWebhookPayload(project, cardsToExport);

    let res: DispatchResult;
    if (isTest || !googleChatWebhookUrl.trim()) {
      res = await simulateWebhookDispatch('Google Chat', googleChatSpaceName || 'Product Leadership Space');
    } else {
      res = await dispatchToGoogleChatWebhook(googleChatWebhookUrl, payload);
    }

    setIsDispatching(false);
    setDispatchStatus(res);
    setAuditLogs(loadDispatchAuditLog());
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleDispatchDiscord = async (isTest: boolean) => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ discord: discordWebhookUrl });
    const payload = formatDiscordWebhookPayload(project, cardsToExport);

    let res: DispatchResult;
    if (isTest || !discordWebhookUrl.trim()) {
      res = await simulateWebhookDispatch('Discord', discordChannelName || '#status-reports');
    } else {
      res = await dispatchToDiscordWebhook(discordWebhookUrl, payload);
    }

    setIsDispatching(false);
    setDispatchStatus(res);
    setAuditLogs(loadDispatchAuditLog());
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleSimulateEmailSend = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ emailTo, emailCc });
    const res = await simulateWebhookDispatch('Email Service', emailTo, `Subject: ${emailSubject}`);
    setIsDispatching(false);
    setDispatchStatus(res);
    setAuditLogs(loadDispatchAuditLog());
    onNotify(t('export.simulatedTo', { to: emailTo }), 'success');
  };

  const handleClearAuditLog = () => {
    clearDispatchAuditLog();
    setAuditLogs([]);
    onNotify(t('export.clearedLog'), 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs no-print p-0 sm:p-3 lg:p-4">
      <div 
        className="bg-white rounded-none sm:rounded-2xl border-0 sm:border border-black/10 shadow-2xl max-w-5xl w-full h-[100dvh] sm:h-auto flex flex-col min-h-0 max-h-[100dvh] sm:max-h-[calc(100dvh-1.5rem)] lg:max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 sm:p-4 lg:p-5 border-b border-black/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 id="export-dialog-title" className="text-base font-bold text-[#1F1F1F]">
                {t('export.title')}
              </h2>
              <p className="hidden sm:block text-xs text-[#727272]">
                {t('export.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Mode Switcher */}
            <div className="flex flex-1 sm:flex-none items-center p-0.5 bg-black/[0.04] rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setModalMode('formats')}
                className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md transition-all whitespace-nowrap ${
                  modalMode === 'formats' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {t('export.formats')}
              </button>
              <button
                type="button"
                onClick={() => setModalMode('tools')}
                className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  modalMode === 'tools' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('export.dispatch')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 text-[#727272] hover:text-[#1F1F1F] rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label={t('export.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODE 1: FORMATS & COPY */}
        {modalMode === 'formats' && (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left Destinations Menu */}
            <div className="export-destination-nav shrink-0 p-2 sm:p-3 border-b border-black/[0.08] bg-[#FAFAFA] overflow-x-auto lg:overflow-y-auto">
              {/* Scope selector */}
              {selectedCards.length > 0 && (
                <div className="export-scope space-y-1.5 mb-2 sm:mb-3">
                  <span className="text-[11px] font-semibold text-[#727272] uppercase tracking-wider block">
                    {t('export.scope')}
                  </span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-200/60 rounded-lg text-xs font-medium max-w-sm">
                    <button
                      type="button"
                      onClick={() => setExportScope('all')}
                      className={`py-1 rounded text-center transition-all ${
                        exportScope === 'all' ? 'bg-white text-[#1F1F1F] shadow-xs' : 'text-[#727272]'
                      }`}
                    >
                      {t('export.allOf', { count: project.cards.length })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportScope('selected')}
                      className={`py-1 rounded text-center transition-all ${
                        exportScope === 'selected' ? 'bg-white text-[#1F1F1F] shadow-xs' : 'text-[#727272]'
                      }`}
                    >
                      {t('export.selectedOf', { count: selectedCards.length })}
                    </button>
                  </div>
                </div>
              )}

              <div className="export-destinations flex flex-col sm:flex-row sm:items-center gap-1.5">
                <span className="hidden sm:block text-[11px] font-semibold text-[#727272] uppercase tracking-wider shrink-0 mr-1">
                  {t('export.destinations')}
                </span>
                {destinationsList.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setDestination(dest.id)}
                    className={`w-full sm:w-auto sm:min-w-[150px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center sm:items-start gap-2 ${
                      destination === dest.id
                        ? 'bg-white shadow-xs border border-black/10 font-semibold text-[#1F1F1F]'
                        : 'hover:bg-neutral-200/50 text-[#727272]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{dest.icon}</div>
                    <div className="min-w-0">
                      <div className="text-xs truncate">{dest.name}</div>
                      <div className="hidden lg:block text-[10px] text-[#727272] leading-tight line-clamp-1 font-normal">
                        {dest.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Print action button */}
              <div className="export-print-action pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-black/[0.08] sm:pl-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#1F1F1F] bg-white border border-black/15 rounded-xl hover:bg-neutral-50 transition-colors shadow-xs whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>{t('export.printPdf')}</span>
                </button>
              </div>
            </div>

            {/* Right Preview */}
            <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 lg:p-5 bg-white overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-black/[0.06] mb-3 shrink-0">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider break-words">
                    {t('export.previewFor', { name: destinationsList.find((d) => d.id === destination)?.name ?? '' })}
                  </span>
                  <span className="text-xs text-[#727272] ml-2">
                    {t('export.cardsCount', { count: cardsToExport.length })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071E3] text-white text-xs font-semibold rounded-lg hover:bg-[#0071E3]/90 transition-all shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t('export.copied') : t('export.copy')}</span>
                  </button>

                  {htmlText && destination === 'executive_email' && (
                    <button
                      type="button"
                      onClick={handleCopyRawHtml}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 text-[#1F1F1F] text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
                      title={t('export.rawHtmlTitle')}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{copiedRawHtml ? t('export.htmlCopied') : t('export.rawHtml')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-[#1F1F1F] text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('export.download')}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto overscroll-contain bg-[#F8FAFC] border border-black/[0.08] rounded-xl font-mono leading-relaxed select-all p-3 sm:p-4 text-[11px] sm:text-xs">
                {destination === 'executive_email' && htmlText ? (
                  <div 
                    className="font-sans" 
                    dangerouslySetInnerHTML={{ __html: htmlText }} 
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words">{plainText}</pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: DIRECT MESSAGE TOOL DISPATCH */}
        {modalMode === 'tools' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Tool Selector Sidebar */}
            <div className="export-tool-nav shrink-0 p-2 sm:p-3 border-b border-black/[0.08] bg-[#FAFAFA] overflow-x-auto lg:overflow-y-auto">
              {/* Scope selector */}
              {selectedCards.length > 0 && (
                <div className="export-scope mb-2 space-y-1">
                  <span className="text-[11px] font-semibold text-[#727272] uppercase tracking-wider block">
                    {t('export.dispatchScope')}
                  </span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-200/60 rounded-lg text-xs font-medium max-w-sm">
                    <button
                      type="button"
                      onClick={() => setExportScope('all')}
                      className={`py-1 rounded text-center transition-all ${
                        exportScope === 'all' ? 'bg-white text-[#1F1F1F] shadow-xs' : 'text-[#727272]'
                      }`}
                    >
                      {t('export.allOf', { count: project.cards.length })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportScope('selected')}
                      className={`py-1 rounded text-center transition-all ${
                        exportScope === 'selected' ? 'bg-white text-[#1F1F1F] shadow-xs' : 'text-[#727272]'
                      }`}
                    >
                      {t('export.selectedOf', { count: selectedCards.length })}
                    </button>
                  </div>
                </div>
              )}

              <span className="hidden sm:block text-[11px] font-semibold text-[#727272] uppercase tracking-wider mb-2">
                {t('export.tools')}
              </span>

              {/* 1. Email Suite */}
              <button
                type="button"
                onClick={() => { setSelectedTool('email'); setDispatchStatus(null); }}
                className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  selectedTool === 'email'
                    ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                    : 'text-[#727272] hover:bg-neutral-200/50'
                }`}
              >
                <Mail className="w-4 h-4 text-[#0071E3]" />
                <div>
                  <div className="text-xs">{t('export.toolEmail')}</div>
                  <div className="text-[10px] text-[#727272] font-normal">{t('export.toolEmailSub')}</div>
                </div>
              </button>

              {/* 2. Slack Channel */}
              <button
                type="button"
                onClick={() => { setSelectedTool('slack'); setDispatchStatus(null); }}
                className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  selectedTool === 'slack'
                    ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                    : 'text-[#727272] hover:bg-neutral-200/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#E01E5A]" />
                <div>
                  <div className="text-xs">{t('export.toolSlack')}</div>
                  <div className="text-[10px] text-[#727272] font-normal">{t('export.toolSlackSub')}</div>
                </div>
              </button>

              {/* 3. Microsoft Teams */}
              <button
                type="button"
                onClick={() => { setSelectedTool('teams'); setDispatchStatus(null); }}
                className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  selectedTool === 'teams'
                    ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                    : 'text-[#727272] hover:bg-neutral-200/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#6264A7]" />
                <div>
                  <div className="text-xs">{t('export.toolTeams')}</div>
                  <div className="text-[10px] text-[#727272] font-normal">{t('export.toolTeamsSub')}</div>
                </div>
              </button>

              {/* 4. Google Chat */}
              <button
                type="button"
                onClick={() => { setSelectedTool('google_chat'); setDispatchStatus(null); }}
                className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  selectedTool === 'google_chat'
                    ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                    : 'text-[#727272] hover:bg-neutral-200/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#00AC47]" />
                <div>
                  <div className="text-xs">{t('export.toolGchat')}</div>
                  <div className="text-[10px] text-[#727272] font-normal">{t('export.toolGchatSub')}</div>
                </div>
              </button>

              {/* 5. Discord */}
              <button
                type="button"
                onClick={() => { setSelectedTool('discord'); setDispatchStatus(null); }}
                className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  selectedTool === 'discord'
                    ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                    : 'text-[#727272] hover:bg-neutral-200/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                <div>
                  <div className="text-xs">{t('export.toolDiscord')}</div>
                  <div className="text-[10px] text-[#727272] font-normal">{t('export.toolDiscordSub')}</div>
                </div>
              </button>

              {/* 6. Quick Mobile */}
              <button
                type="button"
                onClick={() => { setSelectedTool('mobile'); setDispatchStatus(null); }}
                className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  selectedTool === 'mobile'
                    ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                    : 'text-[#727272] hover:bg-neutral-200/50'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#25D366]" />
                <div>
                  <div className="text-xs">{t('export.toolMobile')}</div>
                  <div className="text-[10px] text-[#727272] font-normal">{t('export.toolMobileSub')}</div>
                </div>
              </button>

              {/* 7. Delivery Audit Log */}
              <div className="export-audit-nav pt-0 sm:pt-2 border-t-0 sm:border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => { setSelectedTool('audit_log'); setDispatchStatus(null); }}
                  className={`export-tool-button w-full sm:w-auto sm:min-w-[145px] text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-between ${
                    selectedTool === 'audit_log'
                      ? 'bg-white shadow-xs border border-black/10 font-bold text-[#1F1F1F]'
                      : 'text-[#727272] hover:bg-neutral-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#F59E0B]" />
                    <div className="text-xs">{t('export.audit')}</div>
                  </div>
                  {auditLogs.length > 0 && (
                    <span className="text-[10px] font-bold bg-[#0071E3]/10 text-[#0071E3] px-1.5 py-0.5 rounded-full">
                      {auditLogs.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tool Active Workspace */}
            <div className="flex-1 min-h-0 p-3 sm:p-4 lg:p-6 overflow-y-auto overscroll-contain bg-white space-y-4 sm:space-y-5">
              {selectedTool !== 'audit_log' && <details className="rounded-2xl border border-black/[0.08] bg-[#FAFAFA] overflow-hidden" open={selectedTool === 'email'}>
                <summary className="px-4 py-3 cursor-pointer text-[13px] font-semibold text-[#1D1D1F]">{selectedTool === 'email' ? t('export.emailPreview') : t('export.graphsIncluded')}</summary>
                {selectedTool === 'email' ? <div>
                  <div className="px-4 pb-3 flex flex-wrap items-center gap-3"><button type="button" onClick={handleCopyEmail} className="rounded-full bg-[#0071E3] text-white px-4 py-2 text-xs font-medium">{t('export.copyEmailGraphs')}</button><span className="text-[11px] text-[#6E6E73]">{t('export.composeHint')}</span></div>
                  <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: emailHtml }} />
                </div> : <div className="px-4 pb-4 space-y-3">
                  <p className="text-[11px] text-[#6E6E73]">{t('export.portableGraphs')}</p>
                  {dispatchGraphs.length ? dispatchGraphs.map((metric, index) => <div key={index} className="rounded-xl bg-white border border-black/[0.06] p-3"><div className="text-xs font-medium mb-2">{metric.label}</div><pre className="text-[11px] whitespace-pre-wrap text-[#424245] leading-relaxed">{metric.graph}</pre></div>) : <p className="text-xs text-[#6E6E73]">{t('export.chooseGraph')}</p>}
                </div>}
              </details>}
              {/* TOOL 1: EMAIL SUITE */}
              {selectedTool === 'email' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.emailTitle')}</h3>
                    <p className="text-xs text-[#727272]">
                      {t('export.emailDesc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">{t('export.toLabel')}</label>
                      <input
                        type="text"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="executive-review@acme.corp"
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">{t('export.ccLabel')}</label>
                      <input
                        type="text"
                        value={emailCc}
                        onChange={(e) => setEmailCc(e.target.value)}
                        placeholder="product-leads@acme.corp, pmo@acme.corp"
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">{t('export.subjectLabel')}</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-black/[0.08] rounded-xl text-xs text-[#334155] max-h-36 overflow-y-auto font-mono">
                    {plainText}
                  </div>

                  {dispatchStatus && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      dispatchStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">{dispatchStatus.message}</div>
                        <div className="text-[11px] opacity-80 mt-0.5 font-mono">{dispatchStatus.statusText} · {dispatchStatus.timestamp}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenMailto}
                      className="px-3.5 py-2 bg-[#0071E3] text-white text-xs font-semibold rounded-xl hover:bg-[#0071E3]/90 flex items-center gap-2 shadow-xs transition-transform active:scale-[0.99]"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{t('export.openMailApp')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenGmailWeb}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#EA4335]" />
                      <span>{t('export.gmailWeb')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenOutlookWeb}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#0078D4]" />
                      <span>{t('export.outlookWeb')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateEmailSend}
                      disabled={isDispatching}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ml-auto"
                      title="Simulate enterprise SMTP delivery"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('export.simulateSend')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TOOL 2: SLACK CHANNEL */}
              {selectedTool === 'slack' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.slackTitle')}</h3>
                    <p className="text-xs text-[#727272]">
                      {t('export.slackDesc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.channelId')}
                      </label>
                      <input
                        type="text"
                        value={slackChannelName}
                        onChange={(e) => setSlackChannelName(e.target.value)}
                        placeholder="#executive-updates"
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.slackUrl')}
                      </label>
                      <input
                        type="url"
                        value={slackWebhookUrl}
                        onChange={(e) => setSlackWebhookUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/T.../B.../..."
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#727272]">
                    {t('export.webhookHint')}
                  </p>

                  {dispatchStatus && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      dispatchStatus.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      {dispatchStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{dispatchStatus.message}</div>
                        {dispatchStatus.statusText && (
                          <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                            {dispatchStatus.statusText} · {dispatchStatus.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => handleDispatchSlack(false)}
                      className="px-4 py-2 bg-[#E01E5A] hover:bg-[#c0184b] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatching ? t('export.postingTo', { name: slackChannelName || t('export.toolSlack') }) : t('export.postTo', { name: slackChannelName || t('export.toolSlack') })}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatchSlack(true)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                      title="Simulate dispatch without external webhook"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#E01E5A]" />
                      <span>{t('export.testSim')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPayloadInspector(!showPayloadInspector)}
                      className="text-xs text-[#727272] hover:text-[#1F1F1F] ml-auto font-medium"
                    >
                      {showPayloadInspector ? t('export.hidePayload') : t('export.inspectSlack')}
                    </button>
                  </div>

                  {showPayloadInspector && (
                    <div className="p-3 bg-[#F8FAFC] border border-black/[0.08] rounded-xl text-[11px] font-mono text-[#334155] max-h-48 overflow-y-auto">
                      <pre>{JSON.stringify(formatSlackWebhookPayload(project, cardsToExport), null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL 3: MICROSOFT TEAMS */}
              {selectedTool === 'teams' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.teamsTitle')}</h3>
                    <p className="text-xs text-[#727272]">
                      {t('export.teamsDesc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.teamName')}
                      </label>
                      <input
                        type="text"
                        value={teamsChannelName}
                        onChange={(e) => setTeamsChannelName(e.target.value)}
                        placeholder="Executive Briefing Channel"
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.teamsUrl')}
                      </label>
                      <input
                        type="url"
                        value={teamsWebhookUrl}
                        onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                        placeholder="https://outlook.office.com/webhook/..."
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                      />
                    </div>
                  </div>

                  {dispatchStatus && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      dispatchStatus.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      {dispatchStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{dispatchStatus.message}</div>
                        {dispatchStatus.statusText && (
                          <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                            {dispatchStatus.statusText} · {dispatchStatus.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => handleDispatchTeams(false)}
                      className="px-4 py-2 bg-[#6264A7] hover:bg-[#525492] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatching ? t('export.postingTo', { name: teamsChannelName || t('export.toolTeams') }) : t('export.postTo', { name: teamsChannelName || t('export.toolTeams') })}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatchTeams(true)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                      title="Simulate dispatch without external webhook"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#6264A7]" />
                      <span>{t('export.testSim')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPayloadInspector(!showPayloadInspector)}
                      className="text-xs text-[#727272] hover:text-[#1F1F1F] ml-auto font-medium"
                    >
                      {showPayloadInspector ? t('export.hidePayload') : t('export.inspectAdaptive')}
                    </button>
                  </div>

                  {showPayloadInspector && (
                    <div className="p-3 bg-[#F8FAFC] border border-black/[0.08] rounded-xl text-[11px] font-mono text-[#334155] max-h-48 overflow-y-auto">
                      <pre>{JSON.stringify(formatTeamsWebhookPayload(project, cardsToExport), null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL 4: GOOGLE CHAT / SPACES */}
              {selectedTool === 'google_chat' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.gchatTitle')}</h3>
                    <p className="text-xs text-[#727272]">
                      {t('export.gchatDesc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.spaceName')}
                      </label>
                      <input
                        type="text"
                        value={googleChatSpaceName}
                        onChange={(e) => setGoogleChatSpaceName(e.target.value)}
                        placeholder="Product Leadership Space"
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.gchatUrl')}
                      </label>
                      <input
                        type="url"
                        value={googleChatWebhookUrl}
                        onChange={(e) => setGoogleChatWebhookUrl(e.target.value)}
                        placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                      />
                    </div>
                  </div>

                  {dispatchStatus && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      dispatchStatus.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">{dispatchStatus.message}</div>
                        {dispatchStatus.statusText && (
                          <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                            {dispatchStatus.statusText} · {dispatchStatus.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => handleDispatchGoogleChat(false)}
                      className="px-4 py-2 bg-[#00AC47] hover:bg-[#008f3a] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatching ? t('export.postingTo', { name: googleChatSpaceName || t('export.toolGchat') }) : t('export.postTo', { name: googleChatSpaceName || t('export.toolGchat') })}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatchGoogleChat(true)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                      title="Simulate dispatch without external webhook"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#00AC47]" />
                      <span>{t('export.testSim')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPayloadInspector(!showPayloadInspector)}
                      className="text-xs text-[#727272] hover:text-[#1F1F1F] ml-auto font-medium"
                    >
                      {showPayloadInspector ? t('export.hidePayload') : t('export.inspectCardV2')}
                    </button>
                  </div>

                  {showPayloadInspector && (
                    <div className="p-3 bg-[#F8FAFC] border border-black/[0.08] rounded-xl text-[11px] font-mono text-[#334155] max-h-48 overflow-y-auto">
                      <pre>{JSON.stringify(formatGoogleChatWebhookPayload(project, cardsToExport), null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL 5: DISCORD */}
              {selectedTool === 'discord' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.discordTitle')}</h3>
                    <p className="text-xs text-[#727272]">
                      {t('export.discordDesc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.channelName')}
                      </label>
                      <input
                        type="text"
                        value={discordChannelName}
                        onChange={(e) => setDiscordChannelName(e.target.value)}
                        placeholder="#engineering-briefing"
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                        {t('export.discordUrl')}
                      </label>
                      <input
                        type="url"
                        value={discordWebhookUrl}
                        onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full text-xs p-2 border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                      />
                    </div>
                  </div>

                  {dispatchStatus && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      dispatchStatus.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">{dispatchStatus.message}</div>
                        {dispatchStatus.statusText && (
                          <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                            {dispatchStatus.statusText} · {dispatchStatus.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => handleDispatchDiscord(false)}
                      className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatching ? t('export.postingTo', { name: discordChannelName || t('export.toolDiscord') }) : t('export.postTo', { name: discordChannelName || t('export.toolDiscord') })}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatchDiscord(true)}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                      title="Simulate dispatch without external webhook"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#5865F2]" />
                      <span>{t('export.testSim')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPayloadInspector(!showPayloadInspector)}
                      className="text-xs text-[#727272] hover:text-[#1F1F1F] ml-auto font-medium"
                    >
                      {showPayloadInspector ? t('export.hidePayload') : t('export.inspectEmbed')}
                    </button>
                  </div>

                  {showPayloadInspector && (
                    <div className="p-3 bg-[#F8FAFC] border border-black/[0.08] rounded-xl text-[11px] font-mono text-[#334155] max-h-48 overflow-y-auto">
                      <pre>{JSON.stringify(formatDiscordWebhookPayload(project, cardsToExport), null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL 6: QUICK MOBILE SHARE */}
              {selectedTool === 'mobile' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.mobileTitle')}</h3>
                    <p className="text-xs text-[#727272]">
                      {t('export.mobileDesc')}
                    </p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] border border-black/[0.08] rounded-xl space-y-3">
                    <div className="text-xs font-semibold text-[#1F1F1F] flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#0071E3]" />
                      <span>{t('export.digestPreview')}</span>
                    </div>
                    <p className="text-xs text-[#727272] font-mono leading-relaxed line-clamp-4">
                      {plainText}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-[0.99]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('export.shareWhatsApp')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenTelegram}
                      className="px-4 py-2 bg-[#229ED9] hover:bg-[#1d8bc0] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-[0.99]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('export.shareTelegram')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1F1F1F] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ml-auto"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('export.copyMobile')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TOOL 7: DELIVERY AUDIT LOG */}
              {selectedTool === 'audit_log' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#1F1F1F]">{t('export.auditTitle')}</h3>
                      <p className="text-xs text-[#727272]">
                        {t('export.auditDesc')}
                      </p>
                    </div>

                    {auditLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAuditLog}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('export.clearHistory')}</span>
                      </button>
                    )}
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-black/15 rounded-xl bg-neutral-50/50 space-y-2">
                      <History className="w-6 h-6 text-[#727272] mx-auto" />
                      <div className="text-xs font-semibold text-[#1F1F1F]">{t('export.noDispatch')}</div>
                      <p className="text-[11px] text-[#727272] max-w-xs mx-auto">
                        {t('export.noDispatchHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 bg-[#F8FAFC] border border-black/[0.06] rounded-xl flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[#1F1F1F]">{log.tool}</span>
                              <span className="text-[#727272]">→</span>
                              <span className="font-mono text-[11px] text-[#0071E3] truncate">{log.target}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                log.status === 'delivered' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {log.status === 'delivered' ? t('export.delivered') : t('export.scheduled')}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#727272] line-clamp-1">{log.summary}</div>
                          </div>
                          <span className="text-[10px] text-[#727272] shrink-0 font-mono mt-0.5">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
