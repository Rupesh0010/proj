// src/api.js
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

export const CLIENT_FOLDERS = {
  all: ["entfw", "eca", "soundhealth"],
  entfw: ["entfw"],
  eca: ["eca"],
  soundhealth: ["soundhealth"],
};

export const CSV_FILES = ["charges.csv", "denial.csv", "openar.csv", "aging.csv"];

// Generic CSV parsing function
export const parseCSV = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        worker: false,
        transformHeader: (h) => {
          if (!h) return null;
          const map = {
            billed: "Billed_Amount",
            paid: "Paid_Amount",
            adjustment: "Adjustment_Amount",
            open_ar: "Open_AR_Amount",
            first_pass: "Is_First_Pass_Resolution",
            is_clean_claim: "Is_Clean_Claim",
            aging: "aging",
            ar_days: "ar_days",
            visit: "visit",
          };
          return map[h.trim().toLowerCase()] || h.trim();
        },
        complete: (results) => {
          const normalized = results.data.map((r) => {
            const num = (v) => {
              if (v == null || v === "") return 0;
              const cleaned = String(v).replace(/,/g, "").replace(/"/g, "");
              const parsed = Number(cleaned);
              return isNaN(parsed) ? 0 : parsed;
            };
            const parseDateTs = (d) =>
              d ? (dayjs(d).isValid() ? dayjs(d).valueOf() : null) : null;

            return {
              ...r,
              Billed_Amount: num(r.Billed_Amount || r.billed || r.amount),
              Paid_Amount: num(r.Paid_Amount || r.paid),
              Adjustment_Amount: num(r.Adjustment_Amount || r.adjustment),
              Open_AR_Amount: num(r.Open_AR_Amount || r.apenaramount || r.open_ar),
              Is_First_Pass_Resolution:
                r.First_Pass === true ||
                String(r.First_Pass || r.Is_First_Pass_Resolution || "")
                  .toLowerCase() === "true" ||
                Number(r.First_Pass || r.Is_First_Pass_Resolution || 0) === 1,
              Is_Clean_Claim: Number(r.Is_Clean_Claim || 0),
              aging: num(r.aging || r.Aging || 0),
              ar_days: num(r.ar_days || r.arDays || 0),
              visit: num(r.visit || r.Visit || 1),
              Date_of_Service_ts: parseDateTs(r.Date_of_Service || r.date || r.Date),
              Charge_Entry_Date_ts: parseDateTs(r.Charge_Entry_Date || r.entry_date),
              Claim_Submission_Date_ts: parseDateTs(
                r.Claim_Submission_Date || r.claim_submission_date
              ),
              month:
                r.month ||
                (r.Date_of_Service
                  ? dayjs(r.Date_of_Service).format("MMM YY")
                  : r.Charge_Entry_Date
                  ? dayjs(r.Charge_Entry_Date).format("MMM YY")
                  : ""),
            };
          });
          resolve(normalized);
        },
        error: (err) => reject(err),
      });
    });
  } catch (err) {
    console.error("CSV parse error", err);
    return [];
  }
};

// Load data for a single client
export const loadClientData = async (client) => {
  const folders = CLIENT_FOLDERS[client] || [];
  const urls = folders.flatMap((f) => CSV_FILES.map((file) => `/${f}/${file}`));
  const allCharges = [],
    allDenials = [],
    allOpenAR = [],
    allAging = [];

  for (let url of urls) {
    try {
      const data = await parseCSV(url);
      if (url.includes("charges.csv")) allCharges.push(...data);
      else if (url.includes("denial.csv")) allDenials.push(...data);
      else if (url.includes("openar.csv")) allOpenAR.push(...data);
      else if (url.includes("aging.csv")) allAging.push(...data);
    } catch (err) {
      console.error("Error loading CSV", url, err);
    }
  }

  return { allCharges, allDenials, allOpenAR, allAging };
};
