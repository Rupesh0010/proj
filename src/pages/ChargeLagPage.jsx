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

// TrendIndicator Component
const TrendIndicator = ({ trendInfo, isIncreaseGood = true }) => {
  const { trend, percentage } = trendInfo;
  if (!trend || trend === "steady") return null;
  const isIncrease = trend === "increase";
  const isGood = isIncrease === isIncreaseGood;
  const color = isGood ? "#10b981" : "#ef4444";
  const arrow = isIncrease ? "▲" : "▼";
  const sign = isIncrease ? "+" : "";
  return (
    <div style={{ position: "absolute", bottom: "10px", right: "15px", fontSize: "1em", fontWeight: "500", display: "flex", alignItems: "center", color }}>
      <span style={{ marginRight: "4px" }}>{arrow}</span>
      {percentage !== null && <span>{sign}{percentage}%</span>}
    </div>
  );
};

export default function ChargeLagPage() {
  const [data, setData] = useState([]);
  const [selectedClient, setSelectedClient] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const allMonths = useMemo(() => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);

  useEffect(() => {
    fetch("/sample-data.csv")
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: results => {
            const parsed = results.data
              .filter(row => row.Date_of_Service && row.Charge_Entry_Date) // Ensure dates exist
              .map((row) => ({
                id: row.Claim_ID,
                payer: row.Payer_Name || "Unknown",
                client: row.Client_Name || "Unknown",
                date: row.Claim_Submission_Date || "",
                month: row.Claim_Submission_Date ? dayjs(row.Claim_Submission_Date).format("MMM") : "",
                chargeLag: dayjs(row.Charge_Entry_Date).diff(dayjs(row.Date_of_Service), 'day'),
              }));
            setData(parsed);
          }
        });
      });
  }, []);

  const clients = useMemo(() => ["All", ...Array.from(new Set(data.map(d => d.client))).filter(Boolean)], [data]);
  const monthsForClient = useMemo(() => ["All", ...allMonths], [allMonths]);

  const kpiMetrics = useMemo(() => {
    const getMetrics = (dataset) => {
      if (!dataset || dataset.length === 0) {
        return { avgLag: 0, totalClaims: 0 };
      }
      const totalLag = dataset.reduce((sum, d) => sum + d.chargeLag, 0);
      const totalClaims = dataset.length;
      const avgLag = totalClaims > 0 ? totalLag / totalClaims : 0;
      return { avgLag, totalClaims };
    };

    const mainFilteredData = data.filter(d =>
      (selectedClient === "All" || d.client === selectedClient) &&
      (selectedMonth === "All" || d.month === selectedMonth)
    );
    const mainMetrics = getMetrics(mainFilteredData);

    const clientFilteredData = data.filter(d => selectedClient === "All" || d.client === selectedClient);
    let currentTrendMonth, previousTrendMonth;

    if (selectedMonth === "All") {
      const sortedDates = [...clientFilteredData].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
      if (sortedDates.length > 0) {
        const lastDate = dayjs(sortedDates[0].date);
        currentTrendMonth = lastDate.format("MMM");
        previousTrendMonth = lastDate.subtract(1, "month").format("MMM");
      }
    } else {
      currentTrendMonth = selectedMonth;
      const monthIndex = allMonths.indexOf(selectedMonth);
      if (monthIndex > 0) previousTrendMonth = allMonths[monthIndex - 1];
    }

    const currentTrendData = clientFilteredData.filter(d => d.month === currentTrendMonth);
    const previousTrendData = clientFilteredData.filter(d => d.month === previousTrendMonth);

    const currentMetrics = getMetrics(currentTrendData);
    const previousMetrics = getMetrics(previousTrendData);

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
      avgChargeLag: mainMetrics.avgLag.toFixed(1),
      totalClaims: mainMetrics.totalClaims,
      lagTrend: getTrendDetails(currentMetrics.avgLag, previousMetrics.avgLag),
    };
  }, [data, selectedClient, selectedMonth, allMonths]);

  const filteredMonthlyData = useMemo(() => {
    const monthsToShow = selectedMonth === "All" ? allMonths : [selectedMonth];
    return monthsToShow.map(month => {
      const monthRows = data.filter(d =>
        (selectedClient === "All" || d.client === selectedClient) && d.month === month
      );
      if (monthRows.length === 0) return { month, actual: 0 };
      const avgLag = monthRows.reduce((sum, r) => sum + r.chargeLag, 0) / monthRows.length;
      return { month, actual: parseFloat(avgLag.toFixed(1)) };
    });
  }, [data, selectedClient, selectedMonth]);

  const avgVsLastMonthData = useMemo(() => {
    const getAvgLagForMonth = (monthStr) => {
      const monthData = data.filter(d => (selectedClient === "All" || d.client === selectedClient) && d.month === monthStr);
      if (monthData.length === 0) return 0;
      return monthData.reduce((sum, d) => sum + d.chargeLag, 0) / monthData.length;
    };
    const sortedDates = [...data.filter(d => selectedClient === "All" || d.client === selectedClient)].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    if (sortedDates.length === 0) return [];
    const lastDate = dayjs(sortedDates[0].date);
    const lastMonthStr = lastDate.format("MMM");
    const prevMonthStr = lastDate.subtract(1, "month").format("MMM");
    const twoMonthsAgoStr = lastDate.subtract(2, "month").format("MMM");
    const avg3 = (getAvgLagForMonth(lastMonthStr) + getAvgLagForMonth(prevMonthStr) + getAvgLagForMonth(twoMonthsAgoStr)) / 3;
    return [
      { label: "Avg 3 Months", lag: parseFloat(avg3.toFixed(1)) },
      { label: "Last Month", lag: parseFloat(getAvgLagForMonth(lastMonthStr).toFixed(1)) },
    ];
  }, [data, selectedClient]);

  const aggregatedPayerData = useMemo(() => {
    const filtered = data.filter(d =>
      (selectedClient === "All" || d.client === selectedClient) &&
      (selectedMonth === "All" || d.month === selectedMonth)
    );
    const map = {};
    filtered.forEach(item => {
      if (!map[item.payer]) {
        map[item.payer] = { name: item.payer, totalLag: 0, count: 0 };
      }
      map[item.payer].totalLag += item.chargeLag;
      map[item.payer].count += 1;
    });
    return Object.values(map).map(p => ({
      name: p.name,
      avgLag: p.count > 0 ? parseFloat((p.totalLag / p.count).toFixed(1)) : 0
    }));
  }, [data, selectedClient, selectedMonth]);

  const filteredTableData = useMemo(() => {
    return data.filter(d =>
      (selectedClient === "All" || d.client === selectedClient) &&
      (selectedMonth === "All" || d.month === selectedMonth)
    );
  }, [data, selectedClient, selectedMonth]);

  const totalPages = Math.ceil(filteredTableData.length / rowsPerPage);
  const currentData = filteredTableData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="gcr-container">
      <h1 className="gcr-title">Charge Lag Dashboard</h1>
      <div className="summary-filters">
        <div className="summary-boxes">
          <div className="summary-box" style={{ position: "relative" }}>
            <h4>Average Charge Lag</h4>
            <p>{kpiMetrics.avgChargeLag} Days</p>
            <TrendIndicator trendInfo={kpiMetrics.lagTrend} isIncreaseGood={true} />
          </div>
          <div className="summary-box">
            <h4>Total Claims</h4>
            <p>{kpiMetrics.totalClaims.toLocaleString()}</p>
          </div>
        </div>
        <div className="filters">
          <div className="filter-box"><label>Client: </label><select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setCurrentPage(1); setSelectedMonth("All"); }}>{clients.map(client => (<option key={client} value={client}>{client}</option>))}</select></div>
          <div className="filter-box"><label>Month: </label><select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}>{monthsForClient.map(month => (<option key={month} value={month}>{month}</option>))}</select></div>
        </div>
      </div>
      <div className="charts">
        <div className="chart-card">
          <h3>Monthly Charge Lag (Avg Days)</h3>
          <ResponsiveContainer width="100%" height={200}><LineChart data={filteredMonthlyData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }} ><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="actual" name="Avg Lag" stroke="#3b82f6" /></LineChart></ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3>Avg 3 Months vs Last Month</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={avgVsLastMonthData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="lag" fill="#3b82f6" barSize={40} name="Avg Days" /></BarChart></ResponsiveContainer>
        </div>
        <div className="chart-card">
          <h3>Payer Breakdown (Avg Days)</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart layout="vertical" data={aggregatedPayerData} margin={{ top: 5, right: 10, bottom: 0, left: 40 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={80} /><Tooltip /><Bar dataKey="avgLag" fill="#3b82f6" name="Avg Lag" /></BarChart></ResponsiveContainer>
        </div>
      </div>
      <div className="claim-table">
        <div className="claim-table-header"><h3>Claim Level Details</h3></div>
        <div className="claim-table-body">
          <table>
            <thead><tr>{["Claim ID", "Payer", "Charge Lag (Days)"].map(header => (<th key={header}>{header}</th>))}</tr></thead>
            <tbody>{currentData.map((row) => (<tr key={row.id}><td>{row.id}</td><td>{row.payer}</td><td>{row.chargeLag}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="pagination">
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>&lt;</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const pageNumber = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i; return (<button key={pageNumber} onClick={() => setCurrentPage(pageNumber)} className={currentPage === pageNumber ? "active" : ""}>{pageNumber}</button>); })}
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>&gt;</button>
        </div>
      </div>
    </div>
  );
}