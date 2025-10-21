import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

function Profile() {
  // Profile state
  const [user, setUser] = useState({ name: '', email: '', createdAt: '' });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Lightweight activity stats
  const [entries, setEntries] = useState([]); // workouts + sessions dates only

  // Styles
  const bgStyle = {
    minHeight: '100vh',
    padding: '32px 16px 64px',
    background: 'linear-gradient(135deg, #0b1020 0%, #121b3a 60%, #1a234a 100%)',
    position: 'relative'
  };
  const gridOverlay = {
    position: 'absolute', inset: 0,
    backgroundImage: 'radial-gradient(1px 1px at 20px 20px, rgba(255,255,255,0.08), rgba(0,0,0,0) 40px)',
    backgroundSize: '40px 40px', pointerEvents: 'none'
  };
  const container = { maxWidth: 1000, margin: '0 auto', position: 'relative' };
  const card = (accent = false) => ({
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    ...(accent ? { borderImage: 'linear-gradient(90deg, #6ee7f9, #a78bfa) 1', borderWidth: 1, borderStyle: 'solid' } : {})
  });
  const label = { color: '#c9d3ff', fontSize: 13, marginBottom: 6, display: 'block' };
  const input = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff' };
  const button = (bg, color = '#fff') => ({ padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, background: bg, color });

  // Derived
  const initials = useMemo(() => (user?.name || 'U').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(), [user?.name]);
  const joined = useMemo(() => user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—', [user?.createdAt]);

  // Stats
  const totalWorkouts = entries.length;
  const thisMonth = useMemo(() => {
    const now = new Date();
    return entries.filter(d => {
      const x = new Date(d);
      return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
    }).length;
  }, [entries]);
  const streak = useMemo(() => {
    if (!entries.length) return 0;
    const days = new Set(entries.map(d => new Date(d).toDateString()));
    let s = 0; const today = new Date();
    // count backwards until a day with no entry
    for (let i = 0; ; i++) {
      const d = new Date(); d.setDate(today.getDate() - i);
      if (days.has(d.toDateString())) s++; else break;
    }
    return s;
  }, [entries]);

  useEffect(() => {
    const fetchProfileAndActivity = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [prof, wRes, sRes] = await Promise.all([
          axios.get('http://localhost:5000/api/user/profile', { headers }),
          axios.get('http://localhost:5000/api/workouts', { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/sessions', { headers }).catch(() => ({ data: [] }))
        ]);
        const u = prof.data || {};
        setUser(u);
        setName(u.name || '');
        setEmail(u.email || '');
        const dates = [];
        (Array.isArray(wRes.data) ? wRes.data : []).forEach(w => dates.push(w.date || w.createdAt));
        (Array.isArray(sRes.data) ? sRes.data : []).forEach(s => dates.push(s.endTime || s.startTime || s.createdAt));
        dates.sort((a, b) => new Date(b) - new Date(a));
        setEntries(dates);
      } catch (err) {
        setError('Failed to load profile');
      }
    };
    fetchProfileAndActivity();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/user/profile', { name, email }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/user/change-password', { currentPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password changed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div style={bgStyle}>
      <div style={gridOverlay} />
      <div style={container}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8ecff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20 }}>{initials}</div>
            <div>
              <h2 style={{ color: '#f4f7ff', margin: 0 }}>User Profile</h2>
              <div style={{ color: '#aab6ff', fontSize: 13 }}>Member since {joined}</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div style={{ ...card(false), borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.12)', color: '#bbf7d0', marginBottom: 12 }}>✅ {message}</div>
        )}
        {error && (
          <div style={{ ...card(false), borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#fecaca', marginBottom: 12 }}>⚠️ {error}</div>
        )}

        {/* Content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          {/* Left: Profile Info */}
          <div style={card(true)}>
            <h3 style={{ color: '#e8ecff', marginTop: 0 }}>Profile Information</h3>
            {!editing ? (
              <div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={label}>Name</div>
                    <div style={{ color: '#e8ecff', fontWeight: 700 }}>{user.name || '—'}</div>
                  </div>
                  <div>
                    <div style={label}>Email</div>
                    <div style={{ color: '#e8ecff' }}>{user.email || '—'}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => setEditing(true)} style={button('linear-gradient(90deg,#22c55e,#16a34a)')}>Edit Profile</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: 12 }}>
                  <label style={label}>Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={input} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={label}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={input} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" style={button('linear-gradient(90deg,#22c55e,#16a34a)')}>Save Changes</button>
                  <button type="button" onClick={() => setEditing(false)} style={button('rgba(255,255,255,0.08)')}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Quick Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card(false)}>
              <h3 style={{ color: '#e8ecff', marginTop: 0 }}>Quick Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <Stat label="Total Workouts" value={totalWorkouts} color="#22c55e" />
                <Stat label="This Month" value={thisMonth} color="#06b6d4" />
                <Stat label="Current Streak" value={`${streak}d`} color="#a855f7" />
              </div>
            </div>

            <div style={card(false)}>
              <h3 style={{ color: '#e8ecff', marginTop: 0 }}>Change Password</h3>
              {!changingPassword ? (
                <button onClick={() => setChangingPassword(true)} style={button('linear-gradient(90deg,#3b82f6,#6366f1)')}>Change Password</button>
              ) : (
                <form onSubmit={handleChangePassword}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={label}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={input} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={label}>New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={input} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={button('linear-gradient(90deg,#3b82f6,#6366f1)')}>Update</button>
                    <button type="button" onClick={() => { setChangingPassword(false); setCurrentPassword(''); setNewPassword(''); }} style={button('rgba(255,255,255,0.08)')}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: 12, color: '#aab6ff' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

export default Profile;