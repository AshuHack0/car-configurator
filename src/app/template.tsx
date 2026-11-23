import styles from './template.module.css';

/** Re-mounts on every navigation, so each page fades in instead of cutting. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
