import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import styles from './Toast.module.css';

export default function Toast({ toasts }) {
  return (
    <div className={styles.container}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <span className={styles.icon}>
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'error' && <XCircle size={16} />}
              {toast.type === 'loading' && <Loader2 size={16} className={styles.spin} />}
            </span>
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
