import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ETAG_PATH = join(__dirname,'../data/apple_etags.json');
const BASE = 'https://caldav.icloud.com';

function loadJSON(p){if(!existsSync(p))return{};try{return JSON.parse(readFileSync(p,'utf8'));}catch{return{};}}
function saveJSON(p,d){writeFileSync(p,JSON.stringify(d,null,2));}
function basicAuth(u,p){return 'Basic '+Buffer.from(`${u}:${p}`).toString('base64');}

async function dav(method,url,user,pass,body=null,extra={}){
  const h={Authorization:basicAuth(user,pass),'Content-Type':'application/xml; charset=utf-8',Depth:'1',...extra};
  if(!body)delete h['Content-Type'];
  const r=await fetch(url,{method,headers:h,body});
  return{status:r.status,headers:r.headers,body:await r.text()};
}

async function principal(user,pass){
  const body=`<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`;
  let url=`${BASE}/.well-known/caldav`;
  for(let i=0;i<5;i++){
    const r=await fetch(url,{method:'PROPFIND',headers:{Authorization:basicAuth(user,pass),'Content-Type':'application/xml',Depth:'0'},body,redirect:'manual'});
    if(r.status===301||r.status===302||r.status===307){url=r.headers.get('location')||url;continue;}
    const t=await r.text();
    const m=t.match(/<current-user-principal[^>]*>\s*<href[^>]*>([^<]+)<\/href>/i);
    if(m)return BASE+m[1].trim();
    break;
  }
  return `${BASE}/${user.split('@')[0]}/principal/`;
}

export async function discoverCalendars(user,pass){
  const prin=await principal(user,pass);
  const homeBody=`<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`;
  const{body:hb}=await dav('PROPFIND',prin,user,pass,homeBody,{Depth:'0'});
  const hm=hb.match(/<calendar-home-set[^>]*>\s*<href[^>]*>([^<]+)<\/href>/i);
  const homeSet=hm?BASE+hm[1].trim():prin;
  const calBody=`<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/></d:prop></d:propfind>`;
  const{body:cb}=await dav('PROPFIND',homeSet,user,pass,calBody);
  const cals=[];const re=/<response[^>]*>([\s\S]*?)<\/response>/gi;let m;
  while((m=re.exec(cb))!==null){
    const bl=m[1];
    if(!(bl.includes('<calendar/>')||bl.includes('<calendar ')))continue;
    if(!(bl.includes('VEVENT')))continue;
    const hr=bl.match(/<href[^>]*>([^<]+)<\/href>/i);
    const nr=bl.match(/<displayname[^>]*>([^<]*)<\/displayname>/i);
    if(hr)cals.push({url:BASE+hr[1].trim(),name:nr?.[1]?.trim()||'Calendar'});
  }
  return cals;
}

export async function syncAppleCalendar(user,pass,calUrl){
  const now=new Date(),future=new Date(now.getTime()+60*86400000);
  const fmt=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const report=`<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${fmt(now)}" end="${fmt(future)}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
  const{body,status}=await dav('REPORT',calUrl,user,pass,report);
  if(status>=400)throw new Error(`Apple REPORT: ${status}`);
  const etags=loadJSON(ETAG_PATH);const events=[];const newEtags={...etags};
  const re=/<response[^>]*>([\s\S]*?)<\/response>/gi;let m;
  while((m=re.exec(body))!==null){
    const bl=m[1];
    const hr=bl.match(/<href[^>]*>([^<]+)<\/href>/i);
    const er=bl.match(/<getetag[^>]*>([^<]+)<\/getetag>/i);
    const dr=bl.match(/<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/i);
    if(!hr||!dr)continue;
    const href=hr[1].trim(),etag=er?.[1]?.trim()||'';
    if(etags[href]===etag)continue;
    newEtags[href]=etag;
    const e=parseVEvent(dr[1],etag,href);if(e)events.push(e);
  }
  saveJSON(ETAG_PATH,newEtags);
  console.log(`[Apple] Synced ${events.length} events`);
  return events;
}

export async function pushEventToApple(user,pass,calUrl,event){
  const uid=randomUUID();
  const fmt=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const ical=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FamilyHub//EN','BEGIN:VEVENT',
    `UID:${uid}`,`DTSTAMP:${fmt(new Date())}`,`DTSTART:${fmt(event.start)}`,
    `DTEND:${fmt(event.end)}`,`SUMMARY:${event.title}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const r=await fetch(`${calUrl}${uid}.ics`,{method:'PUT',headers:{Authorization:basicAuth(user,pass),'Content-Type':'text/calendar; charset=utf-8','If-None-Match':'*'},body:ical});
  if(r.status!==201&&r.status!==204)throw new Error(`Apple PUT: ${r.status}`);
}

function parseVEvent(ical,etag,href){
  const get=k=>{const m=ical.match(new RegExp(`^${k}[;:][^\r\n]*`,'m'));return m?m[0].replace(/^[^:]+:/,'').trim():'';};
  const uid=get('UID'),summary=get('SUMMARY'),dtstart=get('DTSTART'),dtend=get('DTEND');
  if(!uid||!dtstart)return null;
  return{source:'apple',source_uid:uid,source_etag:etag,source_href:href,title:summary||'(no title)',owner:'Family',start:parseDate(dtstart),end:parseDate(dtend||dtstart)};
}
function parseDate(r){
  if(!r)return new Date().toISOString();
  const s=r.replace(/^[A-Z;=]+:/,'');
  if(/^\d{8}$/.test(s))return`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00.000Z`;
  try{const y=s.slice(0,4),mo=s.slice(4,6),d=s.slice(6,8),h=s.slice(9,11)||'00',mi=s.slice(11,13)||'00',se=s.slice(13,15)||'00';return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}Z`).toISOString();}
  catch{return new Date().toISOString();}
}
export function isAppleConnected(user){return!!(user&&existsSync(ETAG_PATH));}
