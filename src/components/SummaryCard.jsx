import React, { useState, useRef } from 'react';
import { Copy, Check, Download, Calendar, Languages, FileText, ListChecks, MessageSquareText, Layers, Volume2, SplitSquareVertical } from 'lucide-react';

export default function SummaryCard({ record, onCopyToast }) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [activeView, setActiveView] = useState('summary'); // 'summary' | 'sidebyside' | 'transcript'
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const audioRef = useRef(null);

  if (!record) return null;

  const handleCopySummary = () => {
    const textToCopy = `AUDIO SUMMARY - ${record.title}
Date Recorded: ${record.recorded_date}
Original Language: ${record.detected_language}

--- EXECUTIVE SUMMARY ---
${record.summary_english}

--- KEY TAKEAWAYS ---
${record.key_takeaways.map((k) => `• ${k}`).join('\n')}

--- ACTION ITEMS ---
${record.action_items.map((a) => `• ${a}`).join('\n')}
`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    if (onCopyToast) onCopyToast('Summary copied to clipboard!');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(record.transcript_english);
    setCopiedTranscript(true);
    if (onCopyToast) onCopyToast('Full English transcript copied to clipboard!');
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(record.transcript_original || record.transcript_english);
    setCopiedOriginal(true);
    if (onCopyToast) onCopyToast('Original language transcript copied!');
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleDownloadReport = () => {
    const textContent = `# ${record.title}
**Recorded Date**: ${record.recorded_date}
**Original Language**: ${record.detected_language}

## Executive Summary
${record.summary_english}

## Key Takeaways
${record.key_takeaways.map((k) => `- ${k}`).join('\n')}

## Action Items
${record.action_items.map((a) => `- ${a}`).join('\n')}

## Original Language Transcript (${record.detected_language})
${record.transcript_original || 'N/A'}

## English Translation Transcript
${record.transcript_english}
`;

    const blob = new Blob([textContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.title.replace(/[^a-z0-9]/gi, '_')}_Summary.md`;
    a.click();
  };

  return (
    <div className="glass-card" style={{ border: '1px solid var(--border-highlight)' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{record.title}</h2>
            <span className="badge badge-lang">
              <Languages size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {record.detected_language}
            </span>
            <span className="badge badge-source">
              {record.source_type === 'drive' ? 'Google Drive Link' : 'Local Audio File'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> Recorded: {record.recorded_date}
            </span>
            {record.notes && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={14} /> Note: {record.notes}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleCopySummary} className={`btn-copy ${copiedSummary ? 'copied' : ''}`}>
            {copiedSummary ? <Check size={16} /> : <Copy size={16} />}
            {copiedSummary ? 'Copied Summary!' : 'Copy Summary'}
          </button>

          <button onClick={handleCopyTranscript} className={`btn-copy ${copiedTranscript ? 'copied' : ''}`}>
            {copiedTranscript ? <Check size={16} /> : <Copy size={16} />}
            {copiedTranscript ? 'Copied Transcript!' : 'Copy English'}
          </button>

          <button onClick={handleDownloadReport} className="btn-copy" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
            <Download size={16} /> Export MD
          </button>
        </div>
      </div>

      {/* Built-In Audio Player */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <Volume2 size={20} style={{ color: 'var(--accent-primary)' }} />
          <audio
            ref={audioRef}
            controls
            src={`/api/audio/${record.id}`}
            style={{ width: '100%', height: '36px', borderRadius: '6px' }}
          />
        </div>

        {/* Speed Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Speed:</span>
          {[1, 1.25, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              style={{
                background: playbackSpeed === s ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                color: playbackSpeed === s ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '8px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveView('summary')}
          style={{
            background: 'transparent',
            color: activeView === 'summary' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            borderBottom: activeView === 'summary' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            paddingBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Layers size={16} /> Structured Summary
        </button>

        <button
          onClick={() => setActiveView('sidebyside')}
          style={{
            background: 'transparent',
            color: activeView === 'sidebyside' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            borderBottom: activeView === 'sidebyside' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            paddingBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <SplitSquareVertical size={16} /> Side-by-Side Transcript Comparison
        </button>

        <button
          onClick={() => setActiveView('transcript')}
          style={{
            background: 'transparent',
            color: activeView === 'transcript' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            borderBottom: activeView === 'transcript' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            paddingBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MessageSquareText size={16} /> Full English Transcript
        </button>
      </div>

      {/* View 1: Summary */}
      {activeView === 'summary' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '8px' }}>
              Executive Summary (Factual & Verified)
            </h3>
            <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-line', fontSize: '0.96rem' }}>
              {record.summary_english}
            </p>
          </div>

          {record.key_takeaways && record.key_takeaways.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListChecks size={18} /> Verified Key Takeaways
              </h3>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {record.key_takeaways.map((point, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {record.action_items && record.action_items.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24', marginBottom: '10px' }}>
                Action Items & Decisions
              </h3>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {record.action_items.map((item, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* View 2: Side-by-Side Comparison */}
      {activeView === 'sidebyside' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left: Original Script */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>
                Original Language ({record.detected_language})
              </span>
              <button onClick={handleCopyOriginal} className={`btn-copy ${copiedOriginal ? 'copied' : ''}`} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                {copiedOriginal ? 'Copied' : 'Copy Original'}
              </button>
            </div>
            <div style={{ lineHeight: 1.7, whiteSpace: 'pre-line', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {record.transcript_original || 'Original transcript in native script will appear here for audio processed.'}
            </div>
          </div>

          {/* Right: English Translation */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.9rem' }}>
                English Translation
              </span>
              <button onClick={handleCopyTranscript} className={`btn-copy ${copiedTranscript ? 'copied' : ''}`} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                {copiedTranscript ? 'Copied' : 'Copy English'}
              </button>
            </div>
            <div style={{ lineHeight: 1.7, whiteSpace: 'pre-line', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {record.transcript_english}
            </div>
          </div>
        </div>
      )}

      {/* View 3: Single Column Transcript */}
      {activeView === 'transcript' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          maxHeight: '450px',
          overflowY: 'auto',
          lineHeight: 1.7,
          whiteSpace: 'pre-line',
          fontSize: '0.94rem',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        }}>
          {record.transcript_english}
        </div>
      )}
    </div>
  );
}
