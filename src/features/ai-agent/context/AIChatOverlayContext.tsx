/**
 * AI Chat overlay – open/close overlay on top of current screen.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
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

  return (
    <AIChatOverlayContext.Provider value={{ open, close, visible }}>
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
