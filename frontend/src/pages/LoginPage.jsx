import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.jsx'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { renderGoogleButton, configError } = useAuth()
  const [loginError, setLoginError] = useState('')
  const buttonRef = useRef(null)

  useEffect(() => {
    if (configError) {
      return undefined
    }

    let isActive = true
    const buttonNode = buttonRef.current

    renderGoogleButton(buttonNode, {
      onSuccess: () => {
        if (!isActive) {
          return
        }

        const redirectTo = location.state?.from?.pathname || '/'
        navigate(redirectTo, { replace: true })
      },
      onError: loginError => {
        if (!isActive) {
          return
        }

        setLoginError(loginError.message || 'Unable to sign in with Google.')
      },
    }).catch(loginError => {
      if (!isActive) {
        return
      }

      setLoginError(loginError.message || 'Unable to sign in with Google.')
    })

    return () => {
      isActive = false
      if (buttonNode) {
        buttonNode.innerHTML = ''
      }
    }
  }, [configError, location.state, navigate, renderGoogleButton])

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.kicker}>Protected Access</p>
          <h1>Sign in to use the AI Music Generation workspace</h1>
          <p className={styles.copy}>
            Google OAuth is required before entering the generator. Unauthenticated
            users are redirected here automatically.
          </p>
        </div>

        <div className={styles.panel}>
          <div className={styles.badge}>Google OAuth</div>
          <div className={styles.googleButtonWrap}>
            <div ref={buttonRef} />
          </div>

          {configError || loginError ? <p className={styles.error}>{configError || loginError}</p> : null}

          <div className={styles.notes}>
            <p>Required Google OAuth env var:</p>
            <code>GOOGLE_OAUTH_CLIENT_ID</code>
            <p>Use the single root .env file for both Django and Vite.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
