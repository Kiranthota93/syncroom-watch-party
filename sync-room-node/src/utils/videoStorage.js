'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

// Windows does not allow an open file to be deleted. Keep track of streams we
// create for HTTP video playback so an admin delete can close them before
// removing the room directory. (On Unix unlinking an open file is allowed.)
const activeVideoStreams = new Map();

// Layout: {uploads.dir}/{invite_token}/{file_id}{ext}          — finalized file
//         {uploads.dir}/{invite_token}/tmp/{upload_id}/{chunk_index}  — in-progress chunks

const roomDir = (invite_token) => path.join(config.uploads.dir, invite_token);
const tmpDir = (invite_token, upload_id) => path.join(roomDir(invite_token), 'tmp', upload_id);
const finalPath = (invite_token, file_id, ext) => path.join(roomDir(invite_token), `${file_id}${ext}`);

const ensureDir = async (dir) => fsp.mkdir(dir, { recursive: true });

const libraryDir = () => path.join(config.uploads.dir, 'videos');
const libraryPath = (video_key, ext) => path.join(libraryDir(), `${video_key}${ext}`);

const hashFile = async (filePath) => {
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const rs = fs.createReadStream(filePath);
    rs.on('data', (chunk) => hash.update(chunk));
    rs.on('end', resolve);
    rs.on('error', reject);
  });
  return hash.digest('hex');
};

const moveToLibrary = async (sourcePath, video_key, ext) => {
  await ensureDir(libraryDir());
  const dest = libraryPath(video_key, ext);
  try {
    await fsp.rename(sourcePath, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      await fsp.copyFile(sourcePath, dest);
      await fsp.unlink(sourcePath);
    } else {
      throw err;
    }
  }
  return dest;
};

const createVideoReadStream = (filePath, options) => {
  const stream = fs.createReadStream(filePath, options);
  const streams = activeVideoStreams.get(filePath) ?? new Set();
  streams.add(stream);
  activeVideoStreams.set(filePath, streams);

  const unregister = () => {
    streams.delete(stream);
    if (streams.size === 0) activeVideoStreams.delete(filePath);
  };
  stream.once('close', unregister);
  stream.once('error', unregister);

  return stream;
};

const closeVideoStreamsIn = (dir) => {
  const prefix = `${path.resolve(dir)}${path.sep}`;
  for (const [filePath, streams] of activeVideoStreams) {
    if (path.resolve(filePath).startsWith(prefix)) {
      for (const stream of streams) stream.destroy();
    }
  }
};

// Best-effort free-space check on the volume backing uploads.dir. statfs is
// only available on Node 18.15+ / recent platforms — fail open (allow the
// upload) if it isn't supported rather than blocking uploads on old Node.
const hasEnoughFreeSpace = async (neededBytes) => {
  try {
    await ensureDir(config.uploads.dir);
    const stats = await fsp.statfs(config.uploads.dir);
    const freeBytes = stats.bavail * stats.bsize;
    return freeBytes - neededBytes >= config.uploads.minFreeDiskBytes;
  } catch {
    return true;
  }
};

const chunkPath = (invite_token, upload_id, chunk_index) =>
  path.join(tmpDir(invite_token, upload_id), String(chunk_index));

// Concatenate all chunks (in order) into the final file, then remove the tmp dir.
const finalizeUpload = async (invite_token, upload_id, file_id, ext, total_chunks) => {
  await ensureDir(roomDir(invite_token));
  const dest = finalPath(invite_token, file_id, ext);
  const out = fs.createWriteStream(dest);

  try {
    for (let i = 0; i < total_chunks; i++) {
      const part = chunkPath(invite_token, upload_id, i);
      await new Promise((resolve, reject) => {
        const rs = fs.createReadStream(part);
        rs.on('error', reject);
        rs.on('end', resolve);
        rs.pipe(out, { end: false });
      });
    }
  } finally {
    out.end();
  }

  await fsp.rm(tmpDir(invite_token, upload_id), { recursive: true, force: true });
  return dest;
};

const deleteRoomUploads = async (invite_token) => {
  const dir = roomDir(invite_token);
  closeVideoStreamsIn(dir);

  // `maxRetries` specifically retries EPERM/EBUSY for recursive removal. It
  // covers the short interval Windows can retain a file handle after destroy.
  await fsp.rm(dir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
};

// Removes every finalized and in-progress upload, including folders left behind
// by rooms that no longer have a database record. This is deliberately only
// called by the explicitly-confirmed admin purge endpoint.
const deleteAllUploads = async () => {
  const dir = path.resolve(config.uploads.dir);

  // A bad UPLOADS_DIR value must never turn an admin cleanup into removal of a
  // whole drive or filesystem root.
  if (dir === path.parse(dir).root) {
    throw new Error('Refusing to delete uploads directory because it resolves to a filesystem root');
  }

  closeVideoStreamsIn(dir);
  await fsp.rm(dir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
  await ensureDir(dir);
};

module.exports = {
  roomDir,
  tmpDir,
  finalPath,
  chunkPath,
  ensureDir,
  createVideoReadStream,
  hasEnoughFreeSpace,
  finalizeUpload,
  deleteRoomUploads,
  deleteAllUploads,
  hashFile,
  moveToLibrary,
};
