const { useState, useEffect, useCallback, useMemo, useRef } = React;
const DATA_URL = "https://ai-data.jonathan-libiran.workers.dev/data-ai.json";
const METRICS = [
  { key:"leads", label:"Leads", fmt:v=>Math.round(v).toLocaleString(), color:"#6366f1" },
  { key:"booked", label:"Bookings", fmt:v=>Math.round(v).toLocaleString(), color:"#0ea5e9" },
  { key:"canceled", label:"Canceled Jobs", fmt:v=>Math.round(v).toLocaleString(), color:"#f43f5e", invert:true },
  { key:"completed", label:"Completed Jobs", fmt:v=>Math.round(v).toLocaleString(), color:"#10b981" },
  { key:"revenue", label:"Revenue", fmt:v=>"$"+Math.round(v).toLocaleString(), color:"#f59e0b" },
  { key:"bookingRate", label:"Booking Rate", fmt:v=>(v*100).toFixed(1)+"%", color:"#8b5cf6" },
  { key:"cancelRate", label:"Cancel Rate", fmt:v=>(v*100).toFixed(1)+"%", color:"#ef4444", invert:true },
  { key:"conversionRate", label:"Conversion Rate", fmt:v=>(v*100).toFixed(1)+"%", color:"#14b8a6" },
  { key:"aov", label:"AOV", fmt:v=>"$"+Math.round(v).toLocaleString(), color:"#f97316" }
];
const CAT_COLORS = { Core:"#6366f1", Brand:"#0ea5e9", GBL:"#f59e0b", Referral:"#10b981", Other:"#94a3b8" };
const FALLBACK = [
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Atlanta", "Channel Category":"Core", leads:54, jobs_booked:12, canceled_jobs:2, invoiced_customer_price:4087, jobs_completed:9 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Austin", "Channel Category":"Core", leads:36, jobs_booked:13, canceled_jobs:0, invoiced_customer_price:5766, jobs_completed:10 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Dallas", "Channel Category":"Core", leads:86, jobs_booked:22, canceled_jobs:1, invoiced_customer_price:6318, jobs_completed:14 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Dallas", "Channel Category":"GBL", leads:8, jobs_booked:1, canceled_jobs:0, invoiced_customer_price:0, jobs_completed:0 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Dallas", "Channel Category":"Referral", leads:6, jobs_booked:3, canceled_jobs:0, invoiced_customer_price:0, jobs_completed:0 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Houston", "Channel Category":"Core", leads:53, jobs_booked:13, canceled_jobs:1, invoiced_customer_price:3884, jobs_completed:10 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Nashville", "Channel Category":"Core", leads:22, jobs_booked:9, canceled_jobs:1, invoiced_customer_price:3541, jobs_completed:7 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Orlando", "Channel Category":"Core", leads:21, jobs_booked:7, canceled_jobs:2, invoiced_customer_price:1885, jobs_completed:4 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"San Antonio", "Channel Category":"Core", leads:23, jobs_booked:6, canceled_jobs:1, invoiced_customer_price:2169, jobs_completed:5 },
  { Month:"2024-10-01T05:00:00.000Z", Week:"2024-09-30T05:00:00.000Z", Day:"2024-10-01T05:00:00.000Z", market:"Tampa", "Channel Category":"Core", leads:17, jobs_booked:5, canceled_jobs:2, invoiced_customer_price:1987, jobs_completed:4 }
];

function useViewport(){
  const gw=()=>typeof window!=="undefined"?window.innerWidth:1280;
  const [w,setW]=useState(gw());
  useEffect(()=>{const fn=()=>setW(gw());window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[]);
  return{isPhone:w<640,isTablet:w>=640&&w<1024};
}
function sumK(arr,k){return arr.reduce((a,r)=>a+(Number(r[k])||0),0);}
function aggregate(rows){
  const leads=sumK(rows,"leads"),booked=sumK(rows,"booked"),canceled=sumK(rows,"canceled"),completed=sumK(rows,"completed"),revenue=sumK(rows,"revenue");
  return{leads,booked,canceled,completed,revenue,bookingRate:leads?booked/leads:0,cancelRate:booked?canceled/booked:0,conversionRate:leads?completed/leads:0,aov:completed?revenue/completed:0};
}
function buildTimeSeries(rows,period){
  const groups={};
  rows.forEach(r=>{const key=period==="day"?(r.date||"").slice(0,10):period==="week"?(r.Week||"").slice(0,10):(r.Month||"").slice(0,7);if(!key)return;if(!groups[key])groups[key]=[];groups[key].push(r);});
  const keys=Object.keys(groups).sort().slice(period==="day"?-60:-12);
  return keys.map(k=>{const g=groups[k],leads=sumK(g,"leads"),booked=sumK(g,"booked"),canceled=sumK(g,"canceled"),completed=sumK(g,"completed"),revenue=sumK(g,"revenue");return{label:k,leads,booked,canceled,completed,revenue,bookingRate:leads?booked/leads:0,cancelRate:booked?canceled/booked:0,conversionRate:leads?completed/leads:0,aov:completed?revenue/completed:0};});
}
function buildChannelShareSeries(rows,period,metricKey){
  const timeKey=r=>period==="day"?(r.date||"").slice(0,10):period==="week"?(r.Week||"").slice(0,10):(r.Month||"").slice(0,7);
  const allKeys=[...new Set(rows.map(timeKey).filter(Boolean))].sort().slice(period==="day"?-60:-12);
  const channels=[...new Set(rows.map(r=>r.cat).filter(Boolean))].sort();
  const rawMap={};
  allKeys.forEach(t=>{rawMap[t]={};channels.forEach(c=>{rawMap[t][c]=[];});});
  rows.forEach(r=>{const t=timeKey(r);if(rawMap[t]&&r.cat&&rawMap[t][r.cat])rawMap[t][r.cat].push(r);});
  const series=allKeys.map(t=>{
    const point={label:t};
    const totalRows=Object.values(rawMap[t]).flat();
    const totalAgg=aggregate(totalRows);
    channels.forEach(c=>{const cRows=rawMap[t][c]||[];const cAgg=aggregate(cRows);const totalVal=totalAgg[metricKey]||0;point[c]=totalVal>0?(cAgg[metricKey]/totalVal)*100:0;});
    return point;
  });
  return{series,channels};
}
function fmtLabel(label,period){
  if(period==="day")return new Date(label+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
  if(period==="week")return"W"+new Date(label+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const[y,m]=label.split("-");return["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m,10)-1]+" '"+y.slice(2);
}
function mapRows(d){return d.map(r=>({date:r.Day||r.date||r.Month||"",Week:r.Week||r.Day||r.date||"",Month:r.Month||r.Day||r.date||"",market:r.market||"",cat:r["Channel Category"]||"Other",leads:Number(r.leads)||0,booked:Number(r.jobs_booked)||0,canceled:Number(r.canceled_jobs)||0,completed:Number(r.jobs_completed)||0,revenue:Number(r.invoiced_customer_price)||0}));}
function calcPacing(period){
  const now=new Date();
  if(period==="week"){const dow=now.getDay()===0?7:now.getDay();if(dow===7)return null;return{elapsed:dow,total:7,pct:dow/7,label:"Day "+dow+" of 7"};}
  if(period==="month"){const dom=now.getDate(),dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();if(dom===dim)return null;return{elapsed:dom,total:dim,pct:dom/dim,label:"Day "+dom+" of "+dim};}
  return null;
}
async function loadData(){
  for(const url of["/data.json",DATA_URL]){try{const r=await fetch(url);if(!r.ok)throw new Error(r.status);const d=JSON.parse(await r.text());if(!Array.isArray(d)||!d.length)throw new Error("empty");return d;}catch(e){console.error(url,e);}}
  throw new Error("all failed");
}

function Sparkline({data,metricKey,color}){
  const vals=data.map(d=>d[metricKey]||0);
  if(vals.length<2)return null;
  const min=Math.min(...vals),max=Math.max(...vals),range=max-min||1,w=80,h=28;
  const pts=vals.map((v,i)=>`${((i/(vals.length-1))*w).toFixed(1)},${(h-((v-min)/range)*h).toFixed(1)}`).join(" ");
  return React.createElement("svg",{width:w,height:h,style:{display:"block"}},React.createElement("polyline",{points:pts,fill:"none",stroke:color,strokeWidth:"1.5",strokeLinejoin:"round"}));
}

function MultiLineShareChart({data,channels,period,metricKey}){
  if(!data.length)return null;
  const W=680,H=230,pL=44,pB=36,pT=16,pR=16,cW=W-pL-pR,cH=H-pB-pT,n=data.length;
  const xP=i=>pL+(n>1?i/(n-1):0.5)*cW,yP=v=>pT+cH-(Math.min(Math.max(v,0),100)/100)*cH;
  const step=Math.ceil(n/10);
  const activeChannels=channels.filter(c=>data.some(d=>(d[c]||0)>0));
  return React.createElement("svg",{viewBox:`0 0 ${W} ${H}`,style:{width:"100%",height:"auto"}},
    React.createElement("defs",null,activeChannels.map(c=>React.createElement("linearGradient",{key:"g_"+c,id:"sg_"+c,x1:"0",y1:"0",x2:"0",y2:"1"},React.createElement("stop",{offset:"0%",stopColor:CAT_COLORS[c]||"#94a3b8",stopOpacity:"0.12"}),React.createElement("stop",{offset:"100%",stopColor:CAT_COLORS[c]||"#94a3b8",stopOpacity:"0.01"})))),
    [0,25,50,75,100].map(t=>{const y=pT+cH*(1-t/100);return React.createElement("g",{key:t},React.createElement("line",{x1:pL,x2:W-pR,y1:y,y2:y,stroke:"#e5e7eb",strokeWidth:"1"}),React.createElement("text",{x:pL-5,y:y+4,textAnchor:"end",fontSize:"9",fill:"#9ca3af"},t+"%"));}),
    activeChannels.map(c=>{const color=CAT_COLORS[c]||"#94a3b8",pts=data.map((d,i)=>xP(i).toFixed(1)+","+yP(d[c]||0).toFixed(1)).join(" ");const fillPts=xP(0).toFixed(1)+","+(pT+cH)+" "+pts+" "+xP(n-1).toFixed(1)+","+(pT+cH);return React.createElement("g",{key:c},React.createElement("polygon",{points:fillPts,fill:`url(#sg_${c})`}),React.createElement("polyline",{points:pts,fill:"none",stroke:color,strokeWidth:"2",strokeLinejoin:"round",strokeLinecap:"round"}));}),
    activeChannels.map(c=>data.map((d,i)=>React.createElement("circle",{key:c+"_"+i,cx:xP(i),cy:yP(d[c]||0),r:2.5,fill:CAT_COLORS[c]||"#94a3b8",stroke:"#fff",strokeWidth:"1"}))),
    data.map((d,i)=>i%step===0?React.createElement("text",{key:i,x:xP(i),y:H-4,textAnchor:"middle",fontSize:"9",fill:"#9ca3af"},fmtLabel(d.label,period)):null)
  );
}

function TrendChart({data,metricKey,metric,period,chartType,pacing}){
  const isRateOrAov=metricKey.includes("Rate")||metricKey==="aov";
  const vals=data.map((d,i)=>{const raw=d[metricKey]||0;if(i===data.length-1&&pacing&&!isRateOrAov&&(period==="week"||period==="month"))return raw/pacing.pct;return raw;});
  const actuals=data.map(d=>d[metricKey]||0);
  const hasProjection=pacing&&!isRateOrAov&&(period==="week"||period==="month");
  if(!vals.length)return null;
  const max=Math.max(...vals,1),W=680,H=210,pL=56,pB=36,pT=16,pR=16,cW=W-pL-pR,cH=H-pB-pT;
  const bW=Math.min(cW/vals.length-2,28),step=Math.ceil(vals.length/10),lastIdx=vals.length-1;
  const fmtY=v=>{if(metricKey==="revenue"||metricKey==="aov")return"$"+(v>=1000?(v/1000).toFixed(1)+"k":Math.round(v));if(metricKey.includes("Rate"))return(v*100).toFixed(0)+"%";return v>=1000?(v/1000).toFixed(1)+"k":Math.round(v).toString();};
  const xP=i=>pL+(i/(vals.length-1||1))*cW,yP=v=>pT+cH-(v/max)*cH,gId="lg_"+metricKey;
  return React.createElement("svg",{viewBox:`0 0 ${W} ${H}`,style:{width:"100%",height:"auto"}},
    [0,0.25,0.5,0.75,1].map(t=>{const y=pT+cH*(1-t);return React.createElement("g",{key:t},React.createElement("line",{x1:pL,x2:W-pR,y1:y,y2:y,stroke:"#e5e7eb",strokeWidth:"1"}),React.createElement("text",{x:pL-5,y:y+4,textAnchor:"end",fontSize:"10",fill:"#9ca3af"},fmtY(max*t)));}),
    chartType==="line"?React.createElement("g",null,
      React.createElement("defs",null,React.createElement("linearGradient",{id:gId,x1:"0",y1:"0",x2:"0",y2:"1"},React.createElement("stop",{offset:"0%",stopColor:metric.color,stopOpacity:"0.18"}),React.createElement("stop",{offset:"100%",stopColor:metric.color,stopOpacity:"0.01"}))),
      React.createElement("polygon",{points:xP(0).toFixed(1)+","+(pT+cH)+" "+vals.map((v,i)=>xP(i).toFixed(1)+","+yP(v).toFixed(1)).join(" ")+" "+xP(lastIdx).toFixed(1)+","+(pT+cH),fill:`url(#${gId})`}),
      React.createElement("polyline",{points:vals.map((v,i)=>xP(i).toFixed(1)+","+yP(v).toFixed(1)).join(" "),fill:"none",stroke:metric.color,strokeWidth:"2",strokeLinejoin:"round"}),
      hasProjection&&vals.length>1?React.createElement("line",{x1:xP(lastIdx-1).toFixed(1),y1:yP(actuals[lastIdx-1]).toFixed(1),x2:xP(lastIdx).toFixed(1),y2:yP(vals[lastIdx]).toFixed(1),stroke:metric.color,strokeWidth:"2",strokeDasharray:"5,4",opacity:"0.7"}):null,
      vals.map((v,i)=>React.createElement("circle",{key:i,cx:xP(i),cy:yP(v),r:i===lastIdx&&hasProjection?4:3,fill:i===lastIdx&&hasProjection?"#3b82f6":metric.color,stroke:"#fff",strokeWidth:"1.5"})),
      hasProjection?React.createElement("g",null,React.createElement("rect",{x:xP(lastIdx)-28,y:yP(vals[lastIdx])-22,width:56,height:16,rx:"4",fill:"#3b82f6"}),React.createElement("text",{x:xP(lastIdx),y:yP(vals[lastIdx])-11,textAnchor:"middle",fontSize:"9",fill:"#fff",fontWeight:"700"},"▲ "+fmtY(vals[lastIdx]))):null,
      vals.map((v,i)=>i%step===0?React.createElement("text",{key:i,x:xP(i),y:H-4,textAnchor:"middle",fontSize:"9",fill:"#9ca3af"},fmtLabel(data[i].label,period)):null)
    ):React.createElement("g",null,
      vals.map((v,i)=>{const x=pL+(i/vals.length)*cW+cW/vals.length/2,bH=Math.max((v/max)*cH,0),y=pT+cH-bH,isProj=i===lastIdx&&hasProjection;return React.createElement("g",{key:i},React.createElement("rect",{x:x-bW/2,y,width:bW,height:bH,rx:"3",fill:isProj?"#3b82f6":metric.color,opacity:isProj?1:0.85}),isProj?React.createElement("g",null,React.createElement("rect",{x:x-28,y:y-20,width:56,height:16,rx:"4",fill:"#3b82f6"}),React.createElement("text",{x,y:y-9,textAnchor:"middle",fontSize:"9",fill:"#fff",fontWeight:"700"},"▲ "+fmtY(v))):null,i%step===0?React.createElement("text",{x,y:H-4,textAnchor:"middle",fontSize:"9",fill:"#9ca3af"},fmtLabel(data[i].label,period)):null);})
    )
  );
}

function FunnelChart({curr,prev,isPhone,period}){
  const steps=[{key:"leads",label:"Leads",color:"#6366f1"},{key:"booked",label:"Booked",color:"#0ea5e9"},{key:"completed",label:"Completed",color:"#10b981"}];
  const maxVal=Math.max(curr.leads||1,1),periodLabel=period==="day"?"day":period==="week"?"week":"month";
  return React.createElement("div",{style:{background:"#fff",borderRadius:12,padding:isPhone?"12px 12px 16px":"16px 18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}},
    React.createElement("div",{style:{fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16}},"Conversion Funnel — Current "+periodLabel),
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      steps.map((step,si)=>{
        const val=curr[step.key]||0,pct=maxVal?val/maxVal:0,prevVal=prev[step.key]||0;
        const dropPct=si>0&&(curr[steps[si-1].key]||0)>0?((val/(curr[steps[si-1].key]||1))*100).toFixed(1):null;
        const change=prevVal?((val-prevVal)/prevVal*100):0,good=change>=0;
        return React.createElement("div",{key:step.key},
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:step.color,flexShrink:0}}),
              React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"#111827"}},step.label),
              dropPct!==null?React.createElement("span",{style:{fontSize:11,color:"#9ca3af",marginLeft:2}},"("+dropPct+"% of prev)"):null
            ),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"#111827"}},Math.round(val).toLocaleString()),
              prevVal>0?React.createElement("span",{style:{fontSize:11,fontWeight:600,color:good?"#10b981":"#f43f5e",background:good?"#ecfdf5":"#fff1f2",padding:"1px 6px",borderRadius:20,whiteSpace:"nowrap"}},(good?"▲":"▼")+Math.abs(change).toFixed(1)+"%"):null
            )
          ),
          React.createElement("div",{style:{position:"relative",height:10,background:"#f1f5f9",borderRadius:6,overflow:"hidden"}},
            React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:(pct*100)+"%",background:step.color,borderRadius:6}}),
            prevVal>0?React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:((maxVal?prevVal/maxVal:0)*100)+"%",background:"none",borderRight:"2px dashed "+step.color,opacity:0.4}}):null
          )
        );
      })
    )
  );
}

function ComparisonChart({curr,prev,isPhone,period}){
  const KPIs=[{key:"leads",label:"Leads",color:"#6366f1"},{key:"booked",label:"Bookings",color:"#0ea5e9"},{key:"completed",label:"Completed",color:"#10b981"},{key:"revenue",label:"Revenue",color:"#f59e0b"},{key:"bookingRate",label:"Booking Rate",color:"#8b5cf6"},{key:"conversionRate",label:"Conv. Rate",color:"#14b8a6"}];
  const periodLabel=period==="day"?"day":period==="week"?"week":"month";
  const W=560,H=220,pL=16,pR=16,pT=16,pB=32,cW=W-pL-pR,cH=H-pT-pB,n=KPIs.length,groupW=cW/n,bW=Math.min(groupW*0.32,22),gap=bW*0.6;
  const xCenter=i=>pL+i*groupW+groupW/2;
  return React.createElement("div",{style:{background:"#fff",borderRadius:12,padding:isPhone?"12px 12px 16px":"16px 18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}},
      React.createElement("div",{style:{fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em"}},"Current vs Prior Period — Core KPIs"),
      React.createElement("div",{style:{display:"flex",gap:14,fontSize:11}},
        React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},React.createElement("span",{style:{width:10,height:10,borderRadius:2,background:"#6366f1",display:"inline-block"}}),React.createElement("span",{style:{color:"#6b7280",fontWeight:600}},"Current "+periodLabel)),
        React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},React.createElement("span",{style:{width:10,height:10,borderRadius:2,background:"#e5e7eb",border:"1.5px dashed #9ca3af",display:"inline-block"}}),React.createElement("span",{style:{color:"#9ca3af",fontWeight:600}},"Prior "+periodLabel))
      )
    ),
    React.createElement("svg",{viewBox:`0 0 ${W} ${H}`,style:{width:"100%",height:"auto"}},
      [0,0.5,1].map(t=>{const y=pT+cH*(1-t);return React.createElement("g",{key:t},React.createElement("line",{x1:pL,x2:W-pR,y1:y,y2:y,stroke:"#f1f5f9",strokeWidth:"1"}));}),
      KPIs.map((kpi,i)=>{
        const cx=xCenter(i),cVal=curr[kpi.key]||0,pVal=prev[kpi.key]||0,localMax=Math.max(cVal,pVal,1);
        const cH2=Math.max((cVal/localMax)*cH,0),pH2=Math.max((pVal/localMax)*cH,0);
        const cy=pT+cH-cH2,py=pT+cH-pH2,change=pVal?((cVal-pVal)/pVal*100):0,good=change>=0;
        return React.createElement("g",{key:kpi.key},
          React.createElement("rect",{x:cx-gap/2-bW,y:py,width:bW,height:pH2,rx:"3",fill:"#e5e7eb",opacity:0.8}),
          React.createElement("rect",{x:cx+gap/2,y:cy,width:bW,height:cH2,rx:"3",fill:kpi.color,opacity:0.9}),
          React.createElement("text",{x:cx,y:H-4,textAnchor:"middle",fontSize:"9",fill:"#9ca3af"},kpi.label),
          pVal>0?React.createElement("text",{x:cx,y:Math.min(cy,py)-5,textAnchor:"middle",fontSize:"8.5",fill:good?"#10b981":"#f43f5e",fontWeight:"700"},(good?"▲":"▼")+Math.abs(change).toFixed(1)+"%"):null
        );
      })
    )
  );
}

function ChatOverlay({open, onClose, rawData, period, market, chanCat}){
  const [chatHistory,setChatHistory]=useState([]);
  const [userQuestion,setUserQuestion]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const messagesEndRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{if(open&&inputRef.current)setTimeout(()=>inputRef.current&&inputRef.current.focus(),120);},[open]);
  useEffect(()=>{if(messagesEndRef.current)messagesEndRef.current.scrollIntoView({behavior:"smooth"});},[chatHistory,aiLoading]);

  function sumK2(arr,k){return arr.reduce((a,r)=>a+(Number(r[k])||0),0);}
  function aggregate2(rows){const leads=sumK2(rows,"leads"),booked=sumK2(rows,"booked"),canceled=sumK2(rows,"canceled"),completed=sumK2(rows,"completed"),revenue=sumK2(rows,"revenue");return{leads,booked,canceled,completed,revenue,bookingRate:leads?booked/leads:0,cancelRate:booked?canceled/booked:0,conversionRate:leads?completed/leads:0,aov:completed?revenue/completed:0};}
  function getFilteredRows(rows,m,c){return rows.filter(r=>(m==="All Markets"||r.market===m)&&(c==="All Channels"||r.cat===c));}
  function aggregateSeriesByToggle(rows,p){
    const np=p==="week"?"week":"month",groups={};
    rows.forEach(r=>{const key=np==="week"?(r.Week||"").slice(0,10):(r.Month||"").slice(0,7);if(!key)return;if(!groups[key])groups[key]=[];groups[key].push(r);});
    return Object.keys(groups).sort().map(key=>{const g=groups[key],leads=sumK2(g,"leads"),booked=sumK2(g,"booked"),canceled=sumK2(g,"canceled"),completed=sumK2(g,"completed"),revenue=sumK2(g,"revenue");return{label:key,leads,booked,canceled,completed,revenue,bookingRate:leads?booked/leads:0,cancelRate:booked?canceled/booked:0,conversionRate:leads?completed/leads:0,aov:completed?revenue/completed:0};});
  }
  function buildSeriesBreakdown2(rows,p,groupKey){
    const np=p==="week"?"week":"month",grouped={};
    rows.forEach(r=>{const group=r[groupKey]||"Unknown",timeKey=np==="week"?(r.Week||"").slice(0,10):(r.Month||"").slice(0,7);if(!timeKey)return;if(!grouped[group])grouped[group]={};if(!grouped[group][timeKey])grouped[group][timeKey]=[];grouped[group][timeKey].push(r);});
    return Object.keys(grouped).sort().map(group=>{const points=Object.keys(grouped[group]).sort().map(label=>{const g=grouped[group][label],leads=sumK2(g,"leads"),booked=sumK2(g,"booked"),canceled=sumK2(g,"canceled"),completed=sumK2(g,"completed"),revenue=sumK2(g,"revenue");return{label,leads,booked,canceled,completed,revenue,bookingRate:leads?booked/leads:0,cancelRate:booked?canceled/booked:0,conversionRate:leads?completed/leads:0,aov:completed?revenue/completed:0};});return{group,points};});
  }
  function shouldUseFull(q){return["overall","all markets","all channels","full dataset","entire dataset","whole dataset","company-wide","across all markets","across all channels","national","global view","total business","entire business"].some(t=>(q||"").toLowerCase().includes(t));}

  const sendMessage=useCallback(question=>{
    if(aiLoading||!question.trim())return;
    setAiLoading(true);
    const useAll=shouldUseFull(question),am=useAll?"All Markets":market,ac=useAll?"All Channels":chanCat;
    const fr=getFilteredRows(rawData,am,ac),s=aggregateSeriesByToggle(fr,period),o=aggregate2(fr);
    const byMkt=am==="All Markets"&&ac==="All Channels"?buildSeriesBreakdown2(fr,period,"market"):null;
    const byCh=am==="All Markets"&&ac==="All Channels"?buildSeriesBreakdown2(fr,period,"cat"):null;
    const sys=`You are a business analyst for NuBrakes. Source of truth: Period:${period}, Market:${am}, Channel:${ac}. Be concise and quantitative.\nOverall: ${JSON.stringify(o)}\nSeries: ${JSON.stringify(s)}\n${byMkt?"By market: "+JSON.stringify(byMkt)+"\n":""}${byCh?"By channel: "+JSON.stringify(byCh)+"\n":""}`;
    setChatHistory(h=>[...h,{role:"user",text:question}]);
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:[{role:"user",content:"Question: "+question+"\n\nAnswer clearly and concisely."}]})})
      .then(r=>r.json()).then(d=>{const t=(d.content||[]).map(c=>c.text||"").join("");setChatHistory(h=>[...h,{role:"assistant",text:t||"No response."}]);setAiLoading(false);})
      .catch(err=>{setChatHistory(h=>[...h,{role:"assistant",text:"Error: "+err.message}]);setAiLoading(false);});
  },[aiLoading,rawData,period,market,chanCat]);

  if(!open)return null;

  return React.createElement("div",{style:{position:"fixed",bottom:88,right:20,width:360,maxWidth:"calc(100vw - 40px)",zIndex:1000,animation:"slideUp 0.22s ease"}},
    React.createElement("div",{style:{background:"#fff",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb",display:"flex",flexDirection:"column",overflow:"hidden",maxHeight:"70vh"}},
      React.createElement("div",{style:{padding:"12px 16px",background:"#111827",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
          React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:"#10b981"}}),
          React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"#fff"}},"AI Insights"),
          React.createElement("span",{style:{fontSize:11,color:"#6b7280",marginLeft:2}},period+" · "+market)
        ),
        React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center"}},
          chatHistory.length>0?React.createElement("button",{onClick:()=>setChatHistory([]),style:{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#6b7280",padding:"2px 6px",borderRadius:4},"title":"Clear chat"},"Clear"):null,
          React.createElement("button",{onClick:onClose,style:{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,cursor:"pointer",color:"#fff",fontSize:16,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}},"×")
        )
      ),
      React.createElement("div",{style:{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10,minHeight:160}},
        chatHistory.length===0?React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8,marginTop:8}},
          React.createElement("p",{style:{fontSize:12,color:"#9ca3af",margin:0,textAlign:"center",marginBottom:4}},"Ask anything about your data"),
          ["What's the top performing market?","How is revenue trending?","Which channel has the best conversion rate?"].map(q=>React.createElement("button",{key:q,onClick:()=>{setUserQuestion("");sendMessage(q);},style:{background:"#f8fafc",border:"1px solid #e5e7eb",borderRadius:8,padding:"7px 12px",fontSize:12,color:"#374151",cursor:"pointer",textAlign:"left",lineHeight:1.4}},q))
        ):null,
        chatHistory.map((msg,i)=>{
          const isUser=msg.role==="user";
          return React.createElement("div",{key:i,style:{display:"flex",justifyContent:isUser?"flex-end":"flex-start"}},
            React.createElement("div",{style:{maxWidth:"88%",padding:"8px 12px",borderRadius:12,fontSize:12,lineHeight:1.65,whiteSpace:"pre-wrap",background:isUser?"#6366f1":"#f1f5f9",color:isUser?"#fff":"#374151",borderBottomRightRadius:isUser?2:12,borderBottomLeftRadius:isUser?12:2}},msg.text)
          );
        }),
        aiLoading?React.createElement("div",{style:{display:"flex",justifyContent:"flex-start"}},
          React.createElement("div",{style:{padding:"8px 12px",borderRadius:12,background:"#f1f5f9",fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",gap:6}},
            React.createElement("div",{style:{width:14,height:14,border:"2px solid #d1d5db",borderTop:"2px solid #6366f1",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}),
            "Thinking..."
          )
        ):null,
        React.createElement("div",{ref:messagesEndRef})
      ),
      React.createElement("div",{style:{padding:"10px 12px",borderTop:"1px solid #f1f5f9",flexShrink:0,display:"flex",gap:8,background:"#fff"}},
        React.createElement("input",{ref:inputRef,type:"text",value:userQuestion,onChange:e=>setUserQuestion(e.target.value),onKeyDown:e=>{if(e.key==="Enter"&&userQuestion.trim()&&!aiLoading){const q=userQuestion.trim();setUserQuestion("");sendMessage(q);}},placeholder:"Ask a question...",style:{flex:1,padding:"8px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:12,color:"#374151",outline:"none",background:"#f8fafc"}}),
        React.createElement("button",{onClick:()=>{if(userQuestion.trim()&&!aiLoading){const q=userQuestion.trim();setUserQuestion("");sendMessage(q);}},disabled:aiLoading||!userQuestion.trim(),style:{padding:"8px 12px",borderRadius:8,border:"none",background:"#6366f1",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",opacity:(aiLoading||!userQuestion.trim())?0.45:1,flexShrink:0}},
          React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"},React.createElement("line",{x1:"22",y1:"2",x2:"11",y2:"13"}),React.createElement("polygon",{points:"22 2 15 22 11 13 2 9 22 2"}))
        )
      )
    )
  );
}

const baseCardStyle={background:"#fff",borderRadius:12,padding:"16px 18px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9"};

function Dashboard(){
  const {isPhone,isTablet}=useViewport();
  const [rawData,setRawData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [usingFallback,setUsingFallback]=useState(false);
  const [period,setPeriod]=useState("day");
  const [market,setMarket]=useState("All Markets");
  const [chanCat,setChanCat]=useState("All Channels");
  const [tab,setTab]=useState("overview");
  const [trendKey,setTrendKey]=useState("revenue");
  const [chartType,setChartType]=useState("line");
  const [trendView,setTrendView]=useState("absolute");
  const [chatOpen,setChatOpen]=useState(false);

  useEffect(()=>{loadData().then(d=>{setRawData(mapRows(d));setUsingFallback(false);setLoading(false);}).catch(()=>{setRawData(mapRows(FALLBACK));setUsingFallback(true);setLoading(false);});},[]);

  const markets=useMemo(()=>{const s={};rawData.forEach(r=>{if(r.market)s[r.market]=1;});return Object.keys(s).sort();},[rawData]);
  const chanCats=useMemo(()=>{const s={};rawData.forEach(r=>{if(r.cat)s[r.cat]=1;});return Object.keys(s).sort();},[rawData]);
  const filtered=useMemo(()=>rawData.filter(r=>(market==="All Markets"||r.market===market)&&(chanCat==="All Channels"||r.cat===chanCat)),[rawData,market,chanCat]);
  const series=useMemo(()=>buildTimeSeries(filtered,period),[filtered,period]);
  const channelShareData=useMemo(()=>buildChannelShareSeries(market==="All Markets"&&chanCat==="All Channels"?rawData:filtered,period,trendKey),[rawData,filtered,market,chanCat,period,trendKey]);

  const getRowsForLabel=useCallback(label=>filtered.filter(r=>{const key=period==="day"?r.date.slice(0,10):period==="week"?r.Week.slice(0,10):r.Month.slice(0,7);return key===label;}),[filtered,period]);
  const curr=useMemo(()=>{if(!series.length)return{};return aggregate(getRowsForLabel(series[series.length-1].label));},[series,getRowsForLabel]);
  const prev=useMemo(()=>{if(series.length<2)return{};return aggregate(getRowsForLabel(series[series.length-2].label));},[series,getRowsForLabel]);
  const pacing=useMemo(()=>calcPacing(period),[period]);
  const pct=(c,p)=>p?((c-p)/p)*100:0;
  const periodLabel=period==="day"?"Last 60 Days":period==="week"?"Last 12 Weeks":"Last 12 Months";
  const isRateOrAov=key=>key.includes("Rate")||key==="aov";
  const selMetric=METRICS.find(m=>m.key===trendKey)||METRICS[0];

  const overviewLabel=useMemo(()=>{
    if(!series.length)return"";
    const latest=series[series.length-1].label;
    if(period==="day")return new Date(latest+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    if(period==="week"){const s=new Date(latest+"T12:00:00"),e=new Date(s);e.setDate(e.getDate()+6);return s.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" – "+e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
    return new Date(latest+"-01T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
  },[series,period]);

  const activeChannels=channelShareData.channels.filter(c=>channelShareData.series.some(d=>(d[c]||0)>0));

  if(loading)return React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#6b7280",flexDirection:"column",gap:12}},
    React.createElement("div",{style:{width:32,height:32,border:"3px solid #e5e7eb",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin 1s linear infinite"}}),
    React.createElement("span",null,"Loading live data...")
  );

  const containerStyle={fontFamily:"system-ui,sans-serif",background:"#f8fafc",minHeight:"100vh",padding:isPhone?"12px":isTablet?"16px":"20px 16px"};
  const selectStyle={padding:"9px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,color:"#374151",background:"#fff",cursor:"pointer",minWidth:isPhone?"100%":150,width:isPhone?"100%":"auto",maxWidth:"100%"};

  const pacingBanner=pacing&&(period==="week"||period==="month")?React.createElement("div",{style:{marginBottom:16,padding:"10px 16px",borderRadius:10,background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}},
    React.createElement("span",{style:{fontSize:16}},"📈"),
    React.createElement("div",null,
      React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#1d4ed8"}},(period==="week"?"Week":"Month")+" Pacing · "+pacing.label+" · "+(pacing.pct*100).toFixed(0)+"% elapsed"),
      React.createElement("span",{style:{fontSize:11,color:"#3b82f6",marginLeft:8}},"Projected values shown on each metric card")
    ),
    React.createElement("div",{style:{marginLeft:"auto",background:"#dbeafe",borderRadius:20,padding:"2px 10px"}},React.createElement("span",{style:{fontSize:11,fontWeight:700,color:"#1d4ed8"}},(pacing.pct*100).toFixed(0)+"%"))
  ):null;

  return React.createElement("div",{style:containerStyle},
    React.createElement("div",{style:{maxWidth:1240,margin:"0 auto"}},
      React.createElement("div",{style:{marginBottom:20}},
        React.createElement("h1",{style:{margin:0,fontSize:isPhone?18:20,fontWeight:700,color:"#111827"}},"KPI Dashboard"),
        React.createElement("p",{style:{margin:"3px 0 0",fontSize:isPhone?11:12,color:"#6b7280"}},"NuBrakes · "+market+" · "+chanCat+" · "+(tab==="overview"?overviewLabel:periodLabel)),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginTop:6}},
          React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:usingFallback?"#fff7ed":"#ecfdf5",border:"1px solid "+(usingFallback?"#fed7aa":"#6ee7b7")}},
            React.createElement("div",{style:{width:6,height:6,borderRadius:"50%",background:usingFallback?"#f97316":"#10b981"}}),
            React.createElement("span",{style:{fontSize:11,fontWeight:600,color:usingFallback?"#c2410c":"#065f46"}},usingFallback?"Sample Data":"Live Data")
          ),
          usingFallback?React.createElement("span",{style:{fontSize:11,color:"#c2410c"}},"⚠️ Live data unavailable"):null
        )
      ),
      React.createElement("div",{style:{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",alignItems:"center"}},
        ["day","week","month"].map(p=>React.createElement("button",{key:p,onClick:()=>setPeriod(p),style:{padding:"6px 16px",borderRadius:20,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:period===p?"#111827":"#fff",color:period===p?"#fff":"#6b7280",boxShadow:period===p?"none":"0 1px 3px rgba(0,0,0,0.08)"}},p.charAt(0).toUpperCase()+p.slice(1))),
        React.createElement("select",{value:market,onChange:e=>setMarket(e.target.value),style:selectStyle},React.createElement("option",null,"All Markets"),...markets.map(m=>React.createElement("option",{key:m},m))),
        React.createElement("select",{value:chanCat,onChange:e=>setChanCat(e.target.value),style:selectStyle},React.createElement("option",null,"All Channels"),...chanCats.map(c=>React.createElement("option",{key:c},c)))
      ),
      React.createElement("div",{style:{display:"flex",marginBottom:22,borderBottom:"1.5px solid #e5e7eb",overflowX:"auto"}},
        [["overview","Overview"],["trends","Trends"]].map(([t,label])=>React.createElement("button",{key:t,onClick:()=>setTab(t),style:{padding:"8px 20px",border:"none",background:"none",fontSize:13,fontWeight:600,cursor:"pointer",color:tab===t?"#111827":"#9ca3af",borderBottom:tab===t?"2px solid #111827":"2px solid transparent",marginBottom:-1.5,whiteSpace:"nowrap"}},label))
      ),

      tab==="overview"&&React.createElement("div",null,
        pacingBanner,
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isPhone?"1fr":isTablet?"repeat(2, minmax(0,1fr))":"repeat(auto-fill,minmax(190px,1fr))",gap:12,marginBottom:20}},
          METRICS.map(m=>{const c=curr[m.key]||0,p=prev[m.key]||0,change=pct(c,p),good=m.invert?change<=0:change>=0,projected=pacing&&!isRateOrAov(m.key)?c/pacing.pct:null;
            return React.createElement("div",{key:m.key,style:{...baseCardStyle,padding:"14px 16px"}},
              React.createElement("div",{style:{fontSize:10,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}},m.label),
              React.createElement("div",{style:{fontSize:22,fontWeight:700,color:"#111827",marginBottom:8}},m.fmt(c)),
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:8}},
                React.createElement("span",{style:{fontSize:11,fontWeight:600,color:good?"#10b981":"#f43f5e",background:good?"#ecfdf5":"#fff1f2",padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}},(good?"▲":"▼")+" "+Math.abs(change).toFixed(1)+"%"),
                React.createElement(Sparkline,{data:series,metricKey:m.key,color:m.color})
              ),
              projected?React.createElement("div",{style:{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}},React.createElement("span",{style:{fontSize:10,color:"#9ca3af"}},"Projected"),React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#3b82f6"}},m.fmt(projected))):null
            );
          })
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isPhone?"1fr":isTablet?"1fr":"repeat(2,minmax(0,1fr))",gap:16}},
          React.createElement(FunnelChart,{curr,prev,isPhone,period}),
          React.createElement(ComparisonChart,{curr,prev,isPhone,period})
        )
      ),

      tab==="trends"&&React.createElement("div",null,
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:isPhone?"stretch":"center",flexDirection:isPhone?"column":"row",gap:12,marginBottom:16}},
          React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
            METRICS.map(m=>React.createElement("button",{key:m.key,onClick:()=>setTrendKey(m.key),style:{padding:"5px 13px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:"1.5px solid "+(trendKey===m.key?m.color:"#e5e7eb"),background:trendKey===m.key?m.color:"#fff",color:trendKey===m.key?"#fff":"#6b7280"}},m.label))
          ),
          React.createElement("div",{style:{display:"flex",gap:4,background:"#f1f5f9",borderRadius:8,padding:3}},
            [["line","╱ Line"],["bar","▬ Bar"]].map(([t,lbl])=>React.createElement("button",{key:t,onClick:()=>setChartType(t),style:{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:chartType===t?"#fff":"transparent",color:chartType===t?"#111827":"#9ca3af",boxShadow:chartType===t?"0 1px 3px rgba(0,0,0,0.1)":"none"}},lbl))
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:4,background:"#f1f5f9",borderRadius:8,padding:3,marginBottom:16,width:"fit-content"}},
          [["absolute","Absolute"],["share","% Share by Channel"]].map(([v,lbl])=>React.createElement("button",{key:v,onClick:()=>setTrendView(v),style:{padding:"5px 14px",borderRadius:6,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:trendView===v?"#fff":"transparent",color:trendView===v?"#111827":"#9ca3af",boxShadow:trendView===v?"0 1px 3px rgba(0,0,0,0.1)":"none",whiteSpace:"nowrap"}},lbl))
        ),
        trendView==="absolute"&&React.createElement("div",null,
          React.createElement("div",{style:{...baseCardStyle,marginBottom:12}},
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:2}},selMetric.label+" — "+periodLabel),
            React.createElement("div",{style:{fontSize:11,color:"#9ca3af",marginBottom:14}},market+" · "+chanCat),
            React.createElement(TrendChart,{data:series,metricKey:trendKey,metric:selMetric,period,chartType,pacing})
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:isPhone?"repeat(2,minmax(0,1fr))":"repeat(auto-fill,minmax(140px,1fr))",gap:10}},
            ["Peak","Average","Latest","Projected"].map((lbl,li)=>{const vals=series.map(d=>d[trendKey]||0),latest2=vals.length?vals[vals.length-1]:0;let v=null;if(li===0)v=vals.length?Math.max(...vals):0;else if(li===1)v=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;else if(li===2)v=latest2;else{if(!pacing||(period!=="week"&&period!=="month")||isRateOrAov(trendKey))return null;v=latest2/pacing.pct;}return React.createElement("div",{key:lbl,style:{...baseCardStyle,borderTop:li===3?"2px solid #3b82f6":""}},React.createElement("div",{style:{fontSize:10,color:li===3?"#3b82f6":"#9ca3af",fontWeight:600,textTransform:"uppercase",marginBottom:4}},lbl+(li===3&&pacing?" ("+(pacing.pct*100).toFixed(0)+"%)":"")),React.createElement("div",{style:{fontSize:isPhone?18:20,fontWeight:700,color:li===3?"#3b82f6":selMetric.color}},v!==null?selMetric.fmt(v):"—"));})
          )
        ),
        trendView==="share"&&React.createElement("div",{style:{...baseCardStyle,padding:"16px 18px 20px"}},
          React.createElement("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#111827",marginBottom:2}},selMetric.label+" — % Share by Channel"),
              React.createElement("div",{style:{fontSize:11,color:"#9ca3af"}},periodLabel+" · "+market)
            ),
            React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:10}},
              activeChannels.map(c=>React.createElement("span",{key:c,style:{display:"flex",alignItems:"center",gap:5,fontSize:12}},
                React.createElement("span",{style:{width:24,height:3,borderRadius:2,background:CAT_COLORS[c]||"#94a3b8",display:"inline-block"}}),
                React.createElement("span",{style:{color:"#374151",fontWeight:600}},c)
              ))
            )
          ),
          React.createElement(MultiLineShareChart,{data:channelShareData.series,channels:channelShareData.channels,period,metricKey:trendKey}),
          activeChannels.length>0?React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginTop:16}},
            activeChannels.map(c=>{
              const vals=channelShareData.series.map(d=>d[c]||0),latest=vals.length?vals[vals.length-1]:0,prev2=vals.length>1?vals[vals.length-2]:0,chg=prev2?((latest-prev2)/prev2*100):0,good=chg>=0;
              return React.createElement("div",{key:c,style:{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #f1f5f9"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:4}},React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[c]||"#94a3b8"}}),React.createElement("span",{style:{fontSize:11,fontWeight:600,color:"#6b7280"}},c)),
                React.createElement("div",{style:{fontSize:18,fontWeight:700,color:"#111827"}},latest.toFixed(1)+"%"),
                React.createElement("div",{style:{fontSize:11,fontWeight:600,color:good?"#10b981":"#f43f5e",marginTop:2}},(good?"▲":"▼")+Math.abs(chg).toFixed(1)+"% vs prior")
              );
            })
          ):null
        )
      )
    ),

    React.createElement(ChatOverlay,{open:chatOpen,onClose:()=>setChatOpen(false),rawData,period,market,chanCat}),

    React.createElement("button",{
      className:"chat-bubble-btn",
      onClick:()=>setChatOpen(o=>!o),
      style:{position:"fixed",bottom:20,right:20,width:52,height:52,borderRadius:"50%",background:chatOpen?"#374151":"#111827",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.22)",zIndex:1001,transition:"background 0.2s"}
    },
      chatOpen
        ? React.createElement("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"#fff",strokeWidth:"2.5",strokeLinecap:"round"},React.createElement("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),React.createElement("line",{x1:"6",y1:"6",x2:"18",y2:"18"}))
        : React.createElement("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"#fff",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"},React.createElement("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}))
    )
  );
}

ReactDOM.render(React.createElement(Dashboard), document.getElementById('dashboard-root'));
