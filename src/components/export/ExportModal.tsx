/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDialogFocus } from '../common/useDialogFocus';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { metricGraphText } from '../../lib/export/metricGraphs';
import { ReportProject, SnippetCard, ExportDestination } from '../../types/report';
import { sanitizeHtml } from '../../lib/security/sanitize';
import { exportReportToMarkdown } from '../../lib/export/markdownExport';
import { exportReportToJson } from '../../lib/export/jsonExport';
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
  createEmlDraft,
  createWhatsAppShareLink,
  createTelegramShareLink,
  dispatchToSlackWebhook,
  dispatchToTeamsWebhook,
  dispatchToGoogleChatWebhook,
  dispatchToDiscordWebhook,
  loadSavedWebhooks,
  saveWebhooks,
  DispatchResult,
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
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Share2
} from 'lucide-react';

export type MessageToolId = 'email' | 'slack' | 'teams' | 'google_chat' | 'discord' | 'mobile';

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
  const { t, locale } = useLanguage();

  // Unified destination state
  const [destination, setDestination] = useState<ExportDestination>('executive_email');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>(
    selectedCards.length > 0 ? 'selected' : 'all'
  );
  const [copied, setCopied] = useState(false);
  const [copiedRawHtml, setCopiedRawHtml] = useState(false);

  // Email Configuration State
  const [emailTo, setEmailTo] = useState('executive-review@acme.corp');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState(
    `[Status Report] ${project.title}${project.reportingPeriod ? ` (${project.reportingPeriod})` : ''}`
  );

  // Webhook Configuration State
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannelName, setSlackChannelName] = useState('#executive-updates');
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [teamsChannelName, setTeamsChannelName] = useState('Executive Briefing Channel');
  const [googleChatWebhookUrl, setGoogleChatWebhookUrl] = useState('');
  const [googleChatSpaceName, setGoogleChatSpaceName] = useState('Product Leadership Space');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [discordChannelName, setDiscordChannelName] = useState('#status-reports');

  // Dispatch Execution State
  const [dispatchStatus, setDispatchStatus] = useState<DispatchResult | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showPayloadInspector, setShowPayloadInspector] = useState(false);
  const [pasteGuide, setPasteGuide] = useState<'mail' | 'gmail' | 'outlook' | null>(null);

  // Navigation scroll affordance & smooth transition refs
  const navScrollRef = useRef<HTMLDivElement>(null);
  const activeNavButtonRef = useRef<HTMLButtonElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkNavScroll = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollNav = (direction: 'left' | 'right') => {
    const el = navScrollRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -220 : 220;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    checkNavScroll();
    const el = navScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkNavScroll, { passive: true });
    window.addEventListener('resize', checkNavScroll);
    return () => {
      el.removeEventListener('scroll', checkNavScroll);
      window.removeEventListener('resize', checkNavScroll);
    };
  }, [checkNavScroll, isOpen]);

  useEffect(() => {
    activeNavButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0;
    }
    checkNavScroll();
  }, [destination, checkNavScroll]);

  // Sync mode and tool when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTool) {
        if (initialTool === 'email') setDestination('executive_email');
        else if (initialTool === 'slack') setDestination('slack');
        else if (initialTool === 'teams') setDestination('teams');
        else if (initialTool === 'google_chat') setDestination('google_chat');
        else if (initialTool === 'discord') setDestination('discord');
        else if (initialTool === 'mobile') setDestination('mobile');
      } else if (initialMode === 'tools') {
        setDestination('slack');
      } else {
        setDestination('executive_email');
      }

      setExportScope(selectedCards.length > 0 ? 'selected' : 'all');
      setEmailSubject(`[Status Report] ${project.title}${project.reportingPeriod ? ` (${project.reportingPeriod})` : ''}`);
      setDispatchStatus(null);
      
      // Load saved configurations
      const saved = loadSavedWebhooks();
      if (saved.emailTo) setEmailTo(saved.emailTo);
      if (saved.emailCc) setEmailCc(saved.emailCc);
      if (saved.slack) setSlackWebhookUrl(saved.slack);
      if (saved.teams) setTeamsWebhookUrl(saved.teams);
      if (saved.googleChat) setGoogleChatWebhookUrl(saved.googleChat);
      if (saved.discord) setDiscordWebhookUrl(saved.discord);
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

  const emailHtml = formatForExecutiveEmail(project, cardsToExport, locale);
  const emailText = exportReportToMarkdown(project, cardsToExport);
  const dispatchGraphs = cardsToExport.filter(c => c.type === 'kpi_metric').map(c => ({ label: c.label, graph: metricGraphText(c, locale) })).filter(c => c.graph);

  // Unified destination metadata
  const destinationsList: Array<{
    id: ExportDestination;
    name: string;
    icon: React.ReactNode;
    description: string;
    category: 'channels' | 'formats';
    badge?: string;
    ext?: string;
    mime?: string;
  }> = [
    {
      id: 'executive_email',
      name: t('export.destEmail'),
      icon: <Mail className="w-4 h-4 text-[#0071E3]" />,
      description: t('export.destEmailDesc'),
      category: 'channels',
      ext: 'html',
      mime: 'text/html',
    },
    {
      id: 'slack',
      name: t('export.destSlack'),
      icon: <MessageSquare className="w-4 h-4 text-[#E01E5A]" />,
      description: t('export.destSlackDesc'),
      category: 'channels',
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'teams',
      name: t('export.destTeams'),
      icon: <MessageSquare className="w-4 h-4 text-[#6264A7]" />,
      description: t('export.destTeamsDesc'),
      category: 'channels',
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'google_chat',
      name: t('export.toolGchat'),
      icon: <MessageSquare className="w-4 h-4 text-[#00AC47]" />,
      description: t('export.toolGchatSub'),
      category: 'channels',
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'discord',
      name: t('export.toolDiscord'),
      icon: <MessageSquare className="w-4 h-4 text-[#5865F2]" />,
      description: t('export.toolDiscordSub'),
      category: 'channels',
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'mobile',
      name: t('export.toolMobile'),
      icon: <Smartphone className="w-4 h-4 text-[#25D366]" />,
      description: t('export.toolMobileSub'),
      category: 'channels',
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'weekly_status',
      name: t('export.destWeekly'),
      icon: <FileText className="w-4 h-4 text-[#107C41]" />,
      description: t('export.destWeeklyDesc'),
      category: 'formats',
      ext: 'txt',
      mime: 'text/plain',
    },
    {
      id: 'markdown',
      name: t('export.destMarkdown'),
      icon: <FileCode className="w-4 h-4 text-[#1F1F1F]" />,
      description: t('export.destMarkdownDesc'),
      category: 'formats',
      ext: 'md',
      mime: 'text/markdown',
    },
    {
      id: 'json',
      name: t('export.destJson'),
      icon: <FileCode className="w-4 h-4 text-[#F59E0B]" />,
      description: t('export.destJsonDesc'),
      category: 'formats',
      ext: 'json',
      mime: 'application/json',
    },
  ];

  const getExportContent = (): { plainText: string; htmlText?: string } => {
    switch (destination) {
      case 'executive_email':
        return { plainText: emailText, htmlText: emailHtml };
      case 'slack':
        return { plainText: formatForSlack(project, cardsToExport) };
      case 'teams':
        return { plainText: formatForTeams(project, cardsToExport) };
      case 'google_chat':
        return { plainText: exportReportToMarkdown(project, cardsToExport) };
      case 'discord':
        return { plainText: exportReportToMarkdown(project, cardsToExport) };
      case 'mobile':
        return { plainText: `${project.title}\n${exportReportToMarkdown(project, cardsToExport).slice(0, 1500)}` };
      case 'weekly_status':
        return { plainText: formatForWeeklyStatusMemo(project, cardsToExport) };
      case 'markdown':
        return { plainText: exportReportToMarkdown(project, cardsToExport) };
      case 'json':
        return { plainText: exportReportToJson(project, cardsToExport) };
      default:
        return { plainText: '' };
    }
  };

  const { plainText, htmlText } = getExportContent();

  // Copy Handlers
  const handleCopyEmail = async () => {
    // Always use Executive Email rich format (HTML + markdown fallback)
    const result = await copyToClipboard(emailText, emailHtml);
    if (result.success) {
      setCopied(true);
      onNotify(t('export.copiedEmail'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify(t('export.copyFailEmail'), 'error');
    }
  };

  const handleCopy = async () => {
    if (destination === 'executive_email') {
      await handleCopyEmail();
      return;
    }
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
    const rawToCopy = htmlText || emailHtml;
    if (!rawToCopy) return;
    const res = await copyToClipboard(rawToCopy);
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

  // Tool Dispatches - always use Executive Email rich format with HTML UI
  const handleOpenMailto = async () => {
    handleSaveSettings({ emailTo, emailCc });
    // 1. Copy Executive Email rich HTML to clipboard
    await copyToClipboard(emailText, emailHtml);
    
    // 2. Generate and download native RFC 822 .eml draft with X-Unsent: 1 header
    // Opening this .eml on macOS opens Apple Mail / Outlook with the full HTML UI rendered!
    const emlContent = createEmlDraft(emailTo, emailSubject, emailHtml, emailCc);
    const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'status-report'}-executive-draft.eml`;
    downloadFile(filename, emlContent, 'message/rfc822');

    // 3. Also trigger mailto: with clean body
    const link = createMailtoLink(emailTo, emailSubject, '', emailCc);
    window.location.href = link;

    setPasteGuide('mail');
    onNotify(t('export.notifyEmlPrepared'), 'success');
  };

  const handleOpenGmailWeb = async () => {
    handleSaveSettings({ emailTo, emailCc });
    // Always copy Executive Email rich HTML with full tables and graphs
    await copyToClipboard(emailText, emailHtml);
    // Open Gmail compose with clean body so user can paste the rich HTML UI directly
    const link = createGmailComposeLink(emailTo, emailSubject, '', emailCc);
    window.open(link, '_blank');
    setPasteGuide('gmail');
    onNotify(t('export.notifyGmailOpened'), 'info');
  };

  const handleOpenOutlookWeb = async () => {
    handleSaveSettings({ emailTo });
    // Always copy Executive Email rich HTML with full tables and graphs
    await copyToClipboard(emailText, emailHtml);
    // Open Outlook compose with clean body so user can paste the rich HTML UI directly
    const link = createOutlookComposeLink(emailTo, emailSubject, '');
    window.open(link, '_blank');
    setPasteGuide('outlook');
    onNotify(t('export.notifyOutlookOpened'), 'info');
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

  const handleDispatchSlack = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ slack: slackWebhookUrl });
    const payload = formatSlackWebhookPayload(project, cardsToExport);
    const res = await dispatchToSlackWebhook(slackWebhookUrl, payload);
    setIsDispatching(false);
    setDispatchStatus(res);
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleDispatchTeams = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ teams: teamsWebhookUrl });
    const payload = formatTeamsWebhookPayload(project, cardsToExport);
    const res = await dispatchToTeamsWebhook(teamsWebhookUrl, payload);
    setIsDispatching(false);
    setDispatchStatus(res);
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleDispatchGoogleChat = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ googleChat: googleChatWebhookUrl });
    const payload = formatGoogleChatWebhookPayload(project, cardsToExport);
    const res = await dispatchToGoogleChatWebhook(googleChatWebhookUrl, payload);
    setIsDispatching(false);
    setDispatchStatus(res);
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const handleDispatchDiscord = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    handleSaveSettings({ discord: discordWebhookUrl });
    const payload = formatDiscordWebhookPayload(project, cardsToExport);
    const res = await dispatchToDiscordWebhook(discordWebhookUrl, payload);
    setIsDispatching(false);
    setDispatchStatus(res);
    onNotify(res.message, res.success ? 'success' : 'error');
  };

  const currentDestinationMeta = destinationsList.find((d) => d.id === destination);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs no-print p-0 sm:p-3 lg:p-4">
      <div 
        className="bg-white rounded-none sm:rounded-2xl border-0 sm:border border-black/10 shadow-2xl max-w-5xl w-full h-[100dvh] sm:h-auto flex flex-col min-h-0 max-h-[100dvh] sm:max-h-[calc(100dvh-1.5rem)] lg:max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 lg:p-5 border-b border-black/[0.08] shrink-0 bg-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="export-dialog-title" className="text-base font-bold text-[#1F1F1F] truncate">
                {t('export.title')}
              </h2>
            </div>
            <p className="hidden sm:block text-xs text-[#727272] truncate mt-0.5">
              {t('export.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#727272] hover:text-[#1F1F1F] rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label={t('export.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unified Main Layout: Left Sidebar + Right Preview & Dispatch Workspace */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Destinations & Channels Navigation */}
          <div className="export-destination-nav shrink-0 p-2 sm:p-3 border-b lg:border-b-0 lg:border-r border-black/[0.08] bg-[#FAFAFA] overflow-x-auto lg:overflow-y-auto relative w-full lg:w-[260px]">
            {/* Scope selector */}
            {selectedCards.length > 0 && (
              <div className="export-scope space-y-1 mb-2.5 shrink-0">
                <span className="text-[11px] font-semibold text-[#727272] uppercase tracking-wider block">
                  {t('export.scope')}
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-200/60 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`py-1 rounded text-center transition-colors duration-150 ${
                      exportScope === 'all' ? 'bg-white text-[#1F1F1F] shadow-xs font-semibold' : 'text-[#727272] hover:text-[#1F1F1F]'
                    }`}
                  >
                    {t('export.allOf', { count: project.cards.length })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('selected')}
                    className={`py-1 rounded text-center transition-colors duration-150 ${
                      exportScope === 'selected' ? 'bg-white text-[#1F1F1F] shadow-xs font-semibold' : 'text-[#727272] hover:text-[#1F1F1F]'
                    }`}
                  >
                    {t('export.selectedOf', { count: selectedCards.length })}
                  </button>
                </div>
              </div>
            )}

            {/* Scroll cues for compact screens */}
            <div className="relative flex-1 min-w-0">
              {canScrollLeft && (
                <div className="lg:hidden absolute left-0 top-0 bottom-0 z-20 flex items-center pointer-events-none">
                  <div className="w-8 h-full bg-gradient-to-r from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent" />
                  <button
                    type="button"
                    onClick={() => scrollNav('left')}
                    className="pointer-events-auto absolute left-0.5 p-1 rounded-full bg-white/95 shadow-md border border-black/10 text-[#1F1F1F] hover:bg-white active:scale-95 transition-all"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {canScrollRight && (
                <div className="lg:hidden absolute right-0 top-0 bottom-0 z-20 flex items-center justify-end pointer-events-none">
                  <div className="w-8 h-full bg-gradient-to-l from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent" />
                  <button
                    type="button"
                    onClick={() => scrollNav('right')}
                    className="pointer-events-auto absolute right-0.5 p-1 rounded-full bg-white/95 shadow-md border border-black/10 text-[#1F1F1F] hover:bg-white active:scale-95 transition-all"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div 
                ref={navScrollRef}
                onScroll={checkNavScroll}
                className="export-destinations flex flex-row lg:flex-col items-center lg:items-stretch gap-1.5 overflow-x-auto lg:overflow-visible scroll-smooth snap-x snap-proximity py-0.5"
              >
                {/* Section 1: Direct Message & Email Channels */}
                <span className="hidden sm:inline-block lg:block text-[10px] font-semibold text-[#86868B] uppercase tracking-wider shrink-0 mr-1 lg:mb-1">
                  {t('export.dispatch')} & {t('export.toolEmail')}
                </span>

                {destinationsList.filter(d => d.category === 'channels').map((dest) => {
                  const isSelected = destination === dest.id;
                  return (
                    <button
                      key={dest.id}
                      ref={isSelected ? activeNavButtonRef : null}
                      type="button"
                      onClick={() => { setDestination(dest.id); setDispatchStatus(null); }}
                      className={`w-auto lg:w-full min-w-[145px] sm:min-w-[160px] lg:min-w-0 text-left p-2 sm:p-2.5 rounded-xl border flex items-center sm:items-start gap-2 shrink-0 snap-start transition-[background-color,border-color,box-shadow,color] duration-150 ease-out select-none ${
                        isSelected
                          ? 'bg-white shadow-xs border-black/10 text-[#1F1F1F]'
                          : 'border-transparent hover:bg-neutral-200/50 text-[#727272] hover:text-[#1F1F1F]'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{dest.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className={`text-xs truncate ${isSelected ? 'font-semibold text-[#1F1F1F]' : 'font-medium text-[#484848]'}`}>
                            {dest.name}
                          </div>
                        </div>
                        <div className="hidden lg:block text-[10px] text-[#727272] leading-tight line-clamp-1 font-normal mt-0.5">
                          {dest.description}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Section 2: Formats */}
                <div className="hidden lg:block pt-2 border-t border-black/[0.06] mt-1">
                  <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1">
                    {t('export.formats')}
                  </span>
                </div>

                {destinationsList.filter(d => d.category === 'formats').map((dest) => {
                  const isSelected = destination === dest.id;
                  return (
                    <button
                      key={dest.id}
                      ref={isSelected ? activeNavButtonRef : null}
                      type="button"
                      onClick={() => { setDestination(dest.id); setDispatchStatus(null); }}
                      className={`w-auto lg:w-full min-w-[130px] sm:min-w-[145px] lg:min-w-0 text-left p-2 sm:p-2 rounded-xl border flex items-center gap-2 shrink-0 snap-start transition-[background-color,border-color,box-shadow,color] duration-150 ease-out select-none ${
                        isSelected
                          ? 'bg-white shadow-xs border-black/10 text-[#1F1F1F]'
                          : 'border-transparent hover:bg-neutral-200/50 text-[#727272] hover:text-[#1F1F1F]'
                      }`}
                    >
                      <div className="shrink-0">{dest.icon}</div>
                      <div className="min-w-0">
                        <div className={`text-xs truncate ${isSelected ? 'font-semibold text-[#1F1F1F]' : 'font-medium text-[#484848]'}`}>
                          {dest.name}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Section 3: Bottom Actions */}
                <div className="export-print-action shrink-0 pl-1.5 sm:pl-2 border-l lg:border-l-0 lg:border-t border-black/[0.08] lg:pt-2 snap-start lg:mt-1 space-y-1">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-1.5 px-2.5 text-xs font-medium text-[#1F1F1F] bg-white border border-black/10 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>{t('export.printPdf')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Preview & Dispatch Workspace */}
          <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 lg:p-5 bg-white overflow-hidden">
            {/* Top Workspace Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-black/[0.06] mb-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider break-words">
                    {currentDestinationMeta?.name ?? ''}
                  </span>
                  {currentDestinationMeta?.badge && (
                    <span className="text-[11px] font-medium text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
                      {currentDestinationMeta.badge}
                    </span>
                  )}
                  <span className="text-xs text-[#727272]">
                    {t('export.cardsCount', { count: cardsToExport.length })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071E3] text-white text-xs font-semibold rounded-lg hover:bg-[#0071E3]/90 transition-all shadow-sm active:scale-[0.98]"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t('export.copied') : t('export.copy')}</span>
                </button>

                {destination === 'executive_email' && (
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

                {destination !== 'mobile' && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-[#1F1F1F] text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('export.download')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Header: Direct Message & Email Dispatch Controls (Unified in Formats & Preview) */}
            {destination === 'executive_email' && (
              <div className="mb-3 p-3.5 bg-[#F8FAFC] border border-black/[0.08] rounded-xl shrink-0 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>{t('export.emailTitle')}</span>
                    </h3>
                    <p className="text-[11px] text-[#727272] mt-0.5">
                      {t('export.emailDescAlways')}
                    </p>
                  </div>
                </div>

                {/* Recipient Configuration Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.toLabel')}</label>
                    <input
                      type="text"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="executive-review@acme.corp"
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.ccLabel')}</label>
                    <input
                      type="text"
                      value={emailCc}
                      onChange={(e) => setEmailCc(e.target.value)}
                      placeholder="product-leads@acme.corp"
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.subjectLabel')}</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                </div>

                {/* Dispatch Status */}
                {dispatchStatus && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                    dispatchStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{dispatchStatus.message}</div>
                      <div className="text-[10px] opacity-80 mt-0.5 font-mono">{dispatchStatus.statusText} · {dispatchStatus.timestamp}</div>
                    </div>
                  </div>
                )}

                {/* Send Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={handleOpenMailto}
                    className="px-3 py-1.5 bg-[#0071E3] text-white text-xs font-semibold rounded-lg hover:bg-[#0071E3]/90 flex items-center gap-1.5 shadow-2xs active:scale-[0.99] transition-transform"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{t('export.openMailApp')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenGmailWeb}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-[#1F1F1F] border border-black/15 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#EA4335]" />
                    <span>{t('export.gmailWeb')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenOutlookWeb}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-[#1F1F1F] border border-black/15 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#0078D4]" />
                    <span>{t('export.outlookWeb')}</span>
                  </button>
                </div>

                {/* Visual Assistance Banner for HTML UI Delivery */}
                {pasteGuide === 'gmail' && (
                  <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        {t('export.gmailGuideTitle')}
                      </span>
                      <button type="button" onClick={() => setPasteGuide(null)} className="text-amber-700 hover:text-amber-900 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      {t('export.gmailGuideDesc')}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        {t('export.copyAgain')}
                      </button>
                    </div>
                  </div>
                )}

                {pasteGuide === 'outlook' && (
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        {t('export.outlookGuideTitle')}
                      </span>
                      <button type="button" onClick={() => setPasteGuide(null)} className="text-blue-700 hover:text-blue-900 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-blue-800 text-[11px] leading-relaxed">
                      {t('export.outlookGuideDesc')}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="px-2.5 py-1 bg-[#0078D4] hover:bg-[#006abc] text-white font-medium rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        {t('export.copyAgain')}
                      </button>
                    </div>
                  </div>
                )}

                {pasteGuide === 'mail' && (
                  <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('export.mailGuideTitle')}
                      </span>
                      <button type="button" onClick={() => setPasteGuide(null)} className="text-emerald-700 hover:text-emerald-900 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-emerald-800 text-[11px] leading-relaxed">
                      {t('export.mailGuideDesc')}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const emlContent = createEmlDraft(emailTo, emailSubject, emailHtml, emailCc);
                          const filename = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'status-report'}-executive-draft.eml`;
                          downloadFile(filename, emlContent, 'message/rfc822');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <Download className="w-3 h-3" />
                        {t('export.reDownloadEml')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Header: Slack Dispatch Controls */}
            {destination === 'slack' && (
              <div className="mb-3 p-3.5 bg-[#F8FAFC] border border-black/[0.08] rounded-xl shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#E01E5A]" />
                    <span>{t('export.slackTitle')}</span>
                  </h3>
                  <span className="text-[11px] text-[#727272]">{t('export.webhookHint')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.channelId')}</label>
                    <input
                      type="text"
                      value={slackChannelName}
                      onChange={(e) => setSlackChannelName(e.target.value)}
                      placeholder="#executive-updates"
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.slackUrl')}</label>
                    <input
                      type="url"
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/T.../B.../..."
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                    />
                  </div>
                </div>

                {dispatchStatus && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                    dispatchStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {dispatchStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{dispatchStatus.message}</div>
                      {dispatchStatus.statusText && <div className="text-[10px] opacity-80 mt-0.5 font-mono">{dispatchStatus.statusText} · {dispatchStatus.timestamp}</div>}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06]">
                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={handleDispatchSlack}
                    className="px-3.5 py-1.5 bg-[#E01E5A] hover:bg-[#c0184b] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isDispatching ? t('export.postingTo', { name: slackChannelName || t('export.toolSlack') }) : t('export.postTo', { name: slackChannelName || t('export.toolSlack') })}</span>
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
                  <div className="p-2.5 bg-white border border-black/[0.08] rounded-lg text-[10px] font-mono text-[#334155] max-h-36 overflow-y-auto">
                    <pre>{JSON.stringify(formatSlackWebhookPayload(project, cardsToExport), null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Header: Microsoft Teams Dispatch Controls */}
            {destination === 'teams' && (
              <div className="mb-3 p-3.5 bg-[#F8FAFC] border border-black/[0.08] rounded-xl shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#6264A7]" />
                    <span>{t('export.teamsTitle')}</span>
                  </h3>
                  <span className="text-[11px] text-[#727272]">{t('export.toolTeamsSub')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.teamName')}</label>
                    <input
                      type="text"
                      value={teamsChannelName}
                      onChange={(e) => setTeamsChannelName(e.target.value)}
                      placeholder="Executive Briefing Channel"
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.teamsUrl')}</label>
                    <input
                      type="url"
                      value={teamsWebhookUrl}
                      onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                      placeholder="https://outlook.office.com/webhook/..."
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                    />
                  </div>
                </div>

                {dispatchStatus && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                    dispatchStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {dispatchStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{dispatchStatus.message}</div>
                      {dispatchStatus.statusText && <div className="text-[10px] opacity-80 mt-0.5 font-mono">{dispatchStatus.statusText} · {dispatchStatus.timestamp}</div>}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06]">
                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={handleDispatchTeams}
                    className="px-3.5 py-1.5 bg-[#6264A7] hover:bg-[#525492] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isDispatching ? t('export.postingTo', { name: teamsChannelName || t('export.toolTeams') }) : t('export.postTo', { name: teamsChannelName || t('export.toolTeams') })}</span>
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
                  <div className="p-2.5 bg-white border border-black/[0.08] rounded-lg text-[10px] font-mono text-[#334155] max-h-36 overflow-y-auto">
                    <pre>{JSON.stringify(formatTeamsWebhookPayload(project, cardsToExport), null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Header: Google Chat Dispatch Controls */}
            {destination === 'google_chat' && (
              <div className="mb-3 p-3.5 bg-[#F8FAFC] border border-black/[0.08] rounded-xl shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#00AC47]" />
                    <span>{t('export.gchatTitle')}</span>
                  </h3>
                  <span className="text-[11px] text-[#727272]">{t('export.toolGchatSub')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.spaceName')}</label>
                    <input
                      type="text"
                      value={googleChatSpaceName}
                      onChange={(e) => setGoogleChatSpaceName(e.target.value)}
                      placeholder="Product Leadership Space"
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.gchatUrl')}</label>
                    <input
                      type="url"
                      value={googleChatWebhookUrl}
                      onChange={(e) => setGoogleChatWebhookUrl(e.target.value)}
                      placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                    />
                  </div>
                </div>

                {dispatchStatus && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                    dispatchStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {dispatchStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{dispatchStatus.message}</div>
                      {dispatchStatus.statusText && <div className="text-[10px] opacity-80 mt-0.5 font-mono">{dispatchStatus.statusText} · {dispatchStatus.timestamp}</div>}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06]">
                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={handleDispatchGoogleChat}
                    className="px-3.5 py-1.5 bg-[#00AC47] hover:bg-[#008f3a] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isDispatching ? t('export.postingTo', { name: googleChatSpaceName || t('export.toolGchat') }) : t('export.postTo', { name: googleChatSpaceName || t('export.toolGchat') })}</span>
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
                  <div className="p-2.5 bg-white border border-black/[0.08] rounded-lg text-[10px] font-mono text-[#334155] max-h-36 overflow-y-auto">
                    <pre>{JSON.stringify(formatGoogleChatWebhookPayload(project, cardsToExport), null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Header: Discord Dispatch Controls */}
            {destination === 'discord' && (
              <div className="mb-3 p-3.5 bg-[#F8FAFC] border border-black/[0.08] rounded-xl shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
                    <span>{t('export.discordTitle')}</span>
                  </h3>
                  <span className="text-[11px] text-[#727272]">{t('export.toolDiscordSub')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.channelName')}</label>
                    <input
                      type="text"
                      value={discordChannelName}
                      onChange={(e) => setDiscordChannelName(e.target.value)}
                      placeholder="#status-reports"
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#1F1F1F] block mb-0.5">{t('export.discordUrl')}</label>
                    <input
                      type="url"
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3] font-mono"
                    />
                  </div>
                </div>

                {dispatchStatus && (
                  <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                    dispatchStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {dispatchStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{dispatchStatus.message}</div>
                      {dispatchStatus.statusText && <div className="text-[10px] opacity-80 mt-0.5 font-mono">{dispatchStatus.statusText} · {dispatchStatus.timestamp}</div>}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06]">
                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={handleDispatchDiscord}
                    className="px-3.5 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isDispatching ? t('export.postingTo', { name: discordChannelName || t('export.toolDiscord') }) : t('export.postTo', { name: discordChannelName || t('export.toolDiscord') })}</span>
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
                  <div className="p-2.5 bg-white border border-black/[0.08] rounded-lg text-[10px] font-mono text-[#334155] max-h-36 overflow-y-auto">
                    <pre>{JSON.stringify(formatDiscordWebhookPayload(project, cardsToExport), null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Header: Mobile Share Controls */}
            {destination === 'mobile' && (
              <div className="mb-3 p-3.5 bg-[#F8FAFC] border border-black/[0.08] rounded-xl shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>{t('export.mobileTitle')}</span>
                  </h3>
                  <span className="text-[11px] text-[#727272]">{t('export.mobileDesc')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-transform active:scale-[0.99]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('export.shareWhatsApp')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenTelegram}
                    className="px-3.5 py-1.5 bg-[#229ED9] hover:bg-[#1d8bc0] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-transform active:scale-[0.99]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('export.shareTelegram')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-[#1F1F1F] border border-black/15 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ml-auto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('export.copyMobile')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Email Dispatch Link for other formats (Weekly, Markdown, JSON) */}
            {(destination === 'weekly_status' || destination === 'markdown' || destination === 'json') && (
              <div className="mb-3 px-3.5 py-2 bg-[#F0F7FF] border border-[#0071E3]/20 rounded-xl shrink-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[#0071E3]">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-[11px] sm:text-xs">
                    {t('export.formatTip')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDestination('executive_email')}
                  className="px-2.5 py-1 bg-[#0071E3] hover:bg-[#0071E3]/90 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  <span>{t('export.switchToExecutive')}</span>
                </button>
              </div>
            )}

            {/* Main Preview Container */}
            <div 
              ref={previewScrollRef}
              className="flex-1 min-h-0 overflow-auto overscroll-contain bg-[#F8FAFC] border border-black/[0.08] rounded-xl font-mono leading-relaxed select-all p-3 sm:p-4 text-[11px] sm:text-xs"
            >
              <div key={destination} className="export-preview-fade">
                {destination === 'executive_email' ? (
                  <div 
                    className="font-sans" 
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(emailHtml) }} 
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words">{plainText}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
