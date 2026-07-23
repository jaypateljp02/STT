import React, { useState, useEffect } from 'react';
import { Key, Cpu, Save, X, Eye, EyeOff, CheckCircle, Info } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSaveSuccess }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.apiKey) setApiKey(data.apiKey);
          if (data.model) setModel(data.model);
        })
        .catch((err) => console.error('Failed to load settings:', err));
    }
  }, [isOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedStatus(true);
        setTimeout(() => {
          setSavedStatus(false);
          if (onSaveSuccess) onSaveSuccess();
          onClose();
        }, 1200);
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key style={{ color: 'var(--accent-primary)' }} size={22} /> Platform API Settings
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', textDecoration: 'underline' }}
              >
                Get Free API Key
              </a>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{ width: '100%', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                }}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Stored safely in local database. Saved permanently across browser sessions.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} /> Select Multimodal AI Engine
            </label>
            <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: '100%' }}>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fast Multimodal)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Flagship - Maximum Accuracy)</option>
              <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Latest Engine)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Large Context Multimodal)</option>
            </select>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
              background: '#f8fafc',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <Info size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span>For fast speech or complex dialects, select <strong>Gemini 2.5 Pro</strong> for highest fidelity.</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {savedStatus ? (
                <>
                  <CheckCircle size={18} /> Saved!
                </>
              ) : (
                <>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Settings'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
