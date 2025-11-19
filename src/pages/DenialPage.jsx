import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import "./GcrPage.css";

// --- START: Standardized Helper Code ---

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
          // Log full headers for debugging
          console.log(`CSV headers for ${filePath}:`, results.meta.fields);

          // Handle duplicates: Log if any renamed
          if (results.meta.fields.some(field => field.includes('_'))) {
            console.warn(`Duplicate headers detected in ${filePath} (renamed by PapaParse). Check CSV for duplicates.`);
          }

          const parsed = results.data.map((row) => {
            // Flexible Payer_Name: Try exact, renames (e.g., _1), alternatives, trim
            let payerName = row.Payer_Name ||
              row['Payer_Name_1'] || row['Payer_Name_2'] ||  // Handle duplicates
              row.Payer || row['Payer_1'] ||
              row["Payer Name"] || row.Insurance || row["Insurance Provider"] ||
              "Unknown";
            if (payerName && typeof payerName === 'string') {
              payerName = payerName.trim();
            }
            if (!payerName || payerName === '') payerName = "Unknown";

            // Warn if fallback used
            if (payerName === "Unknown" && results.meta.fields.some(h => h.toLowerCase().includes('payer'))) {
              console.warn(`No valid payer name in row for ${filePath}. Headers:`, results.meta.fields);
            }

            const parsedRow = {
              Denial_ID: row.Denial_ID || 'N/A',
              Client: row.Client || "Unknown",
              Date_of_Service: row.Date_of_Service,
              Claim_ID: row.Claim_ID || 'N/A',
              Reason: row.Reason || "N/A",
              Claim_Status: row.Claim_Status || "Unknown",
              Denial_Amount: Number(String(row.Denial_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
              Payer_Name: payerName,
              month: row.Date_of_Service ? dayjs(row.Date_of_Service).format("MMM YY") : "",
            };
            return parsedRow;
          });

          // FIXED: Log sample AFTER map completes (no more scoping error)
          if (parsed.length > 0) {
            console.log(`Sample parsed row from ${filePath} (first one):`, parsed[0]);
            console.log(`Total rows parsed from ${filePath}:`, parsed.length);
          } else {
            console.warn(`No rows parsed from ${filePath} - check CSV content.`);
          }

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

const TrendIndicator = ({ trendInfo, isIncreaseGood = true }) => {
  const { trend, percentage } = trendInfo;
  if (!trend || trend === "steady" || !percentage) return null;
  const isIncrease = trend === "increase";
  const isGood = isIncrease === isIncreaseGood;
  const color = isGood ? "#10b981" : "#ef4444";
  return (
    <div style={{ position: "absolute", bottom: "10px", right: "15px", fontSize: "1em", fontWeight: "500", display: "flex", alignItems: "center", color }}>
      <span style={{ marginRight: "4px" }}>{isIncrease ? "▲" : "▼"}</span>
      <span>{isIncrease ? "+" : ""}{percentage}%</span>
    </div>
  );
};

const formatCurrencyKM = (value) => {
  if (isNaN(value)) return '$0';
  if (Math.abs(value) >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  }
  return '$' + value.toLocaleString();
};

// --- END: Standardized Helper Code ---

export default function DenialRatePage() {
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
        const paths = folders.map(folder => `/${folder}/denial.csv`);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);
        const flatData = allData.flat();
        setAllClaimsData(flatData);
        console.log(`Total denials loaded for ${selectedClient}:`, flatData.length);  // New log for total
      } catch (err) {
        console.error("Error loading CSV files:", err);
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
    const dateColumnToFilter = (d) => d.Date_of_Service;
    const current = allClaimsData.filter(d => {
      const claimDate = dayjs(dateColumnToFilter(d));
      const isValidDate = claimDate.isValid();
      if (!isValidDate) {
        console.warn(`Invalid date in row: ${dateColumnToFilter(d)}`);  // Log bad dates
      }
      return isValidDate && claimDate.isBetween(start, end, null, '[]');
    });
    const previous = allClaimsData.filter(d => {
      const claimDate = dayjs(dateColumnToFilter(d));
      return claimDate.isValid() && claimDate.isBetween(prevStart, prevEnd, null, '[]');
    });
    console.log(`Filtered data length: ${current.length} (date range: ${startDate} to ${endDate})`);  // New log
    return { filteredData: current, prevPeriodData: previous };
  }, [allClaimsData, startDate, endDate]);

  const kpiMetrics = useMemo(() => {
    const getMetrics = (dataset) => {
      const deniedClaims = dataset.filter(d => d.Claim_Status && d.Claim_Status.toLowerCase().includes("denied"));  // FIXED: .includes() for flexibility
      const totalDenials = deniedClaims.length;
      const totalDeniedAmount = deniedClaims.reduce((sum, d) => sum + d.Denial_Amount, 0);
      const totalClaims = dataset.length;
      const denialRate = totalClaims > 0 ? (totalDenials / totalClaims) * 100 : 0;
      return { totalDenials, totalDeniedAmount, denialRate };
    };
    const main = getMetrics(filteredData);
    const prev = getMetrics(prevPeriodData);
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
    return {
      totalDenials: main.totalDenials,
      totalDeniedAmount: main.totalDeniedAmount,
      denialRate: main.denialRate,
      denialTrend: getTrendDetails(main.totalDenials, prev.totalDenials),
      deniedAmountTrend: getTrendDetails(main.totalDeniedAmount, prev.totalDeniedAmount),
      rateTrend: getTrendDetails(main.denialRate, prev.denialRate),
    };
  }, [filteredData, prevPeriodData]);

  const denialData = useMemo(() => {
    const denied = filteredData.filter(d => d.Claim_Status && d.Claim_Status.toLowerCase().includes("denied"));  // FIXED: .includes()
    // New log: Unique Claim_Status and sample
    const uniqueStatuses = [...new Set(filteredData.map(d => d.Claim_Status))];
    console.log('Unique Claim_Status values in filteredData:', uniqueStatuses);
    console.log('Sample filteredData Claim_Status and Payer_Name:', filteredData.slice(0, 3).map(d => ({ status: d.Claim_Status, payer: d.Payer_Name })));
    console.log('denialData length after filter:', denied.length);
    return denied;
  }, [filteredData]);

  const filteredMonthlyData = useMemo(() => {
    const monthlyAggregated = {};
    denialData.forEach(d => {
      if (d.month) {
        if (!monthlyAggregated[d.month]) {
          monthlyAggregated[d.month] = { count: 0, date: dayjs(d.Date_of_Service).startOf('month') };
        }
        monthlyAggregated[d.month].count++;
      }
    });
    return Object.entries(monthlyAggregated)
      .sort(([, a], [, b]) => a.date.unix() - b.date.unix())
      .map(([month, { count }]) => ({ month, denials: count }));
  }, [denialData]);

  const avgVsLastMonthData = useMemo(() => {
    const allDeniedClaims = allClaimsData.filter(d => d.Claim_Status && d.Claim_Status.toLowerCase().includes("denied"));
    if (!allDeniedClaims.length) return [];

    const referenceDate = dayjs(endDate);
    const lastMonthStr = referenceDate.format("MMM YY");
    const avgPeriodStart = referenceDate.subtract(3, 'month').startOf('month');
    const avgPeriodEnd = referenceDate.subtract(1, 'month').endOf('month');

    const lastMonthData = allDeniedClaims.filter(d => d.month === lastMonthStr);
    const prev3MonthsData = allDeniedClaims.filter(d => {
      const claimDate = dayjs(d.Date_of_Service);
      return claimDate.isValid() && claimDate.isBetween(avgPeriodStart, avgPeriodEnd, null, '[]');
    });

    const avg3 = prev3MonthsData.length > 0 ? prev3MonthsData.length / 3 : 0;

    return [
      { label: "Prev 3 Months Avg", denials: Math.round(avg3) },
      { label: `Last Month (${lastMonthStr})`, denials: lastMonthData.length },
    ];
  }, [allClaimsData, endDate]);

  const aggregatedPayerData = useMemo(() => {
    console.log('Sample denialData for payers (first 5):', denialData.slice(0, 5).map(d => ({ status: d.Claim_Status, payer: d.Payer_Name })));  // Enhanced sample log

    const map = {};
    denialData.forEach((item) => {
      let payerName = (item.Payer_Name || "Unknown").trim();
      if (!payerName || payerName === '') payerName = "Unknown";

      if (!map[payerName]) {
        map[payerName] = { name: payerName, denials: 0 };
      }
      map[payerName].denials++;
    });

    const result = Object.values(map)
      .sort((a, b) => b.denials - a.denials)  // Sort by denials descending (top payers first)
      .slice(0, 50);  // Limit to top 50 for chart performance (if many unique payers)

    console.log('Aggregated payers:', result);  // Final log
    return result;
  }, [denialData]);

  const totalPages = Math.ceil(denialData.length / rowsPerPage);
  const currentData = denialData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const payerStartIndex = (payerPage - 1) * payersPerPage;
  const currentPayers = aggregatedPayerData.slice(payerStartIndex, payerStartIndex + payersPerPage);

  return (
    <div className="gcr-container">
      <h1 className="gcr-title">Denial Rate Dashboard</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="summary-boxes" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Total Denials</h4>
            <p>{kpiMetrics.totalDenials.toLocaleString()}</p>
            {/* Add TrendIndicator if needed: <TrendIndicator trendInfo={kpiMetrics.denialTrend} /> */}
          </div>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Total Denied Amount</h4>
            <p>{formatCurrencyKM(kpiMetrics.totalDeniedAmount)}</p>
            {/* <TrendIndicator trendInfo={kpiMetrics.deniedAmountTrend} isIncreaseGood={false} /> */}
          </div>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Denial Rate</h4>
            <p>{kpiMetrics.denialRate.toFixed(2)}%</p>
            {/* <TrendIndicator trendInfo={kpiMetrics.rateTrend} isIncreaseGood={false} /> */}
          </div>
        </div>
        <div className="filters" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Quick Filter</label>
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }}
            >
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
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setCurrentPage(1);
                setPayerPage(1);
              }}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", width: '160px' }}
            >
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
          <h3>Monthly Denials</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filteredMonthlyData} margin={{ top: 5, right: 15, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#111" interval={0} tick={{ fontSize: 10 }} />
              <YAxis stroke="#111" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="denials" stroke="#ef4444" name="Denials" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3>Avg 3 Months vs Last Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgVsLastMonthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="denials" fill="#ef4444" barSize={40} name="Denials" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card" style={{ position: "relative" }}>
          <h3>Payer Denial Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={currentPayers} margin={{ top: 5, right: 10, bottom: 0, left: -50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" stroke="#111" />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#111"
                width={180}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="denials" fill="#ef4444" barSize={10} name="Denied Claims" />
              {/* Fallback for empty data */}
              {currentPayers.length === 0 && (
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#999"
                  fontSize={14}
                >
                  No payer data available (check filters or CSV)
                </text>
              )}
            </BarChart>
          </ResponsiveContainer>
          {aggregatedPayerData.length > payersPerPage && (
            <>
              <button
                disabled={payerPage <= 1}
                onClick={() => setPayerPage((p) => Math.max(p - 1, 1))}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 5,
                  transform: "translateY(-50%)",
                  fontSize: 22,
                  fontWeight: "bold",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: payerPage <= 1 ? "#ccc" : "#111"
                }}
              >
                {"<"}
              </button>
              <button
                disabled={payerPage * payersPerPage >= aggregatedPayerData.length}
                onClick={() => setPayerPage((p) => p + 1)}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 5,
                  transform: "translateY(-50%)",
                  fontSize: 22,
                  fontWeight: "bold",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: payerPage * payersPerPage >= aggregatedPayerData.length ? "#ccc" : "#111"
                }}
              >
                {">"}
              </button>
            </>
          )}
          {aggregatedPayerData.length > 0 && (
            <div style={{ position: "absolute", bottom: "10px", left: "10px", fontSize: "0.9em", color: "#666" }}>
              {/* Showing {payerStartIndex + 1}-{Math.min(payerStartIndex + payersPerPage, aggregatedPayerData.length)} of {aggregatedPayerData.length} payers */}
            </div>
          )}
        </div>
      </div>
      <div className="claim-table">
        <div className="claim-table-header">
          <h3>Denied Claim Details</h3>
          {denialData.length === 0 && <span style={{ color: "#999", fontSize: "0.9em", marginLeft: "10px" }}>(No denied claims in selected range)</span>}
        </div>
        <div className="claim-table-body">
          <table>
            <thead>
              <tr>
                {["Claim ID", "Denied Amount", "Date of Service", "Claim Status", "Payer Name"].map((header) => (  // Added Payer Name to table
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#999", padding: "20px" }}>
                    No data to display
                  </td>
                </tr>
              ) : (
                currentData.map((row, i) => (
                  <tr key={`${row.Denial_ID}-${i}`}>
                    <td>{row.Claim_ID}</td>
                    <td>{formatCurrencyKM(row.Denial_Amount)}</td>
                    <td>{row.Date_of_Service}</td>
                    <td>{row.Claim_Status}</td>
                    <td>{row.Payer_Name}</td>  {/* Added Payer Name column */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1 || totalPages === 0}>
            &lt;
          </button>
          <span> Page {currentPage} of {totalPages || 1} </span>
          <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

