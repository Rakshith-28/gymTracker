import { useMemo } from 'react';

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDay = new Date(firstDay);
  startDay.setDate(1 - firstDay.getDay()); // start on Sunday
  const weeks = [];
  let d = new Date(startDay);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function ActivityCalendar({ days = [] }) {
  const daySet = useMemo(() => new Set(days), [days]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);

  const isSameMonth = (d) => d.getMonth() === month;
  const keyOf = (d) => d.toISOString().split('T')[0];

  return (
    <div>
      <div className="grid grid-cols-7 text-[11px] sm:text-xs text-indigo-300 mb-1.5 select-none">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid gap-1.5">
        {weeks.map((week, idx) => (
          <div key={idx} className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const inMonth = isSameMonth(d);
              const hasWorkout = daySet.has(keyOf(d));
              const cls = hasWorkout
                ? 'bg-linear-to-br from-emerald-500 to-green-500 text-white'
                : 'bg-white/5 text-indigo-50';
              return (
                <div
                  key={d.toISOString()}
                  title={d.toDateString()}
                  className={`h-9 rounded-lg ring-1 ring-white/10 flex items-center justify-end pr-1.5 text-[11px] sm:text-xs ${cls} ${inMonth ? '' : 'opacity-50'}`}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
