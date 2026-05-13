// Family Hub JavaScript/Node.js SDK — no npm install needed, copy this file
export class FamilyHubClient {
  constructor({ baseUrl, apiKey, timeout = 10000 }) {
    this.baseUrl=baseUrl.replace(/\/$/,''); this.apiKey=apiKey; this.timeout=timeout;
    this.events=new EventsResource(this); this.chores=new ChoresResource(this);
    this.meals=new MealsResource(this); this.grocery=new GroceryResource(this);
    this.integrations=new IntegrationsResource(this); this.system=new SystemResource(this);
  }
  async _request(method,path,body){
    const headers={'Content-Type':'application/json'};
    if(this.apiKey) headers['X-API-Key']=this.apiKey;
    const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),this.timeout);
    try{
      const r=await fetch(`${this.baseUrl}${path}`,{method,headers,body:body?JSON.stringify(body):undefined,signal:ctrl.signal});
      clearTimeout(t);
      const d=await r.json().catch(()=>({}));
      if(!r.ok){const e=new Error(d.error||`HTTP ${r.status}`);e.status=r.status;throw e;}
      return d;
    }catch(e){clearTimeout(t);if(e.name==='AbortError')throw new Error('Request timed out');throw e;}
  }
  get(p){return this._request('GET',p);}
  post(p,b){return this._request('POST',p,b);}
  patch(p,b){return this._request('PATCH',p,b);}
  del(p){return this._request('DELETE',p);}
}
class EventsResource{
  constructor(c){this._c=c;}
  list(){return this._c.get('/api/events');}
  create(d){return this._c.post('/api/events',d);}
  async today(){const a=await this.list();const t=new Date().toISOString().slice(0,10);return a.filter(e=>e.start?.slice(0,10)===t).sort((a,b)=>new Date(a.start)-new Date(b.start));}
  async upcoming(days=7){const a=await this.list(),now=new Date(),then=new Date(now.getTime()+days*864e5);return a.filter(e=>{const d=new Date(e.start);return d>=now&&d<=then;}).sort((a,b)=>new Date(a.start)-new Date(b.start));}
}
class ChoresResource{
  constructor(c){this._c=c;}
  list(){return this._c.get('/api/chores');}
  create(d){return this._c.post('/api/chores',d);}
  complete(id){return this._c.post(`/api/chores/${id}/complete`);}
  async open(){return(await this.list()).filter(c=>c.status==='open');}
  async leaderboard(){const a=await this.list(),m={};for(const c of a.filter(c=>c.status==='done'))m[c.assignee]=(m[c.assignee]||0)+(c.points||1);return Object.entries(m).map(([name,points])=>({name,points})).sort((a,b)=>b.points-a.points);}
}
class MealsResource{
  constructor(c){this._c=c;}
  week(){return this._c.get('/api/meals/week');}
  create(d){return this._c.post('/api/meals',d);}
  async today(){const{meals}=await this.week();const t=new Date().toISOString().slice(0,10);return meals.filter(m=>m.date===t);}
}
class GroceryResource{
  constructor(c){this._c=c;}
  list(){return this._c.get('/api/grocery/items');}
  add(d){return this._c.post('/api/grocery/items',d);}
  addMany(items){return Promise.all(items.map(i=>this.add(i)));}
}
class IntegrationsResource{
  constructor(c){this._c=c;}
  status(){return this._c.get('/api/integrations/status');}
  google={startAuth:()=>this._c.post('/api/integrations/google/auth/start'),sync:()=>this._c.post('/api/integrations/google/sync')};
  apple={calendars:()=>this._c.get('/api/integrations/apple/calendars'),sync:()=>this._c.post('/api/integrations/apple/sync')};
  webcal={sync:()=>this._c.post('/api/integrations/webcal/sync')};
}
class SystemResource{
  constructor(c){this._c=c;}
  health(){return this._c.get('/api/health');}
  async isOnline(){try{await this.health();return true;}catch{return false;}}
}
export const createLocalClient=(ip='localhost',key)=>new FamilyHubClient({baseUrl:`http://${ip}:3001`,apiKey:key});
export const createRemoteClient=(host,key)=>new FamilyHubClient({baseUrl:`https://${host}`,apiKey:key,timeout:15000});
