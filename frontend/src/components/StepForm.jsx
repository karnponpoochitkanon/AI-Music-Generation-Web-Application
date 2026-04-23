import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import styles from './StepForm.module.css'

const GENRES = ['lo-fi','jazz','electronic','pop','classical','hip-hop','rock','ambient']
const MOODS  = ['chill','energetic','melancholy','happy','dark','romantic','epic']

function StepIndicator({ step }) {
  const labels = ['Fill request', 'Generate song']
  return (
    <div className={styles.steps}>
      {labels.map((label, i) => {
        const n = i + 1
        const cls = step > n ? styles.done : step === n ? styles.active : styles.idle
        return (
          <div key={n} className={`${styles.step} ${cls}`}>
            <div className={styles.stepNum}>
              {step > n ? '✓' : n}
            </div>
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function StepForm({
  step, setStep, userId,
  requestId, setRequestId,
  authUser,
  addLog, setResult, onReset,
  generationState, setGenerationState,
  onNotify,
}) {
  const email = authUser?.email ?? ''
  const activeUserId = userId || authUser?.userId || null
  const [songName, setSongName]     = useState('Midnight Dreams')
  const [genre, setGenre]           = useState('lo-fi')
  const [mood, setMood]             = useState('chill')
  const [singerStyle, setSingerStyle] = useState('')
  const [description, setDescription] = useState('')
  const [loadingReq, setLoadingReq]     = useState(false)
  const [loadingGen, setLoadingGen]     = useState(false)
  const [reqDone, setReqDone]     = useState(false)
  const [genDone, setGenDone]     = useState(false)
  const pollRef = useRef(null)

  useEffect(() => () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
    }
  }, [])

  function stopPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function fetchGenerationStatus(targetRequestId) {
    const response = await axios.get(`/api/requests/${targetRequestId}/generate/`)
    return response.data
  }

  function beginPolling(targetRequestId) {
    stopPolling()

    pollRef.current = window.setInterval(async () => {
      try {
        const status = await fetchGenerationStatus(targetRequestId)
        setGenerationState(status)

        if (status.status === 'COMPLETED') {
          stopPolling()
          setLoadingGen(false)
          setGenDone(true)
          setStep(3)
          const completedResult = {
            song: status.song,
            strategy: status.metadata?.strategy,
            generation_id: status.generation_id,
            metadata: status.metadata,
          }
          setResult(completedResult)
          addLog('res', `✓ Generation completed  generation_id: "${status.generation_id}"`)
          onNotify?.({
            type: 'success',
            title: 'Song generated',
            message: `Your song "${status.song?.title || songName}" is ready.`,
          })
        }

        if (status.status === 'FAILED') {
          stopPolling()
          setLoadingGen(false)
          addLog('err', `✗ Generation failed ${status.error || 'Unknown error'}`)
          onNotify?.({
            type: 'error',
            title: 'Generation failed',
            message: status.error || 'The AI service could not generate this song.',
          })
        }
      } catch (error) {
        stopPolling()
        setLoadingGen(false)
        addLog('err', `✗ Polling failed ${error.response?.data?.error ?? error.message}`)
        onNotify?.({
          type: 'error',
          title: 'Status check failed',
          message: error.response?.data?.error ?? error.message,
        })
      }
    }, 2500)
  }

  async function createRequest() {
    if (!activeUserId) {
      addLog('err', '✗ Authenticated user session is missing.')
      return
    }

    setLoadingReq(true)
    const body = { user: activeUserId, song_name: songName, genre, mood, singer_style: singerStyle, description }
    addLog('req', `→ POST /api/requests/  song_name: "${songName}"  genre: "${genre}"  mood: "${mood}"`)
    try {
      const res = await axios.post('/api/requests/', body)
      setRequestId(res.data.request_id)
      addLog('res', `✓ 201 Created  request_id: "${res.data.request_id}"`)
      setStep(2)
      setReqDone(true)
    } catch (e) {
      addLog('err', `✗ ${e.response?.status ?? 'Network'} ${JSON.stringify(e.response?.data ?? e.message)}`)
    }
    setLoadingReq(false)
  }

  async function generateSong() {
    setLoadingGen(true)
    setGenDone(false)
    addLog('info', `⚡ Triggering generation for request: ${requestId}`)
    addLog('req', `→ POST /api/requests/${requestId}/generate/`)
    try {
      const res = await axios.post(`/api/requests/${requestId}/generate/`)
      setGenerationState(res.data)
      addLog('info', `… job queued  status: "${res.data.status}" progress: ${res.data.progress_percent}%`)
      onNotify?.({
        type: 'info',
        title: 'Generation started',
        message: 'The AI service is creating your song now.',
      })
      beginPolling(requestId)
    } catch (e) {
      setLoadingGen(false)
      addLog('err', `✗ ${e.response?.status ?? 'Network'} ${e.response?.data?.error ?? e.message}`)
      onNotify?.({
        type: 'error',
        title: 'Generation failed to start',
        message: e.response?.data?.error ?? e.message,
      })
    }
  }

  function handleReset() {
    stopPolling()
    setSongName('Midnight Dreams')
    setGenre('lo-fi'); setMood('chill')
    setSingerStyle(''); setDescription('')
    setReqDone(false); setGenDone(false)
    setGenerationState(null)
    onReset()
  }

  return (
    <div className={styles.col}>
      <StepIndicator step={step} />

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span className={styles.cardIcon}>🎛</span>
          Step 1 — Generation Request
        </div>

        <div className={styles.authNotice}>
          Profile created for <strong>{authUser?.displayName || email}</strong>. Your server-verified user session is ready to submit song requests.
        </div>

        {activeUserId && (
          <div className={styles.infoBox}>
            ✓ User ready — <code>{activeUserId.slice(0, 18)}…</code>
          </div>
        )}

        <div className={styles.field}>
          <label>Song Name</label>
          <input value={songName} onChange={e => setSongName(e.target.value)} disabled={reqDone} />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label>Genre</label>
            <select value={genre} onChange={e => setGenre(e.target.value)} disabled={reqDone}>
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Mood</label>
            <select value={mood} onChange={e => setMood(e.target.value)} disabled={reqDone}>
              {MOODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label>Singer Style <span className={styles.opt}>(optional)</span></label>
          <input value={singerStyle} onChange={e => setSingerStyle(e.target.value)} disabled={reqDone} placeholder="e.g. Frank Ocean" />
        </div>
        <div className={styles.field}>
          <label>Description <span className={styles.opt}>(optional)</span></label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={reqDone} placeholder="Rainy night vibes…" />
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createRequest} disabled={loadingReq || reqDone || step < 1}>
          {loadingReq ? <span className={styles.spinner} /> : null}
          {reqDone ? '✓ Request Created' : loadingReq ? 'Creating…' : '→ Create Request'}
        </button>
      </div>

      <div className={`${styles.card} ${step < 2 ? styles.disabled : ''}`}>
        <div className={styles.cardTitle}>
          <span className={styles.cardIcon}>⚡</span>
          Step 2 — Generate Song
        </div>

        {requestId && (
          <div className={styles.infoBox}>
            ✓ Request ready — <code>{requestId.slice(0, 18)}…</code>
          </div>
        )}

        <div className={styles.strategyRow}>
          <div>
            <div className={styles.stratLabel}>Active Strategy</div>
            <div className={styles.stratHint}>
              Set <code>SONG_GENERATION_STRATEGY</code> in <code>.env</code>
            </div>
          </div>
          <div className={styles.stratBadges}>
            <span className={styles.badgeMock}>MOCK</span>
            <span className={styles.badgeSuno}>SUNO</span>
          </div>
        </div>

        {generationState ? (
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <span className={styles.progressStatus}>
                {generationState.status || 'QUEUED'}
              </span>
              <span className={styles.progressPct}>
                {generationState.progress_percent ?? 0}%
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${generationState.progress_percent ?? 0}%` }}
              />
            </div>
            <div className={styles.progressDetail}>
              {generationState.metadata?.progress_detail
                || (generationState.status === 'FAILED'
                  ? generationState.error
                  : 'Waiting for the AI service to return audio')}
            </div>
          </div>
        ) : null}

        <button className={`${styles.btn} ${styles.btnGenerate}`} onClick={generateSong} disabled={loadingGen || genDone || step < 2}>
          {loadingGen ? <span className={`${styles.spinner} ${styles.spinnerDark}`} /> : null}
          {genDone ? '✓ Generated!' : loadingGen ? 'Generating…' : '✨ Generate Song'}
        </button>
        <button className={`${styles.btn} ${styles.btnReset}`} onClick={handleReset}>
          ↺ Start Over
        </button>
      </div>
    </div>
  )
}
