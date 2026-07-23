import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Calendar, FileText, User, Sparkles, CheckCircle } from 'lucide-react';

export default function UploadZone({ onProcessStart, onProcessSuccess, onError }) {
  const [file, setFile] = useState(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      setDriveUrl(''); // Clear drive link if local file is selected
      if (!title) {
        // Auto-fill title from filename
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(baseName);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);

    // Check if a Google Drive link or text URL was dropped
    const textData = e.dataTransfer.getData('text');
    if (textData && (textData.includes('drive.google.com') || textData.includes('http'))) {
      setDriveUrl(textData.trim());
      setFile(null);
      return;
    }

    // Check if a file was dropped
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !driveUrl.trim()) {
      onError('Please select an audio file or enter a Google Drive link.');
      return;
    }

    setProcessing(true);
    if (onProcessStart) onProcessStart();

    try {
      const formData = new FormData();
      if (file) {
        formData.append('audioFile', file);
      }
      formData.append('driveUrl', driveUrl);
      formData.append('recordedDate', recordedDate);
      formData.append('title', title || (file ? file.name : 'Audio Recording'));
      formData.append('notes', notes);

      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to process audio');
      }

      onProcessSuccess(data.record);
      // Reset input state
      setFile(null);
      setDriveUrl('');
      setTitle('');
      setNotes('');
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="section-title">
        <Sparkles style={{ color: 'var(--accent-primary)' }} />
        Process Japanese / Foreign Audio & Generate Summary
      </div>

      <form onSubmit={handleSubmit}>
        {/* Upload Zone */}
        <div
          className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.wma,.pcm,.3gp"
            style={{ display: 'none' }}
          />

          <UploadCloud className="dropzone-icon" />

          {file ? (
            <div>
              <div className="dropzone-title" style={{ color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle size={20} /> File Selected: {file.name}
              </div>
              <div className="dropzone-sub">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing
              </div>
            </div>
          ) : (
            <div>
              <div className="dropzone-title">
                Drag & Drop Audio File or Google Drive Link Here
              </div>
              <div className="dropzone-sub">
                Supports Audio/Video files (.WAV, .MP3, .M4A, .AAC, .WMA, .MP4) & Google Drive share links
              </div>
            </div>
          )}
        </div>

        {/* OR Google Drive Link Box */}
        <div className="or-divider">
          <span>OR PASTE GOOGLE DRIVE LINK DIRECTLY</span>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <LinkIcon
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => {
                setDriveUrl(e.target.value);
                if (e.target.value) setFile(null); // Clear local file if drive link entered
              }}
              placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
              style={{ width: '100%', paddingLeft: '40px' }}
            />
          </div>
        </div>

        {/* Metadata Inputs */}
        <div className="form-grid">
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} /> Audio Recording Date
            </label>
            <input
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} /> Audio Title / Speaker / Topic
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Japanese Client Meeting / Recording 04"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '16px', marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} /> Context / Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any specific context or notes about who is speaking..."
          />
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={processing || (!file && !driveUrl.trim())}
          >
            {processing ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Translating & Summarizing Audio...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Translate & Summarize Audio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
