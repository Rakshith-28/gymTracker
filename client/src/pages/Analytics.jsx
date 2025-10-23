import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import MuscleMap from '../components/MuscleMap.jsx';
import styles from './Analytics.module.css';

const palette = {
  primary: '#7c3aed',
  secondary: '#06b6d4',
  accent: '#22c55e',
  warn: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
};

function Analytics() {
  const [prs, setPrs] = useState({});
  const [stats, setStats] = useState(null);
  const [frequency, setFrequency] = useState([]);
  const [muscleDistribution, setMuscleDistribution] = useState({});
  const [selectedExercise, setSelectedExercise] = useState('');
  const [strengthProgress, setStrengthProgress] = useState([]);
  const [volumeProgress, setVolumeProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d'); // '7d' | '30d' | '90d' | '365d'
  const [search, setSearch] = useState('');
  const [dailyActivities, setDailyActivities] = useState([]); // workouts + sessions for heatmap and insights
  const [showAllPRs, setShowAllPRs] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | muscle | calendar | exercise
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [activeTotals, setActiveTotals] = useState({ active: 0, rest: 0 });
  const [topExercisesByMuscle, setTopExercisesByMuscle] = useState({});
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);

  // Chart refs for potential export
  const freqRef = useRef(null);
  const muscleRef = useRef(null);
  const strengthRef = useRef(null);
  const volumeRef = useRef(null);
  const radarRef = useRef(null);
  const donutRef = useRef(null);
  const durationRef = useRef(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const { weeks, days } = periodToWindow(period);
        const [prsRes, statsRes, freqRes, muscleRes, libraryRes] = await Promise.all([
          axios.get('http://localhost:5000/api/analytics/prs', { headers }),
          axios.get('http://localhost:5000/api/workouts/stats', { headers }),
          axios.get(`http://localhost:5000/api/analytics/frequency?weeks=${weeks}`, { headers }),
          axios.get(`http://localhost:5000/api/analytics/muscle-distribution?days=${days}`, { headers }),
          axios.get('http://localhost:5000/api/exercises', { headers }).catch(() => ({ data: [] }))
        ]);

        setPrs(prsRes.data || {});
        setStats(statsRes.data || null);
        setFrequency(freqRes.data || []);
        setMuscleDistribution(muscleRes.data || {});
  setExerciseLibrary(Array.isArray(libraryRes.data) ? libraryRes.data : []);

        // Fetch daily workouts for heatmap via date-range endpoint
        const { startDate, endDate } = periodToDates(period);
        const [rangeRes, sessionsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/workouts/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, { headers }).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/sessions', { headers }).catch(() => ({ data: [] }))
        ]);

        const workouts = Array.isArray(rangeRes.data) ? rangeRes.data : [];
        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];

        // Filter sessions by period window and map to activity rows
        const start = new Date(startDate);
        const end = new Date(endDate);
        const sessionActivities = sessions
          .filter(s => {
            const d = new Date(s.endTime || s.startTime || s.createdAt);
            return d >= start && d <= end;
          })
          .map(s => ({
            date: s.endTime || s.startTime || s.createdAt,
            duration: s.totalDuration || Math.round(((new Date(s.endTime) - new Date(s.startTime)) / 60000) || 0),
            active: s.totalActiveDuration || 0,
            rest: s.totalRestDuration || 0,
            exercises: s.exercises || []
          }));

        const workoutActivities = workouts.map(w => ({
          date: w.date || w.endTime || w.startTime || w.createdAt,
          duration: w.duration || 0,
          active: 0,
          rest: 0,
          exercises: w.exercises || []
        }));

        const activities = [...workoutActivities, ...sessionActivities];
        setDailyActivities(activities);

        // Aggregate active/rest totals for overview cards
        const totals = activities.reduce((acc, a) => {
          acc.active += a.active || 0;
          acc.rest += a.rest || 0;
          return acc;
        }, { active: 0, rest: 0 });
        setActiveTotals(totals);
        // Defer building top exercises until we have library mapping
        // (handled in separate effect below)
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  // Build exercise name -> {primary, secondary[]} map from library
  const nameToMuscles = useMemo(() => {
    const map = new Map();
    exerciseLibrary.forEach(ex => {
      const key = (ex.name || '').toLowerCase();
      const primary = (ex.primaryMuscle || '').toLowerCase();
      const secondary = Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.map(s => (s || '').toLowerCase()) : [];
      const legacy = Array.isArray(ex.muscleGroup) ? ex.muscleGroup.map(s => (s || '').toLowerCase()) : [];
      const p = primary || legacy[0] || '';
      const s = secondary.length ? secondary : legacy.filter(m => m !== p);
      map.set(key, { primary: p, secondary: s });
    });
    return map;
  }, [exerciseLibrary]);

  // Stats by muscle group derived from activities
  const statsByMuscle = useMemo(() => {
    const acc = new Map();
    dailyActivities.forEach(a => {
      const minutes = a.duration || 0;
      (a.exercises || []).forEach(ex => {
        const nameKey = (ex.name || '').toLowerCase();
        const setsCount = (ex.sets || []).length;
        const map = nameToMuscles.get(nameKey);
        if (map && map.primary) {
          const pKey = normalizeGroupForStats(map.primary);
          const cur = acc.get(pKey) || { count: 0, sets: 0, minutes: 0 };
          acc.set(pKey, { count: cur.count + 1, sets: cur.sets + setsCount, minutes: cur.minutes + minutes });
          (map.secondary || []).forEach(sg => {
            const sKey = normalizeGroupForStats(sg);
            const c = acc.get(sKey) || { count: 0, sets: 0, minutes: 0 };
            acc.set(sKey, { count: c.count + 0.5, sets: c.sets + Math.round(setsCount * 0.5), minutes: c.minutes + (minutes * 0.5) });
          });
        } else {
          const groups = inferGroupsFromName(ex.name || '');
          groups.forEach(g => {
            const cur = acc.get(g) || { count: 0, sets: 0, minutes: 0 };
            acc.set(g, { count: cur.count + 1, sets: cur.sets + setsCount, minutes: cur.minutes + minutes });
          });
        }
      });
    });
    const obj = {};
    acc.forEach((v, k) => (obj[k] = v));
    // Aggregate arms from biceps + triceps so clicking 'Arms' shows data
    const bi = obj['biceps'];
    const tri = obj['triceps'];
    if (bi || tri) {
      obj['arms'] = {
        count: (bi?.count || 0) + (tri?.count || 0),
        sets: (bi?.sets || 0) + (tri?.sets || 0),
        minutes: (bi?.minutes || 0) + (tri?.minutes || 0)
      };
    }
    return obj;
  }, [dailyActivities, nameToMuscles]);

  // Recompute top exercises per muscle whenever activities or library mapping changes
  useEffect(() => {
    const topMap = new Map();
    dailyActivities.forEach(a => {
      (a.exercises || []).forEach(ex => {
        const nameKey = (ex.name || '').toLowerCase();
        const map = nameToMuscles.get(nameKey);
        const groups = map && map.primary
          ? [normalizeGroupForStats(map.primary), ...(map.secondary || []).map(normalizeGroupForStats)]
          : inferGroupsFromName(ex.name || '');
        groups.forEach(g => {
          const key = g;
          if (!topMap.has(key)) topMap.set(key, new Map());
          const m = topMap.get(key);
          const count = m.get(ex.name) || 0;
          m.set(ex.name, count + (ex.sets?.length || 1));
        });
      });
    });
    const topObj = {};
    topMap.forEach((m, g) => {
      const arr = Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, c]) => ({ name, count: c }));
      topObj[g] = arr;
    });
    // Aggregate 'arms' from biceps + triceps
    const bi = topMap.get('biceps');
    const tri = topMap.get('triceps');
    if (bi || tri) {
      const merged = new Map();
      [bi, tri].forEach(map => {
        if (!map) return;
        map.forEach((count, name) => merged.set(name, (merged.get(name) || 0) + count));
      });
      topObj['arms'] = Array.from(merged.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, c]) => ({ name, count: c }));
    }
    setTopExercisesByMuscle(topObj);
  }, [dailyActivities, nameToMuscles]);

  const handleExerciseSelect = async (exerciseName) => {
    setSelectedExercise(exerciseName);
    setActiveTab('exercise');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [strengthRes, volumeRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/analytics/strength/${exerciseName}`, { headers }),
        axios.get(`http://localhost:5000/api/analytics/volume/${exerciseName}?days=90`, { headers })
      ]);

      setStrengthProgress(strengthRes.data || []);
      setVolumeProgress(volumeRes.data || []);
    } catch (err) {
      console.error('Error fetching exercise progress:', err);
    }
  };

  // Chart helpers
  const getGradient = (c1, c2) => {
    try {
      if (typeof window !== 'undefined' && window.echarts && window.echarts.graphic) {
        return new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: c1 },
          { offset: 1, color: c2 },
        ]);
      }
    } catch (_) {}
    return c1;
  };

  const periodToWindow = (code) => {
    switch (code) {
      case '7d':
        return { days: 7, weeks: 1 };
      case '30d':
        return { days: 30, weeks: 5 };
      case '90d':
        return { days: 90, weeks: 13 };
      case '365d':
        return { days: 365, weeks: 53 };
      default:
        return { days: 30, weeks: 5 };
    }
  };

  const periodToDates = (code) => {
    const now = new Date();
    const { days } = periodToWindow(code);
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString()
    };
  };

  const frequencyOption = useMemo(() => {
    const labels = frequency.map(f => new Date(f.weekStart).toLocaleDateString());
    const counts = frequency.map(f => f.count);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 30, bottom: 40, top: 20 },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      yAxis: {
        type: 'value',
        name: 'Workouts',
        axisLabel: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.15)' } }
      },
      series: [
        {
          name: 'Workouts',
          type: 'line',
          smooth: true,
          data: counts,
          areaStyle: { color: getGradient(palette.primary, '#7c3aed33') },
          lineStyle: { color: palette.primary, width: 2 },
          itemStyle: { color: palette.primary }
        }
      ]
    };
  }, [frequency]);

  const muscleOption = useMemo(() => {
    const entries = Object.entries(muscleDistribution || {});
    const data = entries.map(([name, value]) => ({ name, value }));
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          name: 'Muscle Groups',
          type: 'pie',
          radius: [20, 140],
          center: ['50%', '45%'],
          roseType: 'area',
          itemStyle: { borderRadius: 6 },
          data,
        }
      ]
    };
  }, [muscleDistribution]);

  // Radar chart: current vs target (even distribution)
  const radarOption = useMemo(() => {
    const entries = Object.entries(muscleDistribution || {});
    if (entries.length === 0) return {};
    const indicators = entries.map(([name, val]) => ({ name, max: Math.max(1, Math.max(...entries.map(([, v]) => v)) + 1) }));
    const current = entries.map(([, v]) => v);
    const total = current.reduce((a, b) => a + b, 0) || 1;
    const target = entries.map(() => Math.round(total / entries.length));
    return {
      tooltip: {},
      radar: { indicator: indicators, radius: 110 },
      series: [
        {
          type: 'radar',
          data: [
            { value: current, name: 'Current', areaStyle: { color: 'rgba(124,58,237,0.25)' } },
            { value: target, name: 'Target', areaStyle: { color: 'rgba(34,197,94,0.18)' } },
          ]
        }
      ]
    };
  }, [muscleDistribution]);

  // Donut chart for focus (reuse muscleDistribution percentages)
  const donutOption = useMemo(() => {
    const entries = Object.entries(muscleDistribution || {});
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const data = entries.map(([k, v]) => ({ name: k, value: Math.round((v / total) * 100) }));
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
      legend: { top: 'bottom', textStyle: { color: '#e8ecff' } },
      series: [
        {
          name: 'Workout Split',
          type: 'pie',
          radius: ['45%', '75%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, color: '#e8ecff' },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#e8ecff' } },
          labelLine: { show: false },
          data,
        }
      ]
    };
  }, [muscleDistribution]);

  // Duration trend (weekly total minutes)
  const durationOption = useMemo(() => {
    const labels = frequency.map(f => new Date(f.weekStart).toLocaleDateString());
    const durations = frequency.map(f => f.totalDuration || 0);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 30, bottom: 40, top: 20 },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      yAxis: {
        type: 'value', name: 'Minutes',
        axisLabel: { color: '#cbd5e1' },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.15)' } }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: durations,
          areaStyle: { color: getGradient(palette.purple, '#a855f733') },
          lineStyle: { color: palette.purple, width: 2 },
          itemStyle: { color: palette.purple }
        }
      ]
    };
  }, [frequency]);

  // Calendar heatmap (interactive; intensity by sets). Tooltip shows workouts, sets, minutes
  const heatmapOption = useMemo(() => {
    const statsByDay = new Map();
    dailyActivities.forEach(a => {
      const key = new Date(a.date).toISOString().split('T')[0];
      const prev = statsByDay.get(key) || { count: 0, sets: 0, duration: 0 };
      const setsCount = (a.exercises || []).reduce((s, ex) => s + (ex.sets?.length || 0), 0);
      statsByDay.set(key, {
        count: (prev.count || 0) + 1,
        sets: (prev.sets || 0) + setsCount,
        duration: (prev.duration || 0) + (a.duration || 0)
      });
    });
    const { startDate, endDate } = periodToDates(period);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      const agg = statsByDay.get(key) || { count: 0, sets: 0, duration: 0 };
      days.push([key, agg.sets]);
    }
    const maxSets = Math.max(1, ...days.map(d => d[1]));
    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (p) => {
          const key = p.data[0];
          const agg = statsByDay.get(key) || { count: 0, sets: 0, duration: 0 };
          return `${key}: ${agg.count} workout(s), ${agg.sets} sets, ${agg.duration} min`;
        }
      },
      visualMap: {
        min: 0, max: maxSets,
        orient: 'horizontal', left: 'center', top: 0,
        inRange: { color: ['#0ea5e933', '#06b6d4aa', '#7c3aed'] }
      },
      calendar: {
        top: 40, left: 20, right: 20, bottom: 20,
        cellSize: ['auto', 18],
        range: [startDate.split('T')[0], endDate.split('T')[0]],
        itemStyle: { borderWidth: 0.5, borderColor: '#334155' },
        yearLabel: { show: false },
        monthLabel: { nameMap: 'en' },
        dayLabel: { nameMap: 'en' }
      },
      series: [
        { type: 'heatmap', coordinateSystem: 'calendar', data: days }
      ]
    };
  }, [dailyActivities, period]);

  const strengthOption = useMemo(() => {
    const labels = strengthProgress.map(p => new Date(p.date).toLocaleDateString());
    const maxWeights = strengthProgress.map(p => p.maxWeight || 0);
    const reps = strengthProgress.map(p => p.reps || 0);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Max Weight', 'Reps (x5)'] },
      grid: { left: 50, right: 30, bottom: 40, top: 30 },
      xAxis: { type: 'category', data: labels },
      yAxis: [
        { type: 'value', name: 'Weight (lbs)' },
        { type: 'value', name: 'Reps (x5)' }
      ],
      series: [
        {
          name: 'Max Weight',
          type: 'line',
          smooth: true,
          data: maxWeights,
          symbol: 'circle',
          itemStyle: { color: palette.accent },
          lineStyle: { width: 3 }
        },
        {
          name: 'Reps (x5)',
          type: 'bar',
          yAxisIndex: 1,
          data: reps.map(r => r * 5),
          itemStyle: { color: palette.secondary }
        }
      ]
    };
  }, [strengthProgress]);

  const volumeOption = useMemo(() => {
    const labels = volumeProgress.map(p => new Date(p.date).toLocaleDateString());
    const volumes = volumeProgress.map(p => p.volume || 0);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 30, bottom: 40, top: 30 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', name: 'Volume (lbs)' },
      series: [
        {
          type: 'line',
          smooth: true,
          data: volumes,
          areaStyle: {
            color: getGradient(palette.blue, '#3b82f633')
          },
          lineStyle: { color: palette.blue, width: 2 },
          itemStyle: { color: palette.blue }
        }
      ]
    };
  }, [volumeProgress]);

  // Build filtered and optionally randomized PRs (show up to 5 when collapsed)
  const filteredPRs = useMemo(() => {
    const entries = Object.entries(prs).filter(([name]) => name.toLowerCase().includes(search.toLowerCase()));
    return entries;
  }, [prs, search]);

  const randomFivePRs = useMemo(() => {
    const arr = [...filteredPRs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, [filteredPRs]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px', textAlign: 'center', color: '#e8ecff' }}>
        <div style={{ fontSize: 22, opacity: 0.8 }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/22px 22px, linear-gradient(180deg,#0a0e27,#1a1a2e)' }}>
      <div className={styles.pageContainer}>
      {/* Header + Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f4f7ff' }}>Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff', fontWeight: 600 }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="365d">Last year</option>
          </select>
          <button onClick={() => window.print()} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff', cursor: 'pointer' }}>Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid #334155' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'muscle', label: 'Muscle Focus' },
          { key: 'calendar', label: 'Calendar' },
          { key: 'exercise', label: 'Exercise Progress' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === t.key ? '3px solid #7c3aed' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === t.key ? '#f4f7ff' : '#94a3b8',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overall Stats: only show on Overview */}
      {stats && activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, marginTop: 16 }}>
          <StatCard
            label="Total Workouts"
            value={stats.totalWorkouts}
            color={palette.accent}
            delta={computeDelta(frequency, 'count')}
            sparkData={[]}
            gridColumn="span 6"
            big
          />
          <StatCard
            label="Total Active Minutes"
            value={activeTotals.active}
            color={palette.warn}
            delta={null}
            sparkData={[]}
            gridColumn="span 6"
            big
          />
        </div>
      )}

      {/* PRs moved: shown in Exercise tab side panel */}

      {/* Tab content */}
      {activeTab === 'exercise' && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: 12 }}>Exercise Progress</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
            {/* Left: PRs panel */}
            <div>
              <h4 style={{ marginBottom: 10 }}>Personal Records (PRs)</h4>
              {Object.keys(prs).length === 0 ? (
                <div style={{ opacity: 0.7 }}>No PRs yet. Keep working out!</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {(showAllPRs ? filteredPRs : randomFivePRs).map(([exercise, pr]) => (
                    <button
                      key={exercise}
                      onClick={() => handleExerciseSelect(exercise)}
                      style={{
                        textAlign: 'left',
                        padding: '12px',
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        background: selectedExercise === exercise ? '#eef2ff' : 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{exercise}</div>
                      <div style={{ marginTop: 6 }}><strong>{pr.weight} lbs</strong> × {pr.reps} reps</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Est. 1RM: {pr.oneRepMax} lbs</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(pr.date).toLocaleDateString()}</div>
                    </button>
                  ))}
                </div>
              )}
              {filteredPRs.length > 5 && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => setShowAllPRs(v => !v)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 700 }}>
                    {showAllPRs ? 'Show fewer' : 'Show all PRs'}
                  </button>
                </div>
              )}
            </div>

            {/* Right: charts/content */}
            <div>
              <h3 style={{ marginBottom: 12 }}>{selectedExercise ? `${selectedExercise} Progress` : 'Select an exercise to view details'}</h3>
              {!selectedExercise ? (
                <div style={{ opacity: 0.7 }}>Pick an exercise from the PRs panel to the left to see strength and volume trends.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <ChartCard title="Max Weight & Reps Over Time">
                    <ReactECharts ref={strengthRef} option={strengthOption} style={{ height: 360, width: '100%' }} notMerge={true} lazyUpdate={true} />
                  </ChartCard>
                  <ChartCard title="Total Volume Over Time">
                    <ReactECharts ref={volumeRef} option={volumeOption} style={{ height: 300, width: '100%' }} notMerge={true} lazyUpdate={true} />
                  </ChartCard>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
          <ChartCard title={`Workout Frequency (${periodLabel(period)})`} gridColumn="span 6">
            {frequency.length === 0 ? (
              <div style={{ opacity: 0.7, color: '#e8ecff' }}>No workout frequency data yet.</div>
            ) : (
              <ReactECharts ref={freqRef} option={frequencyOption} style={{ height: 340, width: '100%' }} notMerge={true} lazyUpdate={true} />
            )}
          </ChartCard>
          <ChartCard title="Duration Trend" gridColumn="span 6">
            <ReactECharts ref={durationRef} option={durationOption} style={{ height: 340 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
          <ChartCard title="Workout Focus (Donut)" gridColumn="span 12">
            <ReactECharts ref={donutRef} option={donutOption} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
        </div>
      )}

      {/* Muscle Tab */}
      {activeTab === 'muscle' && (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 16 }}>
          <div>
            <MuscleMap selected={selectedMuscle} onSelect={(k) => setSelectedMuscle(k)} />
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 10, color: '#e8ecff' }}>{selectedMuscle ? `${capitalize(selectedMuscle)} Stats` : 'Pick a muscle'}</div>
            {selectedMuscle ? (
              (() => {
                const norm = normalizeGroupForStats(selectedMuscle);
                const k = norm;
                const val = statsByMuscle[k] || { count: 0, minutes: 0 };
                return (
                  <div style={{ color: '#e8ecff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                      <StatTile label="Workouts" value={Math.round(val.count || 0)} />
                      <StatTile label="Minutes" value={Math.round(val.minutes || 0)} />
                    </div>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Top Exercises</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {(topExercisesByMuscle[k] || []).map(e => (
                        <span key={e.name} style={{ padding: '6px 10px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff' }}>{e.name} · {e.count}</span>
                      ))}
                      {(topExercisesByMuscle[k] || []).length === 0 && <span style={{ opacity: 0.7 }}>—</span>}
                    </div>
                    {/* Small trend chart for this muscle */}
                    <MiniTrend muscleKey={k} dailyActivities={dailyActivities} nameToMuscles={nameToMuscles} period={period} />
                  </div>
                );
              })()
            ) : (
              <div style={{ opacity: 0.7, color: '#aab6ff' }}>Rotate with the button or drag left/right. Click a region to view stats.</div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div style={{ marginTop: 24 }}>
          <ChartCard title="Calendar Heatmap (sets intensity)" gridColumn="span 12">
            <ReactECharts option={heatmapOption} style={{ height: 280 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
        </div>
      )}

      {/* Comparison & Goals removed for now */}

      {/* Achievements: only show on Exercise tab */}
      {activeTab === 'exercise' && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 12, color: '#e8ecff' }}>Recent Achievements</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(prs)
              .sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
              .slice(0, 6)
              .map(([name, pr]) => (
                <div key={name} style={{ padding: '10px 14px', borderRadius: 9999, background: 'rgba(255,255,255,0.06)', color: '#e8ecff', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600 }}>
                  🏅 {name}: {pr.weight}×{pr.reps}
                </div>
              ))}
            {Object.keys(prs).length === 0 && <div style={{ opacity: 0.7, color: '#aab6ff' }}>Log workouts to unlock achievements.</div>}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, delta, sparkData = [], gridColumn = 'span 3', big = false }) {
  const option = {
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: { type: 'category', show: false, data: sparkData.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [{ type: 'line', smooth: true, data: sparkData, areaStyle: { color: 'rgba(59,130,246,0.15)' }, lineStyle: { width: 1, color: '#93c5fd' }, symbol: 'none' }]
  };
  return (
    <div style={{
      gridColumn,
      padding: '18px',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      color: '#e8ecff'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13, color: '#aab6ff' }}>{label}</div>
        {delta && (
          <div style={{ fontSize: 12, fontWeight: 700, color: delta.value >= 0 ? '#86efac' : '#fecaca' }}>
            {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.percent)}%
          </div>
        )}
      </div>
  <div style={{ fontSize: big ? 42 : 34, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
      {sparkData.length > 0 && (
        <div style={{ height: 40, marginTop: 6 }}>
          <ReactECharts option={option} style={{ height: 40 }} notMerge={true} lazyUpdate={true} />
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, gridColumn = 'span 12' }) {
  return (
    <div style={{
      gridColumn,
      padding: 16,
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
    }}>
      <div style={{ fontWeight: 800, marginBottom: 10, color: '#e8ecff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 12, color: '#aab6ff' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#e8ecff' }}>{value}</div>
    </div>
  );
}

function computeDelta(freq = [], field) {
  if (!freq || freq.length < 2) return null;
  const last = freq[freq.length - 1]?.[field] ?? 0;
  const prev = freq[freq.length - 2]?.[field] ?? 0;
  const diff = last - prev;
  const percent = prev === 0 ? 100 : Math.round((diff / prev) * 100);
  return { value: diff, percent };
}

function getLast(freq = [], field) {
  if (!freq.length) return 0;
  return freq[freq.length - 1]?.[field] ?? 0;
}

function getPrev(freq = [], field) {
  if (freq.length < 2) return 0;
  return freq[freq.length - 2]?.[field] ?? 0;
}

function periodLabel(p) {
  switch (p) {
    case '7d': return 'Last 7 days';
    case '30d': return 'Last 30 days';
    case '90d': return 'Last 3 months';
    case '365d': return 'Last year';
    default: return '';
  }
}

function capitalize(s = '') { return s.charAt(0).toUpperCase() + s.slice(1); }

function CompareCard({ title, current, previous, gridColumn = 'span 3' }) {
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const up = diff >= 0;
  return (
    <div style={{ gridColumn, padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', color: '#e8ecff' }}>
      <div style={{ fontSize: 13, color: '#aab6ff' }}>{title}: This Week vs Last</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{current}</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>prev {previous}</div>
        <div style={{ marginLeft: 'auto', fontWeight: 700, color: up ? '#86efac' : '#fecaca' }}>{up ? '↑' : '↓'} {Math.abs(pct)}%</div>
      </div>
    </div>
  );
}

function GoalsCard({ gridColumn = 'span 6', frequency }) {
  // Simple goals: 20 workouts/month, 5 workouts/week
  const monthlyTarget = 20;
  const weeklyTarget = 5;
  const workoutsThisWeek = getLast(frequency, 'count');
  const workoutsLast30Days = frequency.slice(-4).reduce((s, f) => s + (f.count || 0), 0);
  const monthPct = Math.min(100, Math.round((workoutsLast30Days / monthlyTarget) * 100));
  const weekPct = Math.min(100, Math.round((workoutsThisWeek / weeklyTarget) * 100));
  return (
    <div style={{ gridColumn, padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', color: '#e8ecff' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Goals Progress</div>
      <Progress label={`Monthly (${workoutsLast30Days}/${monthlyTarget})`} percent={monthPct} color={palette.primary} />
      <Progress label={`Weekly (${workoutsThisWeek}/${weeklyTarget})`} percent={weekPct} color={palette.accent} />
    </div>
  );
}

function Progress({ label, percent, color }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: '#aab6ff', marginBottom: 6 }}>{label}</div>
      <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 300ms ease' }} />
      </div>
    </div>
  );
}

// Simple inference used for top exercises per muscle; mirrors history page
function inferGroupsFromName(name = '') {
  const n = name.toLowerCase();
  const groups = [];
  if (/(bench|chest|push)/.test(n)) groups.push('chest');
  if (/(pull|row|back)/.test(n)) groups.push('back');
  if (/(squat|leg|lunge)/.test(n)) groups.push('legs');
  if (/(shoulder|press|raise)/.test(n)) groups.push('shoulders');
  if (/(curl|tricep|arm)/.test(n)) groups.push('arms');
  if (/(plank|crunch|core)/.test(n)) groups.push('core');
  if (/(run|cardio|bike|tread|elliptical)/.test(n)) groups.push('cardio');
  return groups.length ? groups : ['other'];
}

// Normalize anatomy-click keys to analytics keys
function normalizeGroupForStats(key = '') {
  const k = key.toLowerCase();
  if (k === 'quads' || k === 'hamstrings' || k === 'calves' || k === 'glutes') return 'legs';
  if (k === 'lats') return 'back';
  if (k === 'obliques') return 'core';
  if (k === 'deltoids') return 'shoulders';
  if (k === 'arms') return 'arms';
  if (k === 'biceps') return 'biceps';
  if (k === 'triceps') return 'triceps';
  return k;
}

export default Analytics;

// Mini trend chart component for selected muscle (minutes per day)
function MiniTrend({ muscleKey, dailyActivities, nameToMuscles, period }) {
  const option = useMemo(() => {
    const { startDate, endDate } = (function periodToDatesLocal(code) {
      const now = new Date();
      const days = code === '7d' ? 7 : code === '90d' ? 90 : code === '365d' ? 365 : 30;
      const start = new Date(now);
      start.setDate(now.getDate() - days);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    })(period);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const labels = [];
    const values = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      labels.push(key.slice(5)); // MM-DD for compactness
      // Sum minutes for this muscle on this date
      let minutes = 0;
      dailyActivities
        .filter(a => (new Date(a.date)).toISOString().split('T')[0] === key)
        .forEach(a => {
          const dayMinutes = a.duration || 0;
          (a.exercises || []).forEach(ex => {
            const map = nameToMuscles.get((ex.name || '').toLowerCase());
            if (map && map.primary) {
              const p = normalizeGroupForStats(map.primary);
              if (p === muscleKey) minutes += dayMinutes;
              (map.secondary || []).forEach(sg => {
                if (normalizeGroupForStats(sg) === muscleKey) minutes += dayMinutes * 0.5;
              });
            } else {
              // fallback to name inference
              const groups = inferGroupsFromName(ex.name || '');
              if (groups.includes(muscleKey)) minutes += dayMinutes;
            }
          });
        });
      values.push(Math.round(minutes));
    }

    return {
      backgroundColor: 'transparent',
      grid: { left: 30, right: 10, top: 10, bottom: 24 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#93a0c3', fontSize: 10 }, axisLine: { lineStyle: { color: '#334155' } } },
      yAxis: { type: 'value', axisLabel: { color: '#93a0c3', fontSize: 10 }, axisLine: { lineStyle: { color: '#334155' } }, splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.15)' } } },
      tooltip: { trigger: 'axis' },
      series: [{ type: 'line', smooth: true, data: values, areaStyle: { color: 'rgba(6,182,212,0.18)' }, lineStyle: { color: '#06b6d4', width: 2 }, symbol: 'none' }]
    };
  }, [muscleKey, dailyActivities, nameToMuscles, period]);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ padding: '6px 10px', color: '#e8ecff', fontWeight: 700, fontSize: 12 }}>Trend (Minutes per day)</div>
      <ReactECharts option={option} style={{ height: 160, width: '100%' }} notMerge={true} lazyUpdate={true} />
    </div>
  );
}