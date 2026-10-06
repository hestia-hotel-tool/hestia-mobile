/**
 * AI Chat overlay – open/close overlay on top of current screen.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AIChatOverlay from '../components/AIChatOverlay';

interface AIChatOverlayContextType {
  open: () => void;
  close: () => void;
  visible: boolean;
}

const AIChatOverlayContext = createContext<AIChatOverlayContextType | undefined>(undefined);

export function AIChatOverlayProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  // Stable unless `visible` changes, so its consumers (the tab bar on every
  // screen) do not re-render each time the provider does.
  const value = useMemo(() => ({ open, close, visible }), [open, close, visible]);

  return (
    <AIChatOverlayContext.Provider value={value}>
      {children}
      <AIChatOverlay visible={visible} onClose={close} />
    </AIChatOverlayContext.Provider>
  );
}

export function useAIChatOverlay(): AIChatOverlayContextType {
  const ctx = useContext(AIChatOverlayContext);
  if (ctx === undefined) {
    throw new Error('useAIChatOverlay must be used within AIChatOverlayProvider');
  }
  return ctx;
}
