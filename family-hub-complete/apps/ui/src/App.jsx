import { useState, useEffect, useCallback, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = localStorage.getItem("familyHubApi") || "http://localhost:3001";

const MEMBERS = [
  { name: "Mom",    color: "#f472b6", bg: "#f472b620" },
  { name: "Dad",    color: "#60a5fa", bg: "#60a5fa20" },
  { name: "Emma",   color: "#a78bfa", bg: "#a78bfa20" },
  { name: "Jack",   color: "#34d399", bg: "#34d39920" },
  { name: "Family", color: "#fb923c", bg: "#fb923c20" },
];
const MEMBER_MAP = Object.fromEntries(MEMBERS.map(m => [m.name, m]));

const TABS = ["Today", "Calendar", "Chores", "Meals", "Grocery", "Settings"];
const TAB_ICONS = { Today: "◈", Calendar: "◷", Chores: "◎", Meals: "◉", Grocery: "◫", Settings: "◌" };

// ─── Utility hooks ────────────────────────────────────────────────────────────
function useApi() {
  const [online, setOnline] = useState(true);
  const call = useCallback(async (path, opts = {}) => {
    try {
      const r = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setOnline(true);
      return r.json();
    } catch { setOnline(false); return null; }
  }, []);
  return { call, online };
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "#050c1a",
  surface:  "#0d1829",
  card:     "#111f35",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.14)",
  text:     "#e8f0fe",
  muted:    "#6b7e9e",
  dim:      "#3a4f6e",
  accent:   "#3b82f6",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
const css = {
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 },
  pill: (color) => ({ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:`${color}22`, border:`1px solid ${color}44`, fontSize:11, fontWeight:700, color, letterSpacing:0.3 }),
  btn: (color="#3b82f6", ghost=false) => ({
    background: ghost ? "transparent" : color,
    border: `1px solid ${ghost ? C.borderHi : color}`,
    color: ghost ? C.text : "#fff",
    padding:"9px 18px", borderRadius:10, fontSize:13, fontWeight:700,
    cursor:"pointer", letterSpacing:0.3, transition:"all 0.15s",
  }),
};

function Pill({ name }) {
  const m = MEMBER_MAP[name] || { color: C.muted, bg: C.surface };
  return <span style={css.pill(m.color)}><span style={{width:6,height:6,borderRadius:"50%",background:m.color,display:"inline-block"}}/>  {name}</span>;
}

function Btn({ children, onClick, color, ghost, small, full, style={} }) {
  const b = css.btn(color || C.accent, ghost);
  if (small) { b.padding = "6px 13px"; b.fontSize = 12; }
  if (full) { b.width = "100%"; }
  return <button style={{...b,...style}} onClick={onClick}
    onMouseEnter={e=>{e.currentTarget.style.opacity="0.82"}}
    onMouseLeave={e=>{e.currentTarget.style.opacity="1"}}>{children}</button>;
}

function Field({ label, children }) {
  return <div style={{marginBottom:14}}>
    {label && <div style={{fontSize:10,fontWeight:800,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    {children}
  </div>;
}

function Input({ label, ...p }) {
  return <Field label={label}><input {...p} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box",...(p.style||{})}}/></Field>;
}

function Select({ label, children, ...p }) {
  return <Field label={label}><select {...p} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 13px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}>
    {children}
  </select></Field>;
}

function Modal({ title, onClose, children, width=400 }) {
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
    <div style={{...css.card,padding:28,width,maxWidth:"calc(100vw - 40px)",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <span style={{fontSize:16,fontWeight:800,color:C.text}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
      </div>
      {children}
    </div>
  </div>;
}

function SectionHeader({ title, icon, color, action }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:color||C.accent}}>{icon} {title}</span>
    </div>
    {action}
  </div>;
}

function Empty({ msg }) {
  return <div style={{textAlign:"center",padding:"28px 0",color:C.dim,fontSize:13}}>{msg}</div>;
}

// ─── Clock & Date ─────────────────────────────────────────────────────────────
function Clock() {
  const now = useClock();
  return <div style={{textAlign:"right"}}>
    <div style={{fontSize:52,fontWeight:800,letterSpacing:-3,color:C.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
      {now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
    </div>
    <div style={{fontSize:13,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>
      {now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
    </div>
  </div>;
}

// ─── Mini calendar strip ──────────────────────────────────────────────────────
function WeekStrip({ events }) {
  const days = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-d.getDay()+i+1); return d;
  });
  const today = new Date().toDateString();
  return <div style={{display:"flex",gap:6}}>
    {days.map(d=>{
      const isToday = d.toDateString()===today;
      const count = events.filter(e=>new Date(e.start).toDateString()===d.toDateString()).length;
      return <div key={d} style={{flex:1,textAlign:"center",padding:"10px 4px",borderRadius:12,
        background:isToday?"#3b82f620":"rgba(255,255,255,0.03)",
        border:`1px solid ${isToday?"#3b82f640":C.border}`}}>
        <div style={{fontSize:10,fontWeight:700,color:isToday?"#60a5fa":C.muted,letterSpacing:0.5,textTransform:"uppercase"}}>
          {d.toLocaleDateString("en-GB",{weekday:"short"})}
        </div>
        <div style={{fontSize:20,fontWeight:800,color:isToday?"#f0f9ff":C.muted,margin:"4px 0"}}>{d.getDate()}</div>
        {count>0 && <div style={{width:6,height:6,borderRadius:"50%",background:"#60a5fa",margin:"0 auto"}}/>}
      </div>;
    })}
  </div>;
}

// ─── TODAY VIEW ───────────────────────────────────────────────────────────────
function TodayView({ events, chores, meals, online, integrations }) {
  const now = useClock();
  const today = new Date().toISOString().slice(0,10);
  const todayEvents = events.filter(e=>e.start?.slice(0,10)===today).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const todayChores = chores.filter(c=>c.status==="open").slice(0,4);
  const todayMeals = meals.filter(m=>m.date===today);
  const hour = now.getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  return <div style={{display:"grid",gap:16}}>
    {/* Greeting + week strip */}
    <div style={{...css.card,padding:22}}>
      <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>{greeting} 👋</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:18}}>
        {todayEvents.length>0 ? `You have ${todayEvents.length} event${todayEvents.length>1?"s":""} today` : "Nothing on the calendar today — enjoy!"}
      </div>
      <WeekStrip events={events}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      {/* Today's events */}
      <div style={{...css.card,padding:18}}>
        <SectionHeader title="Today's events" icon="◷" color="#60a5fa"/>
        {todayEvents.length===0 ? <Empty msg="Nothing scheduled"/> : todayEvents.map(e=>{
          const m = MEMBER_MAP[e.owner]||{color:C.muted};
          return <div key={e.id} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:3,borderRadius:2,background:m.color,flexShrink:0}}/>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{e.title}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                {new Date(e.start).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
                {e.source&&e.source!=="local"&&<span style={{marginLeft:8,...css.pill(e.source==="google"?"#4285f4":"#999")}}>{e.source}</span>}
              </div>
            </div>
          </div>;
        })}
      </div>

      {/* Open chores */}
      <div style={{...css.card,padding:18}}>
        <SectionHeader title="Open chores" icon="◎" color="#34d399"/>
        {todayChores.length===0 ? <Empty msg="All done! 🎉"/> : todayChores.map(c=>{
          const m = MEMBER_MAP[c.assignee]||{color:C.muted};
          return <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${m.color}`,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{c.title}</div>
              <Pill name={c.assignee}/>
            </div>
            <span style={{fontSize:12,color:"#fbbf24",fontWeight:700}}>⭐{c.points}</span>
          </div>;
        })}
      </div>
    </div>

    {/* Today's meals */}
    <div style={{...css.card,padding:18}}>
      <SectionHeader title="Today's meals" icon="◉" color="#fb923c"/>
      {todayMeals.length===0 ? <Empty msg="No meals planned"/> :
        <div style={{display:"flex",gap:12}}>
          {["breakfast","lunch","dinner"].map(type=>{
            const m = todayMeals.find(x=>x.meal_type===type);
            const icons = {breakfast:"🌅",lunch:"☀️",dinner:"🌙"};
            return <div key={type} style={{flex:1,padding:"12px 14px",borderRadius:12,background:m?"rgba(251,146,60,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${m?"rgba(251,146,60,0.2)":C.border}`}}>
              <div style={{fontSize:18,marginBottom:6}}>{icons[type]}</div>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{type}</div>
              <div style={{fontSize:13,color:m?C.text:C.dim,fontWeight:m?600:400}}>{m?m.recipe:"Not planned"}</div>
            </div>;
          })}
        </div>
      }
    </div>

    {/* Sync status */}
    {integrations && (
      <div style={{...css.card,padding:16,display:"flex",gap:16,alignItems:"center"}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Sync status</div>
        <div style={css.pill(integrations.google?.connected?"#4285f4":C.dim)}>
          <span style={{width:6,height:6,borderRadius:"50%",background:integrations.google?.connected?"#4285f4":C.dim,display:"inline-block"}}/>
          Google {integrations.google?.connected?"connected":"not connected"}
        </div>
        <div style={css.pill(integrations.apple?.connected?"#a3b8c8":C.dim)}>
          <span style={{width:6,height:6,borderRadius:"50%",background:integrations.apple?.connected?"#a3b8c8":C.dim,display:"inline-block"}}/>
          Apple {integrations.apple?.connected?"connected":"not connected"}
        </div>
        <div style={{marginLeft:"auto",...css.pill(online?"#34d399":"#ef4444")}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:online?"#34d399":"#ef4444",display:"inline-block"}}/>
          API {online?"online":"offline"}
        </div>
      </div>
    )}
  </div>;
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ events, onAdd, onSync }) {
  const [view, setView] = useState("month");
  const [refDate, setRefDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title:"", owner:"Family", start:"", end:"" });
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.title||!form.start) return;
    const end = form.end || new Date(new Date(form.start).getTime()+3_600_000).toISOString();
    await onAdd({...form,end});
    setShowAdd(false); setForm({title:"",owner:"Family",start:"",end:""});
  };

  // Month grid
  const year = refDate.getFullYear(), month = refDate.getMonth();
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = Array.from({length:Math.ceil((firstDay+daysInMonth)/7)*7},(_,i)=>{
    const dayNum = i-firstDay+1;
    return dayNum>=1&&dayNum<=daysInMonth ? new Date(year,month,dayNum) : null;
  });
  const today = new Date().toDateString();
  const fmt = d => d?.toISOString().slice(0,10);

  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>setRefDate(new Date(year,month-1,1))} style={{background:"none",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>‹</button>
        <span style={{fontSize:18,fontWeight:800,color:C.text,minWidth:160,textAlign:"center"}}>
          {refDate.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}
        </span>
        <button onClick={()=>setRefDate(new Date(year,month+1,1))} style={{background:"none",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>›</button>
        <button onClick={()=>setRefDate(new Date())} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>Today</button>
      </div>
      <div style={{display:"flex",gap:8}}>
        {onSync && <Btn ghost small onClick={onSync}>↻ Sync</Btn>}
        <Btn small onClick={()=>setShowAdd(true)}>+ Add Event</Btn>
      </div>
    </div>

    {/* Day headers */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>(
        <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.muted,letterSpacing:1,padding:"6px 0"}}>{d}</div>
      ))}
    </div>

    {/* Calendar grid */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {cells.map((d,i)=>{
        const dayEvents = d ? events.filter(e=>e.start?.slice(0,10)===fmt(d)) : [];
        const isToday = d?.toDateString()===today;
        return <div key={i} style={{minHeight:90,padding:8,borderRadius:10,
          background:isToday?"rgba(59,130,246,0.08)":d?"rgba(255,255,255,0.02)":"transparent",
          border:`1px solid ${isToday?"rgba(59,130,246,0.3)":d?C.border:"transparent"}`}}>
          {d && <>
            <div style={{fontSize:13,fontWeight:isToday?800:500,color:isToday?"#60a5fa":C.muted,marginBottom:4}}>{d.getDate()}</div>
            {dayEvents.slice(0,3).map(e=>{
              const m = MEMBER_MAP[e.owner]||{color:C.muted};
              return <div key={e.id} style={{fontSize:10,fontWeight:600,color:m.color,background:`${m.color}18`,borderRadius:4,padding:"2px 5px",marginBottom:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                {e.title}
              </div>;
            })}
            {dayEvents.length>3 && <div style={{fontSize:10,color:C.muted}}>+{dayEvents.length-3} more</div>}
          </>}
        </div>;
      })}
    </div>

    {showAdd && <Modal title="New Event" onClose={()=>setShowAdd(false)}>
      <Input label="Event title" value={form.title} onChange={e=>set("title")(e.target.value)} placeholder="e.g. School pickup"/>
      <Select label="Owner" value={form.owner} onChange={e=>set("owner")(e.target.value)}>
        {MEMBERS.map(m=><option key={m.name}>{m.name}</option>)}
      </Select>
      <Input label="Start" type="datetime-local" value={form.start} onChange={e=>set("start")(e.target.value)}/>
      <Input label="End (optional)" type="datetime-local" value={form.end} onChange={e=>set("end")(e.target.value)}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <Btn ghost onClick={()=>setShowAdd(false)}>Cancel</Btn>
        <Btn onClick={submit}>Add Event</Btn>
      </div>
    </Modal>}
  </div>;
}

// ─── CHORES VIEW ──────────────────────────────────────────────────────────────
function ChoresView({ chores, onAdd, onComplete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title:"", assignee:"Family", due_date:"", points:5 });
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.title) return;
    await onAdd({...form, due_date:form.due_date||new Date().toISOString().slice(0,10)});
    setShowAdd(false); setForm({title:"",assignee:"Family",due_date:"",points:5});
  };

  const open = chores.filter(c=>c.status==="open");
  const done = chores.filter(c=>c.status==="done");

  // Points leaderboard
  const scores = MEMBERS.filter(m=>m.name!=="Family").map(m=>({
    ...m,
    pts: chores.filter(c=>c.assignee===m.name&&c.status==="done").reduce((s,c)=>s+(c.points||1),0),
    total: chores.filter(c=>c.assignee===m.name).length,
  })).sort((a,b)=>b.pts-a.pts);
  const maxPts = Math.max(...scores.map(s=>s.pts),1);

  return <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16,alignItems:"start"}}>
    {/* Main chores list */}
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:"#34d399"}}>◎ Chores Board</span>
        <Btn small color="#34d399" onClick={()=>setShowAdd(true)}>+ Add Chore</Btn>
      </div>
      {open.length===0 && <div style={{...css.card,padding:28,textAlign:"center",color:C.dim,fontSize:15}}>All chores done! 🎉</div>}
      <div style={{display:"grid",gap:8}}>
        {open.map(c=>{
          const m = MEMBER_MAP[c.assignee]||{color:C.muted};
          const overdue = c.due_date && c.due_date < new Date().toISOString().slice(0,10);
          return <div key={c.id} style={{...css.card,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,
            borderLeft:`3px solid ${m.color}`}}>
            <button onClick={()=>onComplete(c.id)} style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${m.color}`,
              background:"none",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=m.color+"40"}}
              onMouseLeave={e=>{e.currentTarget.style.background="none"}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.title}</div>
              <div style={{display:"flex",gap:8,marginTop:5,alignItems:"center",flexWrap:"wrap"}}>
                <Pill name={c.assignee}/>
                {c.due_date&&<span style={{fontSize:11,color:overdue?"#ef4444":C.muted}}>
                  {overdue?"⚠ overdue: ":"due: "}{c.due_date}
                </span>}
              </div>
            </div>
            <span style={{fontSize:13,color:"#fbbf24",fontWeight:800}}>⭐{c.points}</span>
          </div>;
        })}
      </div>
      {done.length>0 && <div style={{marginTop:20}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,color:C.dim,textTransform:"uppercase",marginBottom:10}}>Completed ({done.length})</div>
        <div style={{display:"grid",gap:6}}>
          {done.slice(0,5).map(c=>(
            <div key={c.id} style={{...css.card,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,opacity:0.4}}>
              <span style={{color:"#34d399",fontSize:16}}>✓</span>
              <span style={{fontSize:13,color:C.muted,textDecoration:"line-through",flex:1}}>{c.title}</span>
              <Pill name={c.assignee}/>
            </div>
          ))}
        </div>
      </div>}
    </div>

    {/* Leaderboard sidebar */}
    <div style={{...css.card,padding:18}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,color:"#fbbf24",textTransform:"uppercase",marginBottom:16}}>🏆 Leaderboard</div>
      {scores.map((s,i)=>(
        <div key={s.name} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:13,color:i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#d97706":C.dim}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
              </span>
              <span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.name}</span>
            </div>
            <span style={{fontSize:12,fontWeight:800,color:"#fbbf24"}}>⭐ {s.pts}</span>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(s.pts/maxPts)*100}%`,background:s.color,borderRadius:4,transition:"width 0.6s ease"}}/>
          </div>
        </div>
      ))}
    </div>

    {showAdd && <Modal title="New Chore" onClose={()=>setShowAdd(false)}>
      <Input label="Chore" value={form.title} onChange={e=>set("title")(e.target.value)} placeholder="e.g. Vacuum living room"/>
      <Select label="Assign to" value={form.assignee} onChange={e=>set("assignee")(e.target.value)}>
        {MEMBERS.map(m=><option key={m.name}>{m.name}</option>)}
      </Select>
      <Input label="Due date" type="date" value={form.due_date} onChange={e=>set("due_date")(e.target.value)}/>
      <Field label={`Points: ${form.points} ⭐`}>
        <input type="range" min={1} max={20} value={form.points} onChange={e=>set("points")(Number(e.target.value))} style={{width:"100%"}}/>
      </Field>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <Btn ghost onClick={()=>setShowAdd(false)}>Cancel</Btn>
        <Btn color="#34d399" onClick={submit}>Add Chore</Btn>
      </div>
    </Modal>}
  </div>;
}

// ─── MEALS VIEW ───────────────────────────────────────────────────────────────
function MealsView({ meals, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ recipe:"", meal_type:"dinner", date:"", notes:"" });
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.recipe) return;
    await onAdd({...form, date:form.date||new Date().toISOString().slice(0,10)});
    setShowAdd(false); setForm({recipe:"",meal_type:"dinner",date:"",notes:""});
  };

  const days = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-d.getDay()+i+1); return d; });
  const mealIcon = {breakfast:"🌅",lunch:"☀️",dinner:"🌙"};
  const today = new Date().toISOString().slice(0,10);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:"#fb923c"}}>◉ Weekly Meal Plan</span>
      <Btn small color="#fb923c" onClick={()=>setShowAdd(true)}>+ Add Meal</Btn>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
      {days.map(d=>{
        const dateStr = d.toISOString().slice(0,10);
        const isToday = dateStr===today;
        const dayMeals = meals.filter(m=>m.date===dateStr);
        return <div key={dateStr} style={{...css.card,padding:12,
          borderColor:isToday?"rgba(251,146,60,0.3)":C.border,
          background:isToday?"rgba(251,146,60,0.06)":C.card}}>
          <div style={{fontSize:10,fontWeight:700,color:isToday?"#fb923c":C.muted,letterSpacing:1,textTransform:"uppercase"}}>{d.toLocaleDateString("en-GB",{weekday:"short"})}</div>
          <div style={{fontSize:18,fontWeight:800,color:isToday?"#fed7aa":C.text,margin:"4px 0 10px"}}>{d.getDate()}</div>
          {["breakfast","lunch","dinner"].map(type=>{
            const meal = dayMeals.find(m=>m.meal_type===type);
            return <div key={type} style={{marginBottom:8,padding:"6px 8px",borderRadius:8,
              background:meal?"rgba(251,146,60,0.1)":"rgba(255,255,255,0.02)",
              border:`1px solid ${meal?"rgba(251,146,60,0.2)":C.border}`}}>
              <div style={{fontSize:12}}>{mealIcon[type]}</div>
              <div style={{fontSize:10,color:meal?C.text:C.dim,fontWeight:meal?600:400,marginTop:2,lineHeight:1.3}}>
                {meal?.recipe||<span style={{color:C.dim}}>—</span>}
              </div>
            </div>;
          })}
        </div>;
      })}
    </div>
    {showAdd && <Modal title="Add Meal" onClose={()=>setShowAdd(false)}>
      <Input label="Recipe / meal name" value={form.recipe} onChange={e=>set("recipe")(e.target.value)} placeholder="e.g. Spaghetti Bolognese"/>
      <Select label="Meal type" value={form.meal_type} onChange={e=>set("meal_type")(e.target.value)}>
        {["breakfast","lunch","dinner"].map(t=><option key={t}>{t}</option>)}
      </Select>
      <Input label="Date" type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
      <Input label="Notes (optional)" value={form.notes} onChange={e=>set("notes")(e.target.value)} placeholder="Dietary notes, prep time…"/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <Btn ghost onClick={()=>setShowAdd(false)}>Cancel</Btn>
        <Btn color="#fb923c" onClick={submit}>Add Meal</Btn>
      </div>
    </Modal>}
  </div>;
}

// ─── GROCERY VIEW ─────────────────────────────────────────────────────────────
function GroceryView({ items, onAdd }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", quantity:"1" });
  const [checked, setChecked] = useState({});
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.name) return;
    await onAdd(form);
    setShowAdd(false); setForm({name:"",quantity:"1"});
  };

  const toggle = id => setChecked(c=>({...c,[id]:!c[id]}));
  const unchecked = items.filter(i=>!checked[i.id]);
  const done = items.filter(i=>checked[i.id]);
  const progress = items.length>0 ? Math.round((done.length/items.length)*100) : 0;

  // Group by first letter for organisation
  const groups = {};
  unchecked.forEach(i=>{ const k=i.name[0]?.toUpperCase()||"#"; (groups[k]||(groups[k]=[])).push(i); });

  return <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:16,alignItems:"start"}}>
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:"#a78bfa"}}>◫ Grocery List</span>
        <Btn small color="#a78bfa" onClick={()=>setShowAdd(true)}>+ Add Item</Btn>
      </div>
      {items.length===0 && <div style={{...css.card,padding:28,textAlign:"center",color:C.dim}}>List is empty — tap + to add items</div>}
      {unchecked.map(item=>(
        <div key={item.id} onClick={()=>toggle(item.id)} style={{...css.card,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:7,cursor:"pointer",transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHi}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border}}>
          <div style={{width:20,height:20,borderRadius:6,border:`2px solid #a78bfa`,flexShrink:0}}/>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>{item.name}</span>
          <span style={{fontSize:12,color:C.muted,fontWeight:700}}>×{item.quantity}</span>
        </div>
      ))}
      {done.length>0 && <div style={{marginTop:16,opacity:0.45}}>
        <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Got it ({done.length})</div>
        {done.map(item=>(
          <div key={item.id} onClick={()=>toggle(item.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 4px",cursor:"pointer"}}>
            <div style={{width:20,height:20,borderRadius:6,background:"#a78bfa",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:11,color:"#fff"}}>✓</span>
            </div>
            <span style={{fontSize:13,color:C.muted,textDecoration:"line-through",flex:1}}>{item.name}</span>
            <span style={{fontSize:12,color:C.dim}}>×{item.quantity}</span>
          </div>
        ))}
      </div>}
    </div>

    {/* Progress sidebar */}
    <div style={{display:"grid",gap:12}}>
      <div style={{...css.card,padding:18,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Shopping progress</div>
        <div style={{position:"relative",width:100,height:100,margin:"0 auto 12px"}}>
          <svg viewBox="0 0 100 100" style={{width:"100%",height:"100%",transform:"rotate(-90deg)"}}>
            <circle cx="50" cy="50" r="42" fill="none" stroke={C.border} strokeWidth="8"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#a78bfa" strokeWidth="8"
              strokeDasharray={`${progress*2.64} 264`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
            <span style={{fontSize:22,fontWeight:800,color:C.text}}>{progress}%</span>
          </div>
        </div>
        <div style={{fontSize:13,color:C.muted}}>{done.length} of {items.length} items</div>
      </div>
      <div style={{...css.card,padding:14}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Quick add</div>
        {["Milk","Bread","Eggs","Butter","Apples"].map(item=>(
          <button key={item} onClick={()=>onAdd({name:item,quantity:"1"})} style={{display:"block",width:"100%",marginBottom:6,padding:"7px 12px",background:"rgba(167,139,250,0.08)",border:`1px solid rgba(167,139,250,0.2)`,borderRadius:8,color:"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
            + {item}
          </button>
        ))}
      </div>
    </div>

    {showAdd && <Modal title="Add to list" onClose={()=>setShowAdd(false)}>
      <Input label="Item name" value={form.name} onChange={e=>set("name")(e.target.value)} placeholder="e.g. Oat milk"/>
      <Input label="Quantity" value={form.quantity} onChange={e=>set("quantity")(e.target.value)} placeholder="e.g. 2"/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <Btn ghost onClick={()=>setShowAdd(false)}>Cancel</Btn>
        <Btn color="#a78bfa" onClick={submit}>Add Item</Btn>
      </div>
    </Modal>}
  </div>;
}

// ─── SETTINGS / INTEGRATIONS ──────────────────────────────────────────────────
function SettingsView({ call, integrations, onRefresh }) {
  const [googleFlow, setGoogleFlow] = useState(null);
  const [appleStatus, setAppleStatus] = useState("");
  const [loading, setLoading] = useState("");

  const startGoogle = async () => {
    setLoading("google"); setGoogleFlow(null);
    const r = await call("/api/integrations/google/auth/start", { method:"POST" });
    setLoading("");
    if (r?.user_code) setGoogleFlow(r);
    else setGoogleFlow({ error: r?.error || "Check GOOGLE_CLIENT_ID is set in your .env file" });
  };

  const discoverApple = async () => {
    setLoading("apple"); setAppleStatus("");
    const r = await call("/api/integrations/apple/calendars");
    setLoading("");
    if (r?.calendars?.length) setAppleStatus(`Found ${r.calendars.length} calendar(s): ${r.calendars.map(c=>c.name).join(", ")}. Copy a URL into APPLE_CALENDAR_URL in your .env.`);
    else setAppleStatus(r?.error || "Check APPLE_USERNAME and APPLE_PASSWORD are set in your .env file.");
  };

  const syncNow = async (provider) => {
    setLoading(provider);
    await call(`/api/integrations/${provider}/sync`, { method:"POST" });
    setLoading("");
    onRefresh();
  };

  const Row = ({ label, children }) => (
    <div style={{padding:"16px 0",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:20}}>
      <div style={{fontSize:14,color:C.text,fontWeight:600,minWidth:160}}>{label}</div>
      <div style={{flex:1,textAlign:"right"}}>{children}</div>
    </div>
  );

  return <div style={{maxWidth:640}}>
    <div style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:C.muted,marginBottom:20}}>◌ Settings & Integrations</div>

    {/* Google */}
    <div style={{...css.card,padding:22,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(66,133,244,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>G</div>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>Google Calendar</div>
          <div style={{fontSize:12,color:C.muted}}>OAuth 2.0 device flow — no keyboard required</div>
        </div>
        <div style={{marginLeft:"auto",...css.pill(integrations?.google?.connected?"#4285f4":C.dim)}}>
          {integrations?.google?.connected?"● Connected":"○ Not connected"}
        </div>
      </div>

      {!integrations?.google?.connected && <>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:14}}>
          Needs <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>GOOGLE_CLIENT_ID</code> and <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>GOOGLE_CLIENT_SECRET</code> in your <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>.env</code> file. Get these from <a href="https://console.cloud.google.com" style={{color:"#60a5fa"}}>console.cloud.google.com</a> → Credentials → TV &amp; Limited Input device.
        </div>
        <Btn color="#4285f4" onClick={startGoogle}>{loading==="google"?"Starting…":"Connect Google"}</Btn>
      </>}

      {integrations?.google?.connected && <Btn ghost small onClick={()=>syncNow("google")}>{loading==="google"?"Syncing…":"↻ Sync now"}</Btn>}

      {googleFlow && !googleFlow.error && <div style={{marginTop:16,padding:16,background:"rgba(66,133,244,0.08)",border:"1px solid rgba(66,133,244,0.25)",borderRadius:12}}>
        <div style={{fontSize:13,color:"#93c5fd",marginBottom:10}}>
          1. On your phone, open: <a href={googleFlow.verification_url} style={{color:"#60a5fa",fontWeight:700}}>{googleFlow.verification_url}</a>
        </div>
        <div style={{fontSize:13,color:"#93c5fd",marginBottom:12}}>2. Enter this code:</div>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:6,color:"#f0f9ff",textAlign:"center",padding:"12px 0",background:"rgba(255,255,255,0.05)",borderRadius:10}}>
          {googleFlow.user_code}
        </div>
        <div style={{fontSize:12,color:C.muted,marginTop:10,textAlign:"center"}}>Polling in background — this page will update when approved</div>
      </div>}

      {googleFlow?.error && <div style={{marginTop:14,padding:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,fontSize:13,color:"#fca5a5"}}>{googleFlow.error}</div>}
    </div>

    {/* Apple */}
    <div style={{...css.card,padding:22,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <div style={{width:36,height:36,borderRadius:10,background:"rgba(163,184,200,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🍎</div>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>Apple iCloud Calendar</div>
          <div style={{fontSize:12,color:C.muted}}>CalDAV via app-specific password</div>
        </div>
        <div style={{marginLeft:"auto",...css.pill(integrations?.apple?.connected?"#a3b8c8":C.dim)}}>
          {integrations?.apple?.connected?"● Connected":"○ Not connected"}
        </div>
      </div>
      <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:14}}>
        Set <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>APPLE_USERNAME</code> (your iCloud email) and <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>APPLE_PASSWORD</code> (app-specific password from <a href="https://appleid.apple.com" style={{color:"#60a5fa"}}>appleid.apple.com</a> → App-Specific Passwords) in your <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>.env</code> file.
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn color="#636366" onClick={discoverApple}>{loading==="apple"?"Discovering…":"Discover Calendars"}</Btn>
        {integrations?.apple?.connected && <Btn ghost small onClick={()=>syncNow("apple")}>{loading==="apple"?"Syncing…":"↻ Sync now"}</Btn>}
      </div>
      {appleStatus && <div style={{marginTop:14,padding:12,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.text,lineHeight:1.6}}>{appleStatus}</div>}
    </div>

    {/* API config */}
    <div style={{...css.card,padding:22}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>API Connection</div>
      <Row label="Current endpoint">
        <code style={{fontSize:12,color:"#60a5fa"}}>{API}</code>
      </Row>
      <Row label="Override API URL">
        <div style={{display:"flex",gap:8}}>
          <input id="api-url-input" defaultValue={API} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 11px",color:C.text,fontSize:13,outline:"none",width:220}}/>
          <Btn small ghost onClick={()=>{
            const v = document.getElementById("api-url-input").value.trim();
            if(v){localStorage.setItem("familyHubApi",v); window.location.reload();}
          }}>Save</Btn>
        </div>
      </Row>
      <div style={{marginTop:16,padding:12,background:"rgba(255,255,255,0.02)",border:`1px solid ${C.border}`,borderRadius:10}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>START COMMANDS</div>
        <code style={{fontSize:12,color:"#a78bfa",display:"block",marginBottom:4}}>node --env-file=.env apps/api/server.mjs</code>
        <code style={{fontSize:12,color:"#60a5fa",display:"block"}}>npm run start:ui   # serves UI on port 5173</code>
      </div>
    </div>
  </div>;
}

// ─── IDLE PHOTO FRAME ─────────────────────────────────────────────────────────
function PhotoFrame({ onWake }) {
  const now = useClock();
  const [slide, setSlide] = useState(0);
  // Placeholder slides (in real use, fetch from /api/photos)
  const slides = [
    { bg:"linear-gradient(135deg,#1e3a5f,#0f2040)", label:"Add photos to apps/api/data/photos/" },
    { bg:"linear-gradient(135deg,#1a3a2a,#0a1f15)", label:"Photo slideshow mode" },
    { bg:"linear-gradient(135deg,#3a1a2a,#1f0a15)", label:"Tap anywhere to return" },
  ];
  useEffect(()=>{ const t=setInterval(()=>setSlide(s=>(s+1)%slides.length),8000); return()=>clearInterval(t); },[]);

  return <div onClick={onWake} style={{position:"fixed",inset:0,cursor:"none",background:slides[slide].bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"background 1s ease",zIndex:300}}>
    <div style={{fontSize:80,fontWeight:800,color:"rgba(255,255,255,0.9)",letterSpacing:-4,lineHeight:1}}>
      {now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
    </div>
    <div style={{fontSize:18,color:"rgba(255,255,255,0.5)",marginTop:12,letterSpacing:2}}>
      {now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
    </div>
    <div style={{position:"absolute",bottom:40,fontSize:13,color:"rgba(255,255,255,0.25)",letterSpacing:1}}>
      {slides[slide].label}
    </div>
    <div style={{position:"absolute",bottom:20,display:"flex",gap:6}}>
      {slides.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===slide?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}}/>)}
    </div>
  </div>;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { call, online } = useApi();
  const [tab, setTab] = useState("Today");
  const [events, setEvents] = useState([]);
  const [chores, setChores] = useState([]);
  const [meals, setMeals] = useState([]);
  const [grocery, setGrocery] = useState([]);
  const [integrations, setIntegrations] = useState(null);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(null);

  const load = useCallback(async () => {
    const [ev, ch, me, gr, si] = await Promise.all([
      call("/api/events"),
      call("/api/chores"),
      call("/api/meals/week"),
      call("/api/grocery/items"),
      call("/api/integrations/status"),
    ]);
    if (ev) setEvents(ev);
    if (ch) setChores(ch);
    if (me?.meals) setMeals(me.meals);
    if (gr) setGrocery(gr);
    if (si) setIntegrations(si);
  }, [call]);

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  // Idle timer — 3 minutes of no interaction → photo frame
  const resetIdle = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 3*60*1000);
  }, []);
  useEffect(() => { resetIdle(); document.addEventListener("pointerdown", resetIdle); document.addEventListener("keydown", resetIdle); return () => { document.removeEventListener("pointerdown", resetIdle); document.removeEventListener("keydown", resetIdle); clearTimeout(idleTimer.current); }; }, [resetIdle]);

  const addEvent = async (data) => { await call("/api/events",{method:"POST",body:JSON.stringify(data)}); load(); };
  const addChore = async (data) => { await call("/api/chores",{method:"POST",body:JSON.stringify(data)}); load(); };
  const completeChore = async (id) => { await call(`/api/chores/${id}/complete`,{method:"POST"}); load(); };
  const addMeal = async (data) => { await call("/api/meals",{method:"POST",body:JSON.stringify(data)}); load(); };
  const addGrocery = async (data) => { await call("/api/grocery/items",{method:"POST",body:JSON.stringify(data)}); load(); };

  if (idle) return <PhotoFrame onWake={resetIdle}/>;

  return <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
    {/* Top bar */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 28px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div>
          <div style={{fontSize:17,fontWeight:900,color:C.text,letterSpacing:-0.5}}>🏡 Family Hub</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:online?"#34d399":"#ef4444",boxShadow:online?"0 0 6px #34d399":"0 0 6px #ef4444"}}/>
            <span style={{fontSize:10,color:online?"#34d399":"#ef4444",fontWeight:700,letterSpacing:1}}>{online?"API ONLINE":"OFFLINE"}</span>
          </div>
        </div>
        {/* Nav */}
        <nav style={{display:"flex",gap:2,marginLeft:20}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",borderRadius:9,background:tab===t?"rgba(255,255,255,0.08)":"none",border:`1px solid ${tab===t?C.borderHi:"transparent"}`,color:tab===t?C.text:C.muted,fontSize:13,fontWeight:tab===t?700:500,cursor:"pointer",transition:"all 0.15s",letterSpacing:0.2}}>
              <span style={{marginRight:5,fontSize:11}}>{TAB_ICONS[t]}</span>{t}
            </button>
          ))}
        </nav>
      </div>
      <Clock/>
    </div>

    {/* Content */}
    <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
      {tab==="Today"    && <TodayView events={events} chores={chores} meals={meals} online={online} integrations={integrations}/>}
      {tab==="Calendar" && <CalendarView events={events} onAdd={addEvent} onSync={integrations?.google?.connected||integrations?.apple?.connected ? ()=>load() : null}/>}
      {tab==="Chores"   && <ChoresView chores={chores} onAdd={addChore} onComplete={completeChore}/>}
      {tab==="Meals"    && <MealsView meals={meals} onAdd={addMeal}/>}
      {tab==="Grocery"  && <GroceryView items={grocery} onAdd={addGrocery}/>}
      {tab==="Settings" && <SettingsView call={call} integrations={integrations} onRefresh={load}/>}
    </div>
  </div>;
}
