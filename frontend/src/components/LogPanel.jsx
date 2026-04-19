import { useEffect, useRef } from 'react'
import styles from './LogPanel.module.css'

const typeClass = {
  req:  styles.req,
  res:  styles.res,
  err:  styles.err,
  info: styles.info,
}

export default function LogPanel({ logs, onClear }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [logs])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>⬡ API Log</span>
        <button className={styles.clear} onClick={onClear}>Clear</button>
      </div>
      <div className={styles.body} ref={ref}>
        {logs.map((l, i) => (
          <div key={i} className={styles.line}>
            {l.ts && <span className={styles.ts}>{l.ts}</span>}
            <span className={`${styles.text} ${typeClass[l.type] ?? styles.info}`}>
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
