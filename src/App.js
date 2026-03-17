import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

const DATA_URL = "https://ai-data.jonathan-libiran.workers.dev/data-ai.json";
const AI_MODEL = "gpt-4.1";
const AI_ENDPOINT = "/api/ai";

const METRICS = [
  { key: "leads", label: "Leads", fmt: v => Math.round(v).toLocaleString(), color: "#6366f1" },
  { key: "booked", label: "Bookings", fmt: v => Math.round(v).toLocaleString(), color: "#0ea5e9" },
  { key: "canceled", label: "Canceled Jobs", fmt: v => Math.round(v).toLocaleString(), color: "#f43f5e", invert: true },
  { key: "completed", label: "Completed Jobs", fmt: v => Math.round(v).toLocaleString(), color: "#10b981" },
  { key: "revenue", label: "Revenue", fmt: v => "$" + Math.round(v).toLocaleString(), color: "#f59e0b" },
  { key: "bookingRate", label: "Booking Rate", fmt: v => (v * 100).toFixed(1) + "%", color: "#8b5cf6" },
  { key: "cancelRate", label: "Cancel Rate", fmt: v => (v * 100).toFixed(1) + "%", color: "#ef4444", invert: true },
  { key: "conversionRate", label: "Conversion Rate", fmt: v => (v * 100).toFixed(1) + "%", color: "#14b8a6" },
  { key: "aov", label: "AOV", fmt: v => "$" + Math.round(v).toLocaleString(), color: "#f97316" }
];

const SHARE_INCOMPATIBLE = new Set(["bookingRate", "cancelRate", "conversionRate", "aov"]);
const ADDITIVE_METRICS = new Set(["leads", "booked", "canceled", "completed", "revenue"]);

const CAT_COLORS = {
  Core: "#6366f1",
  Brand: "#0ea5e9",
  GBL: "#f59e0b",
  Referral: "#10b981",
  Other: "#94a3b8"
};

const FALLBACK = [
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Atlanta", "Channel Category": "Core", leads: 54, jobs_booked: 12, canceled_jobs: 2, invoiced_customer_price: 4087, jobs_completed: 9 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Austin", "Channel Category": "Core", leads: 36, jobs_booked: 13, canceled_jobs: 0, invoiced_customer_price: 5766, jobs_completed: 10 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Dallas", "Channel Category": "Core", leads: 86, jobs_booked: 22, canceled_jobs: 1, invoiced_customer_price: 6318, jobs_completed: 14 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Dallas", "Channel Category": "GBL", leads: 8, jobs_booked: 1, canceled_jobs: 0, invoiced_customer_price: 0, jobs_completed: 0 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Dallas", "Channel Category": "Referral", leads: 6, jobs_booked: 3, canceled_jobs: 0, invoiced_customer_price: 0, jobs_completed: 0 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Houston", "Channel Category": "Core", leads: 53, jobs_booked: 13, canceled_jobs: 1, invoiced_customer_price: 3884, jobs_completed: 10 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Nashville", "Channel Category": "Core", leads: 22, jobs_booked: 9, canceled_jobs: 1, invoiced_customer_price: 3541, jobs_completed: 7 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Orlando", "Channel Category": "Core", leads: 21, jobs_booked: 7, canceled_jobs: 2, invoiced_customer_price: 1885, jobs_completed: 4 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "San Antonio", "Channel Category": "Core", leads: 23, jobs_booked: 6, canceled_jobs: 1, invoiced_customer_price: 2169, jobs_completed: 5 },
  { Month: "2024-10-01T05:00:00.000Z", Week: "2024-09-30T05:00:00.000Z", Day: "2024-10-01T05:00:00.000Z", market: "Tampa", "Channel Category": "Core", leads: 17, jobs_booked: 5, canceled_jobs: 2, invoiced_customer_price: 1987, jobs_completed: 4 }
];

//vs TARGET TAB
const TARGET_DATA = [
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "core", value: 495 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "gbl", value: 477 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "brand", value: 478 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "referral", value: 473 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "fleet", value: 552 },
  { month_start: "2026-08-01", month_label: "Aug-26 F", metric: "aov", segment: "total", value: 494 },

  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "core", value: 496 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "gbl", value: 477 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "brand", value: 481 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "referral", value: 473 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "fleet", value: 548 },
  { month_start: "2026-09-01", month_label: "Sep-26 F", metric: "aov", segment: "total", value: 493 }

  // add the rest of your target rows here:
  // revenue, leads, completed, aov
  // segments: core, gbl, brand, referral, fleet, total
];

const VS_TARGET_CHANNELS = ["Core", "GBL", "Brand", "Referral", "Fleet"];
const SEGMENT_TO_CAT = {
  core: "Core",
  gbl: "GBL",
  brand: "Brand",
  referral: "Referral",
  fleet: "Fleet",
  total: "Total"
};
const CAT_TO_SEGMENT = {
  Core: "core",
  GBL: "gbl",
  Brand: "brand",
  Referral: "referral",
  Fleet: "fleet",
  Total: "total"
};

function fmtMoneyCompact(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(2).replace(/\.00$/, "") + "M";
  if (Math.abs(n) >= 1000) return "$" + Math.round(n / 1000) + "K";
  return "$" + Math.round(n).toLocaleString();
}

function fmtMoney(v) {
  return "$" + Math.round(Number(v) || 0).toLocaleString();
}

function fmtNum(v) {
  return Math.round(Number(v) || 0).toLocaleString();
}

function pctToTarget(actual, target) {
  if (!target) return null;
  return Math.round((actual / target) * 100);
}

function deltaFmt(delta, prefix = "") {
  const n = Math.round(Number(delta) || 0);
  return (n >= 0 ? "+" : "-") + prefix + Math.abs(n).toLocaleString();
}

function barColor(pct) {
  if (pct === null || pct === undefined) return "#94a3b8";
  if (pct >= 100) return "#1d9e75";
  if (pct >= 75) return "#ba7517";
  return "#a32d2d";
}

function pillStyle(delta) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: delta >= 0 ? "#eaf3de" : "#fcebeb",
    color: delta >= 0 ? "#27500a" : "#791f1f",
    whiteSpace: "nowrap"
  };
}

function getLatestMonthKey(rows) {
  const keys = rows
    .map(r => (r.Month || "").slice(0, 7))
    .filter(Boolean)
    .sort();
  return keys.length ? keys[keys.length - 1] : "";
}

function getMonthRows(rows, monthKey) {
  return rows.filter(r => (r.Month || "").slice(0, 7) === monthKey);
}

function buildMetricTargetMap(targetRows, monthKey) {
  const scoped = targetRows.filter(r => (r.month_start || "").slice(0, 7) === monthKey);
  const out = {};
  scoped.forEach(r => {
    const metric = (r.metric || "").toLowerCase();
    const segment = (r.segment || "").toLowerCase();
    if (!out[metric]) out[metric] = {};
    out[metric][segment] = Number(r.value) || 0;
  });
  return out;
}

function buildActualByChannel(rows) {
  const out = {};
  VS_TARGET_CHANNELS.forEach(ch => {
    const agg = aggregate(rows.filter(r => r.cat === ch));
    out[ch] = agg;
  });
  out.Total = aggregate(rows);
  return out;
}

function getMetricValue(obj, metric) {
  if (!obj) return 0;
  if (metric === "revenue") return obj.revenue || 0;
  if (metric === "leads") return obj.leads || 0;
  if (metric === "completed") return obj.completed || 0;
  if (metric === "aov") return obj.aov || 0;
  return 0;
}

//API CALL

async function callAPI(messages) {
  const response = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, messages })
  });

  const text = await response.text();
  console.log("AI STATUS:", response.status);
  console.log("AI RAW RESPONSE:", text);

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${text}`);
  }

  return JSON.parse(text);
}

function useViewport() {
  const getWidth = () => (typeof window !== "undefined" ? window.innerWidth : 1280);
  const [width, setWidth] = useState(getWidth());

  useEffect(() => {
    const onResize = () => setWidth(getWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    isPhone: width < 640,
    isTablet: width >= 640 && width < 1024
  };
}

function sumK(arr, key) {
  return arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

function aggregate(rows) {
  const leads = sumK(rows, "leads");
  const booked = sumK(rows, "booked");
  const canceled = sumK(rows, "canceled");
  const completed = sumK(rows, "completed");
  const revenue = sumK(rows, "revenue");

  return {
    leads,
    booked,
    canceled,
    completed,
    revenue,
    bookingRate: leads ? booked / leads : 0,
    cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
    conversionRate: leads ? completed / leads : 0,
    aov: completed ? revenue / completed : 0
  };
}

function getFilteredRows(rows, market, chanCat) {
  return rows.filter(
    r =>
      (market === "All Markets" || r.market === market) &&
      (chanCat === "All Channels" || r.cat === chanCat)
  );
}

function getMaxDataDate(rows) {
  const dates = rows
    .map(r => r.date || r.Week || r.Month)
    .filter(Boolean)
    .map(v => new Date(v))
    .filter(d => !isNaN(d.getTime()));

  if (!dates.length) return new Date();
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

function getPeriodKey(row, period) {
  if (period === "week") return (row.Week || "").slice(0, 10);
  if (period === "month") return (row.Month || "").slice(0, 7);
  return (row.date || "").slice(0, 10);
}

function getPointInPeriod(row, period) {
  const raw = row.date || row.Week || row.Month;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;

  if (period === "week") {
    const dow = d.getDay();
    return dow === 0 ? 7 : dow;
  }

  if (period === "month") {
    return d.getDate();
  }

  return null;
}

function getPeriodLengthFromKey(periodKey, period) {
  if (period === "week") return 7;
  if (period === "month") {
    const [y, m] = periodKey.split("-");
    return new Date(Number(y), Number(m), 0).getDate();
  }
  return null;
}

function buildTimeSeries(rows, period) {
  const groups = {};

  rows.forEach(r => {
    const key =
      period === "day"
        ? (r.date || "").slice(0, 10)
        : period === "week"
        ? (r.Week || "").slice(0, 10)
        : (r.Month || "").slice(0, 7);

    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const keys = Object.keys(groups).sort().slice(period === "day" ? -60 : -12);

  return keys.map(k => {
    const g = groups[k];
    const leads = sumK(g, "leads");
    const booked = sumK(g, "booked");
    const canceled = sumK(g, "canceled");
    const completed = sumK(g, "completed");
    const revenue = sumK(g, "revenue");

    return {
      label: k,
      leads,
      booked,
      canceled,
      completed,
      revenue,
      bookingRate: leads ? booked / leads : 0,
      cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
      conversionRate: leads ? completed / leads : 0,
      aov: completed ? revenue / completed : 0
    };
  });
}

function aggregateSeriesByToggle(rows, period) {
  const normalizedPeriod = period === "week" ? "week" : "month";
  const groups = {};

  rows.forEach(r => {
    const key =
      normalizedPeriod === "week"
        ? (r.Week || "").slice(0, 10)
        : (r.Month || "").slice(0, 7);

    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  return Object.keys(groups)
    .sort()
    .map(key => {
      const g = groups[key];
      const leads = sumK(g, "leads");
      const booked = sumK(g, "booked");
      const canceled = sumK(g, "canceled");
      const completed = sumK(g, "completed");
      const revenue = sumK(g, "revenue");

      return {
        label: key,
        leads,
        booked,
        canceled,
        completed,
        revenue,
        bookingRate: leads ? booked / leads : 0,
       cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
        conversionRate: leads ? completed / leads : 0,
        aov: completed ? revenue / completed : 0
      };
    });
}

function buildSeriesBreakdown(rows, period, groupKey) {
  const normalizedPeriod = period === "week" ? "week" : "month";
  const grouped = {};

  rows.forEach(r => {
    const group = r[groupKey] || "Unknown";
    const timeKey =
      normalizedPeriod === "week"
        ? (r.Week || "").slice(0, 10)
        : (r.Month || "").slice(0, 7);

    if (!timeKey) return;

    if (!grouped[group]) grouped[group] = {};
    if (!grouped[group][timeKey]) grouped[group][timeKey] = [];
    grouped[group][timeKey].push(r);
  });

  return Object.keys(grouped)
    .sort()
    .map(group => {
      const points = Object.keys(grouped[group])
        .sort()
        .map(label => {
          const g = grouped[group][label];
          const leads = sumK(g, "leads");
          const booked = sumK(g, "booked");
          const canceled = sumK(g, "canceled");
          const completed = sumK(g, "completed");
          const revenue = sumK(g, "revenue");

          return {
            label,
            leads,
            booked,
            canceled,
            completed,
            revenue,
            bookingRate: leads ? booked / leads : 0,
            cancelRate: (canceled + completed) ? canceled / (canceled + completed) : 0,
            conversionRate: leads ? completed / leads : 0,
            aov: completed ? revenue / completed : 0
          };
        });

      return { group, points };
    });
}

function getScopedAggregates(rows, period, market, chanCat) {
  const filteredRows = getFilteredRows(rows, market, chanCat);
  const series = aggregateSeriesByToggle(filteredRows, period);
  const latestLabel = series.length ? series[series.length - 1].label : null;

const currentPeriodRows = latestLabel
  ? filteredRows.filter(r => getPeriodKey(r, period) === latestLabel)
  : [];

const overall = aggregate(
  (period === "week" || period === "month" || period === "day")
    ? currentPeriodRows
    : filteredRows
);

  const result = {
    rowCount: filteredRows.length,
    market,
    channel: chanCat,
    period,
    overall,
    series
  };

  if (period === "week" || period === "month") {
    const pacingByMetric = {};
    METRICS.forEach(m => {
      pacingByMetric[m.key] = calcHistoricalPacing(period, filteredRows, m.key);
    });

    result.overall = applyProjectionToAggregate(overall, pacingByMetric);
    result.series = applyProjectionToSeries(series, pacingByMetric);
  }

  if (market === "All Markets" && chanCat === "All Channels") {
  result.seriesByMarket =
    period === "week" || period === "month"
      ? applyProjectionToBreakdownSeriesFromRaw(filteredRows, period, "market")
      : buildSeriesBreakdown(filteredRows, period, "market");

  result.seriesByChannel =
    period === "week" || period === "month"
      ? applyProjectionToBreakdownSeriesFromRaw(filteredRows, period, "cat")
      : buildSeriesBreakdown(filteredRows, period, "cat");
}

  return result;
}

function shouldUseFullDataset(question) {
  const q = (question || "").toLowerCase();

  const broadTerms = [
    "overall",
    "all markets",
    "all channels",
    "full dataset",
    "entire dataset",
    "whole dataset",
    "company-wide",
    "across all markets",
    "across all channels",
    "national",
    "global view",
    "total business",
    "entire business"
  ];

  return broadTerms.some(term => q.includes(term));
}

function buildChannelShareSeries(rows, period, metricKey) {
  const timeKey = r =>
    period === "day"
      ? (r.date || "").slice(0, 10)
      : period === "week"
      ? (r.Week || "").slice(0, 10)
      : (r.Month || "").slice(0, 7);

  const allKeys = [...new Set(rows.map(timeKey).filter(Boolean))].sort().slice(period === "day" ? -60 : -12);
  const channels = [...new Set(rows.map(r => r.cat).filter(Boolean))].sort();
  const rawMap = {};

  allKeys.forEach(t => {
    rawMap[t] = {};
    channels.forEach(c => {
      rawMap[t][c] = [];
    });
  });

  rows.forEach(r => {
    const t = timeKey(r);
    if (rawMap[t] && r.cat && rawMap[t][r.cat]) rawMap[t][r.cat].push(r);
  });

  const series = allKeys.map(t => {
    const point = { label: t };
    const totalRows = Object.values(rawMap[t]).flat();
    const totalAgg = aggregate(totalRows);

    channels.forEach(c => {
      const cRows = rawMap[t][c] || [];
      const cAgg = aggregate(cRows);
      const totalVal = totalAgg[metricKey] || 0;
      point[c] = totalVal > 0 ? (cAgg[metricKey] / totalVal) * 100 : 0;
    });

    return point;
  });

  return { series, channels };
}

function fmtLabel(label, period) {
  if (period === "day") {
    return new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (period === "week") {
    return "W" + new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const [y, m] = label.split("-");
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m, 10) - 1] + " '" + y.slice(2);
}

function mapRows(d) {
  return d.map(r => ({
    date: r.Day || r.date || r.Month || "",
    Week: r.Week || r.Day || r.date || "",
    Month: r.Month || r.Day || r.date || "",
    market: r.market || "",
    cat: r["Channel Category"] || "Other",
    leads: Number(r.leads) || 0,
    booked: Number(r.jobs_booked) || 0,
    canceled: Number(r.canceled_jobs) || 0,
    completed: Number(r.jobs_completed) || 0,
    revenue: Number(r.invoiced_customer_price) || 0
  }));
}

function calcHistoricalPacing(period, rows, metricKey = "revenue") {
  if (!rows?.length) return null;
  if (period !== "week" && period !== "month") return null;
  if (!ADDITIVE_METRICS.has(metricKey)) return null;

  const currentPeriodKey = rows
    .map(r => getPeriodKey(r, period))
    .filter(Boolean)
    .sort()
    .slice(-1)[0];

  if (!currentPeriodKey) return null;

  const maxDate = getMaxDataDate(rows);
  const currentPoint = period === "week"
    ? (maxDate.getDay() === 0 ? 7 : maxDate.getDay())
    : maxDate.getDate();

  const grouped = {};
  rows.forEach(r => {
    const key = getPeriodKey(r, period);
    if (!key) return;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const currentRows = grouped[currentPeriodKey] || [];
  const currentActual = currentRows
    .filter(r => {
      const p = getPointInPeriod(r, period);
      return p !== null && p <= currentPoint;
    })
    .reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);

  const historicalKeys = Object.keys(grouped)
    .sort()
    .filter(k => k !== currentPeriodKey);

  const shares = historicalKeys
    .map(key => {
      const group = grouped[key];
      const total = group.reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);
      if (!total) return null;

      const periodLength = getPeriodLengthFromKey(key, period);
      const maxPoint = Math.max(...group.map(r => getPointInPeriod(r, period) || 0));
      const isComplete = maxPoint >= periodLength;
      if (!isComplete) return null;

      const cumulative = group
        .filter(r => {
          const p = getPointInPeriod(r, period);
          return p !== null && p <= currentPoint;
        })
        .reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0);

      const share = cumulative / total;
      if (!share || share <= 0 || share > 1.25) return null;
      return share;
    })
    .filter(Boolean);

  const total = getPeriodLengthFromKey(currentPeriodKey, period);

  if (!shares.length) {
    const fallbackPct = period === "week" ? currentPoint / 7 : currentPoint / total;
    return {
      elapsed: currentPoint,
      total,
      pct: fallbackPct,
      historicalPct: null,
      label: "Day " + currentPoint + " of " + total,
      projected: fallbackPct > 0 ? currentActual / fallbackPct : currentActual,
      actual: currentActual,
      method: "fallback",
      sampleSize: 0
    };
  }

  const historicalPct = shares.reduce((a, b) => a + b, 0) / shares.length;
  const projected = historicalPct > 0 ? currentActual / historicalPct : currentActual;

  return {
    elapsed: currentPoint,
    total,
    pct: historicalPct,
    historicalPct,
    label: "Day " + currentPoint + " of " + total,
    projected,
    actual: currentActual,
    method: "historical",
    sampleSize: shares.length
  };
}

function applyProjectionToAggregate(agg, pacingByMetric) {
  if (!agg) return agg;

  const projected = { ...agg };

  Object.keys(projected).forEach(key => {
    projected[key] = getProjectedMetricValue(key, projected[key], pacingByMetric[key]);
  });

  return projected;
}

function applyProjectionToSeries(series, pacingByMetric) {
  if (!Array.isArray(series) || !series.length) return series;

  return series.map((point, idx) => {
    if (idx !== series.length - 1) return point;

    const projectedPoint = { ...point };

    Object.keys(projectedPoint).forEach(key => {
      if (key === "label") return;
      projectedPoint[key] = getProjectedMetricValue(key, projectedPoint[key], pacingByMetric[key]);
    });

    return projectedPoint;
  });
}

function applyProjectionToBreakdownSeriesFromRaw(rows, period, groupKey) {
  if (period !== "week" && period !== "month") {
    return buildSeriesBreakdown(rows, period, groupKey);
  }

  const baseSeries = buildSeriesBreakdown(rows, period, groupKey);

  return baseSeries.map(groupItem => {
    const groupRows = rows.filter(r => (r[groupKey] || "Unknown") === groupItem.group);

    const pacingByMetric = {};
    METRICS.forEach(m => {
      pacingByMetric[m.key] = calcHistoricalPacing(period, groupRows, m.key);
    });

    return {
      ...groupItem,
      points: applyProjectionToSeries(groupItem.points || [], pacingByMetric)
    };
  });
}


async function loadData() {
  const dataUrls = ["/data.json", DATA_URL];
  const targetUrls = ["/target.json", "target.json"];

  let mainData = null;
  let targetData = [];

  for (const url of dataUrls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const d = JSON.parse(await r.text());
      if (!Array.isArray(d) || !d.length) throw new Error("empty");
      mainData = d;
      break;
    } catch (e) {
      console.error("main data load failed:", url, e);
    }
  }

  for (const url of targetUrls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const d = JSON.parse(await r.text());
      if (!Array.isArray(d)) throw new Error("invalid target data");
      targetData = d;
      break;
    } catch (e) {
      console.error("target data load failed:", url, e);
    }
  }

  if (!mainData) {
    throw new Error("all main data sources failed");
  }

  return {
    mainData,
    targetData
  };
}

function getProjectedMetricValue(metricKey, value, pacing) {
  const isRateOrAov = metricKey.includes("Rate") || metricKey === "aov";
  if (!pacing || isRateOrAov) return value;
  return pacing.projected ?? value;
}

function Sparkline({ data, metricKey, color, pacing }) {
  const isRateOrAov = metricKey.includes("Rate") || metricKey === "aov";

  const vals = data.map((d, i) => {
    const raw = d[metricKey] || 0;
    if (i === data.length - 1 && pacing && !isRateOrAov) {
      return pacing.projected ?? raw;
    }
    return raw;
  });

  if (vals.length < 2) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 28;

  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");

  return React.createElement(
    "svg",
    { width: w, height: h, style: { display: "block" } },
    React.createElement("polyline", {
      points: pts,
      fill: "none",
      stroke: color,
      strokeWidth: "1.5",
      strokeLinejoin: "round"
    })
  );
}

function MultiLineShareChart({ data, channels, period }) {
  if (!data.length) return null;

  const W = 680;
  const H = 230;
  const pL = 44;
  const pB = 36;
  const pT = 16;
  const pR = 16;
  const cW = W - pL - pR;
  const cH = H - pB - pT;
  const n = data.length;
  const xP = i => pL + (n > 1 ? i / (n - 1) : 0.5) * cW;
  const yP = v => pT + cH - (Math.min(Math.max(v, 0), 100) / 100) * cH;
  const step = Math.ceil(n / 10);
  const active = channels.filter(c => data.some(d => (d[c] || 0) > 0));

  return React.createElement(
    "svg",
    { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto" } },
    React.createElement(
      "defs",
      null,
      active.map(c =>
        React.createElement(
          "linearGradient",
          { key: "g_" + c, id: "sg_" + c, x1: "0", y1: "0", x2: "0", y2: "1" },
          React.createElement("stop", { offset: "0%", stopColor: CAT_COLORS[c] || "#94a3b8", stopOpacity: "0.12" }),
          React.createElement("stop", { offset: "100%", stopColor: CAT_COLORS[c] || "#94a3b8", stopOpacity: "0.01" })
        )
      )
    ),
    [0, 25, 50, 75, 100].map(t => {
      const y = pT + cH * (1 - t / 100);
      return React.createElement(
        "g",
        { key: t },
        React.createElement("line", { x1: pL, x2: W - pR, y1: y, y2: y, stroke: "#e5e7eb", strokeWidth: "1" }),
        React.createElement("text", { x: pL - 5, y: y + 4, textAnchor: "end", fontSize: "9", fill: "#9ca3af" }, t + "%")
      );
    }),
    active.map(c => {
      const color = CAT_COLORS[c] || "#94a3b8";
      const pts = data.map((d, i) => xP(i).toFixed(1) + "," + yP(d[c] || 0).toFixed(1)).join(" ");
      return React.createElement(
        "g",
        { key: c },
        React.createElement("polygon", {
          points: xP(0).toFixed(1) + "," + (pT + cH) + " " + pts + " " + xP(n - 1).toFixed(1) + "," + (pT + cH),
          fill: `url(#sg_${c})`
        }),
        React.createElement("polyline", {
          points: pts,
          fill: "none",
          stroke: color,
          strokeWidth: "2",
          strokeLinejoin: "round",
          strokeLinecap: "round"
        })
      );
    }),
    active.map(c =>
      data.map((d, i) =>
        React.createElement("circle", {
          key: c + "_" + i,
          cx: xP(i),
          cy: yP(d[c] || 0),
          r: 2.5,
          fill: CAT_COLORS[c] || "#94a3b8",
          stroke: "#fff",
          strokeWidth: "1"
        })
      )
    ),
    data.map((d, i) =>
      i % step === 0
        ? React.createElement("text", { key: i, x: xP(i), y: H - 4, textAnchor: "middle", fontSize: "9", fill: "#9ca3af" }, fmtLabel(d.label, period))
        : null
    )
  );
}

function TrendChart({ data, metricKey, metric, period, chartType, pacing }) {
  const isRateOrAov = metricKey.includes("Rate") || metricKey === "aov";

  const vals = data.map((d, i) => {
    const raw = d[metricKey] || 0;
    if (i === data.length - 1 && pacing && !isRateOrAov && (period === "week" || period === "month")) {
      return pacing.projected ?? raw;
    }
    return raw;
  });

  const actuals = data.map(d => d[metricKey] || 0);
  const hasProjection = pacing && !isRateOrAov && (period === "week" || period === "month");

  if (!vals.length) return null;

  const max = Math.max(...vals, 1);
  const W = 680;
  const H = 210;
  const pL = 56;
  const pB = 36;
  const pT = 16;
  const pR = 16;
  const cW = W - pL - pR;
  const cH = H - pB - pT;
  const bW = Math.min(cW / vals.length - 2, 28);
  const step = Math.ceil(vals.length / 10);
  const lastIdx = vals.length - 1;
  const fmtY = v => {
    if (metricKey === "revenue" || metricKey === "aov") return "$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v));
    if (metricKey.includes("Rate")) return (v * 100).toFixed(0) + "%";
    return v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v).toString();
  };
  const xP = i => pL + (i / (vals.length - 1 || 1)) * cW;
  const yP = v => pT + cH - (v / max) * cH;
  const gId = "lg_" + metricKey;

  return React.createElement(
    "svg",
    { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto" } },
    [0, 0.25, 0.5, 0.75, 1].map(t => {
      const y = pT + cH * (1 - t);
      return React.createElement(
        "g",
        { key: t },
        React.createElement("line", { x1: pL, x2: W - pR, y1: y, y2: y, stroke: "#e5e7eb", strokeWidth: "1" }),
        React.createElement("text", { x: pL - 5, y: y + 4, textAnchor: "end", fontSize: "10", fill: "#9ca3af" }, fmtY(max * t))
      );
    }),
    chartType === "line"
      ? React.createElement(
          "g",
          null,
          React.createElement(
            "defs",
            null,
            React.createElement(
              "linearGradient",
              { id: gId, x1: "0", y1: "0", x2: "0", y2: "1" },
              React.createElement("stop", { offset: "0%", stopColor: metric.color, stopOpacity: "0.18" }),
              React.createElement("stop", { offset: "100%", stopColor: metric.color, stopOpacity: "0.01" })
            )
          ),
          React.createElement("polygon", {
            points: xP(0).toFixed(1) + "," + (pT + cH) + " " + vals.map((v, i) => xP(i).toFixed(1) + "," + yP(v).toFixed(1)).join(" ") + " " + xP(lastIdx).toFixed(1) + "," + (pT + cH),
            fill: `url(#${gId})`
          }),
          React.createElement("polyline", {
            points: vals.map((v, i) => xP(i).toFixed(1) + "," + yP(v).toFixed(1)).join(" "),
            fill: "none",
            stroke: metric.color,
            strokeWidth: "2",
            strokeLinejoin: "round"
          }),
          hasProjection && vals.length > 1
            ? React.createElement("line", {
                x1: xP(lastIdx - 1).toFixed(1),
                y1: yP(actuals[lastIdx - 1]).toFixed(1),
                x2: xP(lastIdx).toFixed(1),
                y2: yP(vals[lastIdx]).toFixed(1),
                stroke: metric.color,
                strokeWidth: "2",
                strokeDasharray: "5,4",
                opacity: "0.7"
              })
            : null,
          vals.map((v, i) =>
            React.createElement("circle", {
              key: i,
              cx: xP(i),
              cy: yP(v),
              r: i === lastIdx && hasProjection ? 4 : 3,
              fill: i === lastIdx && hasProjection ? "#3b82f6" : metric.color,
              stroke: "#fff",
              strokeWidth: "1.5"
            })
          ),
          hasProjection
            ? React.createElement(
                "g",
                null,
                React.createElement("rect", { x: xP(lastIdx) - 28, y: yP(vals[lastIdx]) - 22, width: 56, height: 16, rx: "4", fill: "#3b82f6" }),
                React.createElement("text", { x: xP(lastIdx), y: yP(vals[lastIdx]) - 11, textAnchor: "middle", fontSize: "9", fill: "#fff", fontWeight: "700" }, "▲ " + fmtY(vals[lastIdx]))
              )
            : null,
          vals.map((v, i) =>
            i % step === 0
              ? React.createElement("text", { key: i, x: xP(i), y: H - 4, textAnchor: "middle", fontSize: "9", fill: "#9ca3af" }, fmtLabel(data[i].label, period))
              : null
          )
        )
      : React.createElement(
          "g",
          null,
          vals.map((v, i) => {
            const x = pL + (i / vals.length) * cW + cW / vals.length / 2;
            const barH = Math.max((v / max) * cH, 0);
            const y = pT + cH - barH;
            const isProj = i === lastIdx && hasProjection;

            return React.createElement(
              "g",
              { key: i },
              React.createElement("rect", {
                x: x - bW / 2,
                y,
                width: bW,
                height: barH,
                rx: "3",
                fill: isProj ? "#3b82f6" : metric.color,
                opacity: isProj ? 1 : 0.85
              }),
              isProj
                ? React.createElement(
                    "g",
                    null,
                    React.createElement("rect", { x: x - 28, y: y - 20, width: 56, height: 16, rx: "4", fill: "#3b82f6" }),
                    React.createElement("text", { x, y: y - 9, textAnchor: "middle", fontSize: "9", fill: "#fff", fontWeight: "700" }, "▲ " + fmtY(v))
                  )
                : null,
              i % step === 0
                ? React.createElement("text", { x, y: H - 4, textAnchor: "middle", fontSize: "9", fill: "#9ca3af" }, fmtLabel(data[i].label, period))
                : null
            );
          })
        )
  );
}

function FunnelChart({ curr, prev, period, pacingByMetric }) {
  const steps = [
    { key: "leads", label: "Leads", color: "#6366f1" },
    { key: "booked", label: "Booked", color: "#0ea5e9" },
    { key: "completed", label: "Completed", color: "#10b981" }
  ];

  const projectedCurr = {
    leads: getProjectedMetricValue("leads", curr.leads || 0, pacingByMetric.leads),
    booked: getProjectedMetricValue("booked", curr.booked || 0, pacingByMetric.booked),
    completed: getProjectedMetricValue("completed", curr.completed || 0, pacingByMetric.completed)
  };

  const maxVal = Math.max(projectedCurr.leads || 1, 1);
  const pl = period === "day" ? "day" : period === "week" ? "week" : "month";

  return React.createElement(
    "div",
    {
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: "16px 18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        border: "1px solid #f1f5f9"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 16
        }
      },
      "Conversion Funnel — Projected Current " + pl
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 6 } },
      steps.map(step => {
        const val = projectedCurr[step.key] || 0;
        const pctWidth = maxVal ? val / maxVal : 0;
        const prevVal = prev[step.key] || 0;

        const pctOfLeads =
          projectedCurr.leads > 0 && step.key !== "leads"
            ? ((val / projectedCurr.leads) * 100).toFixed(1)
            : null;

        const change = prevVal ? ((val - prevVal) / prevVal) * 100 : 0;
        const good = change >= 0;

        return React.createElement(
          "div",
          { key: step.key },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 5
              }
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement("div", {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: step.color,
                  flexShrink: 0
                }
              }),
              React.createElement("span", {
                style: { fontSize: 13, fontWeight: 700, color: "#111827" }
              }, step.label),
              pctOfLeads !== null
                ? React.createElement("span", {
                    style: { fontSize: 11, color: "#9ca3af", marginLeft: 2 }
                  }, "(" + pctOfLeads + "% of Leads)")
                : null
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement("span", {
                style: { fontSize: 13, fontWeight: 700, color: "#111827" }
              }, Math.round(val).toLocaleString()),
              prevVal > 0
                ? React.createElement("span", {
                    style: {
                      fontSize: 11,
                      fontWeight: 600,
                      color: good ? "#10b981" : "#f43f5e",
                      background: good ? "#ecfdf5" : "#fff1f2",
                      padding: "1px 6px",
                      borderRadius: 20,
                      whiteSpace: "nowrap"
                    }
                  }, (good ? "▲" : "▼") + Math.abs(change).toFixed(1) + "%")
                : null
            )
          ),
          React.createElement(
            "div",
            {
              style: {
                position: "relative",
                height: 10,
                background: "#f1f5f9",
                borderRadius: 6,
                overflow: "hidden"
              }
            },
            React.createElement("div", {
              style: {
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: pctWidth * 100 + "%",
                background: step.color,
                borderRadius: 6
              }
            }),
            prevVal > 0
              ? React.createElement("div", {
                  style: {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: ((maxVal ? prevVal / maxVal : 0) * 100) + "%",
                    background: "none",
                    borderRight: "2px dashed " + step.color,
                    opacity: 0.4
                  }
                })
              : null
          )
        );
      })
    )
  );
}

function ComparisonChart({ curr, prev, period, pacingByMetric }) {
  const KPIs = [
    { key: "leads", label: "Leads", color: "#6366f1" },
    { key: "booked", label: "Bookings", color: "#0ea5e9" },
    { key: "completed", label: "Completed", color: "#10b981" },
    { key: "revenue", label: "Revenue", color: "#f59e0b" },
    { key: "bookingRate", label: "Booking Rate", color: "#8b5cf6" },
    { key: "conversionRate", label: "Conv. Rate", color: "#14b8a6" }
  ];

  const pl = period === "day" ? "day" : period === "week" ? "week" : "month";
  const W = 560;
  const H = 220;
  const pL = 16;
  const pR = 16;
  const pT = 16;
  const pB = 32;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n = KPIs.length;
  const groupW = cW / n;
  const bW = Math.min(groupW * 0.32, 22);
  const gap = bW * 0.6;
  const xCenter = i => pL + i * groupW + groupW / 2;

  return React.createElement(
    "div",
    {
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: "16px 18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        border: "1px solid #f1f5f9"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8
        }
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }
        },
        "Projected Current vs Prior Period — Core KPIs"
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 14, fontSize: 11 } },
        React.createElement(
          "span",
          { style: { display: "flex", alignItems: "center", gap: 5 } },
          React.createElement("span", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#6366f1",
              display: "inline-block"
            }
          }),
          React.createElement("span", {
            style: { color: "#6b7280", fontWeight: 600 }
          }, "Projected current " + pl)
        ),
        React.createElement(
          "span",
          { style: { display: "flex", alignItems: "center", gap: 5 } },
          React.createElement("span", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#e5e7eb",
              border: "1.5px dashed #9ca3af",
              display: "inline-block"
            }
          }),
          React.createElement("span", {
            style: { color: "#9ca3af", fontWeight: 600 }
          }, "Prior " + pl)
        )
      )
    ),
    React.createElement(
      "svg",
      { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto" } },
      [0, 0.5, 1].map(t => {
        const y = pT + cH * (1 - t);
        return React.createElement(
          "g",
          { key: t },
          React.createElement("line", {
            x1: pL,
            x2: W - pR,
            y1: y,
            y2: y,
            stroke: "#f1f5f9",
            strokeWidth: "1"
          })
        );
      }),
      KPIs.map((kpi, i) => {
        const cx = xCenter(i);
        const cVal = getProjectedMetricValue(kpi.key, curr[kpi.key] || 0, pacingByMetric[kpi.key]);
        const pVal = prev[kpi.key] || 0;
        const localMax = Math.max(cVal, pVal, 1);
        const cH2 = Math.max((cVal / localMax) * cH, 0);
        const pH2 = Math.max((pVal / localMax) * cH, 0);
        const cy = pT + cH - cH2;
        const py = pT + cH - pH2;
        const change = pVal ? ((cVal - pVal) / pVal) * 100 : 0;
        const good = change >= 0;

        return React.createElement(
          "g",
          { key: kpi.key },
          React.createElement("rect", {
            x: cx - gap / 2 - bW,
            y: py,
            width: bW,
            height: pH2,
            rx: "3",
            fill: "#e5e7eb",
            opacity: 0.8
          }),
          React.createElement("rect", {
            x: cx + gap / 2,
            y: cy,
            width: bW,
            height: cH2,
            rx: "3",
            fill: kpi.color,
            opacity: 0.9
          }),
          React.createElement("text", {
            x: cx,
            y: H - 4,
            textAnchor: "middle",
            fontSize: "9",
            fill: "#9ca3af"
          }, kpi.label),
          pVal > 0
            ? React.createElement("text", {
                x: cx,
                y: Math.min(cy, py) - 5,
                textAnchor: "middle",
                fontSize: "8.5",
                fill: good ? "#10b981" : "#f43f5e",
                fontWeight: "700"
              }, (good ? "▲" : "▼") + Math.abs(change).toFixed(1) + "%")
            : null
        );
      })
    )
  );
}

function ChatOverlay({ open, onClose, rawData, period, market, chanCat }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [userQuestion, setUserQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, aiLoading]);

  const sendMessage = useCallback((question) => {
    if (aiLoading || !question.trim()) return;

    setAiLoading(true);

    const useFullDataset = shouldUseFullDataset(question);
    const aiMarket = useFullDataset ? "All Markets" : "All Markets";
    const aiChannel = useFullDataset ? "All Channels" : "All Channels";
    const scopedAgg = getScopedAggregates(rawData, period, aiMarket, aiChannel);

    const systemCtx = `
You are a business analyst for NuBrakes.

Use the aggregated dataset below as the only source of truth.

Scope mode:
- "Full dataset override triggered by user question"

Scope:
- Period: ${period}
- Market: ${aiMarket}
- Channel: ${aiChannel}
- Row count: ${scopedAgg.rowCount}

Formatting rules for chat:
- Maximum 6 lines unless the user asks for more detail.
- No markdown bold, no headings, no tables.
- Keep each bullet to one short sentence.
- Start with the answer immediately.
- Use plain text only.
- Use numbers only when supported by the data.
- For rates use percentage (%).

Style rules:
- Concise
- Quantitative
- Business-focused
- No fluff
- No invented facts

Answer template:
<direct answer>
- <supporting point>
- <supporting point>
- <supporting point>

Data:
Overall summary:
${JSON.stringify(scopedAgg.overall)}

Main time series:
${JSON.stringify(scopedAgg.series)}

${scopedAgg.seriesByMarket ? `Time series by market:\n${JSON.stringify(scopedAgg.seriesByMarket)}\n` : ""}
${scopedAgg.seriesByChannel ? `Time series by channel:\n${JSON.stringify(scopedAgg.seriesByChannel)}\n` : ""}
`;

    setChatHistory(h => [...h, { role: "user", text: question }]);

    callAPI([
      { role: "system", content: systemCtx },
      {
        role: "user",
        content: `Question: ${question}\n\nAnswer clearly and concisely using the scoped aggregated data.`
      }
    ])
      .then(d => {
        const t =
          d.output_text ||
          (d.output || [])
            .flatMap(item => item.content || [])
            .map(c => c.text || "")
            .join("");

        setChatHistory(h => [...h, { role: "assistant", text: t || "No response." }]);
        setAiLoading(false);
      })
      .catch(err => {
        console.error(err);
        setChatHistory(h => [...h, { role: "assistant", text: `Error: ${err.message}` }]);
        setAiLoading(false);
      });
  }, [aiLoading, rawData, period, market, chanCat]);

  if (!open) return null;

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        bottom: 88,
        right: 20,
        width: 360,
        maxWidth: "calc(100vw - 40px)",
        zIndex: 1000,
        animation: "slideUp 0.22s ease"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "70vh"
        }
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "12px 16px",
            background: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "#10b981" } }),
          React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#fff" } }, "AI Insights"),
          React.createElement("span", { style: { fontSize: 11, color: "#9ca3af", marginLeft: 2 } }, `${period} · All Markets · All Channels`)
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, alignItems: "center" } },
          chatHistory.length > 0
            ? React.createElement("button", {
                onClick: () => setChatHistory([]),
                style: { background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af", padding: "2px 6px", borderRadius: 4 }
              }, "Clear")
            : null,
          React.createElement("button", {
            onClick: onClose,
            style: {
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "#fff",
              fontSize: 16,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          }, "×")
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            overflowY: "auto",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 160
          }
        },
        chatHistory.length === 0
          ? React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 } },
              React.createElement("p", { style: { fontSize: 12, color: "#9ca3af", margin: 0, textAlign: "center", marginBottom: 4 } }, "Ask anything about your data"),
              ["What's the top performing market?", "How is revenue trending?", "Which channel has the best conversion rate?"].map(q =>
                React.createElement("button", {
                  key: q,
                  onClick: () => {
                    setUserQuestion("");
                    sendMessage(q);
                  },
                  style: {
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 12,
                    color: "#374151",
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.4
                  }
                }, q)
              )
            )
          : null,
        chatHistory.map((msg, i) => {
          const isUser = msg.role === "user";
          return React.createElement(
            "div",
            { key: i, style: { display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" } },
            React.createElement(
              "div",
              {
                style: {
                  maxWidth: "88%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 12,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  background: isUser ? "#6366f1" : "#f1f5f9",
                  color: isUser ? "#fff" : "#374151",
                  borderBottomRightRadius: isUser ? 2 : 12,
                  borderBottomLeftRadius: isUser ? 12 : 2
                }
              },
              msg.text
            )
          );
        }),
        aiLoading
          ? React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "flex-start" } },
              React.createElement(
                "div",
                {
                  style: {
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "#f1f5f9",
                    fontSize: 12,
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }
                },
                React.createElement("div", {
                  style: {
                    width: 14,
                    height: 14,
                    border: "2px solid #d1d5db",
                    borderTop: "2px solid #6366f1",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }
                }),
                "Thinking..."
              )
            )
          : null,
        React.createElement("div", { ref: messagesEndRef })
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 12px",
            borderTop: "1px solid #f1f5f9",
            flexShrink: 0,
            display: "flex",
            gap: 8,
            background: "#fff"
          }
        },
        React.createElement("input", {
          ref: inputRef,
          type: "text",
          value: userQuestion,
          onChange: e => setUserQuestion(e.target.value),
          onKeyDown: e => {
            if (e.key === "Enter" && userQuestion.trim() && !aiLoading) {
              const q = userQuestion.trim();
              setUserQuestion("");
              sendMessage(q);
            }
          },
          placeholder: "Ask a question...",
          style: {
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1.5px solid #e5e7eb",
            fontSize: 12,
            color: "#374151",
            outline: "none",
            background: "#f8fafc"
          }
        }),
        React.createElement(
          "button",
          {
            onClick: () => {
              if (userQuestion.trim() && !aiLoading) {
                const q = userQuestion.trim();
                setUserQuestion("");
                sendMessage(q);
              }
            },
            disabled: aiLoading || !userQuestion.trim(),
            style: {
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              opacity: aiLoading || !userQuestion.trim() ? 0.45 : 1,
              flexShrink: 0
            }
          },
          React.createElement(
            "svg",
            {
              width: 14,
              height: 14,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.5",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            },
            React.createElement("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
            React.createElement("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
          )
        )
      )
    )
  );
}


function VsTargetTab({ filtered, rawData, targetRows, isPhone, isTablet }) {
  const h = React.createElement;

  const monthKey = getLatestMonthKey(filtered.length ? filtered : rawData);
  const monthRows = getMonthRows(filtered.length ? filtered : rawData, monthKey);
  const actualByChannel = buildActualByChannel(monthRows);
  const targetMap = buildMetricTargetMap(targetRows, monthKey);

  const monthLabel =
    monthKey
      ? new Date(monthKey + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Current Month";

  const topMetrics = [
    { key: "revenue", label: "Total revenue", formatter: fmtMoneyCompact, prefix: "$" },
    { key: "leads", label: "Total leads", formatter: fmtNum, prefix: "" },
    { key: "completed", label: "Completed jobs", formatter: fmtNum, prefix: "" },
    { key: "aov", label: "Avg order value", formatter: fmtMoney, prefix: "$" }
  ];

  const overallActual = actualByChannel.Total || {};
  const revenueActual = getMetricValue(overallActual, "revenue");
  const revenueTarget = targetMap.revenue?.total || 0;
  const revenuePct = pctToTarget(revenueActual, revenueTarget);

  const rowCardStyle = {
    background: "#fff",
    border: "0.5px solid #e5e7eb",
    borderRadius: 16,
    padding: "18px 20px"
  };

  const kpiGridCols = isPhone ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))";
  const row2Cols = isPhone ? "1fr" : "minmax(0,1.6fr) minmax(0,1fr)";
  const row3Cols = isPhone ? "1fr" : "repeat(2,minmax(0,1fr))";
  const row4Cols = isPhone ? "1fr" : "repeat(2,minmax(0,1fr))";

  function renderKpi(metric) {
    const actual = getMetricValue(overallActual, metric.key);
    const target = targetMap[metric.key]?.total || 0;
    const delta = actual - target;
    return h(
      "div",
      {
        key: metric.key,
        style: {
          background: "#f8fafc",
          borderRadius: 12,
          padding: "16px"
        }
      },
      h("div", {
        style: {
          fontSize: 11,
          color: "#6b7280",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: ".04em"
        }
      }, metric.label),
      h("div", {
        style: {
          fontSize: 26,
          fontWeight: 600,
          lineHeight: 1,
          marginBottom: 6,
          color: "#111827"
        }
      }, metric.formatter(actual)),
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11
          }
        },
        h("span", { style: pillStyle(delta) }, deltaFmt(delta, metric.key === "revenue" || metric.key === "aov" ? "$" : "")),
        h("span", { style: { color: "#9ca3af" } }, "vs " + metric.formatter(target) + " target")
      )
    );
  }

  function renderRevenueBars() {
    const maxVal = Math.max(
      ...VS_TARGET_CHANNELS.flatMap(ch => [
        getMetricValue(actualByChannel[ch], "revenue"),
        targetMap.revenue?.[CAT_TO_SEGMENT[ch]] || 0
      ]),
      1
    );

    return h(
      "div",
      null,
      VS_TARGET_CHANNELS.map(ch => {
        const actual = getMetricValue(actualByChannel[ch], "revenue");
        const target = targetMap.revenue?.[CAT_TO_SEGMENT[ch]] || 0;
        const actualW = (actual / maxVal) * 100;
        const targetW = (target / maxVal) * 100;

        return h(
          "div",
          { key: ch, style: { marginBottom: 14 } },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5
              }
            },
            h("span", { style: { fontSize: 12, color: "#111827" } }, ch),
            h("span", { style: { fontSize: 11, color: "#6b7280" } }, fmtMoneyCompact(actual) + " / " + fmtMoneyCompact(target))
          ),
          h(
            "div",
            {
              style: {
                position: "relative",
                height: 18,
                background: "#f1f5f9",
                borderRadius: 8,
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                position: "absolute",
                left: 0,
                top: 3,
                height: 5,
                width: targetW + "%",
                background: "#d3d1c7",
                borderRadius: 4
              }
            }),
            h("div", {
              style: {
                position: "absolute",
                left: 0,
                bottom: 3,
                height: 7,
                width: actualW + "%",
                background: "#378add",
                borderRadius: 4
              }
            })
          )
        );
      })
    );
  }

  function renderRevenuePct() {
    return h(
      "div",
      null,
      VS_TARGET_CHANNELS.map(ch => {
        const actual = getMetricValue(actualByChannel[ch], "revenue");
        const target = targetMap.revenue?.[CAT_TO_SEGMENT[ch]] || 0;
        const pct = pctToTarget(actual, target);
        const fill = Math.min(pct || 0, 100);
        const delta = actual - target;

        return h(
          "div",
          {
            key: ch,
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12
            }
          },
          h("span", { style: { fontSize: 12, width: 60, flexShrink: 0, color: "#6b7280" } }, ch),
          h(
            "div",
            {
              style: {
                flex: 1,
                height: 8,
                background: "#f1f5f9",
                borderRadius: 4,
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                height: "100%",
                width: fill + "%",
                background: barColor(pct),
                borderRadius: 4
              }
            })
          ),
          h("span", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              minWidth: 42,
              textAlign: "right",
              color: barColor(pct)
            }
          }, pct !== null ? pct + "%" : "—"),
          h("span", { style: { minWidth: 72, textAlign: "right" } }, h("span", { style: pillStyle(delta) }, deltaFmt(delta, "$")))
        );
      })
    );
  }

  function renderTable(metricKey, title) {
    const rows = [...VS_TARGET_CHANNELS, "Total"].map(ch => {
      const segment = CAT_TO_SEGMENT[ch];
      const actual = getMetricValue(actualByChannel[ch], metricKey);
      const target = targetMap[metricKey]?.[segment] || 0;
      const pct = pctToTarget(actual, target);
      const delta = actual - target;
      return { ch, actual, target, pct, delta };
    });

    return h(
      "div",
      { style: rowCardStyle },
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
        h("h3", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: ".04em",
            margin: 0
          }
        }, title)
      ),
      h(
        "div",
        { style: { overflowX: "auto" } },
        h(
          "table",
          { style: { width: "100%", borderCollapse: "collapse" } },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              ["Channel", "Pacing", "Target", "% to target", "Delta"].map((col, i) =>
                h("th", {
                  key: col,
                  style: {
                    fontSize: 11,
                    color: "#6b7280",
                    fontWeight: 600,
                    textAlign: i === 0 ? "left" : "right",
                    padding: "0 0 8px",
                    borderBottom: "0.5px solid #e5e7eb"
                  }
                }, col)
              )
            )
          ),
          h(
            "tbody",
            null,
            rows.map(r =>
              h(
                "tr",
                { key: r.ch },
                h(
                  "td",
                  { style: { padding: "8px 0", borderBottom: "0.5px solid #e5e7eb" } },
                  h("div", { style: { fontSize: 12, color: "#111827", marginBottom: 4 } }, r.ch),
                  h(
                    "div",
                    {
                      style: {
                        height: 5,
                        background: "#f1f5f9",
                        borderRadius: 3,
                        overflow: "hidden"
                      }
                    },
                    h("div", {
                      style: {
                        height: "100%",
                        width: Math.min(r.pct || 0, 100) + "%",
                        background: barColor(r.pct),
                        borderRadius: 3
                      }
                    })
                  )
                ),
                h("td", { style: { textAlign: "right", padding: "8px 0", borderBottom: "0.5px solid #e5e7eb", fontSize: 12 } }, metricKey === "aov" || metricKey === "revenue" ? fmtMoney(r.actual) : fmtNum(r.actual)),
                h("td", { style: { textAlign: "right", padding: "8px 0", borderBottom: "0.5px solid #e5e7eb", fontSize: 12, color: "#6b7280" } }, metricKey === "aov" || metricKey === "revenue" ? fmtMoney(r.target) : fmtNum(r.target)),
                h("td", { style: { textAlign: "right", padding: "8px 0", borderBottom: "0.5px solid #e5e7eb", fontSize: 12 } }, r.pct !== null ? r.pct + "%" : "—"),
                h("td", { style: { textAlign: "right", padding: "8px 0", borderBottom: "0.5px solid #e5e7eb", fontSize: 12 } }, h("span", { style: pillStyle(r.delta) }, deltaFmt(r.delta, metricKey === "aov" || metricKey === "revenue" ? "$" : "")))
              )
            )
          )
        )
      )
    );
  }

  function renderAov() {
    return h(
      "div",
      null,
      VS_TARGET_CHANNELS.map(ch => {
        const actual = getMetricValue(actualByChannel[ch], "aov");
        const target = targetMap.aov?.[CAT_TO_SEGMENT[ch]] || 0;
        const delta = actual - target;
        const pct = pctToTarget(actual, target);

        return h(
          "div",
          { key: ch, style: { marginBottom: 14 } },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 4
              }
            },
            h("span", { style: { fontSize: 12, color: "#111827" } }, ch),
            h(
              "div",
              { style: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" } },
              h("span", { style: { fontSize: 14, fontWeight: 600 } }, actual ? fmtMoney(actual) : "—"),
              h("span", { style: { fontSize: 11, color: "#6b7280" } }, "target " + fmtMoney(target)),
              h("span", { style: pillStyle(delta) }, deltaFmt(delta, "$"))
            )
          ),
          h(
            "div",
            {
              style: {
                height: 5,
                background: "#f1f5f9",
                borderRadius: 3,
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                height: "100%",
                width: Math.min(pct || 0, 100) + "%",
                background: actual ? barColor(pct) : "#d3d1c7",
                borderRadius: 3
              }
            })
          )
        );
      })
    );
  }

  function renderHealth() {
    return h(
      "div",
      null,
      VS_TARGET_CHANNELS.map(ch => {
        const revenuePct = pctToTarget(getMetricValue(actualByChannel[ch], "revenue"), targetMap.revenue?.[CAT_TO_SEGMENT[ch]] || 0);
        const leadPct = pctToTarget(getMetricValue(actualByChannel[ch], "leads"), targetMap.leads?.[CAT_TO_SEGMENT[ch]] || 0);
        const jobPct = pctToTarget(getMetricValue(actualByChannel[ch], "completed"), targetMap.completed?.[CAT_TO_SEGMENT[ch]] || 0);
        const vals = [revenuePct, leadPct, jobPct].filter(v => v !== null);
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;

        return h(
          "div",
          { key: ch, style: { marginBottom: 12 } },
          h(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4
              }
            },
            h("span", { style: { fontSize: 12, color: "#111827" } }, ch),
            h("span", { style: { fontSize: 12, fontWeight: 600, color: barColor(avg) } }, avg !== null ? avg + "%" : "—")
          ),
          h(
            "div",
            {
              style: {
                height: 8,
                background: "#f1f5f9",
                borderRadius: 4,
                overflow: "hidden"
              }
            },
            h("div", {
              style: {
                height: "100%",
                width: Math.min(avg || 0, 100) + "%",
                background: barColor(avg),
                borderRadius: 4
              }
            })
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: 10,
                fontSize: 11,
                color: "#6b7280",
                marginTop: 4,
                flexWrap: "wrap"
              }
            },
            h("span", null, "Rev " + (revenuePct !== null ? revenuePct + "%" : "—")),
            h("span", null, "Leads " + (leadPct !== null ? leadPct + "%" : "—")),
            h("span", null, "Jobs " + (jobPct !== null ? jobPct + "%" : "—"))
          )
        );
      })
    );
  }

  return h(
    "div",
    { style: { padding: "4px 0 10px" } },
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: isPhone ? "flex-start" : "center",
          flexDirection: isPhone ? "column" : "row",
          gap: 10,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "0.5px solid #e5e7eb"
        }
      },
      h(
        "div",
        null,
        h("h1", { style: { fontSize: 20, fontWeight: 500, margin: 0, color: "#111827" } }, "Performance overview"),
        h("p", { style: { fontSize: 12, color: "#6b7280", margin: "2px 0 0" } }, monthLabel + " — month to date pacing vs target")
      ),
      h(
        "span",
        {
          style: {
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 20,
            fontWeight: 600,
            background: "#faeeda",
            color: "#633806",
            whiteSpace: "nowrap"
          }
        },
        revenuePct !== null ? revenuePct + "% to revenue target" : "No revenue target"
      )
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: kpiGridCols,
          gap: 12,
          marginBottom: 16
        }
      },
      topMetrics.map(renderKpi)
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: row2Cols,
          gap: 12,
          marginBottom: 16
        }
      },
      h(
        "div",
        { style: rowCardStyle },
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8
            }
          },
          h("h3", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0
            }
          }, "Revenue by channel"),
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                fontSize: 11,
                color: "#6b7280"
              }
            },
            h("span", null, h("span", { style: { width: 8, height: 8, display: "inline-block", borderRadius: 2, background: "#378add", marginRight: 4 } }), "Pacing"),
            h("span", null, h("span", { style: { width: 8, height: 8, display: "inline-block", borderRadius: 2, background: "#b4b2a9", marginRight: 4 } }), "Target")
          )
        ),
        renderRevenueBars()
      ),
      h(
        "div",
        { style: rowCardStyle },
        h("div", { style: { marginBottom: 12 } },
          h("h3", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0
            }
          }, "% to revenue target")
        ),
        renderRevenuePct()
      )
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: row3Cols,
          gap: 12,
          marginBottom: 16
        }
      },
      renderTable("leads", "Leads vs target by channel"),
      renderTable("completed", "Completed jobs vs target")
    ),

    h(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: row4Cols,
          gap: 12
        }
      },
      h(
        "div",
        { style: rowCardStyle },
        h("div", { style: { marginBottom: 12 } },
          h("h3", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0
            }
          }, "AOV by channel")
        ),
        renderAov()
      ),
      h(
        "div",
        { style: rowCardStyle },
        h("div", { style: { marginBottom: 12 } },
          h("h3", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              margin: 0
            }
          }, "Channel health snapshot")
        ),
        renderHealth()
      )
    )
  );
}

const baseCardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "16px 18px 14px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  border: "1px solid #f1f5f9"
};

function Dashboard() {
  const { isPhone, isTablet } = useViewport();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [period, setPeriod] = useState("month");
  const [market, setMarket] = useState("All Markets");
  const [chanCat, setChanCat] = useState("All Channels");
  const [tab, setTab] = useState("overview");
  const [trendKey, setTrendKey] = useState("revenue");
  const [chartType, setChartType] = useState("line");
  const [trendView, setTrendView] = useState("absolute");
  const [chatOpen, setChatOpen] = useState(false);
  const [targetData, setTargetData] = useState(TARGET_DATA);

  useEffect(() => {
    if (SHARE_INCOMPATIBLE.has(trendKey) && trendView === "share") {
      setTrendView("absolute");
    }
  }, [trendKey, trendView]);

  useEffect(() => {
  loadData()
    .then(({ mainData, targetData }) => {
      setRawData(mapRows(mainData));
      if (Array.isArray(targetData) && targetData.length) {
        setTargetData(targetData);
      }
      setUsingFallback(false);
      setLoading(false);
    })
    .catch(() => {
      setRawData(mapRows(FALLBACK));
      setUsingFallback(true);
      setLoading(false);
    });
}, []);

  const markets = useMemo(() => {
    const s = {};
    rawData.forEach(r => {
      if (r.market) s[r.market] = 1;
    });
    return Object.keys(s).sort();
  }, [rawData]);

  const chanCats = useMemo(() => {
    const s = {};
    rawData.forEach(r => {
      if (r.cat) s[r.cat] = 1;
    });
    return Object.keys(s).sort();
  }, [rawData]);

  const filtered = useMemo(
    () => rawData.filter(r => (market === "All Markets" || r.market === market) && (chanCat === "All Channels" || r.cat === chanCat)),
    [rawData, market, chanCat]
  );

  const series = useMemo(() => buildTimeSeries(filtered, period), [filtered, period]);

  const channelShareData = useMemo(
    () => buildChannelShareSeries(market === "All Markets" && chanCat === "All Channels" ? rawData : filtered, period, trendKey),
    [rawData, filtered, market, chanCat, period, trendKey]
  );

  const getRowsForLabel = useCallback(
    label =>
      filtered.filter(r => {
        const key = period === "day" ? r.date.slice(0, 10) : period === "week" ? r.Week.slice(0, 10) : r.Month.slice(0, 7);
        return key === label;
      }),
    [filtered, period]
  );

  const curr = useMemo(() => {
    if (!series.length) return {};
    return aggregate(getRowsForLabel(series[series.length - 1].label));
  }, [series, getRowsForLabel]);

  const prev = useMemo(() => {
    if (series.length < 2) return {};
    return aggregate(getRowsForLabel(series[series.length - 2].label));
  }, [series, getRowsForLabel]);

  const pacingByMetric = useMemo(() => {
    const result = {};
    METRICS.forEach(m => {
      result[m.key] = calcHistoricalPacing(period, filtered, m.key);
    });
    return result;
  }, [period, filtered]);

  const defaultPacing = pacingByMetric.revenue || null;
  const pct = (c, p) => (p ? ((c - p) / p) * 100 : 0);
  const periodLabel = period === "day" ? "Last 60 Days" : period === "week" ? "Last 12 Weeks" : "Last 12 Months";
  const isRateOrAov = key => key.includes("Rate") || key === "aov";
  const selMetric = METRICS.find(m => m.key === trendKey) || METRICS[0];
  const shareBlocked = SHARE_INCOMPATIBLE.has(trendKey);
  const activeChannels = channelShareData.channels.filter(c => channelShareData.series.some(d => (d[c] || 0) > 0));
  const selectedMetricPacing = pacingByMetric[trendKey] || null;

  const overviewLabel = useMemo(() => {
    if (!series.length) return "";
    const latest = series[series.length - 1].label;

    if (period === "day") {
      return new Date(latest + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }

    if (period === "week") {
      const s = new Date(latest + "T12:00:00");
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      return s.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    return new Date(latest + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [series, period]);

  if (loading) {
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui",
          color: "#6b7280",
          flexDirection: "column",
          gap: 12
        }
      },
      React.createElement("div", {
        style: {
          width: 32,
          height: 32,
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }
      }),
      React.createElement("span", null, "Loading live data...")
    );
  }

  const containerStyle = {
    fontFamily: "system-ui,sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
    padding: isPhone ? "12px" : isTablet ? "16px" : "20px 16px"
  };

  const selectStyle = {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    fontSize: 13,
    color: "#374151",
    background: "#fff",
    cursor: "pointer",
    minWidth: isPhone ? "100%" : 150,
    width: isPhone ? "100%" : "auto",
    maxWidth: "100%"
  };

  const pacingBanner =
    defaultPacing && (period === "week" || period === "month")
      ? React.createElement(
          "div",
          {
            style: {
              marginBottom: 16,
              padding: "10px 16px",
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap"
            }
          },
          React.createElement("span", { style: { fontSize: 16 } }, "📈"),
          React.createElement(
            "div",
            null,
            React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#1d4ed8" } }, (period === "week" ? "Week" : "Month") + " Historical Pacing · " + defaultPacing.label + " · " + (defaultPacing.pct * 100).toFixed(0) + "% typical completion"),
            React.createElement("span", { style: { fontSize: 11, color: "#3b82f6", marginLeft: 8 } }, defaultPacing.method === "historical" ? `Based on ${defaultPacing.sampleSize} completed prior periods` : "Fallback to elapsed-day pacing")
          ),
          React.createElement(
            "div",
            { style: { marginLeft: "auto", background: "#dbeafe", borderRadius: 20, padding: "2px 10px" } },
            React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#1d4ed8" } }, (defaultPacing.pct * 100).toFixed(0) + "%")
          )
        )
      : null;

  return React.createElement(
    "div",
    { style: containerStyle },
    React.createElement(
      "div",
      { style: { maxWidth: 1240, margin: "0 auto" } },
      React.createElement(
        "div",
        { style: { marginBottom: 20 } },
        React.createElement("h1", { style: { margin: 0, fontSize: isPhone ? 18 : 20, fontWeight: 700, color: "#111827" } }, "KPI Dashboard"),
        React.createElement(
  "p",
  { style: { margin: "3px 0 0", fontSize: 12, color: "#6b7280" } },
  "NuBrakes · " +
    market +
    " · " +
    chanCat +
    " · " +
    (tab === "overview"
      ? overviewLabel
      : tab === "vsTarget"
      ? (getLatestMonthKey(filtered || rawData)
          ? new Date(getLatestMonthKey(filtered || rawData) + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
          : "Current Month")
      : periodLabel)
),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 6 } },
          React.createElement(
            "div",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                background: usingFallback ? "#fff7ed" : "#ecfdf5",
                border: "1px solid " + (usingFallback ? "#fed7aa" : "#6ee7b7")
              }
            },
            React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: usingFallback ? "#f97316" : "#10b981" } }),
            React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: usingFallback ? "#c2410c" : "#065f46" } }, usingFallback ? "Sample Data" : "Live Data")
          ),
          usingFallback ? React.createElement("span", { style: { fontSize: 11, color: "#c2410c" } }, "⚠️ Live data unavailable") : null
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" } },
        ["day", "week", "month"].map(p =>
          React.createElement(
            "button",
            {
              key: p,
              onClick: () => setPeriod(p),
              style: {
                padding: "6px 16px",
                borderRadius: 20,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: period === p ? "#111827" : "#fff",
                color: period === p ? "#fff" : "#6b7280",
                boxShadow: period === p ? "none" : "0 1px 3px rgba(0,0,0,0.08)"
              }
            },
            p.charAt(0).toUpperCase() + p.slice(1)
          )
        ),
        React.createElement("select", { value: market, onChange: e => setMarket(e.target.value), style: selectStyle }, React.createElement("option", null, "All Markets"), ...markets.map(m => React.createElement("option", { key: m }, m))),
        React.createElement("select", { value: chanCat, onChange: e => setChanCat(e.target.value), style: selectStyle }, React.createElement("option", null, "All Channels"), ...chanCats.map(c => React.createElement("option", { key: c }, c)))
      ),
      React.createElement(
        "div",
        { style: { display: "flex", marginBottom: 22, borderBottom: "1.5px solid #e5e7eb", overflowX: "auto" } },
        [["overview", "Overview"], ["trends", "Trends"], ["vsTarget", "vs Target"]].map(([t, label]) =>
          React.createElement(
            "button",
            {
              key: t,
              onClick: () => setTab(t),
              style: {
                padding: "8px 20px",
                border: "none",
                background: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: tab === t ? "#111827" : "#9ca3af",
                borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent",
                marginBottom: -1.5,
                whiteSpace: "nowrap"
              }
            },
            label
          )
        )
      ),
      tab === "overview"
        ? React.createElement(
            "div",
            null,
            pacingBanner,
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: isPhone ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fill,minmax(190px,1fr))", gap: 12, marginBottom: 20 } },
              METRICS.map(m => {
                const actual = curr[m.key] || 0;
                const pacing = pacingByMetric[m.key] || null;
                const projectedValue = getProjectedMetricValue(m.key, actual, pacing);
                const prior = prev[m.key] || 0;
                const displayValue = pacing && !isRateOrAov(m.key) ? projectedValue : actual;
                const change = pct(displayValue, prior);
                const good = m.invert ? change <= 0 : change >= 0;

                return React.createElement(
                  "div",
                  { key: m.key, style: { ...baseCardStyle, padding: "14px 16px" } },
                  React.createElement("div", { style: { fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 } }, m.label),
                  React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 } }, m.fmt(displayValue)),
                  React.createElement(
                    "div",
                    { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 } },
                    React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: good ? "#10b981" : "#f43f5e", background: good ? "#ecfdf5" : "#fff1f2", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" } }, (good ? "▲" : "▼") + " " + Math.abs(change).toFixed(1) + "%"),
                    React.createElement(Sparkline, { data: series, metricKey: m.key, color: m.color, pacing })
                  ),
                  pacing && !isRateOrAov(m.key)
                    ? React.createElement(
                        "div",
                        {
                          style: {
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px dashed #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }
                        },
                        React.createElement("span", { style: { fontSize: 10, color: "#9ca3af" } }, "Actual so far"),
                        React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#6b7280" } }, m.fmt(actual))
                      )
                    : null
                );
              })
            ),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: isPhone ? "1fr" : isTablet ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 16 } },
              React.createElement(FunnelChart, { curr, prev, period, pacingByMetric }),
              React.createElement(ComparisonChart, { curr, prev, period, pacingByMetric })
            )
          )
        : null,
      tab === "trends"
        ? React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: isPhone ? "stretch" : "center", flexDirection: isPhone ? "column" : "row", gap: 12, marginBottom: 16 } },
              React.createElement(
                "div",
                { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                METRICS.map(m =>
                  React.createElement(
                    "button",
                    {
                      key: m.key,
                      onClick: () => setTrendKey(m.key),
                      style: {
                        padding: "5px 13px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1.5px solid " + (trendKey === m.key ? m.color : "#e5e7eb"),
                        background: trendKey === m.key ? m.color : "#fff",
                        color: trendKey === m.key ? "#fff" : "#6b7280"
                      }
                    },
                    m.label
                  )
                )
              ),
              React.createElement(
                "div",
                { style: { display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 } },
                [["line", "╱ Line"], ["bar", "▬ Bar"]].map(([t, lbl]) =>
                  React.createElement(
                    "button",
                    {
                      key: t,
                      onClick: () => setChartType(t),
                      style: {
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: chartType === t ? "#fff" : "transparent",
                        color: chartType === t ? "#111827" : "#9ca3af",
                        boxShadow: chartType === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                      }
                    },
                    lbl
                  )
                )
              )
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" } },
              React.createElement(
                "div",
                { style: { display: "flex", gap: 4, background: shareBlocked ? "#f8fafc" : "#f1f5f9", borderRadius: 8, padding: 3, opacity: shareBlocked ? 0.5 : 1 } },
                [["absolute", "Absolute"], ["share", "% Share by Channel"]].map(([v, lbl]) =>
                  React.createElement(
                    "button",
                    {
                      key: v,
                      onClick: () => {
                        if (!shareBlocked || v === "absolute") setTrendView(v);
                      },
                      disabled: shareBlocked && v === "share",
                      style: {
                        padding: "5px 14px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: shareBlocked && v === "share" ? "not-allowed" : "pointer",
                        background: trendView === v && !(shareBlocked && v === "share") ? "#fff" : "transparent",
                        color: trendView === v && !(shareBlocked && v === "share") ? "#111827" : "#9ca3af",
                        boxShadow: trendView === v && !(shareBlocked && v === "share") ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        whiteSpace: "nowrap"
                      }
                    },
                    lbl
                  )
                )
              ),
              shareBlocked
                ? React.createElement(
                    "span",
                    { style: { fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 } },
                    React.createElement(
                      "svg",
                      { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "#9ca3af", strokeWidth: "2", strokeLinecap: "round" },
                      React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                      React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
                      React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
                    ),
                    "% share is not meaningful for rate and average metrics"
                  )
                : null
            ),
            trendView === "absolute"
              ? React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    { style: { ...baseCardStyle, marginBottom: 12 } },
                    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 } }, selMetric.label + " — " + periodLabel),
                    React.createElement("div", { style: { fontSize: 11, color: "#9ca3af", marginBottom: 14 } }, market + " · " + chanCat),
                    React.createElement(TrendChart, { data: series, metricKey: trendKey, metric: selMetric, period, chartType, pacing: selectedMetricPacing })
                  ),
                  React.createElement(
                    "div",
                    { style: { display: "grid", gridTemplateColumns: isPhone ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fill,minmax(140px,1fr))", gap: 10 } },
                    ["Peak", "Average", "Latest", "Projected"].map((lbl, li) => {
                      const vals = series.map(d => d[trendKey] || 0);
                      const latest2 = vals.length ? vals[vals.length - 1] : 0;
                      let v = null;

                      if (li === 0) v = vals.length ? Math.max(...vals) : 0;
                      else if (li === 1) v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      else if (li === 2) v = latest2;
                      else {
                        if (!selectedMetricPacing || (period !== "week" && period !== "month") || isRateOrAov(trendKey)) return null;
                        v = selectedMetricPacing.projected ?? latest2;
                      }

                      return React.createElement(
                        "div",
                        { key: lbl, style: { ...baseCardStyle, borderTop: li === 3 ? "2px solid #3b82f6" : "" } },
                        React.createElement("div", { style: { fontSize: 10, color: li === 3 ? "#3b82f6" : "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 } }, lbl + (li === 3 && selectedMetricPacing ? " (hist)" : "")),
                        React.createElement("div", { style: { fontSize: isPhone ? 18 : 20, fontWeight: 700, color: li === 3 ? "#3b82f6" : selMetric.color } }, v !== null ? selMetric.fmt(v) : "—")
                      );
                    })
                  )
                )
              : null,
            trendView === "share" && !shareBlocked
              ? React.createElement(
                  "div",
                  { style: { ...baseCardStyle, padding: "16px 18px 20px" } },
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 } },
                    React.createElement(
                      "div",
                      null,
                      React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 } }, selMetric.label + " — % Share by Channel"),
                      React.createElement("div", { style: { fontSize: 11, color: "#9ca3af" } }, periodLabel + " · " + market)
                    ),
                    React.createElement(
                      "div",
                      { style: { display: "flex", flexWrap: "wrap", gap: 10 } },
                      activeChannels.map(c =>
                        React.createElement(
                          "span",
                          { key: c, style: { display: "flex", alignItems: "center", gap: 5, fontSize: 12 } },
                          React.createElement("span", { style: { width: 24, height: 3, borderRadius: 2, background: CAT_COLORS[c] || "#94a3b8", display: "inline-block" } }),
                          React.createElement("span", { style: { color: "#374151", fontWeight: 600 } }, c)
                        )
                      )
                    )
                  ),
                  React.createElement(MultiLineShareChart, { data: channelShareData.series, channels: channelShareData.channels, period }),
                  activeChannels.length > 0
                    ? React.createElement(
                        "div",
                        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginTop: 16 } },
                        activeChannels.map(c => {
                          const vals = channelShareData.series.map(d => d[c] || 0);
                          const latest = vals.length ? vals[vals.length - 1] : 0;
                          const prev2 = vals.length > 1 ? vals[vals.length - 2] : 0;
                          const chg = prev2 ? ((latest - prev2) / prev2) * 100 : 0;
                          const good = chg >= 0;

                          return React.createElement(
                            "div",
                            { key: c, style: { background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9" } },
                            React.createElement(
                              "div",
                              { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 } },
                              React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[c] || "#94a3b8" } }),
                              React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: "#6b7280" } }, c)
                            ),
                            React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#111827" } }, latest.toFixed(1) + "%"),
                            React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: good ? "#10b981" : "#f43f5e", marginTop: 2 } }, (good ? "▲" : "▼") + Math.abs(chg).toFixed(1) + "% vs prior")
                          );
                        })
                      )
                    : null
                )
              : null
          )
        : null
    ,tab === "vsTarget"
        ? React.createElement(VsTargetTab, {
            filtered,
            rawData,
            targetRows: TARGET_DATA,
            isPhone,
            isTablet
          })
        : null),
    React.createElement(ChatOverlay, {
      open: chatOpen,
      onClose: () => setChatOpen(false),
      rawData,
      period,
      market,
      chanCat
    }),
    React.createElement(
      "button",
      {
        className: "chat-bubble-btn",
        onClick: () => setChatOpen(o => !o),
        style: {
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: chatOpen ? "#374151" : "#111827",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
          zIndex: 1001,
          transition: "background 0.2s"
        }
      },
      chatOpen
        ? React.createElement(
            "svg",
            {
              width: 18,
              height: 18,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "#fff",
              strokeWidth: "2.5",
              strokeLinecap: "round"
            },
            React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
          )
        : React.createElement(
            "svg",
            {
              width: 22,
              height: 22,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "#fff",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round"
            },
            React.createElement("path", { d: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" }),
            React.createElement("path", { d: "M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" }),
            React.createElement("path", { d: "M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z" })
          )
    )
  );
}

export default Dashboard;
