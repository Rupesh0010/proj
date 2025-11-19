import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import "./GcrPage.css";

// --- START: Helper code ---

dayjs.extend(isBetween);

const QUICK_FILTERS = {
  NONE: "none",
  DAY_PREV_DAY: "day_prev_day",
  WEEK_LAST_WEEK: "week_last_week",
  MONTH_LAST_MONTH: "month_last_month",
  YEAR_PREV_YEAR_1: "year_prev_1",
  YEAR_PREV_YEAR_2: "year_prev_2",
  YEAR_PREV_YEAR_3: "year_prev_3",
};

const CLIENT_FOLDERS = {
  all: ["entfw", "eca", "soundhealth"],
  entfw: ["entfw"],
  eca: ["eca"],
  soundhealth: ["soundhealth"],
};

const parseCSV = async (filePath) => {
  try {
    const res = await fetch(filePath);
    if (!res.ok) {
      console.warn(`Failed to fetch ${filePath}: ${res.statusText} - Skipping file`);
      return [];
    }
    const text = await res.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data.map((row) => ({
            Claim_ID: row.Claim_ID || 'N/A',
            Client: row.Client || 'Unknown',
            Charge_Entry_Date: row.Charge_Entry_Date,
            Date_of_Service: row.Date_of_Service,
            Claim_Submission_Date: row.Claim_Submission_Date,
            Billed_Amount: Number(String(row.Billed_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Paid_Amount: Number(String(row.Paid_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            visit: Number(row.visit || "0"), // Correctly using lowercase 'visit' from CSV
            Payer_Name: row.Payer_Name || "Unknown",
            month: row.Charge_Entry_Date ? dayjs(row.Charge_Entry_Date).format("MMM YY") : "",  // Changed to Charge_Entry_Date
          }));
          resolve(parsed);
        },
        error: (error) => reject(error),
      });
    });
  } catch (error) {
    console.error(`Fetch error for ${filePath}:`, error);
    return [];
  }
};

// --- END: Helper code ---

const formatCurrencyKM = (value) => {
  if (Math.abs(value) >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  }
  return '$' + value.toLocaleString();
};

const TrendIndicator = ({ trendInfo }) => {
  const { trend, percentage } = trendInfo;
  if (!trend || trend === "steady" || !percentage) return null;
  const isIncrease = trend === "increase";
  const color = isIncrease ? "#10b981" : "#ef4444";
  return (
    <div style={{ position: "absolute", bottom: "10px", right: "15px", fontSize: "1em", fontWeight: "500", display: "flex", alignItems: "center", color }}>
      <span style={{ marginRight: "4px" }}>{isIncrease ? "▲" : "▼"}</span>
      <span>{isIncrease ? "+" : ""}{percentage}%</span>
    </div>
  );
};

export default function TotalPage() {
  const [allClaimsData, setAllClaimsData] = useState([]);
  const lastDayOfLastMonth = dayjs().subtract(1, 'month').endOf('month');
  const [startDate, setStartDate] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [quickFilter, setQuickFilter] = useState(QUICK_FILTERS.NONE);
  const [selectedClient, setSelectedClient] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [payerPage, setPayerPage] = useState(1);
  const rowsPerPage = 10;
  const payersPerPage = 5;

  useEffect(() => {
    const loadData = async () => {
      try {
        const folders = CLIENT_FOLDERS[selectedClient] || [];
        const paths = folders.map(folder => `/${folder}/charges.csv`);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);
        setAllClaimsData(allData.flat());
      } catch (err) {
        console.error("Error loading client CSV files:", err);
      }
    };
    loadData();
  }, [selectedClient]);

  useEffect(() => {
    if (quickFilter === QUICK_FILTERS.NONE) {
      const lastDayOfLastMonth = dayjs().subtract(1, 'month').endOf('month');  // e.g., September 30, 2024
      const startOfThreeMonthsAgo = lastDayOfLastMonth.subtract(2, 'month').startOf('month');  // e.g., July 1, 2024
      setStartDate(startOfThreeMonthsAgo.format("YYYY-MM-DD"));  // e.g., July 1, 2024
      setEndDate(lastDayOfLastMonth.format("YYYY-MM-DD"));  // e.g., September 30, 2024
      return;
    }
    const today = dayjs();
    let start, end;
    switch (quickFilter) {
      case QUICK_FILTERS.DAY_PREV_DAY:
        start = today.subtract(1, "day"); end = today.subtract(1, "day"); break;
      case QUICK_FILTERS.WEEK_LAST_WEEK:
        start = today.subtract(1, "week").startOf("week"); end = today.subtract(1, "week").endOf("week"); break;
      case QUICK_FILTERS.MONTH_LAST_MONTH:
        start = today.subtract(1, "month").startOf("month"); end = today.subtract(1, "month").endOf("month"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_1:
        start = dayjs().year(2025).startOf('year'); end = dayjs().year(2025).endOf('year'); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_2:
        start = dayjs().year(2024).startOf('year'); end = dayjs().year(2024).endOf('year'); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_3:
        start = dayjs().year(2023).startOf('year'); end = dayjs().year(2023).endOf('year'); break;
      default: return;
    }
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
  }, [quickFilter]);

  const { filteredData, prevPeriodData } = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const duration = end.diff(start, 'day');
    const prevEnd = start.subtract(1, 'day');
    const prevStart = prevEnd.subtract(duration, 'day');
    const dateColumnToFilter = (d) => d.Charge_Entry_Date;  // Changed to Charge_Entry_Date

    const current = allClaimsData.filter(d => {
      const claimDate = dayjs(dateColumnToFilter(d));
      return claimDate.isValid() && claimDate.isBetween(start, end, null, '[]');
    });
    const previous = allClaimsData.filter(d => {
      const claimDate = dayjs(dateColumnToFilter(d));
      return claimDate.isValid() && claimDate.isBetween(prevStart, prevEnd, null, '[]');
    });
    return { filteredData: current, prevPeriodData: previous };
  }, [allClaimsData, startDate, endDate]);

  const kpiMetrics = useMemo(() => {
    const getTrendDetails = (currentVal, prevVal) => {
      let trend = "steady";
      if (prevVal === 0 && currentVal > 0) trend = "increase";
      else if (currentVal > prevVal) trend = "increase";
      else if (currentVal < prevVal) trend = "decrease";

      let percentage = null;
      if (prevVal > 0) {
        percentage = (((currentVal - prevVal) / prevVal) * 100).toFixed(1);
      }
      return { trend, percentage };
    };

    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const duration = end.diff(start, 'day');
    const prevEnd = start.subtract(1, 'day');
    const prevStart = prevEnd.subtract(duration, 'day');

    const calculateTotalVisits = (dataset, fromDate, toDate) => {
      const filteredForVisits = dataset.filter(d => {
        const entryDate = dayjs(d.Charge_Entry_Date);
        return entryDate.isValid() && entryDate.isBetween(fromDate, toDate, null, '[]');
      });
      const total = filteredForVisits.reduce((sum, d) => sum + d.visit, 0);
      return Math.round(total);
    };

    const currentTotalVisits = calculateTotalVisits(allClaimsData, start, end);
    const prevTotalVisits = calculateTotalVisits(allClaimsData, prevStart, prevEnd);

    const mainBilled = filteredData.reduce((sum, d) => sum + d.Billed_Amount, 0);
    const mainPaid = filteredData.reduce((sum, d) => sum + d.Paid_Amount, 0);

    const prevBilled = prevPeriodData.reduce((sum, d) => sum + d.Billed_Amount, 0);
    const prevPaid = prevPeriodData.reduce((sum, d) => sum + d.Paid_Amount, 0);

    return {
      totalClaims: currentTotalVisits,
      totalBilled: mainBilled,
      totalPaid: mainPaid,
      claimsTrend: getTrendDetails(currentTotalVisits, prevTotalVisits),
      billedTrend: getTrendDetails(mainBilled, prevBilled),
      paidTrend: getTrendDetails(mainPaid, prevPaid),
    };
  }, [allClaimsData, filteredData, prevPeriodData, startDate, endDate]);

  const filteredMonthlyData = useMemo(() => {
    const monthlyAggregated = {};
    filteredData.forEach(d => {
      if (d.month) {
        if (!monthlyAggregated[d.month]) {
          monthlyAggregated[d.month] = { totalVisits: 0, date: dayjs(d.Charge_Entry_Date).startOf('month') };  // Sum visits instead of count
        }
        monthlyAggregated[d.month].totalVisits += d.visit || 0;  // Sum the visit values
      }
    });
    return Object.entries(monthlyAggregated)
      .sort(([, a], [, b]) => a.date.unix() - b.date.unix())
      .map(([month, { totalVisits }]) => ({ month, actual: Math.round(totalVisits) }));  // Use summed visits
  }, [filteredData]);

  const avgVsLastMonthData = useMemo(() => {
    if (!allClaimsData.length) return [];
    const referenceDate = dayjs(endDate);
    const lastMonthStr = referenceDate.format("MMM YY");
    const avgPeriodStart = referenceDate.subtract(3, 'month').startOf('month');
    const avgPeriodEnd = referenceDate.subtract(1, 'month').endOf('month');
    const lastMonthClaimsData = allClaimsData.filter(d => d.month === lastMonthStr);
    const prev3MonthsClaimsData = allClaimsData.filter(d => {
      const claimDate = dayjs(d.Charge_Entry_Date);
      return claimDate.isValid() && claimDate.isBetween(avgPeriodStart, avgPeriodEnd, null, '[]');
    });

    const lastMonthTotalVisits = lastMonthClaimsData.reduce((sum, d) => sum + d.visit, 0);  // Sum visits for last month
    const prev3MonthsTotalVisits = prev3MonthsClaimsData.reduce((sum, d) => sum + d.visit, 0);  // Sum visits for prev 3 months
    const avg3MonthsValue = prev3MonthsClaimsData.length > 0 ? prev3MonthsTotalVisits / 3 : 0;  // Average the summed visits

    return [
      { label: "Prev 3 Months Avg", claims: Math.round(avg3MonthsValue) },  // Average of summed visits
      { label: `Last Month (${lastMonthStr})`, claims: Math.round(lastMonthTotalVisits) },  // Sum of visits
    ];
  }, [allClaimsData, endDate]);

  const filteredPayerData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(d => {
      if (!grouped[d.Payer_Name]) grouped[d.Payer_Name] = { name: d.Payer_Name, claims: 0 };
      grouped[d.Payer_Name].claims += d.visit || 0;  // Sum visits instead of counting claims
    });
    return Object.values(grouped);
  }, [filteredData]);

  const payerStartIndex = (payerPage - 1) * payersPerPage;
  const payerEndIndex = payerStartIndex + payersPerPage;
  const currentPayers = filteredPayerData.slice(payerStartIndex, payerEndIndex);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );


  return (
    <div className="gcr-container">
      <h1 className="gcr-title">Total Claims Dashboard</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="summary-boxes" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Total Claims</h4>
            <p>{kpiMetrics.totalClaims.toLocaleString()}</p>
          </div>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Total Billed</h4>
            <p>{formatCurrencyKM(kpiMetrics.totalBilled)}</p>
          </div>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Total Paid</h4>
            <p>{formatCurrencyKM(kpiMetrics.totalPaid)}</p>
          </div>
        </div>

        <div className="filters" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>From Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>To Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Quick Filter</label>
            <select value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }}>
              <option value={QUICK_FILTERS.NONE}>No Filter</option>
              <option value={QUICK_FILTERS.DAY_PREV_DAY}>Previous Day</option>
              <option value={QUICK_FILTERS.WEEK_LAST_WEEK}>Last Week</option>
              <option value={QUICK_FILTERS.MONTH_LAST_MONTH}>Last Month</option>
              <option value={QUICK_FILTERS.YEAR_PREV_YEAR_1}>Year 2025</option>
              <option value={QUICK_FILTERS.YEAR_PREV_YEAR_2}>Year 2024</option>
              <option value={QUICK_FILTERS.YEAR_PREV_YEAR_3}>Year 2023</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Client</label>
            <select value={selectedClient} onChange={(e) => { setSelectedClient(e.target.value); setCurrentPage(1); setPayerPage(1); }} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }}>
              <option value="all">All</option>
              <option value="entfw">ENTFW</option>
              <option value="eca">ECA</option>
              <option value="soundhealth">SOUND HEALTH</option>
            </select>
          </div>
        </div>
      </div>

      <div className="charts">
        <div className="chart-card">
          <h3>Monthly Claims</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filteredMonthlyData} margin={{ top: 5, right: 15, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#111" interval={0} tick={{ fontSize: 10 }} />
              <YAxis stroke="#111" tickFormatter={value => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" name="Total Claims" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Avg 3 Months vs Last Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgVsLastMonthData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#111" />
              <YAxis stroke="#111" tickFormatter={value => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)} />
              <Tooltip />
              <Bar dataKey="claims" fill="#3b82f6" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ position: "relative" }}>
          <h3>Claims Breakdown by Payer</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={currentPayers} margin={{ top: 5, right: 10, bottom: 0, left: -40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#111" tickFormatter={value => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)} />
              <YAxis dataKey="name" type="category" stroke="#111" width={180} interval={0} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="claims" fill="#3b82f6" barSize={8} name="Claims" />
            </BarChart>
          </ResponsiveContainer>
          <button disabled={payerPage <= 1} onClick={() => setPayerPage(p => Math.max(p - 1, 1))} style={{ position: "absolute", top: "50%", left: 5, transform: "translateY(-50%)", fontSize: 22, fontWeight: "bold", background: "none", border: "none", cursor: "pointer", color: payerPage <= 1 ? "#ccc" : "#111" }}>{"<"}</button>
          <button disabled={payerEndIndex >= filteredPayerData.length} onClick={() => setPayerPage(p => p + 1)} style={{ position: "absolute", top: "50%", right: 5, transform: "translateY(-50%)", fontSize: 22, fontWeight: "bold", background: "none", border: "none", cursor: "pointer", color: payerEndIndex >= filteredPayerData.length ? "#ccc" : "#111" }}>{">"}</button>
        </div>
      </div>

      <div className="claim-table">
        <div className="claim-table-header"><h3>Claim Level Details</h3></div>
        <div className="claim-table-body">
          <table>
            <thead>
              <tr>
                {["Claim ID", "Billed Amount ($)", "Paid Amount ($)", "Submission Date", "Payer"].map(header => (<th key={header}>{header}</th>))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={`${row.Claim_ID}-${index}`}>
                  <td>{row.Claim_ID}</td>
                  <td>{row.Billed_Amount.toLocaleString()}</td>
                  <td>{row.Paid_Amount.toLocaleString()}</td>
                  <td>{row.Claim_Submission_Date}</td>
                  <td>{row.Payer_Name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
          <span> Page {currentPage} of {totalPages || 1} </span>
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
        </div>
      </div>
    </div>
  );
}