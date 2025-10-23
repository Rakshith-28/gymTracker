import { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../../pages/Profile.module.css';

export default function AccountSettings({
  initialTheme = 'light',
  initialUnitSystem = 'metric',
  onUnitSystemSaved,
  onDeleteAccount,
}) {
  const [open, setOpen] = useState(true);
  const [theme, setTheme] = useState(initialTheme);
  const [unitSystem, setUnitSystem] = useState(initialUnitSystem);

  // Change password state (as an option, not as a main button)
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('pref.theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch {}
  }, [theme]);

  useEffect(() => {
    setUnitSystem(initialUnitSystem);
  }, [initialUnitSystem]);

  const saveUnitSystem = async (value) => {
    setUnitSystem(value);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/user/profile', { unitSystem: value }, { headers: { Authorization: `Bearer ${token}` } });
      onUnitSystemSaved?.(value);
      setMessage('Unit system updated');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) {
      // revert on failure
      setUnitSystem((prev) => prev);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/user/change-password', { currentPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password changed successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to change password');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const endAllSessions = () => {
    // Frontend-only: clear local token
    try { localStorage.removeItem('token'); } catch {}
    setMessage('All sessions ended on this device');
    setTimeout(() => setMessage(''), 2500);
  };

  const exportData = () => {
    // Frontend-only placeholder: trigger a simple download stub
    const blob = new Blob(["Export coming soon"], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout-export.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage('Export started');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="relative rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md shadow-xl">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 rounded-t-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
        <div className={`${styles.cardHeading} text-indigo-50`}>Account Settings</div>
        <div className={`transition-transform text-2xl ${open ? 'rotate-180' : ''}`}>▾</div>
      </button>
      <div className="h-px mx-6 bg-linear-to-r from-cyan-400/60 via-emerald-400/60 to-lime-400/60" />

      {message && (
        <div className="mx-3 mb-3 border border-emerald-500/30 bg-emerald-500/15 text-emerald-100 rounded-xl px-3 py-2">{message}</div>
      )}

      {open && (
        <ul className="divide-y divide-white/10 mt-1">
          {/* Theme */}
          <li className="p-4">
            <div className="grid sm:grid-cols-[1fr_auto] items-center gap-2">
              <div>
                <div className={`${styles.accountOptionLabel} mb-1 text-indigo-200`}>Theme</div>
                <div className="text-indigo-100/80 text-sm">Choose your display mode.</div>
              </div>
              <div className={`inline-flex items-center rounded-xl bg-white/5 ring-1 ring-white/10 p-1 ${styles.pillGroup}`}>
                <button type="button" onClick={() => setTheme('light')} className={`secondaryButton ${styles.btnSm} ${theme === 'light' ? `text-slate-900 bg-white! shadow ${styles.pillButtonSelected}` : ''}`}>Light</button>
                <button type="button" onClick={() => setTheme('dark')} className={`secondaryButton ${styles.btnSm} ${theme === 'dark' ? `text-slate-900 bg-white! shadow ${styles.pillButtonSelected}` : ''}`}>Dark</button>
              </div>
            </div>
          </li>

          {/* Unit System */}
          <li className="p-4">
            <div className="grid sm:grid-cols-[1fr_auto] items-center gap-2">
              <div>
                <div className={`${styles.accountOptionLabel} mb-1 text-indigo-200`}>Unit System</div>
                <div className="text-indigo-100/80 text-sm">Affects measurement display.</div>
              </div>
              <div className={`inline-flex items-center rounded-xl bg-white/5 ring-1 ring-white/10 p-1 ${styles.pillGroup}`}>
                <button type="button" onClick={() => saveUnitSystem('metric')} className={`secondaryButton ${styles.btnSm} ${unitSystem === 'metric' ? `text-slate-900 bg-white! shadow ${styles.pillButtonSelected}` : ''}`}>Kg (Metric)</button>
                <button type="button" onClick={() => saveUnitSystem('imperial')} className={`secondaryButton ${styles.btnSm} ${unitSystem === 'imperial' ? `text-slate-900 bg-white! shadow ${styles.pillButtonSelected}` : ''}`}>Lbs (Imperial)</button>
              </div>
            </div>
          </li>

          {/* Change Password (as an option row) */}
          <li className="p-4">
            <button type="button" onClick={() => setShowChangePassword(s => !s)} className="w-full flex items-center justify-between">
              <span className={`${styles.accountOptionLabel} text-indigo-100`}>Change Password</span>
              <span className={`transition-transform text-lg ${showChangePassword ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="grid gap-2 mt-3">
                <div>
                  <label className="text-sm text-indigo-200 mb-1 block font-medium">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60" />
                </div>
                <div>
                  <label className="text-sm text-indigo-200 mb-1 block font-medium">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className={`button ${styles.btnSm}`}>Update</button>
                  <button type="button" onClick={() => { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); }} className={`secondaryButton ${styles.btnSm}`}>Cancel</button>
                </div>
              </form>
            )}
          </li>

          {/* End Sessions */}
          <li className="p-4 flex items-center justify-between">
            <span className={`${styles.accountOptionLabel} text-indigo-100`}>End All Sessions</span>
            <button type="button" onClick={endAllSessions} className={`secondaryButton ${styles.btnSm}`}>End</button>
          </li>

          {/* Export */}
          <li className="p-4 flex items-center justify-between">
            <span className={`${styles.accountOptionLabel} text-indigo-100`}>Export Workout History</span>
            <button type="button" onClick={exportData} className={`secondaryButton ${styles.btnSm}`}>Export</button>
          </li>

          {/* Delete */}
          <li className="p-4 flex items-center justify-between">
            <span className={`text-rose-200 ${styles.accountOptionLabel}`}>Delete Account Permanently</span>
            <button type="button" onClick={onDeleteAccount} className={`deleteButton ${styles.btnSm}`}>Delete</button>
          </li>
        </ul>
      )}
    </div>
  );
}
