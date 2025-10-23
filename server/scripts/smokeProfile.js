// Minimal smoke test for profile update, preferences, and weight conversion
// Run with: node scripts/smokeProfile.js

const base = 'http://localhost:5000/api';

function rndEmail() {
  return `smoke_${Date.now()}_${Math.floor(Math.random()*1000)}@example.com`;
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

(async () => {
  try {
    console.log('STEP 1: Register');
    const reg = await jfetch(`${base}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Smoke User', email: rndEmail(), password: 'Passw0rd!' }),
    });
    const token = reg.token;
    if (!token) throw new Error('No token returned from register');

    const auth = { Authorization: `Bearer ${token}` };

    console.log('STEP 2: Update profile');
    const update = await jfetch(`${base}/user/profile`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({
        name: 'Smoke User Updated',
        age: 29,
        gender: 'other',
        heightCm: 175,
        weight: 200, // lbs
        weightUnit: 'lbs',
        bio: 'This is a smoke bio',
        country: 'USA',
        unitSystem: 'imperial',
        preferences: { theme: 'dark', weightUnit: 'lbs' },
      }),
    });

  console.log('STEP 3: Fetch profile');
  const profile = await jfetch(`${base}/user/profile`, { headers: auth });

    const passed = [];
    const failed = [];

    // Name
    (profile.name === 'Smoke User Updated') ? passed.push('name') : failed.push(['name', profile.name]);

    // Age/Gender/Height
    (profile.age === 29) ? passed.push('age') : failed.push(['age', profile.age]);
    (profile.gender === 'other') ? passed.push('gender') : failed.push(['gender', profile.gender]);
    (profile.heightCm === 175) ? passed.push('heightCm') : failed.push(['heightCm', profile.heightCm]);

    // Weight conversion ~ 90.72 kg (allow small epsilon)
    const expectKg = +(200 * 0.45359237).toFixed(2);
    Math.abs((profile.weightKg ?? 0) - expectKg) < 0.02 ? passed.push('weightKg') : failed.push(['weightKg', profile.weightKg]);

    // Preferences
    (profile.preferences?.weightUnit === 'lbs') ? passed.push('pref.weightUnit') : failed.push(['pref.weightUnit', profile.preferences]);
    (profile.preferences?.theme === 'dark') ? passed.push('pref.theme') : failed.push(['pref.theme', profile.preferences]);

    // Country & unitSystem
    (profile.country === 'USA') ? passed.push('country') : failed.push(['country', profile.country]);
    (profile.unitSystem === 'imperial') ? passed.push('unitSystem') : failed.push(['unitSystem', profile.unitSystem]);

  console.log('STEP 4: Activity');
  const activity = await jfetch(`${base}/analytics/activity`, { headers: auth });
    (Array.isArray(activity.days)) ? passed.push('activity.days') : failed.push(['activity.days', activity]);
    (typeof activity.currentStreak === 'number') ? passed.push('activity.currentStreak') : failed.push(['activity.currentStreak', activity]);
    (typeof activity.bestStreak === 'number') ? passed.push('activity.bestStreak') : failed.push(['activity.bestStreak', activity]);

    const ok = failed.length === 0;

    console.log('Smoke test results');
    console.log('Passed:', passed);
    if (!ok) {
      console.error('Failed:', failed);
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Smoke test error:', err.message);
    process.exit(1);
  }
})();
