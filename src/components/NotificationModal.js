import React, { useEffect, useRef } from 'react';
import './NotificationModal.css';

const NotificationModal = ({ message, onClose }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Play notification sound when modal appears
    // Using Web Audio API to create a pleasant notification sound
    const playNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create a pleasant two-tone notification sound
        const playTone = (frequency, startTime, duration) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        playTone(800, now, 0.15);  // First tone
        playTone(1000, now + 0.15, 0.15);  // Second tone (higher)

      } catch (error) {
        console.log('Audio playback not supported:', error);
      }
    };

    playNotificationSound();
  }, []);

  return (
    <div className="notification-modal-backdrop">
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-content">
          <div className="notification-icon">🔔</div>
          <div className="notification-message">{message}</div>
        </div>
        <button className="notification-dismiss-btn" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
