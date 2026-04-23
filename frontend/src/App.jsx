import { useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth.jsx'
import Header from './components/Header'
import StepForm from './components/StepForm'
import ResultPanel from './components/ResultPanel'
import LogPanel from './components/LogPanel'
import LibraryPage from './pages/LibraryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import ShareSongPage from './pages/ShareSongPage.jsx'
import OnboardingRoute from './routes/OnboardingRoute.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import PublicOnlyRoute from './routes/PublicOnlyRoute.jsx'
import './App.css'
import axios from 'axios'

function Dashboard() {
  const { user, logout } = useAuth()
  const [logs, setLogs] = useState([{ type: 'info', text: 'Ready — waiting for input…' }])
  const [result, setResult] = useState(null)
  const [generationState, setGenerationState] = useState(null)
  const [toast, setToast] = useState(null)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState(user?.userId ?? null)
  const [requestId, setRequestId] = useState(null)

  const addLog = useCallback((type, text) => {
    setLogs(prev => [...prev, { type, text, ts: new Date().toTimeString().slice(0, 8) }])
  }, [])

  const clearLogs = () => setLogs([])

  const reset = () => {
    setLogs([{ type: 'info', text: 'Reset — ready for new run' }])
    setResult(null)
    setGenerationState(null)
    setStep(1)
    setUserId(user?.userId ?? null)
    setRequestId(null)
  }

  const notify = useCallback(({ type, title, message }) => {
    setToast({ type, title, message })
    window.setTimeout(() => {
      setToast(current => (current?.title === title && current?.message === message ? null : current))
    }, 4200)
  }, [])

  const handleVisibilityToggle = useCallback(async song => {
    const nextVisibility = song.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'
    setIsUpdatingVisibility(true)
    addLog('req', `→ PATCH /songs/${song.song_id}/visibility/  { visibility: "${nextVisibility}" }`)

    try {
      const response = await axios.patch(`/songs/${song.song_id}/visibility/`, {
        visibility: nextVisibility,
      })

      setResult(current => current ? {
        ...current,
        song: {
          ...current.song,
          visibility: response.data.visibility,
        },
      } : current)
      addLog('res', `✓ Visibility updated  visibility: "${response.data.visibility}"`)
      notify({
        type: 'success',
        title: 'Visibility updated',
        message: `Song is now ${response.data.visibility.toLowerCase()}.`,
      })
    } catch (error) {
      addLog('err', `✗ ${error.response?.status ?? 'Network'} ${error.response?.data?.error ?? error.message}`)
      notify({
        type: 'error',
        title: 'Visibility update failed',
        message: error.response?.data?.error ?? error.message,
      })
    } finally {
      setIsUpdatingVisibility(false)
    }
  }, [addLog, notify])

  return (
    <div className="app-bg">
      <div className="page">
        {toast ? (
          <div className={`toast toast-${toast.type || 'info'}`}>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
        ) : null}
        <Header user={user} onLogout={logout} />
        <div className="grid">
          <StepForm
            step={step}
            setStep={setStep}
            userId={userId}
            setUserId={setUserId}
            requestId={requestId}
            setRequestId={setRequestId}
            authUser={user}
            addLog={addLog}
            setResult={setResult}
            generationState={generationState}
            setGenerationState={setGenerationState}
            onNotify={notify}
            onReset={reset}
          />
          <div className="right-col">
            <ResultPanel
              result={result}
              generationState={generationState}
              onVisibilityToggle={handleVisibilityToggle}
              isUpdatingVisibility={isUpdatingVisibility}
            />
            <LogPanel logs={logs} onClear={clearLogs} />
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { user, logout } = useAuth()

  return (
    <Routes>
      <Route path="/share/:songId" element={<ShareSongPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<LibraryPage user={user} onLogout={logout} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
