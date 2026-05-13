"""Family Hub Python SDK — standard library only, no pip required."""
import json, urllib.request, urllib.error
from datetime import date
from typing import Optional, List

class FamilyHubError(Exception):
    def __init__(self,msg,status=0): super().__init__(msg); self.status=status

class FamilyHubClient:
    def __init__(self,base_url,api_key=None,timeout=10):
        self.base_url=base_url.rstrip('/'); self.api_key=api_key; self.timeout=timeout
        self.events=EventsResource(self); self.chores=ChoresResource(self)
        self.meals=MealsResource(self); self.grocery=GroceryResource(self); self.system=SystemResource(self)
    def _req(self,method,path,body=None):
        data=json.dumps(body).encode() if body else None
        headers={'Content-Type':'application/json','Accept':'application/json'}
        if self.api_key: headers['X-API-Key']=self.api_key
        req=urllib.request.Request(f"{self.base_url}{path}",data=data,headers=headers,method=method)
        try:
            with urllib.request.urlopen(req,timeout=self.timeout) as r: return json.loads(r.read())
        except urllib.error.HTTPError as e:
            try: d=json.loads(e.read())
            except: d={}
            raise FamilyHubError(d.get('error',f'HTTP {e.code}'),e.code)
        except urllib.error.URLError as e: raise FamilyHubError(str(e.reason))
    def get(self,p): return self._req('GET',p)
    def post(self,p,b=None): return self._req('POST',p,b)

class EventsResource:
    def __init__(self,c): self._c=c
    def list(self): return self._c.get('/api/events')
    def create(self,title,start,end=None,owner='Family',**kw): return self._c.post('/api/events',{'title':title,'start':start,'end':end,'owner':owner,**kw})
    def today(self): t=date.today().isoformat(); return [e for e in self.list() if (e.get('start') or '')[:10]==t]

class ChoresResource:
    def __init__(self,c): self._c=c
    def list(self): return self._c.get('/api/chores')
    def create(self,title,assignee='Family',due_date=None,points=5): return self._c.post('/api/chores',{'title':title,'assignee':assignee,'due_date':due_date or date.today().isoformat(),'points':points})
    def complete(self,chore_id): return self._c.post(f'/api/chores/{chore_id}/complete')
    def open(self): return [c for c in self.list() if c.get('status')=='open']

class MealsResource:
    def __init__(self,c): self._c=c
    def week(self): return self._c.get('/api/meals/week')
    def create(self,recipe,meal_type='dinner',meal_date=None,notes=''): return self._c.post('/api/meals',{'recipe':recipe,'meal_type':meal_type,'date':meal_date or date.today().isoformat(),'notes':notes})

class GroceryResource:
    def __init__(self,c): self._c=c
    def list(self): return self._c.get('/api/grocery/items')
    def add(self,name,quantity='1'): return self._c.post('/api/grocery/items',{'name':name,'quantity':quantity})
    def add_many(self,items): return [self.add(n,q) for n,q in items]

class SystemResource:
    def __init__(self,c): self._c=c
    def health(self): return self._c.get('/api/health')
    def is_online(self):
        try: self.health(); return True
        except: return False

def create_local_client(pi_ip='localhost',api_key=None): return FamilyHubClient(f'http://{pi_ip}:3001',api_key)
def create_remote_client(host,api_key): return FamilyHubClient(f'https://{host}',api_key,15)

if __name__=='__main__':
    import sys
    hub=create_local_client(sys.argv[1] if len(sys.argv)>1 else 'localhost', sys.argv[2] if len(sys.argv)>2 else None)
    print('Health:',hub.system.health())
    print('Today:',hub.events.today())
    print('Chores:',hub.chores.open())
