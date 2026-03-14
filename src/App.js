import React, { useState, useEffect, useCallback, useMemo } from "react";

const DATA_URL = "https://ai-data.jonathan-libiran.workers.dev/data-ai.json";
const AI_MODEL = "claude-haiku-4-5-20251001";

const METRICS = [
  { key:"leads",          label:"Leads",           fmt: v => Math.round(v).toLocaleString(),     color:"#6366f1" },
  { key:"booked",         label:"Bookings",         fmt: v => Math.round(v).toLocaleString(),     color:"#0ea5e9" },
  { key:"canceled",       label:"Canceled Jobs",    fmt: v => Math.round(v).toLocaleString(),     color:"#f43f5e", invert:true },
  { key:"completed",      label:"Completed Jobs",   fmt: v => Math.round(v).toLocaleString(),     color:"#10b981" },
  { key:"revenue",        label:"Revenue",          fmt: v => "$"+Math.round(v).toLocaleString(), color:"#f59e0b" },
  { key:"bookingRate",    label:"Booking Rate",     fmt: v => (v*100).toFixed(1)+"%",             color:"#8b5cf6" },
  { key:"cancelRate",     label:"Cancel Rate",      fmt: v => (v*100).toFixed(1)+"%",             color:"#ef4444", invert:true },
  { key:"conversionRate", label:"Conversion Rate",  fmt: v => (v*100).toFixed(1)+"%",             color:"#14b8a6" },
  { key:"aov",            label:"AOV",              fmt: v => "$"+Math.round(v).toLocaleString(), color:"#f97316" },
];

const CAT_COLORS = { Core:"#6366f1", Brand:"#0ea5e9", GBL:"#f59e0b", Referral:"#10b981" };

const FALLBACK = [
  {"date":"2026-03-13T05:00:00.000Z","market":"Dallas","channel":"CORE GOOGLE ADS","leads":47,"jobs_booked":10,"canceled_jobs":0,"invoiced_customer_price":4344,"jobs_completed":6,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"},
  {"date":"2026-03-13T05:00:00.000Z","market":"Houston","channel":"CORE GOOGLE ADS","leads":16,"jobs_booked":4,"canceled_jobs":0,"invoiced_customer_price":993,"jobs_completed":3,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"},
  {"date":"2026-03-13T05:00:00.000Z","market":"Austin","channel":"CORE GOOGLE ADS","leads":20,"jobs_booked":5,"canceled_jobs":0,"invoiced_customer_price":4669,"jobs_completed":5,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"},
  {"date":"2026-03-12T05:00:00.000Z","market":"Nashville","channel":"CORE GOOGLE ADS","leads":18,"jobs_booked":2,"canceled_jobs":0,"invoiced_customer_price":1326,"jobs_completed":2,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"},
  {"date":"2026-03-12T05:00:00.000Z","market":"Dallas","channel":"VIOC BRAND EMAIL","leads":9,"jobs_booked":1,"canceled_jobs":0,"invoiced_customer_price":600,"jobs_completed":2,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Brand"},
  {"date":"2026-03-12T05:00:00.000Z","market":"Atlanta","channel":"VIOC REFERRAL","leads":5,"jobs_booked":2,"canceled_jobs":0,"invoiced_customer_price":500,"jobs_completed":1,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Referral"},
  {"date":"2026-03-11T05:00:00.000Z","market":"Houston","channel":"VIOC GMB","leads":6,"jobs_booked":1,"canceled_jobs":0,"invoiced_customer_price":1234,"jobs_completed":1,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"GBL"},
  {"date":"2026-03-11T05:00:00.000Z","market":"San Antonio","channel":"CORE GOOGLE ADS","leads":9,"jobs_booked":1,"canceled_jobs":0,"invoiced_customer_price":1860,"jobs_completed":2,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"},
  {"date":"2026-03-10T05:00:00.000Z","market":"Orlando","channel":"CORE GOOGLE ADS","leads":19,"jobs_booked":3,"canceled_jobs":1,"invoiced_customer_price":1690,"jobs_completed":3,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"},
  {"date":"2026-03-09T05:00:00.000Z","market":"Miami","channel":"CORE GOOGLE ADS","leads":10,"jobs_booked":3,"canceled_jobs":0,"invoiced_customer_price":730,"jobs_completed":3,"Week":"2026-03-09T05:00:00.000Z","Month":"2026-03-01T06:00:00.000Z","Channel Category":"Core"}
];

function sumK(arr, k) { return arr.reduce((a, r) => a + (r[k] || 0), 0); }

function aggregate(rows) {
  const leads = sumK(rows,"leads"), booked = sumK(rows,"booked"), canceled = sumK(rows,"canceled"),
        completed = sumK(rows,"completed"), revenue = sumK(rows,"revenue");
  return { leads, booked, canceled, completed, revenue,
    bookingRate: leads ? booked/leads : 0,
    cancelRate: booked ? canceled/booked : 0,
    conversionRate: leads ? completed/leads : 0,
    aov: completed ? revenue/completed : 0
  };
}

function buildTimeSeries(rows, period) {
  const groups = {};
  rows.forEach(r => {
    const key = period==="day" ? r.date.slice(0,10) : period==="week" ? r.Week.slice(0,10) : r.Month.slice(0,7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  const keys = Object.keys(groups).sort().slice(period==="day" ? -60 : -12);
  return keys.map(k => {
    const g = groups[k];
    const leads=sumK(g,"leads"), booked=sumK(g,"booked"), canceled=sumK(g,"canceled"),
          completed=sumK(g,"completed"), revenue=sumK(g,"revenue");
    return { label:k, leads, booked, canceled, completed, revenue,
      bookingRate: leads?booked/leads:0, cancelRate: booked?canceled/booked:0,
      conversionRate: leads?completed/leads:0, aov: completed?revenue/completed:0 };
  });
}

function fmtLabel(label, period) {
  if (period==="day") return new Date(label+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
  if (period==="week") return "W"+new Date(label+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const [y,m] = label.split("-");
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]+" '"+y.slice(2);
}

function mapRows(d) {
  return d.map(r => ({
    date:r.date, Week:r.Week, Month:r.Month, market:r.market, channel:r.channel,
    cat:r["Channel Category"], leads:r.leads||0, booked:r.jobs_booked||0,
    canceled:r.canceled_jobs||0, completed:r.jobs_completed||0, revenue:r.invoiced_customer_price||0
  }));
}

function calcPacing(period) {
  const now = new Date();
  if (period === "week") {
    const dow = now.getDay() === 0 ? 7 : now.getDay();
    if (dow === 7) return null;
    return { elapsed: dow, total: 7, pct: dow/7, label: "Day "+dow+" of 7" };
  }
  if (period === "month") {
    const dom = now.getDate();
    const dim = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    if (dom === dim) return null;
    return { elapsed: dom, total: dim, pct: dom/dim, label: "Day "+dom+" of "+dim };
  }
  return null;
}

function callAPI(messages) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 1000, messages })
  }).then(r => r.json());
}

function Sparkline({ data, metricKey, color }) {
  const vals = data.map(d => d[metricKey] || 0);
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const w = 80, h = 28;
  const pts = vals.map((v,i) => `${((i/(vals.length-1))*w).toFixed(1)},${(h-((v-min)/range)*h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function DonutChart({ data, title, fmtVal }) {
  const fmt = fmtVal || (v => Math.round(v).toLocaleString());
  const total = data.reduce((a,d) => a+d.value, 0);
  if (!total) return null;
  const cx=80, cy=80, r=60, sw=18, gap=2, circ=2*Math.PI*r;
  let off=0;
  const slices = data.map(d => {
    const pct=d.value/total, dl=Math.max(0,circ*pct-gap);
    const s = {...d, pct, dl, off};
    off += circ*pct;
    return s;
  });
  return (
    <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}}>
      <div style={{fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>{title}</div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <svg width={160} height={160} viewBox="0 0 160 160" style={{flexShrink:0}}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}/>
          {slices.map((s,i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${s.dl} ${circ}`} strokeDashoffset={-(s.off-circ/4)}/>
          ))}
          <text x={cx} y={cy-8} textAnchor="middle" fontSize="11" fill="#9ca3af" fontWeight="600">Total</text>
          <text x={cx} y={cy+10} textAnchor="middle" fontSize="13" fill="#111827" fontWeight="700">
            {total>=1000?(total/1000).toFixed(1)+"k":total.toLocaleString()}
          </text>
        </svg>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
          {slices.map((s,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.color}}/>
                <span style={{fontSize:11,color:"#6b7280"}}>{s.label}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
                <span style={{fontSize:12,fontWeight:700,color:"#111827"}}>{fmt(s.value)}</span>
                <span style={{fontSize:10,color:"#9ca3af"}}>{(s.pct*100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendChart({ data, metricKey, metric, period, chartType, pacing }) {
  const isRateOrAov = metricKey.includes("Rate") || metricKey==="aov";
  // Replace last data point with projected if pacing applies
  const vals = data.map((d, i) => {
    const raw = d[metricKey] || 0;
    if (i === data.length-1 && pacing && !isRateOrAov && (period==="week"||period==="month")) {
      return raw / pacing.pct;
    }
    return raw;
  });
  const actuals = data.map(d => d[metricKey] || 0);
  const hasProjection = pacing && !isRateOrAov && (period==="week"||period==="month");

  if (!vals.length) return null;
  const max = Math.max(...vals, 1);
  const W=680, H=210, pL=56, pB=36, pT=16, pR=16, cW=W-pL-pR, cH=H-pB-pT;
  const bW = Math.min(cW/vals.length-2, 28);
  const step = Math.ceil(vals.length/10);
  const fmtY = v => {
    if (metricKey==="revenue"||metricKey==="aov") return "$"+(v>=1000?(v/1000).toFixed(1)+"k":Math.round(v));
    if (metricKey.includes("Rate")) return (v*100).toFixed(0)+"%";
    return v>=1000?(v/1000).toFixed(1)+"k":Math.round(v).toString();
  };
  const xP = i => pL+(i/(vals.length-1||1))*cW;
  const yP = v => pT+cH-(v/max)*cH;
  const gId = "lg_"+metricKey;
  const lastIdx = vals.length-1;

  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"auto"}}>
      {[0,0.25,0.5,0.75,1].map(t => {
        const y = pT+cH*(1-t);
        return (
          <g key={t}>
            <line x1={pL} x2={W-pR} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1"/>
            <text x={pL-5} y={y+4} textAnchor="end" fontSize="10" fill="#9ca3af">{fmtY(max*t)}</text>
          </g>
        );
      })}

      {chartType==="line" ? (
        <g>
          <defs>
            <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={metric.color} stopOpacity="0.01"/>
            </linearGradient>
          </defs>
          {/* Area fill using actual vals except last projected */}
          <polygon
            points={xP(0).toFixed(1)+","+(pT+cH)+" "+vals.map((v,i)=>xP(i).toFixed(1)+","+yP(v).toFixed(1)).join(" ")+" "+xP(lastIdx).toFixed(1)+","+(pT+cH)}
            fill={"url(#"+gId+")"}
          />
          {/* Solid line for historical portion */}
          <polyline
            points={vals.slice(0, hasProjection ? lastIdx+1 : vals.length).map((v,i)=>xP(i).toFixed(1)+","+yP(v).toFixed(1)).join(" ")}
            fill="none" stroke={metric.color} strokeWidth="2" strokeLinejoin="round"
          />
          {/* Dashed line connecting last actual to projected */}
          {hasProjection && vals.length > 1 && (
            <line
              x1={xP(lastIdx-1).toFixed(1)} y1={yP(actuals[lastIdx-1]).toFixed(1)}
              x2={xP(lastIdx).toFixed(1)} y2={yP(vals[lastIdx]).toFixed(1)}
              stroke={metric.color} strokeWidth="2" strokeDasharray="5,4" opacity="0.7"
            />
          )}
          {/* Dots */}
          {vals.map((v,i) => (
            <circle key={i} cx={xP(i)} cy={yP(v)} r={i===lastIdx&&hasProjection?4:3}
              fill={i===lastIdx&&hasProjection?"#3b82f6":metric.color}
              stroke="#fff" strokeWidth="1.5"/>
          ))}
          {/* Projected label on last point */}
          {hasProjection && (
            <g>
              <rect x={xP(lastIdx)-28} y={yP(vals[lastIdx])-22} width={56} height={16} rx="4" fill="#3b82f6"/>
              <text x={xP(lastIdx)} y={yP(vals[lastIdx])-11} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
                {"▲ "+fmtY(vals[lastIdx])}
              </text>
            </g>
          )}
          {vals.map((v,i) => i%step===0 ? <text key={i} x={xP(i)} y={H-4} textAnchor="middle" fontSize="9" fill="#9ca3af">{fmtLabel(data[i].label,period)}</text> : null)}
        </g>
      ) : (
        <g>
          {vals.map((v,i) => {
            const x=pL+(i/vals.length)*cW+cW/vals.length/2, bH=Math.max((v/max)*cH,0), y=pT+cH-bH;
            const isProj = i===lastIdx && hasProjection;
            return (
              <g key={i}>
                <rect x={x-bW/2} y={y} width={bW} height={bH} rx="3"
                  fill={isProj?"#3b82f6":metric.color}
                  opacity={isProj?1:0.85}
                  strokeDasharray={isProj?"4,2":"none"}
                />
                {isProj && (
                  <g>
                    <rect x={x-28} y={y-20} width={56} height={16} rx="4" fill="#3b82f6"/>
                    <text x={x} y={y-9} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">{"▲ "+fmtY(v)}</text>
                  </g>
                )}
                {i%step===0 && <text x={x} y={H-4} textAnchor="middle" fontSize="9" fill="#9ca3af">{fmtLabel(data[i].label,period)}</text>}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

const CS = {background:"#fff",borderRadius:12,padding:"16px 18px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"};
const SS = {padding:"7px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,color:"#374151",background:"#fff",cursor:"pointer"};

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [period, setPeriod] = useState("day");
  const [market, setMarket] = useState("All Markets");
  const [chanCat, setChanCat] = useState("All Channels");
  const [tab, setTab] = useState("overview");
  const [trendKey, setTrendKey] = useState("revenue");
  const [chartType, setChartType] = useState("line");
  const [aiLoading, setAiLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .then(d => { setRawData(mapRows(d)); setUsingFallback(false); setLoading(false); })
      .catch(err => { console.error("Fetch failed:", err); setRawData(mapRows(FALLBACK)); setUsingFallback(true); setLoading(false); });
  }, []);

  const markets = useMemo(() => { const s={}; rawData.forEach(r=>{ s[r.market]=1; }); return Object.keys(s).sort(); }, [rawData]);
  const chanCats = useMemo(() => { const s={}; rawData.forEach(r=>{ s[r.cat]=1; }); return Object.keys(s).sort(); }, [rawData]);

  const filtered = useMemo(() => rawData.filter(r =>
    (market==="All Markets"||r.market===market) && (chanCat==="All Channels"||r.cat===chanCat)
  ), [rawData, market, chanCat]);

  const series = useMemo(() => buildTimeSeries(filtered, period), [filtered, period]);

  const overviewCurr = useMemo(() => {
    if (!series.length) return {};
    const latest = series[series.length-1].label;
    const rows = filtered.filter(r => {
      const key = period==="day" ? r.date.slice(0,10) : period==="week" ? r.Week.slice(0,10) : r.Month.slice(0,7);
      return key===latest;
    });
    return aggregate(rows);
  }, [series, filtered, period]);

  const overviewPrev = useMemo(() => {
    if (series.length < 2) return {};
    const prevLabel = series[series.length-2].label;
    const rows = filtered.filter(r => {
      const key = period==="day" ? r.date.slice(0,10) : period==="week" ? r.Week.slice(0,10) : r.Month.slice(0,7);
      return key===prevLabel;
    });
    return aggregate(rows);
  }, [series, filtered, period]);

  const curr = overviewCurr;
  const prev = overviewPrev;

  const pacing = useMemo(() => calcPacing(period), [period]);

  const donutData = useMemo(() => {
    const cats = {};
    filtered.forEach(r => {
      if (!cats[r.cat]) cats[r.cat] = {leads:0,booked:0,revenue:0,completed:0};
      cats[r.cat].leads += r.leads; cats[r.cat].booked += r.booked;
      cats[r.cat].revenue += r.revenue; cats[r.cat].completed += r.completed;
    });
    return Object.keys(cats).sort().map(k => ({ label:k, ...cats[k], color:CAT_COLORS[k]||"#94a3b8" }));
  }, [filtered]);

  const pct = (c, p) => p ? ((c-p)/p*100) : 0;
  const periodLabel = period==="day" ? "Last 60 Days" : period==="week" ? "Last 12 Weeks" : "Last 12 Months";

  const overviewLabel = useMemo(() => {
    if (!series.length) return "";
    const latest = series[series.length-1].label;
    if (period==="day") return new Date(latest+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    if (period==="week") {
      const s = new Date(latest+"T12:00:00"), e = new Date(s);
      e.setDate(e.getDate()+6);
      return s.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" – "+e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    }
    return new Date(latest+"-01T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
  }, [series, period]);

  const selMetric = METRICS.find(m => m.key===trendKey) || METRICS[0];

  const isRateOrAov = key => key.includes("Rate") || key==="aov";

  const fetchAI = useCallback((question) => {
    setAiLoading(true);
    const summary = METRICS.map(m => {
      const c=curr[m.key]||0, p=prev[m.key]||0, ch=pct(c,p).toFixed(1);
      return m.label+": "+m.fmt(c)+" ("+(ch>0?"+":"")+ch+"% vs prior)";
    }).join(", ");
    const rawSample = JSON.stringify(filtered.slice(0,50));
    const systemCtx = "You are a business analyst for NuBrakes, a mobile brake repair service. Market: "+market+", Channel: "+chanCat+", Period: "+overviewLabel+". Metrics: "+summary+". Raw data (up to 50 rows): "+rawSample+".";
    setChatHistory(h => [...h, {role:"user", text:question}]);
    callAPI([{role:"user", content:systemCtx+"\n\nQuestion: "+question+"\n\nAnswer clearly and concisely using the data."}])
      .then(d => {
        const t = (d.content||[]).map(c => c.text||"").join("");
        setChatHistory(h => [...h, {role:"assistant", text: t||"No response."}]);
        setAiLoading(false);
      })
      .catch(() => {
        setChatHistory(h => [...h, {role:"assistant", text:"Failed to get a response."}]);
        setAiLoading(false);
      });
  }, [market, chanCat, period, curr, prev, filtered, overviewLabel]);

  useEffect(() => { if (tab==="ai") setChatHistory([]); }, [tab, period, market, chanCat]);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#6b7280",flexDirection:"column",gap:12}}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{width:32,height:32,border:"3px solid #e5e7eb",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <span>Loading live data...</span>
    </div>
  );

  const pacingBanner = pacing && (period==="week"||period==="month") ? (
    <div style={{marginBottom:16,padding:"10px 16px",borderRadius:10,background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{fontSize:16}}>📈</span>
      <div>
        <span style={{fontSize:12,fontWeight:700,color:"#1d4ed8"}}>
          {period==="week" ? "Week" : "Month"} Pacing · {pacing.label} · {(pacing.pct*100).toFixed(0)}% elapsed
        </span>
        <span style={{fontSize:11,color:"#3b82f6",marginLeft:8}}>Projected values shown on each metric card</span>
      </div>
      <div style={{marginLeft:"auto",background:"#dbeafe",borderRadius:20,padding:"2px 10px"}}>
        <span style={{fontSize:11,fontWeight:700,color:"#1d4ed8"}}>{(pacing.pct*100).toFixed(0)}%</span>
      </div>
    </div>
  ) : null;

  return (
    <div style={{fontFamily:"system-ui,sans-serif",background:"#f8fafc",minHeight:"100vh",padding:"20px 16px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>

        {/* Header */}
        <div style={{marginBottom:20}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#111827"}}>KPI Dashboard</h1>
          <p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>NuBrakes · {market} · {chanCat} · {tab==="overview" ? overviewLabel : periodLabel}</p>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:usingFallback?"#fff7ed":"#ecfdf5",border:"1px solid "+(usingFallback?"#fed7aa":"#6ee7b7")}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:usingFallback?"#f97316":"#10b981"}}/>
              <span style={{fontSize:11,fontWeight:600,color:usingFallback?"#c2410c":"#065f46"}}>{usingFallback?"Sample Data":"Live Data"}</span>
            </div>
            {usingFallback && <span style={{fontSize:11,color:"#c2410c"}}>⚠️ Live data unavailable — showing sample data</span>}
          </div>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
          {["day","week","month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{padding:"6px 16px",borderRadius:20,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:period===p?"#111827":"#fff",color:period===p?"#fff":"#6b7280",boxShadow:period===p?"none":"0 1px 3px rgba(0,0,0,0.08)"}}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          <select value={market} onChange={e => setMarket(e.target.value)} style={SS}>
            <option>All Markets</option>
            {markets.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={chanCat} onChange={e => setChanCat(e.target.value)} style={SS}>
            <option>All Channels</option>
            {chanCats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",marginBottom:22,borderBottom:"1.5px solid #e5e7eb"}}>
          {[["overview","Overview"],["trends","Trends"],["ai","✨ AI Insights"]].map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)} style={{padding:"8px 20px",border:"none",background:"none",fontSize:13,fontWeight:600,cursor:"pointer",color:tab===t?"#111827":"#9ca3af",borderBottom:tab===t?"2px solid #111827":"2px solid transparent",marginBottom:-1.5}}>
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab==="overview" && (
          <div>
            {pacingBanner}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12,marginBottom:24}}>
              {METRICS.map(m => {
                const c = curr[m.key]||0, p = prev[m.key]||0;
                const change = pct(c,p), good = m.invert ? change<=0 : change>=0;
                const projected = pacing && !isRateOrAov(m.key) ? c/pacing.pct : null;
                return (
                  <div key={m.key} style={CS}>
                    <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{m.label}</div>
                    <div style={{fontSize:24,fontWeight:700,color:"#111827",marginBottom:8}}>{m.fmt(c)}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                      <span style={{fontSize:11,fontWeight:600,color:good?"#10b981":"#f43f5e",background:good?"#ecfdf5":"#fff1f2",padding:"2px 7px",borderRadius:20}}>
                        {good?"▲":"▼"} {Math.abs(change).toFixed(1)}%
                      </span>
                      <Sparkline data={series} metricKey={m.key} color={m.color}/>
                    </div>
                    {projected && (
                      <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:10,color:"#9ca3af"}}>Projected</span>
                        <span style={{fontSize:12,fontWeight:700,color:"#3b82f6"}}>{m.fmt(projected)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Channel Category Breakdown</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
              <DonutChart data={donutData.map(d => ({label:d.label,value:d.leads,color:d.color}))} title="Leads by Channel Category"/>
              <DonutChart data={donutData.map(d => ({label:d.label,value:d.booked,color:d.color}))} title="Bookings by Channel Category"/>
              <DonutChart data={donutData.map(d => ({label:d.label,value:d.revenue,color:d.color}))} title="Revenue by Channel Category" fmtVal={v => "$"+Math.round(v).toLocaleString()}/>
              <DonutChart data={donutData.map(d => ({label:d.label,value:d.completed,color:d.color}))} title="Completed Jobs by Channel Category"/>
            </div>
          </div>
        )}

        {/* TRENDS */}
        {tab==="trends" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {METRICS.map(m => (
                  <button key={m.key} onClick={() => setTrendKey(m.key)} style={{padding:"5px 13px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:"1.5px solid "+(trendKey===m.key?m.color:"#e5e7eb"),background:trendKey===m.key?m.color:"#fff",color:trendKey===m.key?"#fff":"#6b7280"}}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:4,background:"#f1f5f9",borderRadius:8,padding:3}}>
                {[["line","╱ Line"],["bar","▬ Bar"]].map(([t,lbl]) => (
                  <button key={t} onClick={() => setChartType(t)} style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:chartType===t?"#fff":"transparent",color:chartType===t?"#111827":"#9ca3af",boxShadow:chartType===t?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{...CS, marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:2}}>{selMetric.label} — {periodLabel}</div>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:14}}>{market} · {chanCat}</div>
              <TrendChart data={series} metricKey={trendKey} metric={selMetric} period={period} chartType={chartType} pacing={pacing}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
              {["Peak","Average","Latest","Projected"].map((lbl,li) => {
                const vals = series.map(d => d[trendKey]||0);
                const latest = vals.length ? vals[vals.length-1] : 0;
                let v = null;
                if (li===0) v = vals.length ? Math.max(...vals) : 0;
                else if (li===1) v = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
                else if (li===2) v = latest;
                else {
                  if (!pacing || (period!=="week"&&period!=="month") || isRateOrAov(trendKey)) return null;
                  v = latest / pacing.pct;
                }
                return (
                  <div key={lbl} style={{...CS, borderTop: li===3?"2px solid #3b82f6":""}}>
                    <div style={{fontSize:10,color:li===3?"#3b82f6":"#9ca3af",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>
                      {lbl}{li===3 && pacing ? " ("+( pacing.pct*100).toFixed(0)+"%)" : ""}
                    </div>
                    <div style={{fontSize:20,fontWeight:700,color:li===3?"#3b82f6":selMetric.color}}>
                      {v !== null ? selMetric.fmt(v) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI INSIGHTS */}
        {tab==="ai" && (
          <div style={CS}>
            <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:4}}>💬 Ask a Question</div>
            <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>{market} · {chanCat} · {overviewLabel}</div>
            {chatHistory.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16,maxHeight:360,overflowY:"auto",padding:"4px 0"}}>
                {chatHistory.map((msg,i) => {
                  const isUser = msg.role==="user";
                  return (
                    <div key={i} style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start"}}>
                      <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",background:isUser?"#6366f1":"#f8fafc",color:isUser?"#fff":"#374151",borderBottomRightRadius:isUser?2:12,borderBottomLeftRadius:isUser?12:2,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                {aiLoading && (
                  <div style={{display:"flex",justifyContent:"flex-start"}}>
                    <div style={{padding:"10px 14px",borderRadius:12,background:"#f8fafc",fontSize:13,color:"#9ca3af"}}>Thinking...</div>
                  </div>
                )}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <input
                type="text"
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter"&&userQuestion.trim()&&!aiLoading){ const q=userQuestion.trim(); setUserQuestion(""); fetchAI(q); }}}
                placeholder="e.g. Which market has the highest cancel rate?"
                style={{flex:1,padding:"10px 14px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,color:"#374151",outline:"none"}}
              />
              <button
                onClick={() => { if(userQuestion.trim()&&!aiLoading){ const q=userQuestion.trim(); setUserQuestion(""); fetchAI(q); }}}
                disabled={aiLoading||!userQuestion.trim()}
                style={{padding:"10px 18px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(aiLoading||!userQuestion.trim())?0.5:1}}
              >Ask</button>
            </div>
            <div style={{marginTop:8,fontSize:11,color:"#9ca3af"}}>Claude will analyze your filtered data to answer your question.</div>
          </div>
        )}

      </div>
    </div>
  );
}
