import type { EvaluationRecord, EvaluationSummary, FixtureReconciliation, HistoricalResult, MarketHistoricalModel, ResultMatch, VerifiedFixture } from './types';

export function freshness(provenance: { retrievedAt: string; maxAgeSeconds?: number }, now = new Date()) {
  const ageSeconds = Math.max(0, (now.getTime() - new Date(provenance.retrievedAt).getTime()) / 1000);
  return { ageSeconds, stale: Boolean(provenance.maxAgeSeconds && ageSeconds > provenance.maxAgeSeconds) };
}
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/fc$/,'');
const teamKey=(f:VerifiedFixture)=>norm(f.homeTeam)+'|'+norm(f.awayTeam);
const same=(a:VerifiedFixture,b:VerifiedFixture)=>Boolean(a.eventCode&&b.eventCode&&a.eventCode===b.eventCode)||(teamKey(a)===teamKey(b)&&Math.abs(Date.parse(a.kickoff)-Date.parse(b.kickoff))<=900000);

export function reconcileFixtures(fixtures: VerifiedFixture[]) {
  const groups: VerifiedFixture[][]=[];
  for(const f of fixtures){const g=groups.find(x=>x.some(v=>same(v,f))); if(g)g.push(f); else groups.push([f]);}
  const canonical=groups.map(g=>{const c=g.slice().sort((a,b)=>a.id.localeCompare(b.id))[0]!; const markets={...c.markets} as VerifiedFixture['markets']; for(const f of g)for(const [k,v] of Object.entries(f.markets))if((markets as any)[k]===undefined&&typeof v==='number')(markets as any)[k]=v; return {...c,markets,provenance:g.flatMap(x=>x.provenance)};});
  const matches: FixtureReconciliation[]=groups.map(g=>{const c=g[0]!;const codes=g.map(x=>x.eventCode).filter(Boolean);const byCode=codes.length>1;const byTime=g.every(x=>teamKey(x)===teamKey(c)&&Math.abs(Date.parse(x.kickoff)-Date.parse(c.kickoff))<=900000);return {canonicalFixtureId:c.id,sourceFixtureIds:g.map(x=>x.id),confidence:byCode?1:byTime?.95:.8,matchedBy:byCode?'event-code':byTime?'teams-kickoff':'teams',sources:[...new Set(g.flatMap(x=>x.provenance.map(p=>p.sourceId)))],conflicts:[]};});
  return {fixtures:canonical,matches};
}
export function matchResultsToFixtures(results:HistoricalResult[],fixtures:VerifiedFixture[]):ResultMatch[]{return results.flatMap(r=>{const exact=fixtures.find(f=>r.fixtureId&&f.id===r.fixtureId);if(exact)return [{resultId:r.id,fixtureId:exact.id,confidence:1,method:'fixture-id' as const}];const cs=fixtures.filter(f=>norm(f.homeTeam)===norm(r.homeTeam)&&norm(f.awayTeam)===norm(r.awayTeam));const close=cs.find(f=>Math.abs(Date.parse(f.kickoff)-Date.parse(r.kickoff))<=86400000);return close?[{resultId:r.id,fixtureId:close.id,confidence:.9,method:'teams-kickoff' as const}]:cs.length===1?[{resultId:r.id,fixtureId:cs[0]!.id,confidence:.7,method:'teams' as const}]:[];});}
export function buildMarketModels(results:HistoricalResult[],asOf:string):MarketHistoricalModel[]{const e=results.filter(r=>Date.parse(r.kickoff)<Date.parse(asOf));const n=e.length;if(!n)return[];const latest=e.reduce((m,r)=>r.kickoff>m?r.kickoff:m,'');return [{market:'1X2',sampleSize:n,asOf,home:e.filter(r=>r.homeGoals>r.awayGoals).length/n,draw:e.filter(r=>r.homeGoals===r.awayGoals).length/n,away:e.filter(r=>r.homeGoals<r.awayGoals).length/n,method:'frequency',eligibleThrough:latest},{market:'OVER_2_5',sampleSize:n,asOf,over25:e.filter(r=>r.homeGoals+r.awayGoals>2).length/n,method:'frequency',eligibleThrough:latest},{market:'BTTS',sampleSize:n,asOf,bttsYes:e.filter(r=>r.homeGoals>0&&r.awayGoals>0).length/n,bttsNo:e.filter(r=>!(r.homeGoals>0&&r.awayGoals>0)).length/n,method:'frequency',eligibleThrough:latest}];}

export function evaluateOutOfSample(records: EvaluationRecord[]): Array<{predictionTime:string; outcomeTime:string; market:string; predicted:Record<string,number>; actual:string; odds?:Record<string,number>; trainingCutoff:string}>){
  const eligible=records.filter(r=>Date.parse(r.predictionTime)<Date.parse(r.outcomeTime)&&Date.parse(r.trainingCutoff)<=Date.parse(r.predictionTime));
  const byMarket=new Map<string,typeof eligible>();
  for(const r of eligible) byMarket.set(r.market,[...(byMarket.get(r.market)||[]),r]);
  return [...byMarket.entries()].map(([market,rs])=>{
    if(rs.length<30)return {market,records:rs.length,accuracy:null,brierScore:null,roi:null,status:'insufficient' as const,note:'At least 30 strictly out-of-sample records are required; no performance claim is reported.'};
    let correct=0,brier=0,profit=0,staked=0;
    for(const r of rs){
      const best=Object.entries(r.predicted).sort((a,b)=>b[1]-a[1])[0]?.[0];
      if(best===r.actual)correct++;
      const p=r.predicted[r.actual]||0;brier+=(p-1)**2+Object.entries(r.predicted).filter(([k])=>k!==r.actual).reduce((x,[,v])=>x+v*v,0);
      const odd=r.odds?.[best||''];if(odd&&odd>1){staked+=1;profit+=best===r.actual?odd-1:-1;}
    }
    return {market,records:rs.length,accuracy:correct/rs.length,brierScore:brier/rs.length,roi:staked?profit/staked:null,status:'evaluated' as const,note:'Evaluation uses only records whose prediction time precedes outcome time and whose training cutoff does not extend beyond prediction time.'};
  });
}
