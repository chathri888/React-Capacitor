import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import './App.css';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import FormsList from './components/FormsList';
import CreateFormScreen from './components/CreateFormScreen';
import FormView from './components/FormView';
import ReportsPage from './components/ReportsPage';
import Dashboard from './components/Dashboard';
import ConfirmModal from './components/ConfirmModal';

// Android uses machine IP; browser uses localhost
// Using LocalTunnel for maximum reliability (bypasses firewalls)
// Logcat will show the URL being used
const GET_API_URL = () => {
  if (Capacitor.getPlatform() === 'android') {
    // If you are using an EMULATOR, use 10.0.2.2
    // If you are using a PHYSICAL DEVICE, use your machine's IP (e.g., 192.168.1.15)
    const machineIp = '192.168.1.15';
    console.log(`[Android] Attempting connection via ${machineIp} and fallback 10.0.2.2`);
    return `http://${machineIp}:5000`; // Primary choice
  }
  return 'http://localhost:5000';
};

const API_URL = GET_API_URL();
axios.defaults.baseURL = API_URL;
console.log('--- AXIOS BASE URL SET ---', axios.defaults.baseURL);

// Bypass localtunnel warning page
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';

// All API requests will now use this base URL.

function App() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // Track form submission
  const [editingForm, setEditingForm] = useState(null);
  const [activeForm, setActiveForm] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, home, reports, form, create, edit
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, formId: null });

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      const res = await axios.get('/api/forms');
      setForms(res.data);
    } catch (e) {
      console.error('--- FETCH FORMS ERROR ---');
      const errorDetail = e.response?.data?.message || e.message;
      const fullUrl = (axios.defaults.baseURL || '') + '/api/forms';
      console.error('URL:', fullUrl);
      console.error('Status:', e.response?.status);
      console.error('Message:', e.message);

      if (e.message === 'Network Error') {
        toast.error(`Network Error: Cannot reach server at ${axios.defaults.baseURL}. Ensure your PC and mobile are on same WiFi and firewall is off.`);
      } else {
        toast.error(`Fetch Error: ${errorDetail}`);
      }
    }
    finally { setLoading(false); }
  };

  const createForm = async ({ name, fields }) => {
    setSubmitting(true);
    try {
      console.log('Creating form:', { name, fields });
      const res = await axios.post('/api/forms', { name, fields });
      setForms([res.data, ...forms]);
      toast.success('Form created successfully!');
      goHome();
    } catch (e) {
      console.error('--- CREATE FORM ERROR ---');
      const errorDetail = e.response?.data?.message || e.message;
      console.error('URL:', axios.defaults.baseURL + '/api/forms');
      console.error('Status:', e.response?.status);
      console.error('Message:', e.message);

      if (e.message === 'Network Error') {
        toast.error(`Network Error: Cannot reach server at ${axios.defaults.baseURL}`);
      } else {
        toast.error(`Create Error: ${errorDetail}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = async ({ id, name, fields }) => {
    try {
      const res = await axios.put(`/api/forms/${id}`, { name, fields });
      setForms(forms.map(f => f.id === id ? res.data : f));
      setEditingForm(null);
      if (activeForm && activeForm.id === id) setActiveForm(res.data);
      toast.success('Form updated successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update form.');
    }
  };

  const requestDeleteForm = (e, id) => {
    if (e) e.stopPropagation();
    setConfirmModal({ isOpen: true, formId: id });
  };

  const deleteForm = async () => {
    const id = confirmModal.formId;
    if (!id) return;
    try {
      await axios.delete(`/api/forms/${id}`);
      setForms(forms.filter(f => f.id !== id));
      if (activeForm && activeForm.id === id) setActiveForm(null);
      toast.success('Form deleted.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete form.');
    } finally {
      setConfirmModal({ isOpen: false, formId: null });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    );
  }

  const goDashboard = () => { setActiveForm(null); setEditingForm(null); setActiveView('dashboard'); setSidebarOpen(false); };
  const goHome = () => { setActiveForm(null); setEditingForm(null); setActiveView('home'); setSidebarOpen(false); };
  const goReports = () => { setActiveForm(null); setEditingForm(null); setActiveView('reports'); setSidebarOpen(false); };
  const goCreate = () => { setActiveForm(null); setEditingForm(null); setActiveView('create'); setSidebarOpen(false); };
  const openForm = (f) => { setActiveForm(f); setEditingForm(null); setActiveView('form'); setSidebarOpen(false); };
  const openEditForm = (f) => { setEditingForm(f); setActiveView('edit'); setSidebarOpen(false); };
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-shell">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'glass-toast',
        }}
      />
      {/* ─── Mobile Header ─── */}
      <header className="mobile-header">
        <button className={`hamburger ${sidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="mobile-logo">SmartTracker</div>
      </header>

      {/* ─── Sidebar Backdrop ─── */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">📋</div>
            <div>
              <div className="sidebar-logo-text">SmartTracker</div>
              <div className="sidebar-logo-sub">Data at a glance</div>
            </div>
          </div>
        </div>

        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={goDashboard}
          >
            ✨&nbsp; Dashboard
          </button>
          <button
            className={`nav-item ${activeView === 'home' ? 'active' : ''}`}
            onClick={goHome}
          >
            🏠&nbsp; My Forms
          </button>
          <button
            className={`nav-item ${activeView === 'reports' ? 'active' : ''}`}
            onClick={goReports}
          >
            📊&nbsp; Monthly Reports
          </button>
        </nav>

        {forms.length > 0 && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">My Forms</div>
            <nav className="sidebar-nav sidebar-forms-list">
              {forms.map(f => (
                <button
                  key={f.id}
                  className={`nav-item ${activeForm && activeForm.id === f.id ? 'active' : ''}`}
                  onClick={() => openForm(f)}
                  title={f.name}
                >
                  📄&nbsp; {f.name}
                </button>
              ))}
            </nav>
          </>
        )}

        <button className="btn-create-form" onClick={goCreate}>
          ＋ &nbsp;New Form
        </button>
      </aside>

      {/* ─── Main ─── */}
      <main className="main-content">
        {activeView === 'dashboard' ? (
          <Dashboard forms={forms} onOpenForm={openForm} />
        ) : activeView === 'reports' ? (
          <ReportsPage forms={forms} />
        ) : activeView === 'form' && activeForm ? (
          <FormView form={activeForm} onBack={goHome} />
        ) : activeView === 'create' || activeView === 'edit' ? (
          <CreateFormScreen
            editingForm={editingForm}
            onBack={goHome}
            onCreate={createForm}
            onUpdate={updateForm}
            submitting={submitting}
          />
        ) : (
          <FormsList
            forms={forms}
            onOpen={openForm}
            onDelete={requestDeleteForm}
            onEdit={openEditForm}
            onCreate={goCreate}
          />
        )}
      </main>

      {/* ─── Bottom Navigation (Mobile Only) ─── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <button
            className={`nav-tab ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={goDashboard}
          >
            <span className="nav-tab-icon">✨</span>
            <span className="nav-tab-label">Home</span>
          </button>
          <button
            className={`nav-tab ${activeView === 'home' ? 'active' : ''}`}
            onClick={goHome}
          >
            <span className="nav-tab-icon">🏠</span>
            <span className="nav-tab-label">Forms</span>
          </button>
          <button
            className={`nav-tab ${activeView === 'reports' ? 'active' : ''}`}
            onClick={goReports}
          >
            <span className="nav-tab-icon">📊</span>
            <span className="nav-tab-label">Reports</span>
          </button>
          <button className="nav-tab" onClick={goCreate}>
            <span className="nav-tab-icon">➕</span>
            <span className="nav-tab-label">New</span>
          </button>
        </div>
      </nav>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Form"
        message="Are you sure you want to delete this form and all its entries? This action cannot be undone."
        onConfirm={deleteForm}
        onCancel={() => setConfirmModal({ isOpen: false, formId: null })}
      />
    </div>
  );
}

export default App;
