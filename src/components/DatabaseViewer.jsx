import React, { useState, useEffect } from 'react';
import { Database, Search, Calendar, Trash2, Edit3, Eye, Copy, Check, Languages, FileText } from 'lucide-react';
import SummaryCard from './SummaryCard';

export default function DatabaseViewer({ onCopyToast }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeRecord, setActiveRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let url = '/api/records?';
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (selectedDate) url += `date=${encodeURIComponent(selectedDate)}`;

      const res = await fetch(url);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [searchTerm, selectedDate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this audio summary record?')) return;
    try {
      await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (activeRecord?.id === id) setActiveRecord(null);
      fetchRecords();
    } catch (err) {
      alert('Failed to delete record: ' + err.message);
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/records/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingRecord.title,
          notes: editingRecord.notes,
          recorded_date: editingRecord.recorded_date,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingRecord(null);
        fetchRecords();
      }
    } catch (err) {
      alert('Failed to update record: ' + err.message);
    }
  };

  return (
    <div>
      {/* Search & Filter Control Bar */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Saved Audio Database</h2>
            <span className="badge badge-source">{records.length} Saved Records</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, summary, or transcript..."
                style={{ width: '100%', paddingLeft: '38px' }}
              />
            </div>

            <div style={{ position: 'relative', width: '170px' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {(searchTerm || selectedDate) && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedDate(''); }}
                style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlignment: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading saved audio records from local database...
        </div>
      ) : records.length === 0 ? (
        /* Empty State */
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
          <Database size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No Saved Audio Records Found</h3>
          <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Process your first Japanese or foreign audio file in the "New Audio" tab above.
          </p>
        </div>
      ) : (
        /* Record Cards Grid */
        <div className="records-grid">
          {records.map((r) => (
            <div key={r.id} className="record-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</h3>
                  <span className="badge badge-lang">{r.detected_language}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> {r.recorded_date}
                  </span>
                  <span>•</span>
                  <span>{r.source_type === 'drive' ? 'Google Drive' : 'Local Audio'}</span>
                </div>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {r.summary_english}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setActiveRecord(r)}
                  style={{ background: 'var(--accent-primary)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Eye size={14} /> View & Copy
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditingRecord(r)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px' }}
                    title="Edit Notes/Date"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '6px', borderRadius: '6px' }}
                    title="Delete Record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Record View Modal */}
      {activeRecord && (
        <div className="modal-overlay" onClick={() => setActiveRecord(null)}>
          <div className="modal-card" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <SummaryCard record={activeRecord} onCopyToast={onCopyToast} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setActiveRecord(null)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Edit Record Details</h3>
            <form onSubmit={handleUpdateRecord}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Audio Title / Speaker</label>
                <input
                  type="text"
                  value={editingRecord.title}
                  onChange={(e) => setEditingRecord({ ...editingRecord, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Recorded Date</label>
                <input
                  type="date"
                  value={editingRecord.recorded_date}
                  onChange={(e) => setEditingRecord({ ...editingRecord, recorded_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Notes / Context</label>
                <textarea
                  rows={3}
                  value={editingRecord.notes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setEditingRecord(null)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
