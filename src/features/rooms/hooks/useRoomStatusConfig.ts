import { useEffect, useState } from 'react';

import { loadRoomStatusConfig, type RoomStatusConfig } from '../services/roomActions';
import { DEFAULT_ROOM_STATUS_RULES } from '../utils/roomStatusMachine';

const INITIAL: RoomStatusConfig = { rules: DEFAULT_ROOM_STATUS_RULES, undoSeconds: 120 };

/**
 * The room status rules and the hotel's undo window — loaded once per session
 * and shared. The built-in copy of the rules covers the first frame, so the
 * status menu is never empty while the table loads.
 */
export function useRoomStatusConfig(): RoomStatusConfig {
  const [config, setConfig] = useState<RoomStatusConfig>(INITIAL);
  useEffect(() => {
    let cancelled = false;
    loadRoomStatusConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return config;
}

export default useRoomStatusConfig;
