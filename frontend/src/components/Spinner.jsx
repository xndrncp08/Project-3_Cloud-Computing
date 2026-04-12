// src/components/Spinner.jsx
import styles from "./Spinner.module.css";

export default function Spinner({ size = 32 }) {
  return (
    <div
      className={styles.spinner}
      style={{ width: size, height: size, borderWidth: size > 24 ? 3 : 2 }}
      role="status"
      aria-label="Loading"
    />
  );
}
