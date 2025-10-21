import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';

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
  const [dailyWorkouts, setDailyWorkouts] = useState([]); // for heatmap
  const [showAllPRs, setShowAllPRs] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | muscle | calendar | exercise

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
        const [prsRes, statsRes, freqRes, muscleRes] = await Promise.all([
          axios.get('http://localhost:5000/api/analytics/prs', { headers }),
          axios.get('http://localhost:5000/api/workouts/stats', { headers }),
          axios.get(`http://localhost:5000/api/analytics/frequency?weeks=${weeks}`, { headers }),
          axios.get(`http://localhost:5000/api/analytics/muscle-distribution?days=${days}`, { headers })
        ]);

        setPrs(prsRes.data || {});
        setStats(statsRes.data || null);
        setFrequency(freqRes.data || []);
        setMuscleDistribution(muscleRes.data || {});

        // Fetch daily workouts for heatmap via date-range endpoint
        const { startDate, endDate } = periodToDates(period);
        const rangeRes = await axios.get(
          `http://localhost:5000/api/workouts/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
          { headers }
        );
        setDailyWorkouts(rangeRes.data || []);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

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
      grid: { left: 40, right: 20, bottom: 40, top: 20 },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: 45 } },
      yAxis: { type: 'value', name: 'Workouts' },
      series: [
        {
          name: 'Workouts',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: getGradient(palette.primary, '#7c3aed33')
          },
          emphasis: { focus: 'series' },
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
      legend: { top: 'bottom' },
      series: [
        {
          name: 'Workout Split',
          type: 'pie',
          radius: ['45%', '75%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
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
      grid: { left: 40, right: 20, bottom: 40, top: 20 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', name: 'Minutes' },
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

  // Calendar heatmap (daily workouts in range)
  const heatmapOption = useMemo(() => {
    // Build date -> count map
    const map = new Map();
    dailyWorkouts.forEach(w => {
      const key = new Date(w.date).toISOString().split('T')[0];
      map.set(key, (map.get(key) || 0) + 1);
    });
    const { startDate, endDate } = periodToDates(period);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      days.push([key, map.get(key) || 0]);
    }
    return {
      tooltip: {
        position: 'top',
        formatter: (p) => `${p.data[0]}: ${p.data[1]} workout(s)`
      },
      visualMap: {
        min: 0, max: Math.max(1, Math.max(...days.map(d => d[1]))),
        orient: 'horizontal', left: 'center', top: 0
      },
      calendar: {
        top: 40, left: 20, right: 20, bottom: 20,
        cellSize: ['auto', 18],
        range: [startDate.split('T')[0], endDate.split('T')[0]],
        itemStyle: { borderWidth: 0.5, borderColor: '#e5e7eb' },
        yearLabel: { show: false },
        monthLabel: { nameMap: 'en' },
        dayLabel: { nameMap: 'en' }
      },
      series: [
        { type: 'heatmap', coordinateSystem: 'calendar', data: days }
      ]
    };
  }, [dailyWorkouts, period]);

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
      <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, opacity: 0.8 }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '40px auto', padding: '20px' }}>
      {/* Header + Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f4f7ff' }}>Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercise PRs..."
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontWeight: 600 }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="365d">Last year</option>
          </select>
          <button onClick={() => window.print()} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Export</button>
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

      {/* Overall Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, marginTop: 16 }}>
          <StatCard
            label="Total Workouts"
            value={stats.totalWorkouts}
            color={palette.accent}
            delta={computeDelta(frequency, 'count')}
            sparkData={frequency.map(f => f.count)}
            gridColumn="span 3"
          />
          <StatCard
            label="Total Exercises"
            value={stats.totalExercises}
            color={palette.secondary}
            delta={null}
            sparkData={frequency.map(f => f.count)}
            gridColumn="span 3"
          />
          <StatCard
            label="Total Minutes"
            value={stats.totalDuration}
            color={palette.warn}
            delta={computeDelta(frequency, 'totalDuration')}
            sparkData={frequency.map(f => f.totalDuration)}
            gridColumn="span 3"
          />
          <StatCard
            label="Avg Duration (min)"
            value={stats.averageDuration}
            color={palette.purple}
            delta={null}
            sparkData={frequency.map(f => f.totalDuration)}
            gridColumn="span 3"
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
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
          <ChartCard title={`Workout Frequency (${periodLabel(period)})`} gridColumn="span 7">
            {frequency.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No workout frequency data yet.</div>
            ) : (
              <ReactECharts ref={freqRef} option={frequencyOption} style={{ height: 340, width: '100%' }} notMerge={true} lazyUpdate={true} />
            )}
          </ChartCard>
          <ChartCard title="Duration Trend" gridColumn="span 5">
            <ReactECharts ref={durationRef} option={durationOption} style={{ height: 340 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
          <ChartCard title="Workout Focus (Donut)" gridColumn="span 12">
            <ReactECharts ref={donutRef} option={donutOption} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
        </div>
      )}

      {/* Muscle Tab */}
      {activeTab === 'muscle' && (
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
          <ChartCard title={`Muscle Group Distribution (${periodLabel(period)})`} gridColumn="span 6">
            {Object.keys(muscleDistribution || {}).length === 0 ? (
              <div style={{ opacity: 0.7 }}>No muscle distribution data yet.</div>
            ) : (
              <ReactECharts ref={muscleRef} option={muscleOption} style={{ height: 360, width: '100%' }} notMerge={true} lazyUpdate={true} />
            )}
          </ChartCard>
          <ChartCard title="Muscle Balance (Radar)" gridColumn="span 6">
            <ReactECharts ref={radarRef} option={radarOption} style={{ height: 360 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div style={{ marginTop: 24 }}>
          <ChartCard title="Calendar Heatmap" gridColumn="span 12">
            <ReactECharts option={heatmapOption} style={{ height: 280 }} notMerge={true} lazyUpdate={true} />
          </ChartCard>
        </div>
      )}

      {/* Comparison & Goals */}
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        <CompareCard title="Workouts" current={getLast(frequency, 'count')} previous={getPrev(frequency, 'count')} gridColumn="span 3" />
        <CompareCard title="Minutes" current={getLast(frequency, 'totalDuration')} previous={getPrev(frequency, 'totalDuration')} gridColumn="span 3" />
        <GoalsCard gridColumn="span 6" frequency={frequency} />
      </div>

      {/* Achievements */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Recent Achievements</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(prs)
            .sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
            .slice(0, 6)
            .map(([name, pr]) => (
              <div key={name} style={{ padding: '10px 14px', borderRadius: 9999, background: '#eef2ff', color: '#3730a3', fontWeight: 600 }}>
                🏅 {name}: {pr.weight}×{pr.reps}
              </div>
            ))}
          {Object.keys(prs).length === 0 && <div style={{ opacity: 0.7 }}>Log workouts to unlock achievements.</div>}
        </div>
    </div>
    </div>
  );
}

function StatCard({ label, value, color, delta, sparkData = [], gridColumn = 'span 3' }) {
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
      border: '1px solid #e5e7eb',
      background: 'linear-gradient(180deg, #ffffff, #fafafa)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      transition: 'transform 120ms ease, box-shadow 120ms ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>{label}</div>
        {delta && (
          <div style={{ fontSize: 12, fontWeight: 700, color: delta.value >= 0 ? '#16a34a' : '#dc2626' }}>
            {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.percent)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
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
      border: '1px solid #e5e7eb',
      background: 'linear-gradient(180deg, #ffffff, #fbfbfb)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <div style={{ fontWeight: 800, marginBottom: 10, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15 }}>{title}</span>
      </div>
      {children}
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

function CompareCard({ title, current, previous, gridColumn = 'span 3' }) {
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const up = diff >= 0;
  return (
    <div style={{ gridColumn, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, color: '#64748b' }}>{title}: This Week vs Last</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{current}</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>prev {previous}</div>
        <div style={{ marginLeft: 'auto', fontWeight: 700, color: up ? '#16a34a' : '#dc2626' }}>{up ? '↑' : '↓'} {Math.abs(pct)}%</div>
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
    <div style={{ gridColumn, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Goals Progress</div>
      <Progress label={`Monthly (${workoutsLast30Days}/${monthlyTarget})`} percent={monthPct} color={palette.primary} />
      <Progress label={`Weekly (${workoutsThisWeek}/${weeklyTarget})`} percent={weekPct} color={palette.accent} />
    </div>
  );
}

function Progress({ label, percent, color }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ height: 12, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 300ms ease' }} />
      </div>
    </div>
  );
}

export default Analytics;