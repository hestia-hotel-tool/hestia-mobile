/**
 * Toast and MessageModal helpers for use outside React (e.g. in utils).
 * In React components, prefer useToast() and useMessageModal() from their contexts.
 */

import { getToast as getToastFromContext } from '../contexts/ToastContext';
import { getMessageModal as getMessageModalFromContext } from '../contexts/MessageModalContext';

export const getToast = getToastFromContext;
export const getMessageModal = getMessageModalFromContext;
