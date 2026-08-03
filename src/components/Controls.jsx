import { Play, Pause, Stop, SkipBack, SkipForward, Mic, Volume, Clock } from './Icons'

/** Seconds → "m:ss" (or "h:mm:ss" for long documents). */
function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * Playback control bar: play/pause/stop, paragraph skip, speed (with words-per-
 * minute readout) and volume, a live time-remaining countdown, and the
 * "pause & annotate" action. Shown once a document is loaded.
 */
export default function Controls({
  reading,
  paused,
  supported,
  rate,
  volume,
  currentIndex,
  total,
  wpm,
  remainingSeconds,
  onPlay,
  onPause,
  onResume,
  onStop,
  onPrev,
  onNext,
  onRateChange,
  onVolumeChange,
  onAnnotate,
}) {
  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-1">
        <button className={iconBtn} onClick={onPrev} disabled={!supported} title="Parágrafo anterior">
          <SkipBack />
        </button>

        {!reading || paused ? (
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
            onClick={reading && paused ? onResume : onPlay}
            disabled={!supported}
            title={reading && paused ? 'Continuar' : 'Iniciar leitura'}
          >
            <Play width={22} height={22} />
          </button>
        ) : (
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:bg-indigo-700"
            onClick={onPause}
            title="Pausar"
          >
            <Pause width={22} height={22} />
          </button>
        )}

        <button className={iconBtn} onClick={onNext} disabled={!supported} title="Próximo parágrafo">
          <SkipForward />
        </button>
        <button className={iconBtn} onClick={onStop} disabled={!reading} title="Parar">
          <Stop />
        </button>
      </div>

      <div className="hidden items-center gap-1 text-sm tabular-nums text-slate-500 sm:flex">
        <span className="font-medium text-slate-700">{total ? currentIndex + 1 : 0}</span>
        <span>/ {total}</span>
      </div>

      {/* Time remaining countdown */}
      <div
        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-sm tabular-nums text-slate-600"
        title={reading ? 'Tempo restante para terminar a leitura' : 'Tempo estimado de leitura'}
      >
        <Clock width={15} height={15} />
        <span className="font-medium">{formatDuration(remainingSeconds)}</span>
        <span className="hidden text-xs text-slate-400 md:inline">
          {reading ? 'restante' : 'estimado'}
        </span>
      </div>

      {/* Speed with words-per-minute readout */}
      <label className="flex items-center gap-2 text-sm text-slate-500">
        <span className="font-medium">Vel.</span>
        <input
          type="range"
          min="0.5"
          max="2.5"
          step="0.1"
          value={rate}
          onChange={(e) => onRateChange(parseFloat(e.target.value))}
          className="w-28 accent-indigo-600"
        />
        <span className="w-20 text-right tabular-nums text-slate-600">
          {rate.toFixed(1)}x
          <span className="ml-1 text-xs text-slate-400">{wpm} ppm</span>
        </span>
      </label>

      {/* Volume */}
      <label className="flex items-center gap-2 text-sm text-slate-500">
        <Volume width={18} height={18} />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-24 accent-indigo-600"
        />
      </label>

      <div className="ml-auto">
        <button
          onClick={onAnnotate}
          className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          title="Pausa a leitura e abre a gravação de anotação"
        >
          <Mic width={18} height={18} />
          Pausar e anotar
        </button>
      </div>

      {!supported && (
        <p className="w-full text-xs text-rose-500">
          Seu navegador não suporta síntese de voz (Web Speech API). Use Chrome ou Edge.
        </p>
      )}
    </div>
  )
}
