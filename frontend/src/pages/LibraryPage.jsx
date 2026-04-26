import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Header from '../components/Header'
import AudioPlayer from '../components/AudioPlayer'
import styles from './LibraryPage.module.css'

function inferStrategy(song) {
  const strategy = song.generation_request?.generation_metadata?.strategy
  if (strategy) return String(strategy).toLowerCase()
  return song.audio_url?.startsWith('/static/') ? 'mock' : 'suno'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function DetailField({ label, value, mono }) {
  return (
    <div className={styles.detailField}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>{value || '—'}</div>
    </div>
  )
}

export default function LibraryPage({ user, onLogout }) {
  const [songs, setSongs] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busySongId, setBusySongId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadLibrary() {
      setLoading(true)
      setError('')
      try {
        const response = await axios.get('/api/songs/')
        if (cancelled) return
        const orderedSongs = [...response.data.results].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        )
        setSongs(orderedSongs)
        setSelectedId(current => current && orderedSongs.some(song => song.song_id === current)
          ? current
          : orderedSongs[0]?.song_id ?? null)
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

    loadLibrary()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const selectedSong = useMemo(
    () => songs.find(song => song.song_id === selectedId) ?? songs[0] ?? null,
    [selectedId, songs],
  )

  async function handleDelete(song) {
    setBusySongId(song.song_id)
    try {
      await axios.delete(`/songs/${song.song_id}/delete/`)
      setSongs(current => current.filter(item => item.song_id !== song.song_id))
      setSelectedId(current => (current === song.song_id ? null : current))
      setToast({
        type: 'success',
        title: 'Song deleted',
        message: `"${song.title}" was removed from your library.`,
      })
    } catch (requestError) {
      setToast({
        type: 'error',
        title: 'Delete failed',
        message: requestError.response?.data?.error ?? requestError.message,
      })
    } finally {
      setBusySongId(null)
    }
  }

  async function handleVisibilityToggle(song, nextVisibility) {
    setBusySongId(song.song_id)
    try {
      const response = await axios.patch(`/songs/${song.song_id}/visibility/`, { visibility: nextVisibility })
      setSongs(current =>
        current.map(item =>
          item.song_id === song.song_id ? { ...item, visibility: response.data.visibility } : item,
        ),
      )
      setToast({
        type: 'success',
        title: 'Visibility updated',
        message: `"${song.title}" is now ${response.data.visibility.toLowerCase()}.`,
      })
    } catch (requestError) {
      setToast({
        type: 'error',
        title: 'Update failed',
        message: requestError.response?.data?.error ?? requestError.message,
      })
    } finally {
      setBusySongId(null)
    }
  }

  async function handleCopyShareLink(song) {
    const shareUrl = `${window.location.origin}/share/${song.song_id}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setToast({
        type: 'success',
        title: 'Share link copied',
        message: song.visibility === 'PRIVATE'
          ? `Link copied — set song to public so others can open it.`
          : shareUrl,
      })
    } catch {
      setToast({
        type: 'info',
        title: 'Share link',
        message: shareUrl,
      })
    }
  }

  return (
    <div className="app-bg">
      <div className="page">
        {toast ? (
          <div className={`toast toast-${toast.type || 'info'}`}>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
        ) : null}

        <Header user={user} onLogout={onLogout} />

        <div className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>Personal Library</div>
            <h2 className={styles.title}>All generated songs saved automatically</h2>
            <p className={styles.copy}>
              Browse every track you created, play it back, remove it from your library, and inspect the exact generation parameters behind it.
            </p>
          </div>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total songs</div>
              <div className={styles.statValue}>{songs.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Visible now</div>
              <div className={styles.statValue}>{songs.filter(song => song.visibility === 'PUBLIC').length}</div>
            </div>
          </div>
        </div>

        <div className={styles.layout}>
          <section className={styles.libraryPanel}>
            <div className={styles.panelHeader}>
              <h3>Your songs</h3>
              <span>{loading ? 'Loading…' : `${songs.length} tracks`}</span>
            </div>

            {loading ? <div className={styles.stateBox}>Loading library…</div> : null}
            {!loading && error ? <div className={styles.stateError}>{error}</div> : null}
            {!loading && !error && songs.length === 0 ? (
              <div className={styles.stateBox}>No songs yet. Generate one from the studio page first.</div>
            ) : null}

            {!loading && !error && songs.length > 0 ? (
              <div className={styles.songList}>
                {songs.map(song => {
                  const isSelected = selectedSong?.song_id === song.song_id
                  const strategy = inferStrategy(song)
                  return (
                    <button
                      key={song.song_id}
                      type="button"
                      className={`${styles.songCard} ${isSelected ? styles.songCardActive : ''}`}
                      onClick={() => setSelectedId(song.song_id)}
                    >
                      <div className={styles.songCardTop}>
                        <div>
                          <div className={styles.songTitle}>{song.title}</div>
                          <div className={styles.songMeta}>
                            {song.generation_request?.genre || 'unknown genre'} · {song.generation_request?.mood || 'unknown mood'}
                          </div>
                        </div>
                        <div className={`${styles.visibilityBadge} ${song.visibility === 'PUBLIC' ? styles.publicBadge : styles.privateBadge}`}>
                          {song.visibility}
                        </div>
                      </div>
                      <div className={styles.songCardBottom}>
                        <span>{formatDate(song.created_at)}</span>
                        <span className={styles.strategyBadge}>{strategy.toUpperCase()}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </section>

          <section className={styles.detailPanel}>
            {!selectedSong ? (
              <div className={styles.stateBox}>Select a song to preview it and inspect the generation details.</div>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <div className={styles.detailEyebrow}>Library detail</div>
                    <h3>{selectedSong.title}</h3>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={busySongId === selectedSong.song_id}
                    onClick={() => handleDelete(selectedSong)}
                  >
                    {busySongId === selectedSong.song_id ? 'Deleting…' : 'Delete song'}
                  </button>
                </div>

                <div className={styles.playerWrap}>
                  <AudioPlayer
                    audioUrl={selectedSong.audio_url}
                    strategy={inferStrategy(selectedSong)}
                  />
                </div>

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={`${styles.visibilityToggle} ${styles.privateToggle} ${selectedSong.visibility === 'PRIVATE' ? styles.visibilityActive : ''}`}
                    disabled={busySongId === selectedSong.song_id || selectedSong.visibility === 'PRIVATE'}
                    onClick={() => handleVisibilityToggle(selectedSong, 'PRIVATE')}
                  >
                    {busySongId === selectedSong.song_id ? 'Updating…' : 'Private'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.visibilityToggle} ${styles.publicToggle} ${selectedSong.visibility === 'PUBLIC' ? styles.visibilityActive : ''}`}
                    disabled={busySongId === selectedSong.song_id || selectedSong.visibility === 'PUBLIC'}
                    onClick={() => handleVisibilityToggle(selectedSong, 'PUBLIC')}
                  >
                    {busySongId === selectedSong.song_id ? 'Updating…' : 'Public'}
                  </button>
                  <button
                    type="button"
                    className={styles.shareButton}
                    onClick={() => handleCopyShareLink(selectedSong)}
                  >
                    Copy share link
                  </button>
                  <a className={styles.downloadButton} href={`/songs/${selectedSong.song_id}/download/`}>
                    Download song
                  </a>
                </div>

                <div className={styles.detailsGrid}>
                  <DetailField label="Song ID" value={selectedSong.song_id} mono />
                  <DetailField label="Visibility" value={selectedSong.visibility} />
                  <DetailField label="Created at" value={formatDate(selectedSong.created_at)} />
                  <DetailField label="Generation ID" value={selectedSong.generation_request?.generation_id} mono />
                  <DetailField label="Song name prompt" value={selectedSong.generation_request?.song_name} />
                  <DetailField label="Genre" value={selectedSong.generation_request?.genre} />
                  <DetailField label="Mood" value={selectedSong.generation_request?.mood} />
                  <DetailField label="Singer style" value={selectedSong.generation_request?.singer_style} />
                </div>

                <div className={styles.descriptionBlock}>
                  <div className={styles.detailLabel}>Description</div>
                  <div className={styles.descriptionValue}>
                    {selectedSong.generation_request?.description || 'No extra description was provided.'}
                  </div>
                </div>

                <div className={styles.metadataBlock}>
                  <div className={styles.detailLabel}>Generation metadata</div>
                  <pre className={styles.metadataPre}>
                    {JSON.stringify(selectedSong.generation_request?.generation_metadata || {}, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
