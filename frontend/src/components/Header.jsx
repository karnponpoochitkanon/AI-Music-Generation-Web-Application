import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>♪</div>
        <div>
          <h1 className={styles.title}>
            AI Music <span className={styles.gradient}>Generation</span>
          </h1>
        </div>
      </div>
      <p className={styles.subtitle}>
        Exercise 4 — Strategy Pattern Demo&nbsp;&nbsp;·&nbsp;&nbsp;Django + React
      </p>
      <div className={styles.badges}>
        <span className={styles.badgeMock}>
          <span className={styles.dot} />
          Mock Strategy
        </span>
        <span className={styles.arrow}>⟷</span>
        <span className={styles.badgeSuno}>
          <span className={styles.dot} />
          Suno Strategy
        </span>
      </div>
    </header>
  )
}
