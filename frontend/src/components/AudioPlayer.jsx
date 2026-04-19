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
export default function AudioPlayer({ audioUrl, strategy }) {
  const ctxRef     = useRef(null)
  const srcRef     = useRef(null)
  const startRef   = useRef(0)
  const offsetRef  = useRef(0)
  const bufRef     = useRef(null)
  const rafRef     = useRef(null)

  const [playing,  setPlaying]  = useState(false)
  const [progress, setProgress] = useState(0)  // 0-1
  const [duration, setDuration] = useState(0)

  const isMock = strategy === 'mock' || !audioUrl || audioUrl.startsWith('/static/')

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
      const elapsed = ctxRef.current.currentTime - startRef.current + offsetRef.current
      setProgress(Math.min(elapsed / duration, 1))
      if (elapsed < duration) rafRef.current = requestAnimationFrame(tick)
      else { setPlaying(false); setProgress(0); offsetRef.current = 0 }
    }

    if (playing) rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, duration])

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

    // init context + buffer once
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()

    if (!bufRef.current) {
      bufRef.current = buildMockAudioBuffer(ctx)
      setDuration(bufRef.current.duration)
    }

    const src = ctx.createBufferSource()
    src.buffer = bufRef.current
    src.connect(ctx.destination)
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

  function seek(e) {
    if (!isMock || !bufRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    offsetRef.current = ratio * bufRef.current.duration
    setProgress(ratio)
    if (playing) {
      srcRef.current?.stop()
      setPlaying(false)
      setTimeout(() => togglePlay(), 50)
    }
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
            <div className={styles.seekBar} onClick={seek}>
              <div className={styles.seekTrack}>
                <div className={styles.seekFill} style={{ width: `${progress * 100}%` }} />
                <div className={styles.seekThumb} style={{ left: `${progress * 100}%` }} />
              </div>
            </div>
          </div>
          <span className={styles.badge}>WEB AUDIO</span>
        </>
      ) : (
        // ── Suno: real audio URL ──
        <div className={styles.realAudio}>
          <audio controls src={audioUrl} className={styles.audioEl} />
          <span className={`${styles.badge} ${styles.sunoBadge}`}>
            SUNO
          </span>
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
