import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import AudioPlayer from '../components/AudioPlayer'
import styles from './ShareSongPage.module.css'

function inferStrategy(song) {
  if (!song) return 'mock'
  return song.audio_url?.startsWith('/static/') ? 'mock' : 'suno'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function ShareSongPage() {
  const { songId } = useParams()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSong() {
      setLoading(true)
      setError('')
      try {
        const response = await axios.get(`/songs/${songId}/`)
        if (!cancelled) {
          setSong(response.data)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.error ?? requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSong()
    return () => {
      cancelled = true
    }
  }, [songId])

  const strategy = useMemo(() => inferStrategy(song), [song])

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <div className={styles.kicker}>Public Song Share</div>
          <h1>Listen without signing in</h1>
          <p className={styles.copy}>
            This shared page is available only for songs that the owner marked as public.
          </p>
        </div>

        {loading ? <div className={styles.stateBox}>Loading shared song…</div> : null}
        {!loading && error ? <div className={styles.stateError}>{error}</div> : null}

        {!loading && !error && song ? (
          <div className={styles.playerCard}>
            <div className={styles.titleRow}>
              <div>
                <div className={styles.songTitle}>{song.title}</div>
                <div className={styles.songMeta}>
                  Shared on {formatDate(song.created_at)} · {song.visibility}
                </div>
              </div>
              <div className={styles.badges}>
                <span className={styles.publicBadge}>PUBLIC</span>
                <span className={styles.strategyBadge}>{strategy.toUpperCase()}</span>
              </div>
            </div>

            <div className={styles.playerWrap}>
              <AudioPlayer audioUrl={song.audio_url} strategy={strategy} />
            </div>

            <div className={styles.actions}>
              <a className={styles.primaryAction} href={`/songs/${song.id}/download/`}>
                Download song
              </a>
              <Link className={styles.secondaryAction} to="/login">
                Open full studio
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
