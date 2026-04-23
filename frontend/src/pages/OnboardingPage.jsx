import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.jsx'
import styles from './OnboardingPage.module.css'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshSession } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const [profileImageUrl, setProfileImageUrl] = useState(
    user?.profileImageUrl || user?.googlePicture || '',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  function handleProfileImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setProfileImageUrl(reader.result?.toString() || '')
      setFileName(file.name)
      setError('')
    }
    reader.onerror = () => {
      setError('Unable to read that image file.')
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          profile_image_url: profileImageUrl.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        const fieldErrors = data.errors
          ? Object.values(data.errors).flat().join(' ')
          : data.error
        throw new Error(fieldErrors || 'Unable to create your user profile.')
      }

      await refreshSession(data.user)
      navigate('/', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Unable to create your user profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.kicker}>Create User</p>
          <h1>Finish your profile setup</h1>
          <p className={styles.copy}>
            Google already verified your identity. Choose the username and profile
            photo this app should use before you enter the music workspace.
          </p>
          <div className={styles.heroNote}>
            <strong>Next step:</strong> pick a handle and upload a profile image from
            your device.
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formIntro}>
            <p className={styles.formEyebrow}>Profile Details</p>
            <h2>Create your studio identity</h2>
            <p className={styles.formCopy}>
              Pick a username and upload the profile photo you want shown across the app.
            </p>
          </div>

          <div className={styles.avatarBlock}>
            <img
              className={styles.avatar}
              src={profileImageUrl || user?.googlePicture || 'https://placehold.co/160x160?text=User'}
              alt="Profile preview"
            />
            <div>
              <p className={styles.emailLabel}>Signed in as</p>
              <p className={styles.email}>{user?.email}</p>
            </div>
          </div>

          <label className={styles.field}>
            <span>Username</span>
            <input
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="your_handle"
              required
            />
            <small className={styles.helper}>This will be shown on your profile inside the app.</small>
          </label>

          <label className={styles.field}>
            <span>Profile Image</span>
            <label className={styles.filePicker}>
              <input
                accept="image/*"
                className={styles.fileInput}
                onChange={handleProfileImageChange}
                type="file"
              />
              <span>{fileName || 'Choose an image from your device'}</span>
            </label>
            <small className={styles.helper}>PNG, JPG, or any standard image file is fine.</small>
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button className={styles.submitButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving profile...' : 'Create User'}
          </button>
        </form>
      </section>
    </main>
  )
}
