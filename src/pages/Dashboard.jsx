// FINAL 

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import axios from "axios";

import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area, BarChart, Bar, LabelList, ReferenceLine,
} from "recharts";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Avatar from "../components/ui/avatar";


const QUICK_FILTERS = {
  NONE: "none",
  DAY_PREV_DAY: "day_prev_day",
  DAY_LAST_MONTH_SAME_DAY: "day_last_month_same",
  DAY_LAST_YEAR_SAME_DAY: "day_last_year_same",
  WEEK_LAST_WEEK: "week_last_week",
  WEEK_LAST_MONTH_WEEK: "week_last_month",
  WEEK_LAST_YEAR_WEEK: "week_last_year",
  MONTH_LAST_MONTH: "month_last_month",
  MONTH_LAST_YEAR_SAME_MONTH: "month_last_year_same",
  YEAR_PREV_YEAR_1: "year_prev_1",
  YEAR_PREV_YEAR_2: "year_prev_2",
  YEAR_PREV_YEAR_3: "year_prev_3",
};

// Client folders configuration (adjust names/paths if needed)
const CLIENT_FOLDERS = {
  all: ["entfw", "eca", "soundhealth"],  // Load all 3 clients
  entfw: ["entfw"],
  eca: ["eca"],
  soundhealth: ["soundhealth"],
};

// DropdownAvatar code remains unchanged...
function DropdownAvatar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleLogout = () => {
    navigate("/");
  };
  const menuItem = {
    padding: "10px 20px",
    cursor: "pointer",
    borderBottom: "1px solid #eee"
  };
  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#007bff",
          color: "white",
          fontWeight: "bold",
          border: "none",
          cursor: "pointer",
        }}
      >
        JD
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            minWidth: "160px",
            zIndex: 1000,
          }}
        >
          <div style={menuItem} onClick={() => navigate("/policy")}>
            Privacy Policy
          </div>
          <div style={menuItem} onClick={handleLogout}>
            Logout
          </div>
        </div>
      )}
    </div>
  );
}

dayjs.extend(isBetween);

const parseCSV = async (filePath) => {
  try {
    const res = await fetch(filePath);
    if (!res.ok) {
      console.warn(`Failed to fetch ${filePath}: ${res.statusText} - Skipping file`);
      return [];  // Return empty array if file missing
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
            Adjustment_Amount: Number(String(r.Adjustment_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Open_AR_Amount: Number(String(r.Open_AR_Amount || r.apenaramount || "0").replace(/,/g, "").replace(/"/g, "")),
            GCR_Target: Number(String(r.GCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            GCR_Baseline: Number(String(r.GCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            NCR_Target: Number(String(r.NCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            NCR_Baseline: Number(String(r.NCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            CCR_Target: Number(String(r.CCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            CCR_Baseline: Number(String(r.CCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            FPR_Target: Number(String(r.FPR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            FPR_Baseline: Number(String(r.FPR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            Denial_Rate_Target: Number(String(r.Denial_Rate_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            Denial_Rate_Baseline: Number(String(r.Denial_Rate_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            Is_First_Pass_Resolution:
              r.First_Pass === true ||
              String(r.First_Pass || r.Is_First_Pass_Resolution).toLowerCase() === "true" ||
              Number(r.First_Pass || r.Is_First_Pass_Resolution) === 1,
            Is_Clean_Claim: Number(r.Is_Clean_Claim || 0),  // Numeric for averaging
            Date_of_Service: r.Date_of_Service || null,
            Charge_Entry_Date: r.Charge_Entry_Date || null,
            Claim_Submission_Date: r.Claim_Submission_Date || null,
            aging: Number(r.aging || 0),  // For AR Buckets (from CSV "aging" header) - USED FOR NEW aging.csv
            ar_days: Number(r.ar_days || 0),  // For AR Days Graph/Card (from CSV "ar_days" header)
            visit: Number(r.visit || 0),  // NEW: For Total Claims sum (from charges.csv "visit" column)
          }));
          resolve(normalized);
        },
        error: (error) => {
          console.error(`Parse error for ${filePath}:`, error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error(`Fetch error for ${filePath}:`, error);
    return [];
  }
};

export default function Dashboard() {
  const [charges, setCharges] = useState([]);
  const [denials, setDenials] = useState([]);
  const [openAR, setOpenAR] = useState([]);
  const [aiBotOpen, setAiBotOpen] = useState(false);
  const [agingData, setAgingData] = useState([]);  // NEW: State for aging.csv data
  const lastDayOfLastMonth = dayjs().subtract(1, 'month').endOf('month');
  const [startDate, setStartDate] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [quickFilter, setQuickFilter] = useState(QUICK_FILTERS.NONE);
  const [selectedMetric, setSelectedMetric] = useState("GCR");
  const [selectedClient, setSelectedClient] = useState("all");  // New: Client filter state (default "All")

  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Updated: getClientPaths to include aging.csv
  const getClientPaths = (client) => {
    const folders = CLIENT_FOLDERS[client] || [];
    const paths = folders.flatMap(folder => [
      `/${folder}/charges.csv`,
      `/${folder}/denial.csv`,
      `/${folder}/openar.csv`,
      `/${folder}/aging.csv`,  // NEW: Load aging.csv for AR Aging Buckets
    ]);
    return paths;
  };


 function AiBotPopup({ open, onClose }) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever chatMessages changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    // Add user message
    setChatMessages(prev => [...prev, { sender: "user", text: trimmed }]);
    setChatInput("");

    try {
      const res = await axios.post("http://localhost:9000/chat", { message: trimmed });
      const botReply = res.data?.response || "No response from bot.";
      setChatMessages(prev => [...prev, { sender: "bot", text: botReply }]);
    } catch (error) {
      console.error("AXIOS ERROR:", error);
      const errorMsg = error.response?.data?.error || "Error contacting bot.";
      setChatMessages(prev => [...prev, { sender: "bot", text: errorMsg }]);
    }
  };

  return open ? (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        right: 24,
        width: 340,
        height: 420,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 16px rgba(60,64,120,0.2)",
        zIndex: 1300,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #eee",
          fontWeight: 600,
          fontSize: 18,
          background: "#1976d2",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        Joire AI Chatbot
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer"
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "12px",
          overflowY: "auto",
          background: "#f5f6fa"
        }}
      >
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.sender === "user" ? "right" : "left",
              marginBottom: 10
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: msg.sender === "user" ? "#e3f2fd" : "#ede7f6",
                borderRadius: 7,
                padding: "5px 12px",
                maxWidth: "80%",
                wordBreak: "break-word"
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: 12,
          borderTop: "1px solid #eee",
          display: "flex"
        }}
      >
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 7,
            border: "1px solid #ddd"
          }}
          placeholder="Type your question..."
          onKeyDown={e => e.key === "Enter" && sendChatMessage()}
        />
        <button
          style={{
            marginLeft: 8,
            padding: "8px 16px",
            borderRadius: 7,
            border: "none",
            background: "#1976d2",
            color: "#fff",
            fontWeight: 500,
            cursor: "pointer"
          }}
          onClick={sendChatMessage}
        >
          Send
        </button>
      </div>
    </div>
  ) : null;
}


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
      case QUICK_FILTERS.DAY_LAST_MONTH_SAME_DAY:
        start = today.subtract(1, "month");
        end = today.subtract(1, "month");
        break;
      case QUICK_FILTERS.DAY_LAST_YEAR_SAME_DAY:
        start = today.subtract(1, "year");
        end = today.subtract(1, "year");
        break;
      case QUICK_FILTERS.WEEK_LAST_WEEK:
        start = today.subtract(1, "week").startOf("week");
        end = today.subtract(1, "week").endOf("week");
        break;
      case QUICK_FILTERS.WEEK_LAST_MONTH_WEEK:
        start = today.subtract(1, "month").startOf("week");
        end = today.subtract(1, "month").endOf("week");
        break;
      case QUICK_FILTERS.WEEK_LAST_YEAR_WEEK:
        start = today.subtract(1, "year").startOf("week");
        end = today.subtract(1, "year").endOf("week");
        break;
      case QUICK_FILTERS.MONTH_LAST_MONTH:
        start = today.subtract(1, "month").startOf("month");
        end = today.subtract(1, "month").endOf("month");
        break;
      case QUICK_FILTERS.MONTH_LAST_YEAR_SAME_MONTH:
        start = today.subtract(1, "year").startOf("month");
        end = today.subtract(1, "year").endOf("month");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_1:
        start = today.subtract(0, "year").startOf("year");
        end = today.subtract(0, "year").endOf("year");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_2:
        start = today.subtract(1, "year").startOf("year");
        end = today.subtract(1, "year").endOf("year");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_3:
        start = today.subtract(2, "year").startOf("year");
        end = today.subtract(2, "year").endOf("year");
        break;
      default:
        return;
    }
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
  }, [quickFilter]);

  // Updated: handleFileUpload to append to selected client's charges (or combined for "all")
  // Updated: handleFileUpload to append to selected client's charges (or combined for "all")
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadError("Only CSV files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csvText = ev.target.result;
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const normalized = results.data.map((r) => ({
            ...r,
            month: r.month || (r.Date_of_Service ? dayjs(r.Date_of_Service).format("MMM YY") : (r.Charge_Entry_Date ? dayjs(r.Charge_Entry_Date).format("MMM YY") : "")),
            Billed_Amount: Number(String(r.Billed_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Paid_Amount: Number(String(r.Paid_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Adjustment_Amount: Number(String(r.Adjustment_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Open_AR_Amount: Number(String(r.Open_AR_Amount || r.apenaramount || "0").replace(/,/g, "").replace(/"/g, "")),
            GCR_Target: Number(String(r.GCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            GCR_Baseline: Number(String(r.GCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            NCR_Target: Number(String(r.NCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            NCR_Baseline: Number(String(r.NCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            CCR_Target: Number(String(r.CCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            CCR_Baseline: Number(String(r.CCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            FPR_Target: Number(String(r.FPR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            FPR_Baseline: Number(String(r.FPR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            Denial_Rate_Target: Number(String(r.Denial_Rate_Target || "0").replace(/,/g, "").replace(/"/g, "")),
            Denial_Rate_Baseline: Number(String(r.Denial_Rate_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
            Is_First_Pass_Resolution:
              r.First_Pass === true ||
              String(r.First_Pass || r.Is_First_Pass_Resolution).toLowerCase() === "true" ||
              Number(r.First_Pass || r.Is_First_Pass_Resolution) === 1,
            Is_Clean_Claim: Number(r.Is_Clean_Claim || 0),  // Numeric for averaging
            Date_of_Service: r.Date_of_Service || null,
            Charge_Entry_Date: r.Charge_Entry_Date || null,
            Claim_Submission_Date: r.Claim_Submission_Date || null,
            aging: Number(r.aging || 0),
            ar_days: Number(r.ar_days || 0),
            visit: Number(r.visit || 0),  // NEW: For Total Claims sum (from charges.csv "visit" column)
          }));
          // Updated: Append to selected client's charges (or combined for "all")
          if (selectedClient === "all") {
            setCharges(prev => [...prev, ...normalized]);
          } else {
            // For specific client, reload data to append (simple way; optimize if needed)
            loadData();  // Re-trigger load to include upload
          }
          setUploadError('');
        }
      });
    };
    reader.readAsText(file);
  };

  // Updated: loadData to load based on selectedClient, including aging.csv
  useEffect(() => {
    const loadData = async () => {
      try {
        const paths = getClientPaths(selectedClient);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);

        // Group data by type (charges, denials, openAR, aging) across clients
        let allCharges = [];
        let allDenials = [];
        let allOpenAR = [];
        let allAging = [];  // NEW: Group aging data

        paths.forEach((path, index) => {
          const data = allData[index] || [];
          if (path.includes("charges.csv")) {
            allCharges = [...allCharges, ...data];
          } else if (path.includes("denial.csv")) {
            allDenials = [...allDenials, ...data];
          } else if (path.includes("openar.csv")) {
            allOpenAR = [...allOpenAR, ...data];
          } else if (path.includes("aging.csv")) {  // NEW: Load aging.csv
            allAging = [...allAging, ...data];
          }
        });

        setCharges(allCharges);
        setDenials(allDenials);
        setOpenAR(allOpenAR);
        setAgingData(allAging);  // NEW: Set aging data
        console.log(`Loaded data for client "${selectedClient}": Charges=${allCharges.length}, Denials=${allDenials.length}, OpenAR=${allOpenAR.length}, Aging=${allAging.length}`);
      } catch (err) {
        console.error("Error loading client CSV files:", err);
      }
    };
    loadData();
  }, [selectedClient]);  // Re-run on client change

  // Updated: useMemo for filtering, including aging data
  // Updated: useMemo for filtering, including aging data
  const {
    filteredCharges,
    filteredDenials,
    filteredOpenAR,
    filteredAging,  // NEW: Filtered aging data by Date_of_Service
    prevCharges,
    prevDenials,
    prevOpenAR,
    prevAging,  // NEW: Previous filtered aging (for consistency)
  } = useMemo(() => {
    // Safety: Ensure input data is always arrays (state starts as [])
    const safeCharges = Array.isArray(charges) ? charges : [];
    const safeDenials = Array.isArray(denials) ? denials : [];
    const safeOpenAR = Array.isArray(openAR) ? openAR : [];
    const safeAgingData = Array.isArray(agingData) ? agingData : [];  // NEW: Safe aging data

    const start = dayjs(startDate);
    const end = dayjs(endDate);

    // DYNAMIC: Count exact days difference (your selected range duration)
    let durationDays = end.diff(start, 'day') + 1;  // +1 for inclusive (e.g., Jul 1-1 =1 day; Jul1-2=2 days)
    if (durationDays <= 1) durationDays = 1;  // Minimum 1 day

    // DYNAMIC: Previous period - same duration, exactly back (no overlap)
    let prevEnd = start.subtract(1, 'day');  // End: 1 day before your start
    let prevStart = prevEnd.clone().subtract(durationDays - 1, 'day');  // Start: prevEnd - (duration -1) for inclusive match

    // FIXED: Ensure no overlap/invalid dates
    if (!prevStart.isValid() || !prevEnd.isValid()) {
      prevStart = start.clone().subtract(durationDays, 'day');
      prevEnd = prevStart.clone().add(durationDays - 1, 'day');
    }

    // Debug logs (remove after testing)
    console.log(`Dynamic Difference: ${durationDays} days (${start.format('YYYY-MM-DD')} to ${end.format('YYYY-MM-DD')})`);
    console.log(`Previous Range (same duration back, no overlap): ${prevStart.format('YYYY-MM-DD')} to ${prevEnd.format('YYYY-MM-DD')}`);

    // CURRENT PERIOD: Filter your selected range
    const currentCharges = safeCharges.filter((r) => {
      const postedDate = dayjs(r.Charge_Entry_Date);
      return postedDate.isValid() && postedDate.isBetween(start, end, null, '[]');  // Inclusive
    });

    const currentDenials = safeDenials.filter((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      return serviceDate.isValid() && serviceDate.isBetween(start, end, null, '[]');
    });

    const currentOpenAR = safeOpenAR.filter((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      return serviceDate.isValid() && serviceDate.isBetween(start, end, null, '[]');
    });

    // NEW: Filter aging data by Date_of_Service for current period
    const currentAging = safeAgingData.filter((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      return serviceDate.isValid() && serviceDate.isBetween(start, end, null, '[]');
    });

    // PREVIOUS PERIOD: Filter shifted back by your duration (dynamic)
    const previousCharges = safeCharges.filter((r) => {
      const postedDate = dayjs(r.Charge_Entry_Date);
      return postedDate.isValid() && postedDate.isBetween(prevStart, prevEnd, null, '[]');
    });

    const previousDenials = safeDenials.filter((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      return serviceDate.isValid() && serviceDate.isBetween(prevStart, prevEnd, null, '[]');
    });

    const previousOpenAR = safeOpenAR.filter((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      return serviceDate.isValid() && serviceDate.isBetween(prevStart, prevEnd, null, '[]');
    });

    // NEW: Filter aging data for previous period (for consistency, though pie uses current)
    const previousAging = safeAgingData.filter((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      return serviceDate.isValid() && serviceDate.isBetween(prevStart, prevEnd, null, '[]');
    });

    // Debug: Log counts (no undefined)
    console.log(`Current Counts - Charges: ${currentCharges.length}, Denials: ${currentDenials.length}, OpenAR: ${currentOpenAR.length}, Aging: ${currentAging.length}`);
    console.log(`Previous Counts - Charges: ${previousCharges.length}, Denials: ${previousDenials.length}, OpenAR: ${previousOpenAR.length}, Aging: ${previousAging.length}`);

    // Return all as arrays (never undefined)
    return {
      filteredCharges: currentCharges,
      prevCharges: previousCharges,
      filteredDenials: currentDenials,
      prevDenials: previousDenials,
      filteredOpenAR: currentOpenAR,
      prevOpenAR: previousOpenAR,
      filteredAging: currentAging,  // NEW
      prevAging: previousAging,     // NEW
    };
  }, [charges, denials, openAR, agingData, startDate, endDate]);  // Re-runs on changes (added agingData)

  const calculateKPIs = (chargesData, denialsData, openARData) => {
    // SAFETY: Ensure all params are arrays (default to [])
    const safeCharges = Array.isArray(chargesData) ? chargesData : [];
    const safeDenials = Array.isArray(denialsData) ? denialsData : [];
    const safeOpenAR = Array.isArray(openARData) ? openARData : [];

    if (safeCharges.length === 0 && safeDenials.length === 0) {
      return {
        totalPayments: 0,
        totalClaims: 0,
        gcr: 0,
        ncr: 0,
        denialRate: 0,
        firstPassRate: 0,
        cleanClaimRate: 0,
        totalDenials: 0,
        totalOpenAR: 0,
      };
    }

    const totalPayments = safeCharges.reduce((sum, r) => sum + (r.Paid_Amount || 0), 0);
    const totalBilled = safeCharges.reduce((sum, r) => sum + (r.Billed_Amount || 0), 0);  // FIXED: Use safeCharges
    const totalAdjustments = safeCharges.reduce((sum, r) => sum + (r.Adjustment_Amount || 0), 0);  // FIXED
    // UPDATED: Total Claims = Sum of "visit" column (instead of row count)
    const totalClaims = safeCharges.reduce((sum, r) => sum + Number(r.visit || 0), 0);  // Sum visits in filtered charges

    // Denial Rate
    const deniedCount = safeDenials.filter(r => (r.Claim_Status || "").toLowerCase().trim() === "denied").length;
    const totalDenialRows = safeDenials.length;
    const denialRate = totalDenialRows > 0 ? (deniedCount / totalDenialRows) * 100 : 0;

    // FPR: % true Is_First_Pass_Resolution in filtered denials
    const firstPassClaimsCount = safeDenials.filter(r => r.Is_First_Pass_Resolution).length;  // FIXED: safeDenials
    const firstPassRate = totalDenialRows > 0 ? (firstPassClaimsCount / totalDenialRows) * 100 : 0;

    // CCR
    const cleanClaimValues = safeCharges  // FIXED: safeCharges
      .map(r => Number(r.Is_Clean_Claim || 0))
      .filter(val => !isNaN(val) && val >= 0 && val <= 100);
    const gcr = totalBilled === 0 ? 0 : (totalPayments / totalBilled) * 100;
    const netBilled = totalBilled - totalAdjustments;
    const ncr = netBilled <= 0 ? 0 : (totalPayments / netBilled) * 100;
    const cleanClaimRate = cleanClaimValues.length > 0
      ? cleanClaimValues.reduce((sum, val) => sum + val, 0) / cleanClaimValues.length
      : 0;
    const totalOpenAR = safeOpenAR.reduce((sum, r) => sum + (r.Open_AR_Amount || 0), 0);  // FIXED

    return {
      totalPayments,
      totalClaims,  // Now sum of visits
      gcr,
      ncr,
      denialRate,
      firstPassRate,
      cleanClaimRate,
      totalDenials: deniedCount,
      totalOpenAR,
    };
  };

  const currentKPIs = calculateKPIs(filteredCharges, filteredDenials, filteredOpenAR);
  const prevKPIs = calculateKPIs(prevCharges, prevDenials, prevOpenAR);

  const trend = (current, previous, isIncreaseGood = true) => {
    if (previous === 0 || !isFinite(previous)) {  // No previous data
      return {
        percentChange: current.toFixed(2),  // Show current value if no previous
        arrow: "▲",
        color: "#6c757d",  // Gray
      };
    }

    const diff = current - previous;  // ABSOLUTE DIFFERENCE: e.g., 32.10 - 33.09 = -0.99
    const isPositive = diff >= 0;     // True if current > previous (increase)

    return {
      percentChange: Math.abs(diff).toFixed(2),  // Display abs value: "0.99"
      arrow: isPositive ? "▲" : "▼",             // Arrow shows direction (▲ increase, ▼ decrease)
      color: isPositive === isIncreaseGood ? "#198754" : "#dc3545",  // Green if good direction, red if bad
    };
  };

  const kpisWithTrend = {
    gcr: trend(currentKPIs.gcr, prevKPIs.gcr, true),  // Higher good
    ncr: trend(currentKPIs.ncr, prevKPIs.ncr, true),  // Higher good
    denialRate: trend(currentKPIs.denialRate, prevKPIs.denialRate, false),  // Lower good
    firstPassRate: trend(currentKPIs.firstPassRate, prevKPIs.firstPassRate, true),  // Higher good
    cleanClaimRate: trend(currentKPIs.cleanClaimRate, prevKPIs.cleanClaimRate, true),  // Higher good
    totalClaims: trend(currentKPIs.totalClaims, prevKPIs.totalClaims, true),

  };

  // Helper for monthly trends from charges (unchanged)
  const getMonthlyChargesTrend = (fn) =>
    Object.values(
      filteredCharges.reduce((acc, r) => {
        const month = r.month || (r.Charge_Entry_Date ? dayjs(r.Charge_Entry_Date).format("MMM YY") : "Unknown");
        if (!acc[month]) acc[month] = { vals: [], month };
        acc[month].vals.push(r);
        return acc;
      }, {})
    ).map(d => ({
      value: fn(d.vals),
      month: d.month,
    }));

  // Helper for monthly denial trends: denied / total denial rows per month (unchanged)
  const getMonthlyDenialTrend = () => {
    if (filteredDenials.length === 0) return [];  // Avoid error if no data
    const monthlyData = filteredDenials.reduce((acc, r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      if (!serviceDate.isValid()) return acc;
      const month = serviceDate.format("MMM YY");
      if (!acc[month]) {
        acc[month] = { denied: 0, totalDenials: 0 };
      }
      // Count only "denied"
      if ((r.Claim_Status || "").toLowerCase().trim() === "denied") {
        acc[month].denied++;
      }
      acc[month].totalDenials++; // Total denial rows per month
      return acc;
    }, {});

    // Sort months chronologically
    return Object.keys(monthlyData)
      .map(month => {
        const { denied, totalDenials } = monthlyData[month];
        return {
          value: totalDenials > 0 ? (denied / totalDenials) * 100 : 0, // e.g., per month: denied / total denials that month
          month,
        };
      })
      .sort((a, b) => dayjs(a.month, "MMM YY").valueOf() - dayjs(b.month, "MMM YY").valueOf());
  };

  // UPDATED Helper for monthly FPR trends: % true Is_First_Pass_Resolution in filtered denials per month
  const getMonthlyFPRTrend = () => {
    if (filteredDenials.length === 0) return [];  // No denials data, empty sparkline

    // Group filtered denials by month from Date_of_Service
    const monthlyData = filteredDenials.reduce((acc, r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      if (!serviceDate.isValid()) return acc;
      const month = serviceDate.format("MMM YY");
      if (!acc[month]) acc[month] = { trueCount: 0, totalCount: 0 };
      if (r.Is_First_Pass_Resolution) {  // True/1/"true" (normalized boolean)
        acc[month].trueCount++;
      }
      acc[month].totalCount++;  // Total denial rows per month
      return acc;
    }, {});

    // Compute % true per month and sort chronologically
    return Object.keys(monthlyData)
      .map(month => {
        const { trueCount, totalCount } = monthlyData[month];
        return {
          value: totalCount > 0 ? (trueCount / totalCount) * 100 : 0,  // % true (e.g., 800 true / 1000 denials = 80%)
          month,
        };
      })
      .sort((a, b) => dayjs(a.month, "MMM YY").valueOf() - dayjs(b.month, "MMM YY").valueOf());
  };

  const kpiSparklines = useMemo(() => ({
    // GCR from charges (unchanged)
    gcr: getMonthlyChargesTrend(rows => {
      const paid = rows.reduce((a, r) => a + (r.Paid_Amount || 0), 0);
      const billed = rows.reduce((a, r) => a + (r.Billed_Amount || 0), 0);
      return billed > 0 ? (paid / billed) * 100 : 0;
    }),
    // NCR from charges (unchanged)
    ncr: getMonthlyChargesTrend(rows => {
      const paid = rows.reduce((a, r) => a + (r.Paid_Amount || 0), 0);
      const allowed = rows.reduce((a, r) => a + ((r.Billed_Amount || 0) - (r.Adjustment_Amount || 0)), 0);
      return allowed > 0 ? (paid / allowed) * 100 : 0;
    }),
    // Denial Rate from denials (unchanged)
    denialRate: getMonthlyDenialTrend(),
    // UPDATED FPR: % true per month in filtered denials (now from denials only)
    firstPassRate: getMonthlyFPRTrend(),
    // CCR from charges (unchanged)
    cleanClaimRate: getMonthlyChargesTrend(rows => {
      // Average Is_Clean_Claim per month (from filtered charges)
      const cleanValues = rows
        .map(r => Number(r.Is_Clean_Claim || 0))
        .filter(val => !isNaN(val) && val >= 0 && val <= 100);
      return cleanValues.length > 0
        ? cleanValues.reduce((sum, val) => sum + val, 0) / cleanValues.length
        : 0;  // Monthly average
    }),
    // UPDATED Total Claims: Sum of "visit" per month (instead of row count)
    totalClaims: getMonthlyChargesTrend(rows => rows.reduce((sum, r) => sum + Number(r.visit || 0), 0)),  // Monthly sum of visits
  }), [filteredCharges, filteredDenials]);

  const calculateLag = (data, dateKey1, dateKey2) => {
    const diffs = data
      .map((r) => {
        const date1 = dayjs(r[dateKey1]);
        const date2 = dayjs(r[dateKey2]);
        if (date1.isValid() && date2.isValid()) {
          return date2.diff(date1, "day"); // As per spec: for charge lag, service - entry; billing: submission - service
        }
        return null;
      })
      .filter((diff) => diff !== null && !isNaN(diff));

    return diffs.length === 0 ? 0 : Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  };

  const chargeLag = calculateLag(filteredCharges, "Date_of_Service", "Charge_Entry_Date"); // service - entry (from charges)
  // UPDATED: Billing Lag now from denials (Date_of_Service to Claim_Submission_Date)
  const billingLag = calculateLag(filteredDenials, "Date_of_Service", "Claim_Submission_Date");

  const mainChartData = useMemo(() => {
    const map = {};

    // Step 1: Group charges by month (for GCR/NCR/CCR – unchanged)
    filteredCharges.forEach((r) => {
      const postedDate = dayjs(r.Charge_Entry_Date);
      if (!postedDate.isValid()) return;
      const month = postedDate.format("MMM YY");

      // Parse year for sorting (unchanged)
      const yearMatch = month.match(/(\d{2,4})$/);
      const yearPart = yearMatch ? parseInt(yearMatch[1], 10) : dayjs().year() % 100;
      const fullYear = yearPart >= 0 && yearPart < 100 ? 2000 + yearPart : yearPart;
      const monthWithFullYear = `${month.split(" ")[0]} ${fullYear}`;
      const date = dayjs(monthWithFullYear, "MMM YYYY").startOf("month");

      if (!map[month]) {
        map[month] = {
          paidSum: 0,
          billedSum: 0,
          adjustmentSum: 0,
          ccrSum: 0,
          ccrCount: 0,
          fprTrueCount: 0,  // For FPR true count in denials
          fprDenialCount: 0,  // Total denial rows per month
          count: 0,  // For charges (GCR/NCR)
          date,
          target: undefined,
          baseline: undefined,
          deniedCount: 0,
          totalDenialRows: 0,
        };
      }

      const cleanVal = Number(r.Is_Clean_Claim || 0);

      // Sum financials and increment charges count (unchanged)
      map[month].paidSum += r.Paid_Amount || 0;
      map[month].billedSum += r.Billed_Amount || 0;
      map[month].adjustmentSum += r.Adjustment_Amount || 0;
      map[month].count++;

      // For CCR (unchanged)
      if (!isNaN(cleanVal) && cleanVal >= 0 && cleanVal <= 100) {
        map[month].ccrSum += cleanVal;
        map[month].ccrCount++;
      }

      // Targets/baselines (unchanged)
      if (map[month].target === undefined) {
        const metricKey = selectedMetric.replace(" ", "_").replace(" Rate", "");
        map[month].target = r[`${metricKey}_Target`];
        map[month].baseline = r[`${metricKey}_Baseline`];
      }
    });

    // Step 2: Group denials for FPR and Denial Rate (now includes FPR always for denials)
    filteredDenials.forEach((r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      if (!serviceDate.isValid()) return;
      const month = serviceDate.format("MMM YY");

      // Parse year (unchanged)
      const yearMatch = month.match(/(\d{2,4})$/);
      const yearPart = yearMatch ? parseInt(yearMatch[1], 10) : dayjs().year() % 100;
      const fullYear = yearPart >= 0 && yearPart < 100 ? 2000 + yearPart : yearPart;
      const monthWithFullYear = `${month.split(" ")[0]} ${fullYear}`;
      const date = dayjs(monthWithFullYear, "MMM YYYY").startOf("month");

      if (!map[month]) {
        map[month] = {
          paidSum: 0, billedSum: 0, adjustmentSum: 0, ccrSum: 0, ccrCount: 0,
          fprTrueCount: 0, fprDenialCount: 0, count: 0, date, target: undefined, baseline: undefined,
          deniedCount: 0, totalDenialRows: 0,
        };
      }

      // For Denial Rate (unchanged)
      map[month].totalDenialRows++;
      if ((r.Claim_Status || "").toLowerCase().trim() === "denied") {
        map[month].deniedCount++;
      }

      // UPDATED: For FPR - Count true Is_First_Pass_Resolution per month in denials
      if (r.Is_First_Pass_Resolution) {
        map[month].fprTrueCount++;
      }
      map[month].fprDenialCount++;  // Total denial rows per month (denominator)
    });

    // Step 3: Calculate per-month values (FPR updated)
    let chartData = Object.entries(map)
      .sort((a, b) => a[1].date.unix() - b[1].date.unix())
      .map(([month, obj]) => {
        let avgVal = 0;

        if (selectedMetric === "GCR" && obj.billedSum > 0) {
          avgVal = (obj.paidSum / obj.billedSum) * 100;
        } else if (selectedMetric === "NCR" && (obj.billedSum - obj.adjustmentSum) > 0) {
          avgVal = (obj.paidSum / (obj.billedSum - obj.adjustmentSum)) * 100;
        } else if (selectedMetric === "CCR") {
          avgVal = obj.ccrCount > 0 ? obj.ccrSum / obj.ccrCount : (obj.target || obj.baseline || 0);
        } else if (selectedMetric === "FPR") {
          // UPDATED: Monthly % true in denials (true count / total denial rows * 100)
          avgVal = obj.fprDenialCount > 0 ? (obj.fprTrueCount / obj.fprDenialCount) * 100 : 0;  // e.g., 350 true / 500 denials = 70%
        } else if (selectedMetric === "Denial Rate") {
          avgVal = obj.totalDenialRows > 0 ? (obj.deniedCount / obj.totalDenialRows) * 100 : 0;
        }

        return {
          month: obj.date.format("MMM YY"),
          avg: avgVal,
          target: obj.target,
          baseline: obj.baseline,
        };
      });

    // CCR special handling (unchanged)
    if (selectedMetric === "CCR" && chartData.length > 0) {
      const monthlyAvgs = chartData.map(d => d.avg).filter(avg => avg > 0);
      const avgAcrossMonths = monthlyAvgs.length > 0 ? monthlyAvgs.reduce((sum, avg) => sum + avg, 0) / monthlyAvgs.length : 0;
      chartData = [{
        month: `${chartData.length}M Avg`,
        avg: avgAcrossMonths,
        target: chartData[chartData.length - 1]?.target,
        baseline: chartData[chartData.length - 1]?.baseline,
      }];
    }

    return chartData;
  }, [filteredCharges, filteredDenials, selectedMetric]);

  const arDaysTrendData = useMemo(() => {
    if (filteredOpenAR.length === 0) return [];  // No filtered data, empty chart

    // Group filtered openAR by month (Date_of_Service) and average "ar_days" value per month
    const monthlyData = filteredOpenAR.reduce((acc, r) => {
      const serviceDate = dayjs(r.Date_of_Service);
      if (!serviceDate.isValid()) return acc;  // Skip invalid dates
      const month = serviceDate.format("MMM YY");
      if (!acc[month]) {
        acc[month] = { arDaysValues: [], date: serviceDate.startOf("month") };  // Use ar_days for graph
      }
      const arDaysVal = Number(r.ar_days || 0);  // From CSV "ar_days" header (normalized)
      if (!isNaN(arDaysVal) && arDaysVal >= 0) {  // Only valid non-negative values
        acc[month].arDaysValues.push(arDaysVal);
      }
      return acc;
    }, {});

    // Compute simple average per month and sort chronologically
    return Object.entries(monthlyData)
      .map(([month, obj]) => {
        const avgArDays = obj.arDaysValues.length > 0
          ? obj.arDaysValues.reduce((sum, val) => sum + val, 0) / obj.arDaysValues.length
          : 0;  // Pure average from "ar_days"
        return {
          month: obj.date.format("MMM YY"),
          value: Math.round(avgArDays),  // Round to whole days for graph
        };
      })
      .sort((a, b) => dayjs(a.month, "MMM YY").valueOf() - dayjs(b.month, "MMM YY").valueOf());  // Chronological order
  }, [filteredOpenAR]);

  const avgArDays = useMemo(() => {
    if (filteredOpenAR.length === 0) return 0;  // No filtered data

    // Extract and average "ar_days" values directly from filtered openAR rows
    const arDaysValues = filteredOpenAR
      .map(r => Number(r.ar_days || 0))  // From CSV "ar_days" header (normalized)
      .filter(val => !isNaN(val) && val >= 0);  // Only valid non-negative values

    if (arDaysValues.length === 0) return 0;  // No valid values

    const total = arDaysValues.reduce((sum, val) => sum + val, 0);
    return Math.round(total / arDaysValues.length);  // Simple average from "ar_days", rounded for card
  }, [filteredOpenAR]);

  // UPDATED: AR Aging Buckets from NEW aging.csv (filtered by Date_of_Service)
  const arAgingPieData = useMemo(() => {
    const buckets = {
      "0-30 Days": 0,  // Initialize for summing amounts
      "31-60 Days": 0,
      "61-90 Days": 0,
      "90+ Days": 0,
    };

    if (!Array.isArray(filteredAging) || filteredAging.length === 0) {
      return Object.entries(buckets).map(([name]) => ({ name, value: 0, rawAmount: 0 }));  // Return 0 for both
    }

    filteredAging.forEach(item => {
      let aging = Number(item.aging || 0);
      let amount = Number(item.Aging_Amount || 0);
      if (isNaN(aging) || aging < 0 || isNaN(amount)) return;  // Skip invalid
      if (aging >= 0 && aging <= 30) buckets["0-30 Days"] += amount;
      else if (aging >= 31 && aging <= 60) buckets["31-60 Days"] += amount;
      else if (aging >= 61 && aging <= 90) buckets["61-90 Days"] += amount;
      else if (aging >= 91) buckets["90+ Days"] += amount;
    });

    const totalAmount = Object.values(buckets).reduce((sum, val) => sum + val, 0);

    return Object.entries(buckets).map(([name, value]) => ({
      name,
      value: totalAmount > 0 ? ((value / totalAmount) * 100) : 0,  // Percentage
      rawAmount: value,  // Store the original summed amount
    }));
  }, [filteredAging]);
  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const pyramidChartData = useMemo(() => {
    const data = [
      { name: "GCR", current: currentKPIs.gcr, previous: prevKPIs.gcr },
      { name: "NCR", current: currentKPIs.ncr, previous: prevKPIs.ncr },
      { name: "CCR", current: currentKPIs.cleanClaimRate, previous: prevKPIs.cleanClaimRate },
      { name: "FPR", current: currentKPIs.firstPassRate, previous: prevKPIs.firstPassRate },
      { name: "Denial Rate", current: currentKPIs.denialRate, previous: prevKPIs.denialRate },
    ];
    return data.map((item) => ({ name: item.name, current: item.current, previous: -item.previous }));
  }, [currentKPIs, prevKPIs]);

  // --- UPDATED: sideCardSparklines to always show 6 bars (last 6 months) ---
  // UPDATED: billingLag sparkline now from denials (Claim_Submission_Date - Date_of_Service)
  const sideCardSparklines = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const totalDays = end.diff(start, 'day') + 1;  // Inclusive count
    const segments = 6;  // Always 6 bars
    let daysPerSegment = totalDays > 1 ? Math.ceil(totalDays / segments) : 1;  // Divide days by 6, or 1 if single day

    // Initialize arrays for 6 segments
    const segmentDataCharges = Array(segments).fill().map(() => ({ payments: 0, chargeLags: [] }));
    const segmentDataDenials = Array(segments).fill().map(() => ({ billingLags: [] }));

    filteredCharges.forEach(r => {
      const chargeDate = dayjs(r.Charge_Entry_Date);
      if (chargeDate.isBetween(start, end, null, '[]')) {
        const dayIndex = Math.floor(chargeDate.diff(start, 'day') / daysPerSegment);
        const segmentIndex = Math.min(dayIndex, segments - 1);  // Ensure it doesn't exceed 5
        segmentDataCharges[segmentIndex].payments += r.Paid_Amount || 0;
        if (r.Date_of_Service && r.Charge_Entry_Date) {
          const lag = chargeDate.diff(dayjs(r.Date_of_Service), 'day');
          segmentDataCharges[segmentIndex].chargeLags.push(lag);
        }
      }
    });

    filteredDenials.forEach(r => {
      const serviceDate = dayjs(r.Date_of_Service);
      if (serviceDate.isBetween(start, end, null, '[]')) {
        const dayIndex = Math.floor(serviceDate.diff(start, 'day') / daysPerSegment);
        const segmentIndex = Math.min(dayIndex, segments - 1);  // Ensure it doesn't exceed 5
        if (r.Date_of_Service && r.Claim_Submission_Date) {
          const lag = dayjs(r.Claim_Submission_Date).diff(serviceDate, 'day');
          segmentDataDenials[segmentIndex].billingLags.push(lag);
        }
      }
    });

    // Calculate overall averages if totalDays <= 1
    let overallChargeAvgLag = 0;
    if (totalDays <= 1 && segmentDataCharges[0].chargeLags.length > 0) {
      overallChargeAvgLag = segmentDataCharges[0].chargeLags.reduce((a, b) => a + b, 0) / segmentDataCharges[0].chargeLags.length;
    }

    let overallBillingAvgLag = 0;
    if (totalDays <= 1 && segmentDataDenials[0].billingLags.length > 0) {
      overallBillingAvgLag = segmentDataDenials[0].billingLags.reduce((a, b) => a + b, 0) / segmentDataDenials[0].billingLags.length;
    }

    // Create final data arrays for 6 bars with units
    const paymentsData = segmentDataCharges.map(segment => ({
      value: totalDays <= 1 ? segmentDataCharges[0].payments / segments : segment.payments,
      unit: 'amount'  // Explicitly indicate it's in currency (e.g., dollars)
    }));

    const chargeLagData = segmentDataCharges.map(segment => {
      const avgLag = segment.chargeLags.length > 0 ? segment.chargeLags.reduce((a, b) => a + b, 0) / segment.chargeLags.length : 0;
      return {
        value: totalDays <= 1 ? (overallChargeAvgLag / segments) : avgLag,  // Divide by 6 if single day
        unit: 'days'  // Explicitly indicate it's in days
      };
    });

    const billingLagData = segmentDataDenials.map(segment => {
      const avgLag = segment.billingLags.length > 0 ? segment.billingLags.reduce((a, b) => a + b, 0) / segment.billingLags.length : 0;
      return {
        value: totalDays <= 1 ? (overallBillingAvgLag / segments) : avgLag,  // Divide by 6 if single day
        unit: 'days'  // Explicitly indicate it's in days
      };
    });

    // Debugging logs
    console.log('paymentsData:', paymentsData);
    console.log('chargeLagData:', chargeLagData);
    console.log('billingLagData:', billingLagData);
    return { paymentsData, chargeLagData, billingLagData };
  }, [filteredCharges, filteredDenials, startDate, endDate]);



  const CustomPyramidTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const currentVal = payload.find((p) => p.dataKey === "current")?.value || 0;
      const previousVal = payload.find((p) => p.dataKey === "previous")?.value || 0;
      return (
        <div style={{ backgroundColor: "#fff", border: "1px solid #ccc", padding: "10px" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>{label}</p>
          <p style={{ margin: 0, color: "#0088FE" }}>Current: {Math.abs(currentVal).toFixed(2)}%</p>
          <p style={{ margin: 0, color: "#8b5cf6" }}>Previous: {Math.abs(previousVal).toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  // UPDATED: Trend for billingLag now uses prevDenials (uses absolute diff trend)
  const sideCardData = [
    {
      title: "Charge Lag",
      value: chargeLag,
      trend: trend(chargeLag, calculateLag(prevCharges, "Date_of_Service", "Charge_Entry_Date"), false), // Lower lag is good (absolute diff)
      color: "#3b82f6",
      suffix: "days",
      sparklineData: sideCardSparklines.chargeLagData,
    },
    {
      title: "Billing Lag",
      value: billingLag,
      trend: trend(billingLag, calculateLag(prevDenials, "Date_of_Service", "Claim_Submission_Date"), false), // Lower lag is good (absolute diff)
      color: "#8b5cf6",
      suffix: "days",
      sparklineData: sideCardSparklines.billingLagData,
    },
    {
      title: "Total Payments",
      value: currentKPIs.totalPayments,
      trend: trend(currentKPIs.totalPayments, prevKPIs.totalPayments, true),  // Absolute diff
      color: "#22c55e",
      prefix: "$",
      sparklineData: sideCardSparklines.paymentsData,
      link: "/totalpayment",
    },
  ];

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", fontFamily: "system-ui, sans-serif", marginTop: "-10px" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: "80px", height: "40px", objectFit: "cover" }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: "20px" }}>RCM Dashboard</h2>
            <p style={{ margin: 0, color: "#6c757d", fontSize: "14px" }}>Healthcare Revenue Cycle Management Optimization </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Date From */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#242424ff", marginBottom: "4px" }}>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: "white" }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#242424ff", marginBottom: "4px" }}>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: "white" }}
            />
          </div>

          {/* Quick Filter */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#242424ff", marginBottom: "4px" }}>Quick Filter</label>
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: "white" }}
            >
              <option value={QUICK_FILTERS.NONE}>No Filter</option>
              <option value={QUICK_FILTERS.DAY_PREV_DAY}>Previous Day</option>
              <option value={QUICK_FILTERS.DAY_LAST_MONTH_SAME_DAY}>Same Day Last Month</option>
              <option value={QUICK_FILTERS.DAY_LAST_YEAR_SAME_DAY}>Same Day Last Year</option>
              <option value={QUICK_FILTERS.WEEK_LAST_WEEK}>Last Week</option>
              <option value={QUICK_FILTERS.WEEK_LAST_MONTH_WEEK}>Same Week Last Month</option>
              <option value={QUICK_FILTERS.WEEK_LAST_YEAR_WEEK}>Same Week Last Year</option>
              <option value={QUICK_FILTERS.MONTH_LAST_MONTH}>Last Month</option>
              <option value={QUICK_FILTERS.MONTH_LAST_YEAR_SAME_MONTH}>Same Month Last Year</option>
              <option value={QUICK_FILTERS.YEAR_PREV_YEAR_1}>Year 2025</option>
              <option value={QUICK_FILTERS.YEAR_PREV_YEAR_2}>Year 2024</option>
              <option value={QUICK_FILTERS.YEAR_PREV_YEAR_3}>Year 2023</option>
            </select>
          </div>

          {/* New: Client Filter Dropdown */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "12px", fontWeight: "500", color: "#242424ff", marginBottom: "4px" }}>Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: "white" }}
            >
              <option value="all">All</option>
              <option value="entfw">ENTFW</option>
              <option value="eca">ECA</option>
              <option value="soundhealth">SOUND HEALTH</option>
            </select>
          </div>

          {/* Upload CSV button */}
          <div style={{ marginLeft: 16 }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid #ced4da",
                background: "linear-gradient(90deg, #204ba0ff, #1783ccff)",
                color: "#FFF",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              Upload CSV
            </button>
            {uploadError && (
              <div style={{ color: "red", marginTop: 4 }}>{uploadError}</div>
            )}
          </div>
          <DropdownAvatar />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
        {[
          { title: "Gross Collection Rate (GCR)", value: currentKPIs.gcr.toFixed(2), trend: kpisWithTrend.gcr, sparklineData: kpiSparklines.gcr, link: "/gcr" },
          { title: "Net Collection Rate (NCR)", value: currentKPIs.ncr.toFixed(2), trend: kpisWithTrend.ncr, sparklineData: kpiSparklines.ncr, link: "/ncr" },
          { title: "Denial Rate", value: currentKPIs.denialRate.toFixed(2), trend: kpisWithTrend.denialRate, sparklineData: kpiSparklines.denialRate, link: "/denials" },
          { title: "First Pass Rate (FPR)", value: currentKPIs.firstPassRate.toFixed(2), trend: kpisWithTrend.firstPassRate, sparklineData: kpiSparklines.firstPassRate },
          { title: "Clean Claim Rate (CCR)", value: currentKPIs.cleanClaimRate.toFixed(2), trend: kpisWithTrend.cleanClaimRate, sparklineData: kpiSparklines.cleanClaimRate },
          { title: "Total Claims", value: Math.round(currentKPIs.totalClaims).toLocaleString(), trend: kpisWithTrend.totalClaims, sparklineData: kpiSparklines.totalClaims, link: "/claims" },
        ].map((kpi) => (
          <Link to={kpi.link || "#"} key={kpi.title} style={{ textDecoration: "none", color: "inherit" }}>
            <Card
              className="kpi-card"
              style={{
                padding: "20px",
                backgroundColor: "white",
                border: "1px solid #dee2e6",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                transition: "border-color 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#7c3aed";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#dee2e6";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", color: "#050505ff", fontWeight: 500 }}>{kpi.title.replace(/\s\$.*\$/, "")}</h3>
                <p style={{ margin: "8px 0", fontSize: "32px", fontWeight: "bold" }}>
                  {kpi.value}
                  {(kpi.title.includes("Rate") || kpi.title.includes("GCR") || kpi.title.includes("NCR")) && "%"}
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ color: kpi.trend.color, fontWeight: "bold" }}>
                  {kpi.trend.arrow} {kpi.trend.percentChange}  {/* Absolute diff, no % */}
                </div>
                <div style={{ width: "80px", height: "30px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.sparklineData}>
                      <Area type="monotone" dataKey="value" stroke={kpi.trend.color} fill={`${kpi.trend.color}33`} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          <Card style={{ padding: "20px", backgroundColor: "white", border: "1px solid #dee2e6" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {["GCR", "NCR", "Denial Rate", "CCR", "FPR"].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "16px",
                    border: "1px solid #dee2e6",
                    cursor: "pointer",
                    backgroundColor: selectedMetric === metric ? "#e0e0e0" : "transparent",
                    color: "black",
                    fontWeight: 500,
                  }}
                >
                  {metric}
                </button>
              ))}
            </div>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mainChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    allowDecimals={false}
                    tickFormatter={(v) => `${Math.round(v)}%`}
                  />
                  <Tooltip formatter={(v) => `${v.toFixed()}%`} />
                  <Legend iconType="plainline" />
                  <Line type="monotone" name="Average" dataKey="avg" stroke="#0dddb7ff" strokeWidth={2} dot={false} />
                  <Line type="monotone" name="Industry Benchmark" dataKey="target" stroke="#e73798ff" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  <Line type="monotone" name="Pre-Jorie Performance" dataKey="baseline" stroke="#2d4ddbff" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* First row (Charge Lag + Billing Lag) */}
            <div style={{ display: "flex", gap: "20px" }}>
              {sideCardData.slice(0, 2).map((card, index) => (
                <Link key={card.title} to={card.link || "#"} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                  <Card
                    style={{
                      padding: "20px",
                      backgroundColor: "white",
                      border: "1px solid #dee2e6",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "#050505ff" }}>{card.title}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "24px", fontWeight: "bold", margin: "8px 0" }}>
                        <span>
                          {card.prefix || ""}
                          {card.value.toLocaleString()}
                          {card.suffix ? ` ${card.suffix}` : ""}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: "70px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={card.sparklineData}>
                          <Bar dataKey="value" fill={card.color} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            
             <button style={{
              position: "fixed", bottom: 24, right: 24, width: 60, height: 60, borderRadius: "50%",
              background: "#1976d2", color: "#fff", fontSize: 32, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1200, cursor: "pointer"
            }} title="Ask the Joire AI" onClick={() => setAiBotOpen(true)}>🤖</button>

            <AiBotPopup open={aiBotOpen} onClose={() => setAiBotOpen(false)} />


            
            {/* Second row (Total Payments) */}
            {sideCardData.slice(2).map((card) => (
              <Link to={card.link} key={card.title} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                <Card
                  style={{
                    padding: "20px",
                    backgroundColor: "white",
                    border: "1px solid #dee2e6",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 500, color: "#050505ff" }}>{card.title}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "24px", fontWeight: "bold", margin: "8px 0" }}>
                      <span>
                        {card.prefix || ""}
                        {card.value.toLocaleString()}
                        {card.suffix ? ` ${card.suffix}` : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: "80px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={card.sparklineData}>
                        <Bar dataKey="value" fill={card.color} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Link> 
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <Card style={{ padding: "20px", backgroundColor: "white", border: "1px solid #dee2e6" }}>
            <h3 style={{ margin: 0, fontSize: "16px" }}>AR Days</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", margin: "8px 0" }}>
              {avgArDays} Days
            </p>
            <div style={{ height: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={arDaysTrendData}
                  margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                >
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    label={{ value: "Days", angle: -90, position: "insideLeft", fontSize: 6 }}
                  />
                  <Tooltip formatter={(value) => `${value} Days`} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="AR Days"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card style={{ padding: "20px", backgroundColor: "white", border: "1px solid #dee2e6" }}>
            <h3 style={{ margin: 0, fontSize: "16px", textAlign: "left" }}>AR Aging Buckets</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "220px", width: "100%" }}>
              <div style={{ flex: 1, height: "100%", marginTop: "10%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={arAgingPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius="100%"
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                    >
                      {arAgingPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${value.toFixed(2)}% , Total Amount - $${props.payload.rawAmount.toLocaleString()}`, name]}
                    />  {/* Now includes raw amount in tooltip */}
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 0.4, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "-20px", marginTop: "15%", gap: "12px" }}>
                {arAgingPieData.map((entry, index) => (
                  <div key={`legend-${index}`} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                        borderRadius: "3px",
                        marginRight: "8px",
                      }}
                    ></span>
                    <span style={{ fontSize: "14px", color: "#343a40" }}>
                      {entry.name} ({entry.value.toFixed(2)}% - ${entry.rawAmount.toLocaleString()})  {/* Updated to include raw amount */}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card style={{ padding: "20px", backgroundColor: "white", border: "1px solid #dee2e6" }}>
            <h3 style={{ margin: 0, fontSize: "16px", textAlign: "left", marginBottom: "10px" }}>Current vs. Previous Period (%)</h3>
            <div style={{ display: "flex", justifyContent: "space-around", fontSize: "12px", fontWeight: "bold", color: "#0a0a0aff", marginBottom: "10px" }}>
              <span>Previous</span>
              <span>Current</span>
            </div>
            <div style={{ height: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={pyramidChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[-100, 100]} tickFormatter={(value) => `${Math.abs(value).toFixed(1)}%`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={75} style={{ fontSize: "12px" }} />
                  {/* NEW: Black solid line and label at 0% */}
                  <ReferenceLine
                    x={0}
                    stroke="black"
                    strokeWidth={1}
                  />
                  <Tooltip content={<CustomPyramidTooltip />} cursor={{ fill: "rgba(200, 200, 200, 0.2)" }} formatter={(value) => [`${Math.abs(value).toFixed(1)}%`]} />
                  <Bar dataKey="previous" fill="#8b5cf6" barSize={15} name="Previous Period">
                    <LabelList dataKey="previous" position="insideLeft" formatter={(val) => `${Math.abs(val).toFixed(1)}%`} style={{ fill: "white" }} />
                  </Bar>
                  <Bar dataKey="current" fill="#0088FE" barSize={15} name="Current Period">
                    <LabelList dataKey="current" position="insideRight" formatter={(val) => `${Math.abs(val).toFixed(1)}%`} style={{ fill: "white" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}