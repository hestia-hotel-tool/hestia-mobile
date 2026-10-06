import React, { useEffect, useState } from 'react';
import { Modal, Platform, type ModalProps } from 'react-native';

/**
 * How long iOS takes to finish dismissing a modal — the cross-dissolve and
 * slide transitions run about 300ms. Only the remainder is waited for.
 */
const IOS_DISMISS_MS = 400;

/** When a modal last started dismissing, app-wide. */
let lastHiddenAt = 0;
function noteHidden() {
  lastHiddenAt = Date.now();
}

/** Tracked modals on screen right now, app-wide. */
let openCount = 0;

/**
 * Whether a tracked modal is on screen. On iOS another top-level Modal cannot
 * be presented over it — `MessageModalProvider` checks this and falls back to
 * a native alert, which can.
 */
export function isAnyModalOpen(): boolean {
  return openCount > 0;
}

type SafeModalProps = ModalProps & {
  /** Leave out of `isAnyModalOpen` — for the message modal itself. */
  untracked?: boolean;
};

/**
 * React Native's Modal, minus the iOS "opened while another was closing"
 * freeze.
 *
 * On iOS every Modal is presented by the screen's view controller
 * (RCTModalHostViewComponentView `presentViewController`). UIKit refuses to
 * present while that controller is still presenting or dismissing another
 * one — but React Native marks the modal presented anyway and never retries.
 * The modal stays invisible, and the screen looks frozen. It happened
 * whenever one sheet handed over to the next in the same render: the status
 * menu to Return Later, Promise Time, Refuse Service or the inspection
 * checklist, and Return Later to Reassign.
 *
 * So on iOS a modal that becomes visible within `IOS_DISMISS_MS` of another
 * being hidden waits out the rest of that dismissal first. Opened on its own,
 * it shows at once. Android presents each Modal in its own dialog and is
 * passed through untouched.
 *
 * Two top-level modals can still not be *open* at the same time on iOS —
 * close one before opening the next. A Modal rendered inside another Modal's
 * content is fine; it is presented by that modal's controller.
 */
export function SafeModal({ untracked, ...props }: SafeModalProps) {
  const requested = props.visible ?? true;
  const shown = useDeferredModalVisible(requested);
  const visible = Platform.OS === 'ios' ? shown : requested;

  useEffect(() => {
    if (!visible || untracked) return;
    openCount += 1;
    return () => {
      openCount -= 1;
    };
  }, [visible, untracked]);

  return <Modal {...props} visible={visible} />;
}

function useDeferredModalVisible(visible: boolean): boolean {
  const [shown, setShown] = useState(false);
  const [previous, setPrevious] = useState(visible);

  // Recorded while rendering, so a modal opened in the same commit sees it no
  // matter which of the two effects runs first.
  if (previous !== visible) {
    if (!visible) noteHidden();
    setPrevious(visible);
  }

  useEffect(() => {
    if (Platform.OS !== 'ios' || !visible) return;
    const wait = Math.max(0, IOS_DISMISS_MS - (Date.now() - lastHiddenAt));
    const timer = setTimeout(() => setShown(true), wait);
    return () => {
      clearTimeout(timer);
      setShown(false);
    };
  }, [visible]);

  return shown;
}

export default SafeModal;
