/**
 * @fileoverview Toast Notification System
 *
 * Displays temporary notification messages to users
 */

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import './Toast.css';

/**
 * Get icon for toast type
 */
const getIcon = (type) => {
    switch (type) {
        case 'success':
            return <CheckCircle size={20} />;
        case 'error':
            return <AlertCircle size={20} />;
        case 'warning':
            return <AlertTriangle size={20} />;
        case 'info':
        default:
            return <Info size={20} />;
    }
};

/**
 * Individual Toast Component
 */
function ToastItem({ toast, onClose }) {
    useEffect(() => {
        // Auto-dismiss after duration
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onClose]);

    return (
        <div className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
                {getIcon(toast.type)}
            </div>
            <div className="toast-content">
                {toast.title && <div className="toast-title">{toast.title}</div>}
                <div className="toast-message">{toast.message}</div>
            </div>
            <button
                className="toast-close"
                onClick={() => onClose(toast.id)}
                aria-label="Close notification"
            >
                <X size={16} />
            </button>
        </div>
    );
}

/**
 * Toast Container Component
 * Renders all active toasts
 */
function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
}

export default ToastContainer;
