/**
 * Merge helpers shared by server and browser.
 * Problem solved: the browser used to POST its whole ticket list to the server every time
 * anything changed. If the server had settled a ticket while the tab was idle, the stale
 * "pending" copy in the browser silently overwrote the settlement. A settled outcome now wins.
 */
const SETTLEMENT_FIELDS = ['settledAt', 'actualPayoutZar', 'profitZar', 'bustedByTeams'] as const;
const LEG_RESULT_FIELDS = ['score', 'actualScore', 'matchStatus', 'verificationSource', 'faultContribution'] as const;

const isSettled = (s: unknown) => s === 'won' || s === 'lost' || s === 'void';

export function mergeLeg(a: any, b: any): any {
  // a = authoritative-if-settled (server), b = other (client)
  if (!a) return b; if (!b) return a;
  if (isSettled(a.status) && !isSettled(b.status)) { const out = { ...b, status: a.status }; for (const f of LEG_RESULT_FIELDS) if (a[f] !== undefined) out[f] = a[f]; return out; }
  if (isSettled(b.status) && !isSettled(a.status)) return { ...a, ...b };
  return { ...a, ...b };
}

export function mergeTicket(server: any, client: any): any {
  if (!server) return client; if (!client) return server;
  const serverSettled = isSettled(server.status), clientSettled = isSettled(client.status);
  const legs = Array.isArray(client.legs) ? client.legs.map((cl: any, i: number) => {
    const sl = Array.isArray(server.legs) ? (server.legs.find((x: any) => x?.id && x.id === cl?.id) || server.legs[i]) : undefined;
    return mergeLeg(sl, cl);
  }) : server.legs;
  if (serverSettled && !clientSettled) {
    const out: any = { ...client, status: server.status, legs };
    for (const f of SETTLEMENT_FIELDS) if (server[f] !== undefined) out[f] = server[f];
    if (server.notes && server.notes !== client.notes) out.notes = server.notes;
    return out;
  }
  return { ...server, ...client, legs };
}

/** Union by id; the client list defines which tickets exist (so deletions still work). */
export function mergeTicketLists(serverTickets: any[], clientTickets: any[]): any[] {
  const byId = new Map((Array.isArray(serverTickets) ? serverTickets : []).map(t => [t?.id, t]));
  return (Array.isArray(clientTickets) ? clientTickets : []).map(c => mergeTicket(byId.get(c?.id), c));
}

/** For the browser: take server-side settlements into local state without losing local edits. */
export function applyServerSettlements(localTickets: any[], serverTickets: any[]): { tickets: any[]; changed: number } {
  const server = new Map((Array.isArray(serverTickets) ? serverTickets : []).map(t => [t?.id, t])); let changed = 0;
  const tickets = localTickets.map(l => {
    const s = server.get(l?.id);
    if (s && isSettled(s.status) && !isSettled(l.status)) { changed++; return mergeTicket(s, l); }
    return l;
  });
  return { tickets, changed };
}
