import React, { useState, useEffect } from 'react';
import { Mic, Settings, Database, PlusCircle, Key, AlertTriangle, Cpu, HelpCircle } from 'lucide-react';
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
  const [errorType, setErrorType] = useState(''); // 'quota' | 'key' | 'general'
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

  const handleProcessError = (errText) => {
    if (errText.includes('QUOTA_EXHAUSTED')) {
      setErrorType('quota');
      setErrorMsg('API Credit / Quota Finished: Your Google Gemini API free quota or credits have been exhausted.');
    } else if (errText.includes('INVALID_API_KEY')) {
      setErrorType('key');
      setErrorMsg('Invalid API Key: The entered Gemini API key is invalid or expired.');
    } else {
      setErrorType('general');
      setErrorMsg(errText);
    }
  };

  const handleProcessSuccess = (newRecord) => {
    setCurrentSummaryRecord(newRecord);
    setErrorMsg('');
    setErrorType('');
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

        {/* Structured Error Banner (Quota / Key / Error handling) */}
        {errorMsg && (
          <div style={{
            background: errorType === 'quota' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            border: errorType === 'quota' ? '1px solid #ef4444' : '1px solid #f59e0b',
            color: '#fff',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={24} style={{ color: errorType === 'quota' ? '#f87171' : '#f59e0b' }} />
              <div>
                <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '2px' }}>
                  {errorType === 'quota' ? '🚨 Gemini API Quota / Credit Finished!' : errorType === 'key' ? '🔑 Invalid Gemini API Key' : 'Processing Issue Encountered'}
                </strong>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                  {errorMsg}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {(errorType === 'quota' || errorType === 'key') && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  style={{
                    background: '#6366f1',
                    color: '#fff',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  <Settings size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Update API Key
                </button>
              )}
              <button
                onClick={() => setErrorMsg('')}
                style={{ background: 'transparent', color: '#94a3b8', fontSize: '1.2rem', padding: '0 8px' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Model Accuracy Tip Box */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid var(--border-color)',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          fontSize: '0.86rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={16} style={{ color: '#a5b4fc' }} />
            <span>
              <strong>Tip for High Accuracy:</strong> If audio is noisy or spoken quickly (e.g. Japanese dialect), open <strong>Settings</strong> and select <strong>Gemini 2.5 Pro</strong> for maximum translation fidelity.
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
          >
            Change Model
          </button>
        </div>

        {/* Tab 1: New Processing */}
        {activeTab === 'process' && (
          <div>
            <UploadZone
              onProcessStart={() => {
                setErrorMsg('');
                setErrorType('');
                setCurrentSummaryRecord(null);
              }}
              onProcessSuccess={handleProcessSuccess}
              onError={handleProcessError}
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
