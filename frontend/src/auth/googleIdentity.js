const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise = null

export const googleClientId = import.meta.env.GOOGLE_OAUTH_CLIENT_ID
export const googleConfigError = googleClientId
  ? null
  : 'Missing Google OAuth env var: GOOGLE_OAUTH_CLIENT_ID'

export function loadGoogleIdentityScript() {
  if (window.google?.accounts) {
    return Promise.resolve(window.google)
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Unable to load Google Identity Services.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}
