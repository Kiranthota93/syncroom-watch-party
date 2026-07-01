import { useEffect, useRef, useCallback } from 'react';
import PlaybackEngine  from '../engine/PlaybackEngine';
import PlaybackService from '../service/PlaybackService';

/**
 * usePlayback — React bridge for the playback layer.
 *
 * Creates and manages a PlaybackEngine + PlaybackService pair for the
 * lifetime of the room page. VideoStage calls setProvider() once the player
 * is ready, and applyJoinSync() after the provider reports ready.
 *
 * @param {string}  inviteToken  — stable room identifier
 * @param {boolean} isController — whether the current user controls playback
 *
 * @returns {{ setProvider, applyJoinSync }}
 */
export function usePlayback({ inviteToken, isController }) {
  const engineRef  = useRef(null);
  const serviceRef = useRef(null);

  // Engine is created once per hook instance
  if (!engineRef.current) {
    engineRef.current = new PlaybackEngine({ isController });
  }

  // Keep isController in sync with room state (e.g. after transfer)
  useEffect(() => {
    engineRef.current.setIsController(isController);
    serviceRef.current?.updateIsController(isController);
  }, [isController]);

  // Service is tied to inviteToken (stable for the room lifetime)
  useEffect(() => {
    const service = new PlaybackService({
      engine:       engineRef.current,
      inviteToken,
      isController,
    });

    serviceRef.current = service;
    service.start();

    return () => {
      service.stop();
    };
  }, [inviteToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Called when a player becomes ready — wires it into the engine. */
  const setProvider = useCallback((provider) => {
    engineRef.current?.setProvider(provider);
  }, []);

  /** Called immediately after setProvider — seeks to current room position. */
  const applyJoinSync = useCallback((playback_state) => {
    engineRef.current?.applyJoinSync(playback_state);
  }, []);

  /**
   * Called by VideoStage custom controls before setting el.currentTime.
   * Proactively suppresses the heartbeat so it cannot fire with stale
   * server data in the window before the 'seeking' event is dispatched.
   */
  const notifySeekStarted = useCallback(() => {
    engineRef.current?.notifySeekStarted();
  }, []);

  return { setProvider, applyJoinSync, notifySeekStarted };
}
