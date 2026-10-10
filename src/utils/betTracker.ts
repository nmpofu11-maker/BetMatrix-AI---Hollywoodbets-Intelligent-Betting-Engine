import { BetTicket } from '../types/betting';

let lastNotice = '';
let lastNoticeAt = 0;
const NOTICE_THROTTLE_MS = 5 * 60 * 1000;

function showThrottledNotice(onShowToast: (msg: string) => void, message: string) {
  const now = Date.now();
  if (message !== lastNotice || now - lastNoticeAt >= NOTICE_THROTTLE_MS) {
    lastNotice = message;
    lastNoticeAt = now;
    onShowToast(message);
  }
}

export const checkPendingBets = async (
  tickets: BetTicket[],
  onUpdateTickets: (tickets: BetTicket[]) => void,
  onShowToast: (msg: string) => void
) => {
  const pendingTickets = tickets.filter(t => t.status === 'pending');
  if (pendingTickets.length === 0) return;

  try {
    const res = await fetch('/api/ai/verify-match-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets }),
    });
    if (!res.ok) {
      showThrottledNotice(onShowToast, 'Settlement check could not reach the score service. Pending ticket statuses were preserved.');
      return;
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.verifiedTickets)) {
      showThrottledNotice(onShowToast, data.error || 'Settlement verification is unavailable. Pending ticket statuses were preserved.');
      return;
    }

    if (data.updatedCount > 0 && JSON.stringify(data.verifiedTickets) !== JSON.stringify(tickets)) {
      onUpdateTickets(data.verifiedTickets);
    }

    if (Number(data.settledCount) > 0) {
      onShowToast('Verified settlement completed for ' + data.settledCount + ' ticket(s) using provider-sourced final scores.');
    } else if (Number(data.updatedCount) > 0) {
      onShowToast('Final-score evidence recorded. Some selections still need a supported, conclusive result before settlement.');
    } else if (!Array.isArray(data.providers) || !data.providers.some((provider: any) => Number(provider.resultCount) > 0)) {
      const detail = Array.isArray(data.providers)
        ? data.providers.map((provider: any) => provider.note || provider.error).filter(Boolean).join(' ')
        : '';
      showThrottledNotice(onShowToast, (data.message || 'No provider-sourced final scores were found.') + (detail ? ' ' + detail : ''));
    }
  } catch (err) {
    console.warn('Provider-backed settlement check failed; ticket statuses are unchanged:', err);
    showThrottledNotice(onShowToast, 'Could not connect to the settlement service. Pending ticket statuses were preserved.');
  }
};
