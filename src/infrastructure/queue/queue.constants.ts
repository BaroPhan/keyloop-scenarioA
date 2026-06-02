export const MAIL_QUEUE = 'mail';
export const WATCH_QUEUE = 'availability-watch';

/** Mail job names handled by MailProcessor. */
export const MailJob = {
  BOOKING_CONFIRMATION: 'booking-confirmation',
  CANCELLATION: 'cancellation',
  WATCH_AVAILABLE: 'watch-available',
} as const;

/** Watch job names handled by WatchProcessor. */
export const WatchJob = {
  CHECK: 'check',
  SWEEP: 'sweep',
} as const;

export interface MailJobData {
  to: string;
  subject: string;
  body: string;
}
