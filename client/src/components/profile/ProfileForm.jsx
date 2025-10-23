import { useEffect, useMemo, useState } from 'react';
import AvatarUploader from './AvatarUploader';

export default function ProfileForm({ user, onSubmit, onCancel, saving }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [age, setAge] = useState(user?.age || '');
  const [gender, setGender] = useState(user?.gender || 'prefer_not_to_say');
  const [heightCm, setHeightCm] = useState(user?.heightCm || '');
  const [unit, setUnit] = useState(user?.preferences?.weightUnit || localStorage.getItem('pref.weightUnit') || 'kg');
  const [weightInput, setWeightInput] = useState('');
  // Keep a canonical kg value to avoid drifting on unit toggles
  const [weightKgLocal, setWeightKgLocal] = useState(user?.weightKg || null);
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');

  // Initialize/refresh from user
  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setAge(user?.age || '');
    setGender(user?.gender || 'prefer_not_to_say');
    setHeightCm(user?.heightCm || '');
    setProfilePicture(user?.profilePicture || '');
    setBio(user?.bio || '');
    const prefUnit = user?.preferences?.weightUnit || localStorage.getItem('pref.weightUnit') || 'kg';
    setUnit(prefUnit);
    setWeightKgLocal(typeof user?.weightKg === 'number' ? user.weightKg : null);
  }, [user]);

  // Recalculate displayed weight when unit or kg changes
  useEffect(() => {
    if (weightKgLocal == null) {
      setWeightInput('');
      return;
    }
    const val = unit === 'lbs' ? (weightKgLocal / 0.45359237) : weightKgLocal;
    setWeightInput(Number(val.toFixed(1)));
  }, [unit, weightKgLocal]);

  // When user types weight, update canonical kg based on current unit
  const onWeightChange = (e) => {
    const v = e.target.value;
    setWeightInput(v);
    if (v === '' || isNaN(Number(v))) return;
    const n = Number(v);
    const kg = unit === 'lbs' ? n * 0.45359237 : n;
    setWeightKgLocal(Number(kg.toFixed(2)));
  };

  const submitPayload = useMemo(() => {
    return {
      name,
      email,
      age: age === '' ? undefined : Number(age),
      gender,
      heightCm: heightCm === '' ? undefined : Number(heightCm),
      // Send weight and unit so server can convert/persist
      weight: weightInput === '' ? undefined : Number(weightInput),
      weightUnit: unit,
      bio,
      profilePicture,
      preferences: { weightUnit: unit }
    };
  }, [name, email, age, gender, heightCm, weightInput, unit, bio, profilePicture]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(submitPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <AvatarUploader value={profilePicture} onChange={setProfilePicture} />

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-indigo-100 mb-1 block font-medium">Height (cm)</label>
          <input className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" type="number" min="0" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-indigo-100 mb-1 block font-medium">Weight ({unit})</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" type="number" min="0" step="0.1" value={weightInput} onChange={onWeightChange} />
            <select className="w-28 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
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
        <button type="button" onClick={() => onCancel?.()} className="px-4 py-2 rounded-lg font-semibold text-white/90 bg-white/10 hover:bg-white/15">
          Cancel
        </button>
      </div>
    </form>
  );
}
