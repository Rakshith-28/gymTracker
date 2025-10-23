import { useState, useEffect, useMemo } from 'react';
import styles from './Profile.module.css';
import axios from 'axios';
// Inline the edit form to avoid cursor jump issues
import ReadOnlyProfileView from '../components/profile/ReadOnlyProfileView';
import AccountSettings from '../components/profile/AccountSettings';
import ActivityCalendar from '../components/profile/ActivityCalendar';
import StreakCard from '../components/profile/StreakCard';

function Profile() {
  // User state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  // Edit form state (inline to prevent remount/focus issues)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [heightCm, setHeightCm] = useState('');
  const [unit, setUnit] = useState('kg');
  const [weightInput, setWeightInput] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [country, setCountry] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric');

  // Password change
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Activity
  const [activityDays, setActivityDays] = useState([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, bestStreak: 0 });

  // Styles
  const bgStyle = { minHeight: '100vh', position: 'relative' };
  const gridOverlay = { position: 'absolute', inset: 0 };
  const container = { maxWidth: 1100, margin: '0 auto', position: 'relative' };
  const card = (accent = false) => ({
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
  });
  const button = (bg, color = '#fff') => ({ padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, background: bg, color });

  const initials = useMemo(() => (user?.name || 'U').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(), [user?.name]);
  const joined = useMemo(() => user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—', [user?.createdAt]);

  // Display helpers for read-only card
  const weightUnitPref = useMemo(() => user?.preferences?.weightUnit || localStorage.getItem('pref.weightUnit') || 'kg', [user]);
  const displayWeight = useMemo(() => {
    if (!user?.weightKg && user?.weightKg !== 0) return '—';
    const value = weightUnitPref === 'lbs' ? (user.weightKg / 0.45359237) : user.weightKg;
    return `${Number(value.toFixed(1))} ${weightUnitPref}`;
  }, [user, weightUnitPref]);

  // Helpers to sync inline edit form with canonical user
  const resetFromUser = (u = user) => {
    if (!u) return;
    setName(u.name || '');
    setEmail(u.email || '');
    setAge(typeof u.age === 'number' ? String(u.age) : (u.age || ''));
    setGender(u.gender || 'prefer_not_to_say');
    setHeightCm(typeof u.heightCm === 'number' ? String(u.heightCm) : (u.heightCm || ''));
    const prefUnit = u?.preferences?.weightUnit || localStorage.getItem('pref.weightUnit') || 'kg';
    setUnit(prefUnit);
    if (typeof u.weightKg === 'number') {
      const val = prefUnit === 'lbs' ? (u.weightKg / 0.45359237) : u.weightKg;
      setWeightInput(String(Number(val.toFixed(1))));
    } else {
      setWeightInput('');
    }
    setBio(u.bio || '');
    setProfilePicture(u.profilePicture || '');
    setCountry(u.country || '');
    setUnitSystem(u.unitSystem || 'metric');
  };

  useEffect(() => { if (user && !isEditing) resetFromUser(user); }, [user]);

  useEffect(() => {
    const applyStoredTheme = () => {
      const theme = localStorage.getItem('pref.theme');
      if (theme) document.documentElement.classList.toggle('dark', theme === 'dark');
    };
    applyStoredTheme();
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('You are not logged in. Please sign in to view your profile.');
          setLoading(false);
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const [prof, act] = await Promise.all([
          axios.get('http://localhost:5000/api/user/profile', { headers }),
          axios.get('http://localhost:5000/api/analytics/activity', { headers })
        ]);
        setUser(prof.data);
        const { days = [], currentStreak = 0, bestStreak = 0 } = act.data || {};
        setActivityDays(days);
        setStreaks({ currentStreak, bestStreak });
        setError('');
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          setError('Session expired or unauthorized. Please log in again.');
        } else {
          setError(err.response?.data?.message || 'Failed to load profile');
        }
        // Helpful for debugging in dev
        if (import.meta?.env?.DEV) {
          console.error('Profile load error', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveProfile = async (payload) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/user/profile', payload, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Weight input change + conversion
  const onWeightChange = (e) => {
    const v = e.target.value;
    setWeightInput(v);
  };

  // Construct payload from inline state
  const saveInline = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      email,
      age: age === '' ? undefined : Number(age),
      gender,
      heightCm: heightCm === '' ? undefined : Number(heightCm),
      weight: weightInput === '' ? undefined : Number(weightInput),
      weightUnit: unit,
      bio,
      profilePicture,
      country,
      unitSystem,
      preferences: { weightUnit: unit }
    };
    await handleSaveProfile(payload);
  };

  const cancelInline = () => {
    resetFromUser();
    setIsEditing(false);
  };

  const handlePrefsChange = async (prefs) => {
    // Optimistically store in localStorage is already handled by component; sync to server
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/user/profile', { preferences: prefs }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (_) {
      // non-blocking
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

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:5000/api/user/account', { headers: { Authorization: `Bearer ${token}` } });
      // Clear local auth and navigate to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', color: '#e8ecff' }}>Loading profile…</div>
    );
  }

  return (
  <div style={bgStyle} className="py-8 px-4 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      <div style={gridOverlay} className="pointer-events-none">
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
      </div>
      <div style={container}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/15 text-indigo-100 flex items-center justify-center font-black text-lg">{initials}</div>
            <div>
              <h2 className="m-0 text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-300 via-sky-300 to-emerald-300">Your Profile</h2>
              <div className="text-indigo-200/80 text-sm">Member since {joined}</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="mb-3 border border-emerald-500/30 bg-emerald-500/15 text-emerald-100 rounded-xl px-3 py-2">✅ {message}</div>
        )}
        {error && (
          <div className="mb-3 border border-rose-500/30 bg-rose-500/15 text-rose-100 rounded-xl px-3 py-2">⚠️ {error}</div>
        )}

        {/* Content grid */}
  <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          {/* Left: Profile editing & activity */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={card(true)} className="relative rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md shadow-xl">
              <div className="absolute -top-px left-6 right-6 h-px bg-linear-to-r from-emerald-400/60 via-cyan-400/60 to-violet-400/60" />
              <h3 className={`${styles.cardHeading} text-indigo-50 mt-0`}>Profile Information</h3>
              {!isEditing ? (
                <ReadOnlyProfileView user={user} displayWeight={displayWeight} onEdit={() => { resetFromUser(); setIsEditing(true); }} />
              ) : (
                <form onSubmit={saveInline} className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Name</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Email</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  {/* Row 1: Name, Email stays above */}

                  {/* Row 2: Country, Unit System */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Country</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={country} onChange={(e) => setCountry(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Unit System</label>
                      <select className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)}>
                        <option value="metric">metric</option>
                        <option value="imperial">imperial</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Age, Gender, Height */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Age</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Gender</label>
                      <select className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Height (cm)</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" type="number" min="0" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
                    </div>
                  </div>

                  {/* Row 4: Weight (+ unit) and Profile Picture */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Weight ({unit})</label>
                      <div className="flex gap-2">
                        <input className="flex-1 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" type="number" min="0" step="0.1" value={weightInput} onChange={onWeightChange} />
                        <select className="w-28 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={unit} onChange={(e) => setUnit(e.target.value)}>
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-indigo-100 mb-1 block font-medium">Profile Picture (URL/Base64)</label>
                      <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={profilePicture} onChange={(e) => setProfilePicture(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-indigo-100 mb-1 block font-medium">Bio</label>
                    <textarea className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white min-h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg font-bold text-white bg-linear-to-r from-emerald-500 to-emerald-600 disabled:opacity-60 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/20">
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={cancelInline} className="px-4 py-2 rounded-lg font-semibold text-white/90 bg-white/10 hover:bg-white/15">Cancel</button>
                  </div>
                </form>
              )}
            </div>
            <div style={card(false)} className="relative rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md shadow-xl">
              <div className="absolute -top-px left-6 right-6 h-px bg-linear-to-r from-violet-400/60 via-cyan-400/60 to-emerald-400/60" />
              <h3 className={`${styles.cardHeading} text-indigo-50 mt-0`}>Activity Calendar</h3>
              <ActivityCalendar days={activityDays} />
            </div>
          </div>

          {/* Right: Stats and account settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card(false)} className="relative rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md shadow-xl">
              <div className="absolute -top-px left-6 right-6 h-px bg-linear-to-r from-amber-400/60 via-pink-400/60 to-indigo-400/60" />
              <StreakCard current={streaks.currentStreak} best={streaks.bestStreak} />
            </div>
            <AccountSettings
              initialTheme={user?.preferences?.theme || localStorage.getItem('pref.theme') || 'light'}
              initialUnitSystem={user?.unitSystem || 'metric'}
              onUnitSystemSaved={(val) => setUser(u => ({ ...u, unitSystem: val }))}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;