'use client';

const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=';

let sharedAudioElement: HTMLAudioElement | null = null;
let sharedAudioPrimed = false;

function ensureSharedAudioElement(): HTMLAudioElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  if (sharedAudioElement) {
    if (!document.body.contains(sharedAudioElement)) {
      document.body.appendChild(sharedAudioElement);
    }

    return sharedAudioElement;
  }

  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.style.display = 'none';
  audio.setAttribute('data-flavorquest-shared-audio', 'true');
  document.body.appendChild(audio);
  sharedAudioElement = audio;
  return audio;
}

export function getSharedAudioElement(): HTMLAudioElement | null {
  return ensureSharedAudioElement();
}

export function isSharedAudioPrimed(): boolean {
  return sharedAudioPrimed;
}

export async function primeSharedAudioElement(): Promise<boolean> {
  const audio = ensureSharedAudioElement();

  if (!audio) {
    return false;
  }

  try {
    const previousMuted = audio.muted;
    const previousSrc = audio.currentSrc || audio.src;
    const previousCurrentTime = audio.currentTime;

    audio.muted = true;
    audio.src = SILENT_AUDIO_DATA_URI;
    audio.load();
    await audio.play();
    audio.pause();
    audio.currentTime = 0;

    if (previousSrc) {
      audio.src = previousSrc;
      audio.load();
      if (Number.isFinite(previousCurrentTime) && previousCurrentTime > 0) {
        audio.currentTime = previousCurrentTime;
      }
    } else {
      audio.removeAttribute('src');
      audio.load();
    }

    audio.muted = previousMuted;
    sharedAudioPrimed = true;
    console.info('[audio-session] shared audio primed');
    return true;
  } catch (error) {
    console.warn('[audio-session] failed to prime shared audio:', error);
    return false;
  }
}
