/**
 * AppProviders — single composition point for all app-wide providers.
 *
 * Order matters: i18n outermost (the login screen needs a language before a
 * session exists), then auth (session), then permissions (which depend on the
 * session), then Toast/MessageModal (global overlays), then the AI chat
 * overlay. Keep this list short; feature-local concerns live in their own
 * feature module.
 */
import React from 'react';
import { AuthProvider } from './AuthProvider';
import { I18nProvider } from './I18nProvider';
import { PermissionProvider } from './PermissionProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import { MessageModalProvider } from '@/contexts/MessageModalContext';
import { AIChatOverlayProvider } from '@features/ai-agent';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <PermissionProvider>
          <ToastProvider>
            <MessageModalProvider>
              <AIChatOverlayProvider>{children}</AIChatOverlayProvider>
            </MessageModalProvider>
          </ToastProvider>
        </PermissionProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
