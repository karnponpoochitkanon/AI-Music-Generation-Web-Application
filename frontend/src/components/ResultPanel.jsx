import { useMemo } from 'react'
import styles from './ResultPanel.module.css'
import AudioPlayer from './AudioPlayer'

function Waveform() {
  const bars = useMemo(() => (
    Array.from({ length: 44 }, (_, i) => ({
      h: 8 + ((i * 17) % 25),
      d: (0.72 + ((i * 7) % 9) * 0.05).toFixed(2),
      delay: (i * 0.04).toFixed(2),
    }))
  ), [])

  return (
    <div className={styles.waveform}>
      {bars.map((b, i) => (
        <div
          key={i}
          className={styles.bar}
          style={{ '--h': `${b.h}px`, '--d': `${b.d}s`, '--delay': `${b.delay}s` }}
        />
      ))}
    </div>
  )
}

function JsonLine({ obj, depth = 0 }) {
  if (obj === null) return <span className={styles.jNull}>null</span>
  if (typeof obj === 'boolean') return <span className={styles.jNum}>{String(obj)}</span>
  if (typeof obj === 'number')  return <span className={styles.jNum}>{obj}</span>
  if (typeof obj === 'string')  return <span className={styles.jStr}>"{obj}"</span>
  if (Array.isArray(obj)) {
    if (!obj.length) return <span>{'[]'}</span>
    return (
      <span>
        {'['}<br />
        {obj.map((v, i) => (
          <span key={i}>
            {'  '.repeat(depth + 1)}<JsonLine obj={v} depth={depth + 1} />{i < obj.length - 1 ? ',' : ''}<br />
          </span>
        ))}
        {'  '.repeat(depth)}{']'}
      </span>
    )
  }
  const entries = Object.entries(obj)
  if (!entries.length) return <span>{'{}'}</span>
  return (
    <span>
      {'{'}<br />
      {entries.map(([k, v], i) => (
        <span key={k}>
          {'  '.repeat(depth + 1)}
          <span className={styles.jKey}>"{k}"</span>
          <span className={styles.jColon}>: </span>
          <JsonLine obj={v} depth={depth + 1} />
          {i < entries.length - 1 ? ',' : ''}
          <br />
        </span>
      ))}
      {'  '.repeat(depth)}{'}'}
    </span>
  )
}

export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span>💿</span> Result
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>♪</div>
          <p>Your generated song will appear here</p>
        </div>
      </div>
    )
  }

  const { song, strategy, generation_id, metadata } = result

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>
        <span>💿</span> Result
      </div>

      <div className={styles.resultCard}>
        <div className={styles.resultHeader}>
          <div className={styles.resultIcon}>♪</div>
          <div>
            <div className={styles.resultTitle}>{song.title}</div>
            <div className={styles.resultSub}>Owner: {song.owner_id?.slice(0, 16)}…</div>
          </div>
          <span className={strategy === 'suno' ? styles.tagSuno : styles.tagMock}>
            {(strategy || 'mock').toUpperCase()}
          </span>
        </div>

        <Waveform />

        <AudioPlayer audioUrl={song.audio_url} strategy={strategy} />

        <div className={styles.fields}>
          <Field label="Status"        value="SUCCESS"       accent="green" />
          <Field label="Strategy"      value={(strategy || '').toUpperCase()} accent="purple" />
          <Field label="Song ID"       value={song.song_id}  mono />
          <Field label="Generation ID" value={generation_id} mono />
          <Field label="Audio URL"     value={song.audio_url} mono span />
        </div>

        <div className={styles.metaLabel}>Metadata</div>
        <pre className={styles.metaBlock}>
          <JsonLine obj={metadata || {}} />
        </pre>
      </div>
    </div>
  )
}

function Field({ label, value, accent, mono, span }) {
  const cls = accent === 'green' ? styles.valGreen
            : accent === 'purple' ? styles.valPurple
            : ''
  return (
    <div className={`${styles.field} ${span ? styles.span : ''}`}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={`${styles.fieldValue} ${mono ? styles.mono : ''} ${cls}`}>
        {value || '—'}
      </div>
    </div>
  )
}
