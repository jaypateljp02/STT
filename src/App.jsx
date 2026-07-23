import React, { useState, useEffect } from 'react';
import { Mic, Settings, Database, PlusCircle, Key, AlertTriangle } from 'lucide-react';
import UploadZone from './components/UploadZone';
import SummaryCard from './components/SummaryCard';
import DatabaseViewer from './components/DatabaseViewer';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('process'); // 'process' | 'history'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(true);
  const [currentSummaryRecord, setCurrentSummaryRecord] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const checkSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data.apiKey) {
          setApiKeyConfigured(false);
        } else {
          setApiKeyConfigured(true);
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));
  };

  useEffect(() => {
    checkSettings();
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleProcessSuccess = (newRecord) => {
    setCurrentSummaryRecord(newRecord);
    setErrorMsg('');
    triggerToast('Audio translated & summary generated successfully!');
  };

  return (
    <div>
      {/* Header Bar */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-title">
            <Mic size={28} />
            <span>Audio Summary Platform</span>
          </div>

          {/* Nav Tabs */}
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'process' ? 'active' : ''}`}
              onClick={() => setActiveTab('process')}
            >
              <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
              New Audio Processing
            </button>

            <button
              className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Database size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Saved Database History
            </button>
          </nav>

          {/* Settings Button */}
          <button className="btn-settings" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={18} />
            Settings
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Missing API Key Warning */}
        {!apiKeyConfigured && (
          <div className="warning-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} style={{ color: '#f59e0b' }} />
              <div>
                <strong>Gemini API Key Required:</strong> Please configure your API key once to start processing foreign audio.
              </div>
            </div>
            <button className="warning-btn" onClick={() => setIsSettingsOpen(true)}>
              <Key size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Configure API Key
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '14px 20px',
            borderRadius: '10px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', color: '#f87171', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Tab 1: New Processing */}
        {activeTab === 'process' && (
          <div>
            <UploadZone
              onProcessStart={() => {
                setErrorMsg('');
                setCurrentSummaryRecord(null);
              }}
              onProcessSuccess={handleProcessSuccess}
              onError={(err) => setErrorMsg(err)}
            />

            {/* Display Active Summary Card when available */}
            {currentSummaryRecord && (
              <SummaryCard record={currentSummaryRecord} onCopyToast={triggerToast} />
            )}
          </div>
        )}

        {/* Tab 2: Saved Database History */}
        {activeTab === 'history' && (
          <DatabaseViewer onCopyToast={triggerToast} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSuccess={checkSettings}
      />

      {/* Toast Notification Popup */}
      {toastMsg && (
        <div className="toast">
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
}
