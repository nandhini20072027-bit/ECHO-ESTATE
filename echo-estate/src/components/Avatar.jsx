import React, { useEffect, useState } from 'react';
import './Avatar.css';

/**
 * Avatar – visual talking AI avatar.
 * Props:
 *   - audioRef: Ref to the <audio> element that plays the response.
 *   - status:   Current UI status – 'ready' | 'thinking' | 'speaking'.
 *   - photoUrl: URL of the user's portrait (S3). If not provided, a default placeholder is used.
 */
export default function Avatar({ audioRef, status, photoUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Update playback state and progress bar.
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef]);

  const togglePlay = () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const avatarStyle = {
    backgroundImage: `url(${photoUrl || '/default-avatar.png'})`,
  };

  return (
    <div className="avatar-container">
      <div className="avatar-wrapper">
        <div className="avatar-frame" style={avatarStyle} />
        {/* Glow effect when speaking */}
        <div className={status === 'speaking' ? 'avatar-glow speaking' : 'avatar-glow'} />
        {/* Simple mouth animation – a pulsing bar at the bottom of the circle */}
        <div className={status === 'speaking' ? 'mouth speaking' : 'mouth'} />
      </div>
      <div className="avatar-controls">
        <button onClick={togglePlay} className="play-pause-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶️'}
        </button>
        <div className="progress-bar">
          <div className="progress-filled" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
