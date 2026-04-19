import { useState } from 'react'
import axios from 'axios'
import styles from './StepForm.module.css'

const GENRES = ['lo-fi','jazz','electronic','pop','classical','hip-hop','rock','ambient']
const MOODS  = ['chill','energetic','melancholy','happy','dark','romantic','epic']

function StepIndicator({ step }) {
  const labels = ['Create user', 'Fill request', 'Generate song']
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
  step, setStep, userId, setUserId,
  requestId, setRequestId,
  addLog, setResult, onReset,
}) {
  const [email, setEmail]           = useState('demo@example.com')
  const [songName, setSongName]     = useState('Midnight Dreams')
  const [genre, setGenre]           = useState('lo-fi')
  const [mood, setMood]             = useState('chill')
  const [singerStyle, setSingerStyle] = useState('')
  const [description, setDescription] = useState('')
  const [loadingUser, setLoadingUser]   = useState(false)
  const [loadingReq, setLoadingReq]     = useState(false)
  const [loadingGen, setLoadingGen]     = useState(false)
  const [userDone, setUserDone]   = useState(false)
  const [reqDone, setReqDone]     = useState(false)
  const [genDone, setGenDone]     = useState(false)

  async function createUser() {
    setLoadingUser(true)
    addLog('req', `→ POST /api/users/  { email: "${email}", account_status: "ACTIVE" }`)
    try {
      const res = await axios.post('/api/users/', { email, account_status: 'ACTIVE' })
      setUserId(res.data.user_id)
      addLog('res', `✓ 201 Created  user_id: "${res.data.user_id}"`)
      setStep(2)
      setUserDone(true)
    } catch (e) {
      addLog('err', `✗ ${e.response?.status ?? 'Network'} ${JSON.stringify(e.response?.data ?? e.message)}`)
    }
    setLoadingUser(false)
  }

  async function createRequest() {
    setLoadingReq(true)
    const body = { user: userId, song_name: songName, genre, mood, singer_style: singerStyle, description }
    addLog('req', `→ POST /api/requests/  song_name: "${songName}"  genre: "${genre}"  mood: "${mood}"`)
    try {
      const res = await axios.post('/api/requests/', body)
      setRequestId(res.data.request_id)
      addLog('res', `✓ 201 Created  request_id: "${res.data.request_id}"`)
      setStep(3)
      setReqDone(true)
    } catch (e) {
      addLog('err', `✗ ${e.response?.status ?? 'Network'} ${JSON.stringify(e.response?.data ?? e.message)}`)
    }
    setLoadingReq(false)
  }

  async function generateSong() {
    setLoadingGen(true)
    addLog('info', `⚡ Triggering generation for request: ${requestId}`)
    addLog('req', `→ POST /api/requests/${requestId}/generate/`)
    try {
      const res = await axios.post(`/api/requests/${requestId}/generate/`)
      const d = res.data
      addLog('res', `✓ 201 Song generated  strategy: "${d.strategy}"`)
      addLog('res', `✓ generation_id: "${d.generation_id}"`)
      addLog('res', `✓ audio_url: "${d.song.audio_url}"`)
      setResult(d)
      setGenDone(true)
      setStep(4)
    } catch (e) {
      addLog('err', `✗ ${e.response?.status ?? 'Network'} ${e.response?.data?.error ?? e.message}`)
    }
    setLoadingGen(false)
  }

  function handleReset() {
    setEmail('demo@example.com')
    setSongName('Midnight Dreams')
    setGenre('lo-fi'); setMood('chill')
    setSingerStyle(''); setDescription('')
    setUserDone(false); setReqDone(false); setGenDone(false)
    onReset()
  }

  return (
    <div className={styles.col}>
      <StepIndicator step={step} />

      {/* ── Card 1 ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span className={styles.cardIcon}>👤</span>
          Step 1 — User
        </div>
        <div className={styles.field}>
          <label>Email Address</label>
          <input value={email} onChange={e => setEmail(e.target.value)} disabled={userDone} placeholder="demo@example.com" />
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createUser} disabled={loadingUser || userDone}>
          {loadingUser ? <span className={styles.spinner} /> : null}
          {userDone ? '✓ User Created' : loadingUser ? 'Creating…' : '→ Create User'}
        </button>
      </div>

      {/* ── Card 2 ── */}
      <div className={`${styles.card} ${step < 2 ? styles.disabled : ''}`}>
        <div className={styles.cardTitle}>
          <span className={styles.cardIcon}>🎛</span>
          Step 2 — Generation Request
        </div>

        {userId && (
          <div className={styles.infoBox}>
            ✓ User ready — <code>{userId.slice(0, 18)}…</code>
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
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createRequest} disabled={loadingReq || reqDone || step < 2}>
          {loadingReq ? <span className={styles.spinner} /> : null}
          {reqDone ? '✓ Request Created' : loadingReq ? 'Creating…' : '→ Create Request'}
        </button>
      </div>

      {/* ── Card 3 ── */}
      <div className={`${styles.card} ${step < 3 ? styles.disabled : ''}`}>
        <div className={styles.cardTitle}>
          <span className={styles.cardIcon}>⚡</span>
          Step 3 — Generate Song
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

        <button className={`${styles.btn} ${styles.btnGenerate}`} onClick={generateSong} disabled={loadingGen || genDone || step < 3}>
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
