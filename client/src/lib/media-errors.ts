/** Actionable browser/media errors. Never expose raw device identifiers. */
export function mediaErrorMessage(error: unknown): string {
  const name = typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name: unknown }).name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Camera or microphone access was denied. Allow both in your browser site settings and try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No usable camera or microphone was found. Connect both devices and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is busy or unavailable. Close other apps using it and retry.';
    case 'OverconstrainedError':
      return 'Your camera or microphone cannot meet the requested settings. Check your devices.';
    case 'AbortError':
      return 'Your camera or microphone could not start. Reconnect the device and try again.';
    default:
      return 'Could not access your camera or microphone. Check device permissions and try again.';
  }
}

export function mediaEnvironmentError(): string | null {
  if (typeof window !== 'undefined' && window.isSecureContext === false)
    return 'Camera and microphone require HTTPS (or localhost). Open the secure site and try again.';
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia)
    return 'Your browser does not support camera and microphone access. Use a modern browser over HTTPS.';
  return null;
}
