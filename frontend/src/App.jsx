import { useState, useCallback } from 'react'
import Header from './components/Header'
import StepForm from './components/StepForm'
import ResultPanel from './components/ResultPanel'
import LogPanel from './components/LogPanel'
import './App.css'

function App() {
  const [logs, setLogs] = useState([{ type: 'info', text: 'Ready — waiting for input…' }])
  const [result, setResult] = useState(null)
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState(null)
  const [requestId, setRequestId] = useState(null)

  const addLog = useCallback((type, text) => {
    setLogs(prev => [...prev, { type, text, ts: new Date().toTimeString().slice(0, 8) }])
  }, [])

  const clearLogs = () => setLogs([])

  const reset = () => {
    setLogs([{ type: 'info', text: 'Reset — ready for new run' }])
    setResult(null)
    setStep(1)
    setUserId(null)
    setRequestId(null)
  }

  return (
    <div className="app-bg">
      <div className="page">
        <Header />
        <div className="grid">
          <StepForm
            step={step}
            setStep={setStep}
            userId={userId}
            setUserId={setUserId}
            requestId={requestId}
            setRequestId={setRequestId}
            addLog={addLog}
            setResult={setResult}
            onReset={reset}
          />
          <div className="right-col">
            <ResultPanel result={result} />
            <LogPanel logs={logs} onClear={clearLogs} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
