import styles from './Header.module.css'

export default function Header() {
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
      </div>

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
    </header>
  )
}
