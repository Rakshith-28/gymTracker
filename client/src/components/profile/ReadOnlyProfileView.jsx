export default function ReadOnlyProfileView({ user, displayWeight, onEdit }) {
  const label = 'text-sm text-indigo-300/80 font-medium';
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className={label}>Name</div>
          <div className="text-indigo-50 font-semibold">{user?.name || '—'}</div>
        </div>
        <div>
          <div className={label}>Email</div>
          <div className="text-indigo-50">{user?.email || '—'}</div>
        </div>
      </div>
      {/* Country & Unit System moved above Age/Height/Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className={label}>Country</div>
          <div className="text-indigo-50">{user?.country || '—'}</div>
        </div>
        <div>
          <div className={label}>Unit System</div>
          <div className="text-indigo-50">{user?.unitSystem || 'metric'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className={label}>Age</div>
          <div className="text-indigo-50">{typeof user?.age === 'number' ? user.age : (user?.age || '—')}</div>
        </div>
        <div>
          <div className={label}>Height</div>
          <div className="text-indigo-50">{typeof user?.heightCm === 'number' ? `${user.heightCm} cm` : (user?.heightCm ? `${user.heightCm} cm` : '—')}</div>
        </div>
        <div>
          <div className={label}>Weight</div>
          <div className="text-indigo-50">{displayWeight}</div>
        </div>
      </div>

      <div>
        <div className={label}>Bio</div>
        <div className="text-indigo-50 whitespace-pre-wrap">{user?.bio || '—'}</div>
      </div>

      <div className="pt-1">
        <button
          onClick={onEdit}
          className="px-4 py-2 rounded-lg font-bold text-white bg-linear-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/20 hover:translate-y-0.5 transition"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}
