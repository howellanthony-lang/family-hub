import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH  = join(__dirname, '../data/google_token.json');
const CURSOR_PATH = join(__dirname, '../data/google_sync_cursor.json');

const SCOPES = 'https://www.googleapis.com/auth/calendar';
const DEVICE_URL = 'https://oauth2.googleapis.com/device/code';
const TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const CAL_BASE   = 'https://www.googleapis.com/calendar/v3';

function loadJSON(p)    { if(!existsSync(p))return null; try{return JSON.parse(readFileSync(p,'utf8'));}catch{return null;} }
function saveJSON(p,d)  { writeFileSync(p, JSON.stringify(d,null,2)); }

export async function startDeviceFlow(clientId) {
  const r = await fetch(DEVICE_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,scope:SCOPES})});
  if(!r.ok) throw new Error(`Device flow failed: ${r.status}`);
  return r.json();
}

export async function pollForToken(clientId, clientSecret, deviceCode, interval=5) {
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  while(true) {
    await wait(interval*1000);
    const r = await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,device_code:deviceCode,grant_type:'urn:ietf:params:oauth:grant-type:device_code'})});
    const d = await r.json();
    if(d.access_token){ saveJSON(TOKEN_PATH,{...d,saved_at:Date.now()}); console.log('[Google] Auth complete'); return d; }
    if(d.error==='authorization_pending') continue;
    if(d.error==='slow_down'){interval+=5;continue;}
    throw new Error(`Auth failed: ${d.error}`);
  }
}

async function getAccessToken(clientId, clientSecret) {
  let tok = loadJSON(TOKEN_PATH);
  if(!tok) throw new Error('No Google token — connect via Settings first');
  const age = Date.now()-(tok.saved_at||0);
  if(age > (tok.expires_in||3600)*1000-60000) {
    const r = await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:tok.refresh_token,grant_type:'refresh_token'})});
    const d = await r.json();
    if(!d.access_token) throw new Error('Token refresh failed');
    tok = {...tok,...d,saved_at:Date.now()};
    saveJSON(TOKEN_PATH,tok);
  }
  return tok.access_token;
}

export async function syncGoogleCalendar(clientId, clientSecret, calendarId='primary') {
  const access = await getAccessToken(clientId, clientSecret);
  const cursor = loadJSON(CURSOR_PATH)||{};
  const syncToken = cursor[calendarId];
  const headers = {Authorization:`Bearer ${access}`};
  let url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?maxResults=250&singleEvents=true`;
  if(syncToken) url+=`&syncToken=${syncToken}`;
  else url+=`&timeMin=${encodeURIComponent(new Date().toISOString())}&orderBy=startTime`;
  const events=[];
  let next=url;
  while(next){
    const r=await fetch(next,{headers});
    if(r.status===410){ delete cursor[calendarId]; saveJSON(CURSOR_PATH,cursor); return syncGoogleCalendar(clientId,clientSecret,calendarId); }
    if(!r.ok) throw new Error(`Google fetch: ${r.status}`);
    const d=await r.json();
    for(const e of d.items||[]){
      if(e.status==='cancelled'){events.push({_deleted:true,source_uid:e.id,source:'google'});continue;}
      events.push({source:'google',source_uid:e.id,source_etag:e.etag,title:e.summary||'(no title)',owner:'Family',start:e.start?.dateTime||e.start?.date||'',end:e.end?.dateTime||e.end?.date||''});
    }
    if(d.nextSyncToken) saveJSON(CURSOR_PATH,{...loadJSON(CURSOR_PATH)||{},[calendarId]:d.nextSyncToken});
    next=d.nextPageToken?`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?pageToken=${d.nextPageToken}&maxResults=250`:null;
  }
  console.log(`[Google] Synced ${events.length} events`);
  return events;
}

export async function pushEventToGoogle(clientId, clientSecret, event, calendarId='primary') {
  const access = await getAccessToken(clientId, clientSecret);
  const r = await fetch(`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({summary:event.title,start:{dateTime:event.start},end:{dateTime:event.end}})});
  if(!r.ok) throw new Error(`Google push: ${r.status}`);
  return r.json();
}

export function isGoogleConnected() { return existsSync(TOKEN_PATH); }
