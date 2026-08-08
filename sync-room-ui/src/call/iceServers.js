import nodeAPI from '../services/api';
import { createLogger } from '../utils/logger';

const log = createLogger('iceServers');

const FALLBACK = [{ urls: 'stun:stun.l.google.com:19302' }];

let cached = null;

// Fetched once per page load and cached — the backend can rotate TURN
// credentials without a frontend deploy.
export async function getIceServers() {
  if (cached) return cached;
  try {
    const { data } = await nodeAPI.get('/rooms/ice-servers');
    cached = data.iceServers?.length ? data.iceServers : FALLBACK;
  } catch (err) {
    log.error('Failed to fetch ICE servers, using STUN fallback', err);
    cached = FALLBACK;
  }
  return cached;
}
