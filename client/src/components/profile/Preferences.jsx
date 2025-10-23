import { useEffect, useState } from 'react';

export default function Preferences({ initialTheme = 'light', initialWeightUnit = 'kg', onChange }) {
  const [theme, setTheme] = useState(initialTheme);
  const [unit, setUnit] = useState(initialWeightUnit);

  useEffect(() => {
    try {
      localStorage.setItem('pref.theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch {}
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem('pref.weightUnit', unit); } catch {}
  }, [unit]);

  useEffect(() => {
    onChange?.({ theme, weightUnit: unit });
  }, [theme, unit]);

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-sm text-indigo-200 mb-1 font-medium">Theme</div>
        <div className="inline-flex items-center rounded-xl bg-white/5 ring-1 ring-white/10 p-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${theme === 'light' ? 'text-slate-900 bg-white shadow' : 'text-indigo-100 hover:bg-white/10'}`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${theme === 'dark' ? 'text-slate-900 bg-white shadow' : 'text-indigo-100 hover:bg-white/10'}`}
          >
            Dark
          </button>
        </div>
      </div>
      <div>
        <div className="text-sm text-indigo-200 mb-1 font-medium">Weight Units</div>
        <div className="inline-flex items-center rounded-xl bg-white/5 ring-1 ring-white/10 p-1">
          <button
            type="button"
            onClick={() => setUnit('kg')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${unit === 'kg' ? 'text-slate-900 bg-white shadow' : 'text-indigo-100 hover:bg-white/10'}`}
          >
            kg
          </button>
          <button
            type="button"
            onClick={() => setUnit('lbs')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${unit === 'lbs' ? 'text-slate-900 bg-white shadow' : 'text-indigo-100 hover:bg-white/10'}`}
          >
            lbs
          </button>
        </div>
      </div>
    </div>
  );
}
