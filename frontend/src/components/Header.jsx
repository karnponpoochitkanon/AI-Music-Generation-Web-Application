import { NavLink } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header({ user, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>♪</div>
          <h1 className={styles.title}>
            AI Music<br />
            <span className={styles.gradient}>Generation</span>
          </h1>
        </div>
        <p className={styles.subtitle}>
          Exercise 4 — Strategy Pattern Demo &nbsp;·&nbsp; Django + React
        </p>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            Studio
          </NavLink>
          <NavLink
            to="/library"
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          >
            Library
          </NavLink>
        </nav>
      </div>

      <div className={styles.right}>
        <div className={styles.badges}>
          <p className={styles.tagline}>Active strategies</p>
          <div className={styles.badgeRow}>
            <span className={styles.badgeMock}>
              <span className={styles.dot} />
              Mock
            </span>
            <span className={styles.arrow}>↔</span>
            <span className={styles.badgeSuno}>
              <span className={styles.dot} />
              Suno
            </span>
          </div>
        </div>

        <div className={styles.userCard}>
          <img
            className={styles.avatar}
            src={user?.profileImageUrl || user?.googlePicture || 'https://placehold.co/96x96?text=U'}
            alt={user?.displayName || user?.email || 'User avatar'}
          />
          <div>
            <p className={styles.userLabel}>Signed in with Google</p>
            <p className={styles.userName}>{user?.displayName || user?.googleName || 'User'}</p>
            <p className={styles.userEmail}>@{user?.username || 'pending'} · {user?.email}</p>
          </div>
          <button type="button" className={styles.logoutButton} onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
