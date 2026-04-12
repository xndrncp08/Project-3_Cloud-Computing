// src/components/StatCard.jsx
import styles from "./StatCard.module.css";

export default function StatCard({ label, value, icon, color = "accent", loading }) {
  return (
    <div className={`${styles.card} ${styles[color]} fade-up`}>
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.label}>{label}</div>
        {loading ? (
          <div className={styles.skeleton} />
        ) : (
          <div className={styles.value}>{value}</div>
        )}
      </div>
    </div>
  );
}
