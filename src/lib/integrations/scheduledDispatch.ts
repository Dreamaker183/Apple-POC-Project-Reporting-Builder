import { ReportProject } from '../../types/report';
import { dispatchToSlackWebhook, dispatchToTeamsWebhook, dispatchToGoogleChatWebhook, dispatchToDiscordWebhook, loadSavedWebhooks } from './messageDispatch';
import { formatSlackWebhookPayload, formatTeamsWebhookPayload, formatGoogleChatWebhookPayload, formatDiscordWebhookPayload } from '../export/destinationFormatters';

export function isScheduleDue(project: ReportProject, now = Date.now()): boolean {
  const schedule = project.sendSchedule;
  return !!schedule?.enabled && schedule.status === 'scheduled' && Number.isFinite(Date.parse(schedule.scheduledAt)) && Date.parse(schedule.scheduledAt) <= now;
}

export async function sendScheduledReport(project: ReportProject) {
  const destination = project.sendSchedule?.destination;
  const config = loadSavedWebhooks();
  if (!destination || !config[destination]) return { success: false, message: 'Configure this destination’s webhook in Share → Message Dispatch.', timestamp: new Date().toISOString() };
  switch (destination) {
    case 'slack': return dispatchToSlackWebhook(config.slack!, formatSlackWebhookPayload(project));
    case 'teams': return dispatchToTeamsWebhook(config.teams!, formatTeamsWebhookPayload(project));
    case 'googleChat': return dispatchToGoogleChatWebhook(config.googleChat!, formatGoogleChatWebhookPayload(project));
    case 'discord': return dispatchToDiscordWebhook(config.discord!, formatDiscordWebhookPayload(project));
  }
}
