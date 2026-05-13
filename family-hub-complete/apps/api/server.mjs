/**
 * Family Hub API Server — v1.0.0
 * Node.js 20+ | Run: node --env-file=.env apps/api/server.mjs
 */
import { createServer }   from 'node:http';
import { randomUUID }     from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join }  from 'node:path';
import { fileURLToPath }  from 'node:url';
import { checkApiKey }    from './auth.mjs';
import { startDeviceFlow, pollForToken, syncGoogleCalendar, pushEventToGoogle, isGoogleConnected } from './sync/google.mjs';
import { discoverCalendars, syncAppleCalendar, pushEventToApple, isAppleConnected } from './sync/apple.mjs';
import { syncAllWebcals } from './sync/webcal.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir   = join(__dirname, 'data');
const dbPath    = join(dataDir, 'db.json');
const initDb    = { events:[], chores:[], meals:[], grocery_items:[] };

function ensureDb() {
  if (!existsSync(dataDir)) mkdirSync(dataDir,{recursive:true});
  if (!existsSync(dbPath))  writeFileSync(dbPath, JSON.stringify(initDb,null,2));
}
function readDb()    { ensureDb(); return JSON.parse(readFileSync(dbPath,'utf8')); }
function writeDb(db) { writeFileSync(dbPath, JSON.stringify(db,null,2)); }

function cors(res) {
  return {
    'Content-Type':'application/json',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type,X-API-Key',
  };
}
function send(res,code,data){ res.writeHead(code,cors(res)); res.end(JSON.stringify(data)); }
function notFound(res){ send(res,404,{error:'Not found'}); }
function parseBody(req){
  return new Promise((ok,fail)=>{
    let b='';
    req.on('data',c=>{b+=c; if(b.length>1e6)fail(new Error('Too large'));});
    req.on('end',()=>{ try{ok(b?JSON.parse(b):{});}catch{fail(new Error('Bad JSON'));} });
  });
}
function weekRange(d=new Date()){
  const u=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
  const day=u.getUTCDay()||7; u.setUTCDate(u.getUTCDate()+1-day);
  const start=u.toISOString().slice(0,10);
  u.setUTCDate(u.getUTCDate()+6);
  return {start,end:u.toISOString().slice(0,10)};
}
function mergeEvents(db,incoming){
  for(const e of incoming){
    if(e._deleted){db.events=db.events.filter(x=>x.source_uid!==e.source_uid);continue;}
    const i=db.events.findIndex(x=>x.source_uid&&x.source_uid===e.source_uid);
    if(i>=0) db.events[i]={...db.events[i],...e};
    else db.events.push({id:randomUUID(),created_at:new Date().toISOString(),...e});
  }
}

async function syncCycle(){
  const {GOOGLE_CLIENT_ID:gid,GOOGLE_CLIENT_SECRET:gs,GOOGLE_CALENDAR_ID:gcal,
         APPLE_USERNAME:au,APPLE_PASSWORD:ap,APPLE_CALENDAR_URL:acu}=process.env;
  const db=readDb(); let changed=false;
  if(gid&&gs&&isGoogleConnected()){
    try{ const ev=await syncGoogleCalendar(gid,gs,gcal||'primary'); if(ev.length){mergeEvents(db,ev);changed=true;} }
    catch(e){console.error('[Google]',e.message);}
  }
  if(au&&ap&&acu){
    try{ const ev=await syncAppleCalendar(au,ap,acu); if(ev.length){mergeEvents(db,ev);changed=true;} }
    catch(e){console.error('[Apple]',e.message);}
  }
  if(process.env.WEBCAL_URLS){
    try{ const ev=await syncAllWebcals(); if(ev.length){mergeEvents(db,ev);changed=true;} }
    catch(e){console.error('[Webcal]',e.message);}
  }
  if(changed) writeDb(db);
}
setTimeout(()=>{ syncCycle(); setInterval(syncCycle,5*60*1000); },10_000);

const server=createServer(async(req,res)=>{
  if(!req.url) return notFound(res);
  if(req.method==='OPTIONS'){res.writeHead(204,cors(res));return res.end();}
  const url=new URL(req.url,'http://localhost');
  const p=url.pathname;

  if(req.method==='GET'&&p==='/api/health'){
    const wc=(process.env.WEBCAL_URLS||'').split(',').filter(Boolean);
    return send(res,200,{ok:true,service:'family-hub-api',version:'1.0.0',
      google:isGoogleConnected(),apple:isAppleConnected(process.env.APPLE_USERNAME),
      webcal:{connected:wc.length>0,feeds:wc.length}});
  }

  const authErr=checkApiKey(req);
  if(authErr) return send(res,401,authErr);
  const db=readDb();

  // EVENTS
  if(req.method==='GET'&&p==='/api/events'){
    let ev=db.events;
    const o=url.searchParams.get('owner'),f=url.searchParams.get('from'),t=url.searchParams.get('to');
    if(o) ev=ev.filter(e=>e.owner===o);
    if(f) ev=ev.filter(e=>e.start>=f);
    if(t) ev=ev.filter(e=>e.start<=t);
    return send(res,200,ev.sort((a,b)=>new Date(a.start)-new Date(b.start)));
  }
  if(req.method==='POST'&&p==='/api/events'){
    const b=await parseBody(req).catch(e=>{send(res,400,{error:e.message});return null;});
    if(!b||res.writableEnded)return;
    const event={id:randomUUID(),title:b.title??'Untitled',owner:b.owner??'Family',source:'local',
      start:b.start??new Date().toISOString(),end:b.end??new Date(Date.now()+3_600_000).toISOString(),
      description:b.description??'',location:b.location??'',created_at:new Date().toISOString()};
    db.events.push(event);writeDb(db);
    const{GOOGLE_CLIENT_ID:gid,GOOGLE_CLIENT_SECRET:gs,GOOGLE_CALENDAR_ID:gcal}=process.env;
    if(gid&&gs&&isGoogleConnected()) pushEventToGoogle(gid,gs,event,gcal||'primary').catch(console.error);
    const{APPLE_USERNAME:au,APPLE_PASSWORD:ap,APPLE_CALENDAR_URL:acu}=process.env;
    if(au&&ap&&acu) pushEventToApple(au,ap,acu,event).catch(console.error);
    return send(res,201,event);
  }
  if(req.method==='PATCH'&&p.match(/^\/api\/events\/[^/]+$/)){
    const id=p.split('/')[3];
    const b=await parseBody(req).catch(e=>{send(res,400,{error:e.message});return null;});
    if(!b||res.writableEnded)return;
    const i=db.events.findIndex(e=>e.id===id);
    if(i<0)return send(res,404,{error:'Event not found'});
    db.events[i]={...db.events[i],...b,updated_at:new Date().toISOString()};
    writeDb(db);return send(res,200,db.events[i]);
  }
  if(req.method==='DELETE'&&p.match(/^\/api\/events\/[^/]+$/)){
    const id=p.split('/')[3];const i=db.events.findIndex(e=>e.id===id);
    if(i<0)return send(res,404,{error:'Event not found'});
    db.events.splice(i,1);writeDb(db);return send(res,200,{deleted:true});
  }

  // CHORES
  if(req.method==='GET'&&p==='/api/chores'){
    let c=db.chores;
    const a=url.searchParams.get('assignee'),s=url.searchParams.get('status');
    if(a)c=c.filter(x=>x.assignee===a);if(s)c=c.filter(x=>x.status===s);
    return send(res,200,c);
  }
  if(req.method==='POST'&&p==='/api/chores'){
    const b=await parseBody(req).catch(e=>{send(res,400,{error:e.message});return null;});
    if(!b||res.writableEnded)return;
    const chore={id:randomUUID(),title:b.title??'Untitled',assignee:b.assignee??'Family',
      due_date:b.due_date??new Date().toISOString().slice(0,10),points:Number(b.points??5),
      status:'open',created_at:new Date().toISOString()};
    db.chores.push(chore);writeDb(db);return send(res,201,chore);
  }
  if(req.method==='POST'&&p.match(/^\/api\/chores\/[^/]+\/complete$/)){
    const id=p.split('/')[3];const c=db.chores.find(x=>x.id===id);
    if(!c)return send(res,404,{error:'Chore not found'});
    c.status='done';c.completed_at=new Date().toISOString();writeDb(db);return send(res,200,c);
  }
  if(req.method==='DELETE'&&p.match(/^\/api\/chores\/[^/]+$/)){
    const id=p.split('/')[3];const i=db.chores.findIndex(c=>c.id===id);
    if(i<0)return send(res,404,{error:'Chore not found'});
    db.chores.splice(i,1);writeDb(db);return send(res,200,{deleted:true});
  }

  // MEALS
  if(req.method==='GET'&&p==='/api/meals/week'){
    const{start,end}=weekRange();
    return send(res,200,{range:{start,end},meals:db.meals.filter(m=>m.date>=start&&m.date<=end)});
  }
  if(req.method==='POST'&&p==='/api/meals'){
    const b=await parseBody(req).catch(e=>{send(res,400,{error:e.message});return null;});
    if(!b||res.writableEnded)return;
    const meal={id:randomUUID(),date:b.date??new Date().toISOString().slice(0,10),
      meal_type:b.meal_type??'dinner',recipe:b.recipe??'TBD',notes:b.notes??''};
    db.meals.push(meal);writeDb(db);return send(res,201,meal);
  }
  if(req.method==='DELETE'&&p.match(/^\/api\/meals\/[^/]+$/)){
    const id=p.split('/')[3];const i=db.meals.findIndex(m=>m.id===id);
    if(i<0)return send(res,404,{error:'Meal not found'});
    db.meals.splice(i,1);writeDb(db);return send(res,200,{deleted:true});
  }

  // GROCERY
  if(req.method==='GET'&&p==='/api/grocery/items') return send(res,200,db.grocery_items);
  if(req.method==='POST'&&p==='/api/grocery/items'){
    const b=await parseBody(req).catch(e=>{send(res,400,{error:e.message});return null;});
    if(!b||res.writableEnded)return;
    const item={id:randomUUID(),name:b.name??'Item',quantity:b.quantity??'1',checked:false,created_at:new Date().toISOString()};
    db.grocery_items.push(item);writeDb(db);return send(res,201,item);
  }
  if(req.method==='PATCH'&&p.match(/^\/api\/grocery\/items\/[^/]+$/)){
    const id=p.split('/')[4];
    const b=await parseBody(req).catch(e=>{send(res,400,{error:e.message});return null;});
    if(!b||res.writableEnded)return;
    const i=db.grocery_items.findIndex(x=>x.id===id);
    if(i<0)return send(res,404,{error:'Item not found'});
    db.grocery_items[i]={...db.grocery_items[i],...b};writeDb(db);return send(res,200,db.grocery_items[i]);
  }
  if(req.method==='DELETE'&&p.match(/^\/api\/grocery\/items\/[^/]+$/)){
    const id=p.split('/')[4];const i=db.grocery_items.findIndex(x=>x.id===id);
    if(i<0)return send(res,404,{error:'Item not found'});
    db.grocery_items.splice(i,1);writeDb(db);return send(res,200,{deleted:true});
  }

  // INTEGRATIONS
  if(req.method==='GET'&&p==='/api/integrations/status'){
    const wc=(process.env.WEBCAL_URLS||'').split(',').filter(Boolean);
    return send(res,200,{google:{connected:isGoogleConnected()},apple:{connected:isAppleConnected(process.env.APPLE_USERNAME)},webcal:{connected:wc.length>0,feeds:wc.length}});
  }
  if(req.method==='POST'&&p==='/api/integrations/google/auth/start'){
    const{GOOGLE_CLIENT_ID:gid,GOOGLE_CLIENT_SECRET:gs}=process.env;
    if(!gid)return send(res,400,{error:'GOOGLE_CLIENT_ID not set in .env'});
    try{
      const flow=await startDeviceFlow(gid);
      pollForToken(gid,gs,flow.device_code,flow.interval).catch(console.error);
      return send(res,200,{verification_url:flow.verification_url,user_code:flow.user_code,expires_in:flow.expires_in});
    }catch(e){return send(res,500,{error:e.message});}
  }
  if(req.method==='POST'&&p==='/api/integrations/google/sync'){
    if(!isGoogleConnected())return send(res,400,{error:'Google not connected'});
    try{
      const ev=await syncGoogleCalendar(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_CALENDAR_ID||'primary');
      const freshDb=readDb();mergeEvents(freshDb,ev);writeDb(freshDb);
      return send(res,200,{synced:ev.length});
    }catch(e){return send(res,500,{error:e.message});}
  }
  if(req.method==='GET'&&p==='/api/integrations/apple/calendars'){
    const{APPLE_USERNAME:au,APPLE_PASSWORD:ap}=process.env;
    if(!au||!ap)return send(res,400,{error:'APPLE_USERNAME/APPLE_PASSWORD not set'});
    try{return send(res,200,{calendars:await discoverCalendars(au,ap)});}
    catch(e){return send(res,500,{error:e.message});}
  }
  if(req.method==='POST'&&p==='/api/integrations/apple/sync'){
    const{APPLE_USERNAME:au,APPLE_PASSWORD:ap,APPLE_CALENDAR_URL:acu}=process.env;
    if(!acu)return send(res,400,{error:'APPLE_CALENDAR_URL not set'});
    try{
      const ev=await syncAppleCalendar(au,ap,acu);
      const freshDb=readDb();mergeEvents(freshDb,ev);writeDb(freshDb);
      return send(res,200,{synced:ev.length});
    }catch(e){return send(res,500,{error:e.message});}
  }
  if(req.method==='POST'&&p==='/api/integrations/webcal/sync'){
    try{
      const ev=await syncAllWebcals();
      const freshDb=readDb();mergeEvents(freshDb,ev);writeDb(freshDb);
      return send(res,200,{synced:ev.length});
    }catch(e){return send(res,500,{error:e.message});}
  }

  return notFound(res);
});

const PORT=Number(process.env.PORT??3001);
server.listen(PORT,()=>{
  console.log(`\n🏡 Family Hub API  →  http://localhost:${PORT}`);
  console.log(`   Google : ${isGoogleConnected()?'✓ connected':'○ not connected'}`);
  console.log(`   Apple  : ${isAppleConnected(process.env.APPLE_USERNAME)?'✓ connected':'○ not connected'}`);
  console.log(`   Webcal : ${process.env.WEBCAL_URLS?'✓ configured':'○ not configured'}\n`);
});
