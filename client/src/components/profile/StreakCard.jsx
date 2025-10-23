import styles from '../../pages/Profile.module.css';

export default function StreakCard({ current = 0, best = 0 }) {
  return (
    <div className={`${styles.streakCard} p-6 rounded-2xl ring-1 ring-white/10 bg-white/5`}>
      <div className={`${styles.cardHeading} text-indigo-50 tracking-tight`}>Workout Streaks</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl ring-1 ring-emerald-400/30 bg-emerald-500/10">
          <div className="text-emerald-100 text-sm">Current Streak</div>
          <div className="text-emerald-400 font-black text-3xl leading-tight">{current} days</div>
        </div>
        <div className="p-4 rounded-xl ring-1 ring-violet-400/30 bg-violet-500/10">
          <div className="text-violet-100 text-sm">Best Streak</div>
          <div className="text-violet-400 font-black text-3xl leading-tight">{best} days</div>
        </div>
      </div>
    </div>
  );
}
