/**
 * AppProviders — single composition point for all app-wide providers.
 *
 * Order matters: auth first (session), then Toast/MessageModal (global
 * overlays), then the AI chat overlay. Keep this list short; feature-local
 * concerns live in their own feature module.
 */
import React from 'react';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import { MessageModalProvider } from '@/contexts/MessageModalContext';
import { AIChatOverlayProvider } from '@features/ai-agent';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <MessageModalProvider>
          <AIChatOverlayProvider>{children}</AIChatOverlayProvider>
        </MessageModalProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
