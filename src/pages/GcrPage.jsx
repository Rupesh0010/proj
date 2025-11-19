import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "./GcrPage.css";

// --- START: Helper code from Dashboard ---

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
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const normalized = results.data.map((r) => ({
            ...r,
            month: r.month || (r.Date_of_Service ? dayjs(r.Date_of_Service).format("MMM YY") : (r.Charge_Entry_Date ? dayjs(r.Charge_Entry_Date).format("MMM YY") : "")),
            Billed_Amount: Number(String(r.Billed_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Paid_Amount: Number(String(r.Paid_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Date_of_Service: r.Date_of_Service || null,
            Charge_Entry_Date: r.Charge_Entry_Date || null,
          }));
          resolve(normalized);
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error(`Fetch error for ${filePath}:`, error);
    return [];
  }
};

// --- END: Helper code from Dashboard ---

export default function GcrPage() {
  // State for all data and filters
  const [allChargesData, setAllChargesData] = useState([]);
  const lastDayOfLastMonth = dayjs().subtract(1, 'month').endOf('month');
  const [startDate, setStartDate] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [quickFilter, setQuickFilter] = useState(QUICK_FILTERS.NONE);
  const [selectedClient, setSelectedClient] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [payerPage, setPayerPage] = useState(1);
  const rowsPerPage = 10;
  const payersPerPage = 6;

  // Data loading effect
  useEffect(() => {
    const loadData = async () => {
      try {
        const folders = CLIENT_FOLDERS[selectedClient] || [];
        const paths = folders.map(folder => `/${folder}/charges.csv`);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);
        const combinedCharges = allData.flat();
        setAllChargesData(combinedCharges);
      } catch (err) {
        console.error("Error loading client CSV files:", err);
      }
    };
    loadData();
  }, [selectedClient]);

  // --- NEW: Helper function for K/M currency formatting ---
  const formatCurrencyKM = (value) => {
    if (Math.abs(value) >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return '$' + (value / 1000).toFixed(1) + 'K';
    }
    // Return with commas for values under 1000
    return '$' + value.toLocaleString();
  };

  // Quick filter date calculation effect
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
        start = today.subtract(1, "day");
        end = today.subtract(1, "day");
        break;
      case QUICK_FILTERS.WEEK_LAST_WEEK:
        start = today.subtract(1, "week").startOf("week");
        end = today.subtract(1, "week").endOf("week");
        break;
      case QUICK_FILTERS.MONTH_LAST_MONTH:
        start = today.subtract(1, "month").startOf("month");
        end = today.subtract(1, "month").endOf("month");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_1:
        start = dayjs("2025-01-01");
        end = dayjs("2025-12-31");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_2:
        start = dayjs("2024-01-01");
        end = dayjs("2024-12-31");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_3:
        start = dayjs("2023-01-01");
        end = dayjs("2023-12-31");
        break;
      default:
        return;
    }
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
  }, [quickFilter]);

  // Memoized filtering logic
  const { filteredCharges, prevCharges } = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const duration = end.diff(start, 'day');
    const prevEnd = start.subtract(1, 'day');
    const prevStart = prevEnd.subtract(duration, 'day');

    const filterByDate = (data) => {
      const current = data.filter((r) => {
        const postedDate = dayjs(r.Charge_Entry_Date);
        return postedDate.isValid() && postedDate.isBetween(start, end, null, '[]');
      });
      const previous = data.filter((r) => {
        const postedDate = dayjs(r.Charge_Entry_Date);
        return postedDate.isValid() && postedDate.isBetween(prevStart, prevEnd, null, '[]');
      });
      return { current, previous };
    };
    const { current, previous } = filterByDate(allChargesData);
    return { filteredCharges: current, prevCharges: previous };
  }, [allChargesData, startDate, endDate]);

  // Memoized KPI calculations
  const kpiMetrics = useMemo(() => {
    const getMetrics = (dataset) => {
      if (!dataset || dataset.length === 0) return { totalBilled: 0, totalPaid: 0, gcr: 0 };
      const totalBilled = dataset.reduce((sum, d) => sum + d.Billed_Amount, 0);
      const totalPaid = dataset.reduce((sum, d) => sum + d.Paid_Amount, 0);
      const gcr = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;
      return { totalBilled, totalPaid, gcr };
    };
    const mainMetrics = getMetrics(filteredCharges);
    return {
      overallGcr: mainMetrics.gcr.toFixed(2),
      totalPaid: mainMetrics.totalPaid,
      totalBilled: mainMetrics.totalBilled,
    };
  }, [filteredCharges]);

  // Memoized chart data calculations...
  const filteredMonthlyData = useMemo(() => {
    const INDUSTRY_STANDARD_GCR_TARGET = 40;
    const monthlyAggregated = {};
    filteredCharges.forEach((d) => {
      const postedDate = dayjs(d.Charge_Entry_Date);
      if (!postedDate.isValid()) return;
      const month = postedDate.format("MMM YY");
      if (!monthlyAggregated[month]) {
        monthlyAggregated[month] = { billed: 0, paid: 0, date: postedDate.startOf('month') };
      }
      monthlyAggregated[month].billed += d.Billed_Amount || 0;
      monthlyAggregated[month].paid += d.Paid_Amount || 0;
    });
    return Object.entries(monthlyAggregated)
      .sort(([, a], [, b]) => a.date.unix() - b.date.unix())
      .map(([month, vals]) => ({
        month,
        actual: +(vals.billed > 0 ? (vals.paid / vals.billed) * 100 : 0).toFixed(2),
        target: INDUSTRY_STANDARD_GCR_TARGET,
      }));
  }, [filteredCharges]);

  // ================================================================
  // === START: MODIFIED LOGIC (NOW DEPENDENT ON DATE FILTER) ===
  // ===============================================================

  const avgVsLastMonthGcrData = useMemo(() => {
    const calculateGCR = (dataset) => {
      if (!dataset || dataset.length === 0) return 0;
      const totalPaid = dataset.reduce((sum, d) => sum + d.Paid_Amount, 0);
      const totalBilled = dataset.reduce((sum, d) => sum + d.Billed_Amount, 0);
      return totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;
    };
    if (!allChargesData.length) return [];
    const referenceDate = dayjs(endDate);  // e.g., September 30, 2024
    const lastMonthDate = referenceDate.subtract(1, 'month');  // e.g., August 30, 2024
    const lastMonthStr = lastMonthDate.format("MMM YY");  // e.g., "Aug 24"
    // New logic for Prev 3 Months: Based on the three months before lastMonthDate
    const avgPeriodStart = lastMonthDate.subtract(3, 'month').startOf('month');  // e.g., August 1 - 3 months = May 1, 2024
    const avgPeriodEnd = lastMonthDate.subtract(1, 'month').endOf('month');  // e.g., August 1 - 1 month = July 1, then endOf('month') = July 31, 2024
    const lastMonthData = allChargesData.filter(d => d.month === lastMonthStr);  // Still filters for the previous month (e.g., August)
    const prev3MonthsData = allChargesData.filter(d => {
      const chargeDate = dayjs(d.Charge_Entry_Date);
      return chargeDate.isValid() && chargeDate.isBetween(avgPeriodStart, avgPeriodEnd, null, '[]');  // e.g., May 1 to July 31
    });
    const lastMonthGcr = calculateGCR(lastMonthData);
    const prev3MonthsGcr = calculateGCR(prev3MonthsData);
    return [
      { label: "Prev 3 Months GCR", gcr: +prev3MonthsGcr.toFixed(2) },
      { label: `Last Month GCR (${lastMonthStr})`, gcr: +lastMonthGcr.toFixed(2) },
    ];
  }, [allChargesData, endDate]);

  // ===============================
  // === END: MODIFIED LOGIC ===
  // ==============================================================

  const filteredPayerData = useMemo(() => {
    const aggregated = filteredCharges.reduce((acc, d) => {
      const payer = d.Payer_Name || "Unknown";
      if (!acc[payer]) acc[payer] = { name: payer, payments: 0 };
      acc[payer].payments += d.Paid_Amount || 0;
      return acc;
    }, {});
    return Object.values(aggregated).filter(payerData => payerData.payments > 0);
  }, [filteredCharges]);

  // Pagination calculations
  const payerStartIndex = (payerPage - 1) * payersPerPage;
  const payerEndIndex = payerStartIndex + payersPerPage;
  const currentPayers = filteredPayerData.slice(payerStartIndex, payerEndIndex);
  const totalPages = Math.ceil(filteredCharges.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentData = filteredCharges.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="gcr-container">
      <h1 className="gcr-title">Gross Collection Rate (GCR) Dashboard</h1>

      {/* --- START: Combined Header with Boxes and Filters --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Part 1: Summary Boxes */}
        <div className="summary-boxes" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="summary-box">
            <h4>Overall GCR</h4>
            <p>{kpiMetrics.overallGcr}%</p>
          </div>
          <div className="summary-box">
            <h4>Total Payment</h4>
            <p>{formatCurrencyKM(kpiMetrics.totalPaid)}</p>
          </div>
          <div className="summary-box">
            <h4>Total Billed</h4>
            <p>{formatCurrencyKM(kpiMetrics.totalBilled)}</p>
          </div>
        </div>

        {/* Part 2: Filters */}
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
      {/* --- END: Combined Header --- */}

      <div className="charts">
        <div className="chart-card">
          <h3>Monthly GCR Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filteredMonthlyData} margin={{ top: 5, right: 15, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#111" interval={0} tick={{ fontSize: 10 }} />
              <YAxis stroke="#111" tickFormatter={(tick) => `${tick}%`} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#10b981" name="Actual GCR" />
              <Line type="monotone" dataKey="target" stroke="#f43f5e" name="Target GCR" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Avg 3 Months vs Last Month GCR</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgVsLastMonthGcrData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#111" />
              <YAxis stroke="#111" tickFormatter={(tick) => `${tick}%`} />
              <Tooltip />
              <Bar dataKey="gcr" fill="#10b981" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ position: "relative" }}>
          <h3>Payer Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={currentPayers} margin={{ top: 5, right: 15, bottom: 0, left: -50 }} >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#111" tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`} />
              <YAxis dataKey="name" type="category" stroke="#111" width={180} interval={0} tick={{ fontSize: 8.5 }} />
              <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="payments" fill="#10b981" barSize={7} name="Payments ($)" />
            </BarChart>
          </ResponsiveContainer>
          <button
            disabled={payerPage <= 1}
            onClick={() => setPayerPage((p) => Math.max(p - 1, 1))}
            style={{
              position: "absolute",
              top: "50%",
              left: 5,
              transform: "translateY(-50%)",
              fontSize: 16,
              fontWeight: "bold",
              background: "none",
              border: "none",
              cursor: payerPage <= 1 ? "not-allowed" : "pointer",
              color: "#111",
            }}
          >
            {"<"}
          </button>

          {/* Right Arrow */}
          <button
            disabled={payerEndIndex >= filteredPayerData.length}
            onClick={() => setPayerPage((p) => p + 1)}
            style={{
              position: "absolute",
              top: "50%",
              right: 5,
              transform: "translateY(-50%)",
              fontSize: 16,
              fontWeight: "bold",
              background: "none",
              border: "none",
              cursor:
                payerEndIndex >= filteredPayerData.length ? "not-allowed" : "pointer",
              color: "#111",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      <div className="claim-table">
        <div className="claim-table-header"><h3>Claim Level Details</h3></div>
        <div className="claim-table-body">
          <table>
            <thead>
              <tr>
                {["Claim ID", "Billed Amount ($)", "Paid Amount ($)", "Entry Date", "Payer"].map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={`${row.Claim_ID}-${index}`}>
                  <td>{row.Claim_ID}</td>
                  <td>{row.Billed_Amount.toLocaleString()}</td>
                  <td>{row.Paid_Amount.toLocaleString()}</td>
                  <td>{row.Charge_Entry_Date}</td>
                  <td>{row.Payer_Name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
          <span> Page {currentPage} of {totalPages} </span>
          <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
        </div>
      </div>
    </div>
  );
}