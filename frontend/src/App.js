import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import LandingPage from "./pages/LandingPage";
import { Dashboard } from "./components/Dashboard";

function App() {
  const [parsedData, setParsedData] = useState(null);

  const handleDataLoaded = (data) => {
    setParsedData(data);
  };

  const handleReset = () => {
    setParsedData(null);
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        {parsedData ? (
          <div data-testid="app-dashboard-view">
            <button
              data-testid="back-to-upload-btn"
              onClick={handleReset}
              className="fixed bottom-6 left-6 z-[100] px-4 py-2 bg-white border border-zinc-200 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-medium text-zinc-700 hover:text-zinc-900 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload New File
            </button>
            <Dashboard parsedData={parsedData} />
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage onDataLoaded={handleDataLoaded} />} />
            <Route path="*" element={<LandingPage onDataLoaded={handleDataLoaded} />} />
          </Routes>
        )}
      </BrowserRouter>
    </div>
  );
}

export default App;
