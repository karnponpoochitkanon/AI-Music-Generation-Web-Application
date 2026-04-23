import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './context.jsx'
import {
  googleClientId,
  googleConfigError,
  loadGoogleIdentityScript,
} from './googleIdentity.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isActive = true

    async function bootstrapAuth() {
      try {
        const [sessionResponse] = await Promise.all([
          fetch('/api/auth/session/'),
          googleClientId ? loadGoogleIdentityScript() : Promise.resolve(),
        ])

        if (!sessionResponse.ok) {
          throw new Error('Unable to restore the current session.')
        }

        const sessionData = await sessionResponse.json()
        if (isActive) {
          setUser(sessionData.authenticated ? sessionData.user : null)
        }
      } catch {
        if (isActive) {
          setUser(null)
        }
      } finally {
        if (isActive) {
          setAuthReady(true)
        }
      }
    }

    bootstrapAuth()

    return () => {
      isActive = false
    }
  }, [])

  const refreshSession = useCallback(async nextUser => {
    if (nextUser) {
      setUser(nextUser)
      return nextUser
    }

    const response = await fetch('/api/auth/session/')
    const data = await response.json()
    const currentUser = data.authenticated ? data.user : null
    setUser(currentUser)
    return currentUser
  }, [])

  const renderGoogleButton = useCallback(async (container, { onSuccess, onError } = {}) => {
    if (googleConfigError) {
      throw new Error(googleConfigError)
    }

    if (!container) {
      throw new Error('Google login target is missing.')
    }

    const google = await loadGoogleIdentityScript()

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async response => {
        try {
          const authResponse = await fetch('/api/auth/google/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential: response.credential }),
          })

          const authData = await authResponse.json()
          if (!authResponse.ok) {
            throw new Error(authData.error || 'Google sign-in failed.')
          }

          setUser(authData.user)
          onSuccess?.(authData.user)
        } catch (error) {
          onError?.(error)
        }
      },
    })

    container.innerHTML = ''
    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
    })
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout/', {
      method: 'POST',
    })

    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAuthenticated: Boolean(user),
        renderGoogleButton,
        refreshSession,
        logout,
        configError: googleConfigError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
