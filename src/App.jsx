import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";   // KPI dashboard
import SelectKpis from "./pages/selectedkpis"; // New KPI Selection page
import GcrPage from "./pages/GcrPage";
import DenialPage from "./pages/DenialPage";
import NcrPage from "./pages/NcrPage";
// import FprPage from "./pages/FprPage";
// import CcrPage from "./pages/CcrPage";
import TotalPage from "./pages/TotalPage";
import BillingLag from "./pages/BillingLag";
import TotalPaymentPage from "./pages/TotalPaymentPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";

import React, { useState } from "react";

function App() {
  const [selectedKpis, setSelectedKpis] = useState([]);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <SelectKpis setSelectedKpis={setSelectedKpis} />
          }
        />
        <Route
          path="/dashboard"
          element={
            <Dashboard selectedKpis={selectedKpis} />
          }
        />
        <Route path="/gcr" element={<GcrPage />} />
        <Route path="/denials" element={<DenialPage />} />
        <Route path="/ncr" element={<NcrPage />} />
        {/* <Route path="/fpr" element={<FprPage />} />
        <Route path="/ccr" element={<CcrPage />} /> */}
        <Route path="/claims" element={<TotalPage />} />
        <Route path="/policy" element={<PrivacyPolicy />} />
        {/* <Route path="/billinglag" element={<BillingLag />} />
        <Route path="/chargelag" element={<ChargeLagPage />} /> */}
        <Route path="/totalpayment" element={<TotalPaymentPage />}
        />
      </Routes>
    </Router>
  );
}

export default App;
