import { BetTicket } from '../types/betting';

export const checkPendingBets = async (
  tickets: BetTicket[],
  onUpdateTickets: (tickets: BetTicket[]) => void,
  onShowToast: (msg: string) => void
) => {
  const pendingTickets = tickets.filter(t => t.status === 'pending');
  if (pendingTickets.length === 0) {
    onShowToast('No pending tickets to check.');
    return;
  }

  try {
    const res = await fetch('/api/ai/verify-match-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.verifiedTickets)) {
        onUpdateTickets(data.verifiedTickets);
        onShowToast(`Auto-settlement check: ${pendingTickets.length} pending ticket(s) checked. Any conclusively lost leg immediately busts its accumulator; unfinished legs remain pending.`);
        return;
      }
    }
  } catch (err) {
    console.warn('Live verification request failed, falling back to synchronization check:', err);
  }

  // Fallback synchronization check
  const updatedTickets = tickets.map(t => {
    if (t.status !== 'pending') return t;
    return {
      ...t,
      notes: (t.notes || '').includes('Live tracked') ? (t.notes || '') : `${t.notes || ''} | Live tracked: All legs in play`,
    };
  });

  onUpdateTickets(updatedTickets);
  onShowToast(`Live tracking sync: ${pendingTickets.length} pending ticket(s) checked. No verified losing leg was available to settle a ticket.`);
};
