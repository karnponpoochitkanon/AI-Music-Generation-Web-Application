import { useRef, useState, useEffect } from 'react'
import styles from './AudioPlayer.module.css'

// ── Synthesise a short lo-fi demo melody via Web Audio API ──────────────────
// Called when strategy === "mock" (no real file exists yet)
function buildMockAudioBuffer(ctx) {
  const BPM      = 90
  const BEAT     = 60 / BPM
  const DURATION = BEAT * 16          // 4 bars
  const SR       = ctx.sampleRate
  const buf      = ctx.createBuffer(2, SR * DURATION, SR)

  // ── tiny helper ──
  const note = (freq, start, len, vol = 0.18) => {
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      const s0 = Math.floor(start * SR)
      const s1 = Math.floor((start + len) * SR)
      for (let s = s0; s < s1 && s < d.length; s++) {
        const t    = (s - s0) / SR
        const env  = Math.exp(-t * 4) * Math.min(1, t * 40)
        // slight chorus: two detuned sines
        d[s] += vol * env * (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * (freq * 1.002) * t))
      }
    }
  }

  // ── chord pads (C-major pentatonic) ──
  const melody = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66]
  melody.forEach((f, i) => note(f, i * BEAT * 2, BEAT * 2.2, 0.12))

  // ── bass line ──
  ;[130.81, 130.81, 146.83, 146.83, 130.81, 130.81, 98.00, 98.00].forEach((f, i) =>
    note(f, i * BEAT * 2, BEAT * 0.8, 0.22))

  // ── hi-hat click (white-noise bursts) ──
  for (let b = 0; b < 32; b++) {
    const t0  = b * BEAT * 0.5
    const s0  = Math.floor(t0 * SR)
    const len = Math.floor(SR * 0.04)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let s = s0; s < s0 + len && s < d.length; s++) {
        const env = Math.exp(-((s - s0) / SR) * 120)
        d[s] += 0.06 * env * (Math.random() * 2 - 1)
      }
    }
  }

  // ── kick (low thump on beat 1 & 3) ──
  ;[0, BEAT * 4, BEAT * 8, BEAT * 12].forEach(start => {
    const s0 = Math.floor(start * SR)
    const len = Math.floor(SR * 0.25)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let s = s0; s < s0 + len && s < d.length; s++) {
        const t   = (s - s0) / SR
        const env = Math.exp(-t * 18)
        const frq = 60 * Math.exp(-t * 25)
        d[s] += 0.45 * env * Math.sin(2 * Math.PI * frq * t)
      }
    }
  })

  return buf
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AudioPlayer({ audioUrl, strategy, onPlaybackChange }) {
  const ctxRef     = useRef(null)
  const srcRef     = useRef(null)
  const gainRef    = useRef(null)
  const audioRef   = useRef(null)
  const startRef   = useRef(0)
  const offsetRef  = useRef(0)
  const bufRef     = useRef(null)
  const rafRef     = useRef(null)

  const [playing,  setPlaying]  = useState(false)
  const [progress, setProgress] = useState(0)  // 0-1
  const [duration, setDuration] = useState(0)
  const [volume, setVolume]     = useState(0.85)

  const isMock = strategy === 'mock' || !audioUrl || audioUrl.startsWith('/static/')

  useEffect(() => {
    onPlaybackChange?.({ isPlaying: playing, progress })
  }, [onPlaybackChange, playing, progress])

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume
    }
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // ── cleanup on unmount ──
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    srcRef.current?.stop()
    ctxRef.current?.close()
  }, [])

  // ── tick progress ──
  useEffect(() => {
    function tick() {
      if (!ctxRef.current || !playing) return
      const totalDuration = duration || bufRef.current?.duration || 0
      if (!totalDuration) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const elapsed = ctxRef.current.currentTime - startRef.current + offsetRef.current
      setProgress(Math.min(elapsed / totalDuration, 1))
      if (elapsed < totalDuration) rafRef.current = requestAnimationFrame(tick)
      else { setPlaying(false); setProgress(0); offsetRef.current = 0 }
    }

    if (playing) rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, duration])

  function ensureMockAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.')
    }

    if (!ctxRef.current || ctxRef.current.state === 'closed' || !gainRef.current) {
      ctxRef.current = new AudioContextClass()
      gainRef.current = ctxRef.current.createGain()
      gainRef.current.connect(ctxRef.current.destination)
    }

    gainRef.current.gain.value = volume
    return { ctx: ctxRef.current, gain: gainRef.current }
  }

  // ── play / pause ──
  async function togglePlay() {
    if (!isMock) return  // real audio handled by <audio> tag

    if (playing) {
      // pause
      offsetRef.current += ctxRef.current.currentTime - startRef.current
      srcRef.current?.stop()
      setPlaying(false)
      cancelAnimationFrame(rafRef.current)
      return
    }

    const { ctx, gain } = ensureMockAudioGraph()
    if (ctx.state === 'suspended') await ctx.resume()

    if (!bufRef.current) {
      bufRef.current = buildMockAudioBuffer(ctx)
      setDuration(bufRef.current.duration)
    }

    const src = ctx.createBufferSource()
    src.buffer = bufRef.current
    src.connect(gain)
    src.start(0, offsetRef.current)
    src.onended = () => {
      if (offsetRef.current + (ctx.currentTime - startRef.current) >= bufRef.current.duration - 0.05) {
        setPlaying(false); setProgress(0); offsetRef.current = 0
      }
    }
    srcRef.current = src
    startRef.current = ctx.currentTime
    setPlaying(true)
  }

  function seekToRatio(ratio) {
    if (!isMock || !bufRef.current) return
    const nextProgress = Math.max(0, Math.min(1, ratio))
    offsetRef.current = nextProgress * bufRef.current.duration
    setProgress(nextProgress)
    if (playing) {
      const { ctx, gain } = ensureMockAudioGraph()
      if (srcRef.current) srcRef.current.onended = null
      srcRef.current?.stop()
      const src = ctx.createBufferSource()
      src.buffer = bufRef.current
      src.connect(gain)
      src.start(0, offsetRef.current)
      src.onended = () => {
        if (offsetRef.current + (ctx.currentTime - startRef.current) >= bufRef.current.duration - 0.05) {
          setPlaying(false); setProgress(0); offsetRef.current = 0
        }
      }
      srcRef.current = src
      startRef.current = ctx.currentTime
    }
  }

  function seek(e) {
    seekToRatio(Number(e.currentTarget.value) / 1000)
  }

  function handleVolumeChange(e) {
    setVolume(Number(e.currentTarget.value) / 100)
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className={styles.player}>
      {isMock ? (
        // ── Mock: synthesised audio ──
        <>
          <button className={styles.playBtn} onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
            {playing
              ? <PauseIcon />
              : <PlayIcon />}
          </button>
          <div className={styles.controls}>
            <div className={styles.trackInfo}>
              <span className={styles.trackLabel}>Mock Synthesised Audio</span>
              <span className={styles.time}>
                {duration > 0 ? `${fmt(progress * duration)} / ${fmt(duration)}` : '—'}
              </span>
            </div>
            <input
              className={styles.seekRange}
              type="range"
              min="0"
              max="1000"
              value={Math.round(progress * 1000)}
              onChange={seek}
              onInput={seek}
              disabled={duration <= 0}
              aria-label="Seek audio"
              style={{ '--progress': `${progress * 100}%` }}
            />
            <div className={styles.volumeRow}>
              <span className={styles.volumeIcon}>
                <VolumeIcon volume={volume} />
              </span>
              <input
                className={styles.volumeRange}
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={handleVolumeChange}
                onInput={handleVolumeChange}
                aria-label="Adjust volume"
                style={{ '--progress': `${volume * 100}%` }}
              />
              <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
            </div>
          </div>
          <span className={styles.badge}>WEB AUDIO</span>
        </>
      ) : (
        // ── Suno: real audio URL ──
        <div className={styles.realAudio}>
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className={styles.audioEl}
            onPlay={() => onPlaybackChange?.({ isPlaying: true, progress })}
            onPause={e => onPlaybackChange?.({
              isPlaying: false,
              progress: e.currentTarget.duration
                ? e.currentTarget.currentTime / e.currentTarget.duration
                : progress,
            })}
            onEnded={() => onPlaybackChange?.({ isPlaying: false, progress: 0 })}
            onTimeUpdate={e => onPlaybackChange?.({
              isPlaying: !e.currentTarget.paused,
              progress: e.currentTarget.duration
                ? e.currentTarget.currentTime / e.currentTarget.duration
                : 0,
            })}
          />
          <div className={styles.realAudioSide}>
            <div className={styles.volumeRow}>
              <span className={styles.volumeIcon}>
                <VolumeIcon volume={volume} />
              </span>
              <input
                className={styles.volumeRange}
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={handleVolumeChange}
                onInput={handleVolumeChange}
                aria-label="Adjust volume"
                style={{ '--progress': `${volume * 100}%` }}
              />
              <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
            </div>
            <span className={`${styles.badge} ${styles.sunoBadge}`}>
              SUNO
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  )
}

function VolumeIcon({ volume }) {
  if (volume === 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  }

  if (volume < 0.5) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  )
}
