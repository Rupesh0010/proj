import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./GcrPage.css";

const TrendIndicator = ({ trendInfo }) => {
  const { trend, percentage } = trendInfo;
  if (!trend || trend === "steady") return null;
  const isIncrease = trend === "increase";
  const color = isIncrease ? "#10b981" : "#ef4444";
  const arrow = isIncrease ? "▲" : "▼";
  const sign = isIncrease ? "+" : "";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        right: 15,
        fontSize: "1em",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        color,
      }}
    >
      <span style={{ marginRight: 4 }}>{arrow}</span>
      {percentage !== null && <span>{sign}{percentage}%</span>}
    </div>
  );
};

export default function FprPage() {
  const [data, setData] = useState([]);
  const [selectedClient, setSelectedClient] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Pagination state for payer breakdown
  const [payerPage, setPayerPage] = useState(1);
  const payersPerPage = 5;

  useEffect(() => {
    fetch("/sample-data.csv")
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data.map((row) => ({
              id: row.Claim_ID,
              isFirstPass:
                row.Is_First_Pass_Resolution === true ||
                row.Is_First_Pass_Resolution === 1 ||
                String(row.Is_First_Pass_Resolution).toLowerCase() === "true" ||
                String(row.Is_First_Pass_Resolution).trim() === "1",
              billed: parseFloat(row.Billed_Amount) || 0,
              paid: parseFloat(row.Paid_Amount) || 0,
              reason: row.Denial_Reason || "N/A",
              payer: row.Payer_Name || "Unknown",
              client: row.Client_Name || "Unknown",
              date: row.Claim_Submission_Date || "",
              month: row.month || (row.Claim_Submission_Date ? dayjs(row.Claim_Submission_Date).format("MMM YY") : ""),
              aging:
                row.Claim_Status &&
                  String(row.Claim_Status).toLowerCase() !== "paid" &&
                  row.Claim_Submission_Date
                  ? dayjs().diff(dayjs(row.Claim_Submission_Date), "day")
                  : 0,
            }));
            setData(parsed);
          },
        });
      });
  }, []);

  // Unique months filter like GCRPage
  const monthsForClient = useMemo(() => {
    const monthsSet = new Set(data.map((d) => d.month).filter(Boolean));
    const months2024 = [];
    const months2025 = [];

    monthsSet.forEach((monthStr) => {
      const year = monthStr.slice(-2);
      if (year === "24") months2024.push(monthStr);
      else if (year === "25") months2025.push(monthStr);
    });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortByMonth = (array) =>
      array.sort((a, b) => {
        const monthA = monthOrder.findIndex((m) => a.startsWith(m));
        const monthB = monthOrder.findIndex((m) => b.startsWith(m));
        return monthA - monthB;
      });

    const sorted2024 = sortByMonth(months2024);
    const sorted2025 = sortByMonth(months2025);

    return ["All", ...sorted2024, ...sorted2025];
  }, [data]);

  // Clients filter list
  const clients = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.client))).filter(Boolean);
    return ["All", ...unique];
  }, [data]);

  // KPI metrics with trends
  const kpiMetrics = useMemo(() => {
    const getMetricsForMonth = (month) => {
      const filtered = data.filter(d =>
        (selectedClient === "All" || d.client === selectedClient) &&
        (month === "All" || d.month === month)
      );
      if (!filtered.length) {
        return { totalClaims: 0, firstPassClaims: 0, fpr: 0 };
      }
      const totalClaims = filtered.length;
      const firstPassClaims = filtered.filter(d => d.isFirstPass).length;
      const fpr = totalClaims > 0 ? (firstPassClaims / totalClaims) * 100 : 0;
      return { totalClaims, firstPassClaims, fpr };
    };

    const clientFiltered = data.filter(d => selectedClient === "All" || d.client === selectedClient);
    const uniqueMonths = Array.from(new Set(clientFiltered.map(d => d.month))).sort(
      (a, b) => dayjs(b, "MMM YY").valueOf() - dayjs(a, "MMM YY").valueOf()
    );
    const lastMonth = uniqueMonths[0];
    const prevMonth = uniqueMonths[1];

    const mainMetrics = getMetricsForMonth(selectedMonth);
    const currentMetrics = getMetricsForMonth(lastMonth);
    const previousMetrics = getMetricsForMonth(prevMonth);

    const getTrendDetails = (current, previous) => {
      let trend = "steady";
      if (previous === 0 && current > 0) trend = "increase";
      else if (current > previous) trend = "increase";
      else if (current < previous) trend = "decrease";
      let percentage = null;
      if (previous > 0) {
        percentage = (((current - previous) / previous) * 100).toFixed(1);
      }
      return { trend, percentage };
    };

    return {
      overallFpr: mainMetrics.fpr.toFixed(2),
      totalClaims: mainMetrics.totalClaims,
      firstPassClaims: mainMetrics.firstPassClaims,
      fprTrend: getTrendDetails(currentMetrics.fpr, previousMetrics?.fpr || 0),
      totalClaimsTrend: getTrendDetails(currentMetrics.totalClaims, previousMetrics?.totalClaims || 0),
      firstPassTrend: getTrendDetails(currentMetrics.firstPassClaims, previousMetrics?.firstPassClaims || 0),
    };
  }, [data, selectedClient, selectedMonth]);

  // Monthly FPR chart data
  const filteredMonthlyData = useMemo(() => {
    const INDUSTRY_STANDARD_FPR_TARGET = 90;
    const monthlyAggregated = {};

    data.forEach((d) => {
      if (selectedClient === "All" || d.client === selectedClient) {
        const month = d.month;
        if (!monthlyAggregated[month]) monthlyAggregated[month] = { total: 0, firstPass: 0 };
        monthlyAggregated[month].total += 1;
        if (d.isFirstPass) monthlyAggregated[month].firstPass += 1;
      }
    });

    const monthsToShow =
      selectedMonth === "All"
        ? monthsForClient.slice(1).slice(-12)
        : [selectedMonth];

    return monthsToShow.map((month) => {
      const vals = monthlyAggregated[month] || { total: 0, firstPass: 0 };
      const actual = vals.total > 0 ? (vals.firstPass / vals.total) * 100 : 0;
      return {
        month,
        actual: +actual.toFixed(2),
        target: INDUSTRY_STANDARD_FPR_TARGET,
      };
    });
  }, [data, selectedClient, selectedMonth, monthsForClient]);

  // Avg 3 months vs last month chart data
  const avgVsLastMonthData = useMemo(() => {
    const clientFiltered = data.filter(d => selectedClient === "All" || d.client === selectedClient);
    if (!clientFiltered.length) return [];

    const uniqueMonths = Array.from(new Set(clientFiltered.map(d => d.month))).sort(
      (a, b) => dayjs(b, "MMM YY").valueOf() - dayjs(a, "MMM YY").valueOf()
    );

    const lastMonth = uniqueMonths[0];
    const prevMonth = uniqueMonths[1];
    const twoMonthsAgo = uniqueMonths[2];
    const last3 = [lastMonth, prevMonth, twoMonthsAgo].filter(Boolean);

    const getFprForMonth = (m) => {
      const monthData = clientFiltered.filter(d => d.month === m);
      if (!monthData.length) return 0;
      const firstPass = monthData.filter(d => d.isFirstPass).length;
      return (firstPass / monthData.length) * 100;
    };

    const avg3 = last3.reduce((sum, m) => sum + getFprForMonth(m), 0) / (last3.length || 1);
    const lastMonthFpr = getFprForMonth(lastMonth);

    return [
      { label: "Last 3 Months Avg", fpr: +avg3.toFixed(2) },
      { label: `Last Month (${lastMonth})`, fpr: +lastMonthFpr.toFixed(2) },
    ];
  }, [data, selectedClient]);

  // Payer breakdown with pagination
  const aggregatedPayerData = useMemo(() => {
    const filtered = data.filter(
      (d) =>
        (selectedClient === "All" || d.client === selectedClient) &&
        (selectedMonth === "All" || d.month === selectedMonth)
    );

    const map = {};
    filtered.forEach((item) => {
      if (!map[item.payer]) map[item.payer] = { name: item.payer, firstPass: 0 };
      if (item.isFirstPass) map[item.payer].firstPass += 1;
    });

    // Filter out payers with 0 firstPass count
    return Object.values(map).filter((payerData) => payerData.firstPass > 0);
  }, [data, selectedClient, selectedMonth]);

  // Payer pagination
  const payerStartIndex = (payerPage - 1) * payersPerPage;
  const payerEndIndex = payerStartIndex + payersPerPage;
  const currentPayers = aggregatedPayerData.slice(payerStartIndex, payerEndIndex);

  // Table pagination
  const filteredTableData = useMemo(() => {
    return data.filter(
      d =>
        (selectedClient === "All" || d.client === selectedClient) &&
        (selectedMonth === "All" || d.month === selectedMonth)
    );
  }, [data, selectedClient, selectedMonth]);

  const totalPages = Math.ceil(filteredTableData.length / rowsPerPage);
  const currentData = filteredTableData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="gcr-container">
      <h1 className="gcr-title">First Pass Resolution (FPR) Dashboard</h1>

      <div className="summary-filters">
        <div className="summary-boxes">
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Overall FPR</h4>
            <p>{kpiMetrics.overallFpr}%</p>
            <TrendIndicator trendInfo={kpiMetrics.fprTrend} />
          </div>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Total Claims</h4>
            <p>{kpiMetrics.totalClaims.toLocaleString()}</p>
            <TrendIndicator trendInfo={kpiMetrics.totalClaimsTrend} />
          </div>
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>First Pass Claims</h4>
            <p>{kpiMetrics.firstPassClaims.toLocaleString()}</p>
            <TrendIndicator trendInfo={kpiMetrics.firstPassTrend} />
          </div>
        </div>

        <div className="filters">
          <div className="filter-box">
            <label>Client: </label>
            <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setCurrentPage(1); setSelectedMonth("All"); setPayerPage(1); }}>
              {clients.map(client => <option key={client} value={client}>{client}</option>)}
            </select>
          </div>
          <div className="filter-box">
            <label>Month: </label>
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); setPayerPage(1); }}>
              {monthsForClient.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="charts">
        <div className="chart-card">
          <h3>Monthly FPR Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filteredMonthlyData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={t => `${t}%`} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#10b981" name="Actual FPR" />
              <Line type="monotone" dataKey="target" stroke="#ef4444" name="Target FPR" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Avg 3 Months vs Last Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgVsLastMonthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={t => `${t}%`} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="fpr" fill="#5759ce" barSize={40} name="FPR" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ position: "relative" }}>
          <h3>Payer Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              layout="vertical"
              data={currentPayers}
              margin={{ top: 5, right: 10, bottom: 0, left: -50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                stroke="#111"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                  return `${value}`;
                }}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#111"
                width={180}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(val) => val.toLocaleString()} />
              <Legend />
              <Bar dataKey="firstPass" fill="#10b981" barSize={7} name="First Pass Claims" />
            </BarChart>
          </ResponsiveContainer>

          {/* Pagination Arrows */}
          <button
            disabled={payerPage <= 1}
            onClick={() => setPayerPage(p => Math.max(p - 1, 1))}
            style={{
              position: "absolute",
              top: "50%",
              left: 5,
              transform: "translateY(-50%)",
              fontSize: 22,
              fontWeight: "bold",
              background: "none",
              border: "none",
              cursor: payerPage <= 1 ? "not-allowed" : "pointer",
              color: payerPage <= 1 ? "#ccc" : "#111",
            }}
            aria-label="Previous Payers Page"
          >
            {"<"}
          </button>

          <button
            disabled={payerEndIndex >= aggregatedPayerData.length}
            onClick={() => setPayerPage(p => p + 1)}
            style={{
              position: "absolute",
              top: "50%",
              right: 5,
              transform: "translateY(-50%)",
              fontSize: 22,
              fontWeight: "bold",
              background: "none",
              border: "none",
              cursor:
                payerEndIndex >= aggregatedPayerData.length ? "not-allowed" : "pointer",
              color:
                payerEndIndex >= aggregatedPayerData.length ? "#ccc" : "#111",
            }}
            aria-label="Next Payers Page"
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
                {["Claim ID", "Billed Amount ($)", "Paid Amount ($)", "Month", "Payer"].map(header => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, i) => (
                <tr key={`${row.id}-${i}`}>
                  <td>{row.id}</td>
                  <td>{row.billed.toLocaleString()}</td>
                  <td>{row.paid.toLocaleString()}</td>
                  <td>{row.month}</td>
                  <td>{row.payer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>&lt;</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            const pageNumber = startPage + i;
            return (
              <button key={pageNumber} onClick={() => setCurrentPage(pageNumber)} className={currentPage === pageNumber ? "active" : ""}>
                {pageNumber}
              </button>
            );
          })}
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>&gt;</button>
        </div>
      </div>
    </div>
  );
}
