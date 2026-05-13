import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ETAG_PATH = join(__dirname,'../data/webcal_etags.json');

function loadJSON(p){if(!existsSync(p))return{};try{return JSON.parse(readFileSync(p,'utf8'));}catch{return{};}}
function saveJSON(p,d){writeFileSync(p,JSON.stringify(d,null,2));}

export async function syncWebcal(rawUrl){
  const url=rawUrl.replace(/^webcal:\/\//i,'https://');
  const etags=loadJSON(ETAG_PATH);
  const headers={'User-Agent':'FamilyHubPi/1.0'};
  if(etags[url])headers['If-None-Match']=etags[url];
  let r;
  try{r=await fetch(url,{headers});}
  catch(e){throw new Error(`Webcal fetch failed: ${e.message}`);}
  if(r.status===304){console.log(`[Webcal] No changes: ${url}`);return[];}
  if(!r.ok)throw new Error(`Webcal HTTP ${r.status}`);
  const etag=r.headers.get('etag');
  if(etag)saveJSON(ETAG_PATH,{...loadJSON(ETAG_PATH),[url]:etag});
  const text=await r.text();
  const events=parseICS(text,url);
  console.log(`[Webcal] ${events.length} events from ${url}`);
  return events;
}

export async function syncAllWebcals(){
  const urls=(process.env.WEBCAL_URLS||'').split(',').map(u=>u.trim()).filter(Boolean);
  if(!urls.length)return[];
  const results=await Promise.allSettled(urls.map(syncWebcal));
  const events=[];
  for(const r of results){
    if(r.status==='fulfilled')events.push(...r.value);
    else console.error('[Webcal]',r.reason?.message);
  }
  return events;
}

function parseICS(text,src){
  const lines=text.replace(/\r?\n[ \t]/g,'').split(/\r?\n/);
  const events=[];let inEvent=false,cur={};
  for(const raw of lines){
    const line=raw.trim();
    if(line==='BEGIN:VEVENT'){inEvent=true;cur={};continue;}
    if(line==='END:VEVENT'){inEvent=false;const e=buildEvent(cur,src);if(e)events.push(e);continue;}
    if(!inEvent)continue;
    const ci=line.indexOf(':');if(ci<0)continue;
    const key=line.slice(0,ci).split(';')[0].toUpperCase();
    cur[key]={value:line.slice(ci+1),params:line.slice(0,ci)};
  }
  return events;
}
function buildEvent(p,src){
  const uid=p['UID']?.value,summary=p['SUMMARY']?.value||'(no title)',dtstart=p['DTSTART']?.value,dtend=p['DTEND']?.value,dur=p['DURATION']?.value;
  if(!uid||!dtstart)return null;
  const start=parseDate(dtstart);
  const end=dtend?parseDate(dtend):dur?new Date(new Date(start).getTime()+parseDur(dur)).toISOString():new Date(new Date(start).getTime()+86400000).toISOString();
  return{source:'webcal',source_uid:uid,source_url:src,title:decodeText(summary),owner:'Family',start,end};
}
function parseDate(r){
  const s=r.trim();
  if(/^\d{8}$/.test(s))return`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00.000Z`;
  if(/^\d{8}T\d{6}Z$/.test(s))return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`).toISOString();
  if(/^\d{8}T\d{6}$/.test(s))return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}`).toISOString();
  try{return new Date(s).toISOString();}catch{return new Date().toISOString();}
}
function parseDur(d){
  let ms=0;const m=d.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if(!m)return 0;
  const[,w=0,dy=0,h=0,mi=0,s=0]=m.map(v=>v?parseInt(v):0);
  return(w*7+dy)*86400000+h*3600000+mi*60000+s*1000;
}
function decodeText(s){return s.replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim();}
