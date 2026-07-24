/**
 * NOVEL - Custom Responsive YouTube Player Controller
 * Always requests max quality (4K), disables captions, and features smooth auto-hide controls overlay
 * that appears only while the mouse is moving.
 */

const CustomPlayer = (() => {
  let ytPlayer = null;
  let isApiReady = false;
  let isPlaying = false;
  let isMuted = false;
  let progressInterval = null;
  let hideControlsTimer = null;
  let currentVideoId = null;

  // DOM Elements
  const modal = document.getElementById('player-modal');
  const playerContainer = document.getElementById('player-iframe-container');
  const titleEl = document.getElementById('player-title');
  const subtitleEl = document.getElementById('player-subtitle');
  const playPauseBtn = document.getElementById('ctrl-play-pause');
  const muteBtn = document.getElementById('ctrl-mute');
  const volumeSlider = document.getElementById('ctrl-volume');
  const timeDisplay = document.getElementById('ctrl-time');
  const scrubber = document.getElementById('ctrl-scrubber');
  const progress = document.getElementById('ctrl-progress');
  const fullscreenBtn = document.getElementById('ctrl-fullscreen');
  const closeBtn = document.getElementById('close-player');
  const wrapper = document.querySelector('.custom-player-wrapper');

  /**
   * Initializes YouTube IFrame API
   */
  function initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      isApiReady = true;
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      isApiReady = true;
    };
  }

  /**
   * Formats seconds into MM:SS format
   */
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null) return '00:00';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Shows controls temporarily while mouse moves
   */
  function showControlsTemp() {
    const overlay = document.getElementById('controls-overlay');
    if (!overlay) return;

    overlay.classList.add('visible');
    if (wrapper) wrapper.style.cursor = 'default';

    if (hideControlsTimer) clearTimeout(hideControlsTimer);

    hideControlsTimer = setTimeout(() => {
      if (isPlaying) {
        overlay.classList.remove('visible');
        if (wrapper) wrapper.style.cursor = 'none';
      }
    }, 2500);
  }

  function handleMouseLeaveWrapper() {
    const overlay = document.getElementById('controls-overlay');
    if (isPlaying && overlay) {
      if (hideControlsTimer) clearTimeout(hideControlsTimer);
      overlay.classList.remove('visible');
      if (wrapper) wrapper.style.cursor = 'default';
    }
  }

  /**
   * Opens video modal and starts playback at maximum quality (vq: 'highres')
   */
  function openPlayer(video) {
    currentVideoId = video.youtubeId;
    titleEl.textContent = video.title;
    subtitleEl.textContent = video.subtitle;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
      ytPlayer.loadVideoById({
        videoId: video.youtubeId,
        suggestedQuality: 'highres'
      });
    } else {
      createPlayerInstance(video.youtubeId);
    }

    attachControlsEventListeners();
    showControlsTemp();
  }

  /**
   * Spawns YT.Player instance configured for max resolution
   */
  function createPlayerInstance(youtubeId) {
    playerContainer.innerHTML = '<div id="yt-player-target"></div>';
    
    if (!window.YT || !window.YT.Player) {
      setTimeout(() => createPlayerInstance(youtubeId), 200);
      return;
    }

    ytPlayer = new window.YT.Player('yt-player-target', {
      videoId: youtubeId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        cc_lang_pref: '',
        fs: 0,
        playsinline: 1,
        vq: 'highres'
      },
      events: {
        onReady: (event) => {
          disableCaptions(event.target);
          if (typeof event.target.setPlaybackQuality === 'function') {
            event.target.setPlaybackQuality('highres');
          }
          event.target.playVideo();
          startProgressLoop();
          showControlsTemp();
        },
        onStateChange: (event) => {
          const overlay = document.getElementById('controls-overlay');

          if (event.data === window.YT.PlayerState.PLAYING) {
            isPlaying = true;
            if (wrapper) wrapper.classList.remove('paused');
            disableCaptions(event.target);
            updatePlayPauseIcon(true);

            if (typeof event.target.setPlaybackQuality === 'function') {
              event.target.setPlaybackQuality('highres');
            }

            showControlsTemp();
            startProgressLoop();
          } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
            isPlaying = false;
            if (wrapper) {
              wrapper.classList.add('paused');
              wrapper.style.cursor = 'default';
            }
            if (overlay) overlay.classList.add('visible');
            updatePlayPauseIcon(false);
            stopProgressLoop();
          }
        }
      }
    });
  }

  /**
   * Helper to permanently disable YouTube captions / subtitles module
   */
  function disableCaptions(target) {
    if (!target) return;
    try {
      if (typeof target.unloadModule === 'function') {
        target.unloadModule('captions');
        target.unloadModule('cc');
      }
      if (typeof target.setOption === 'function') {
        target.setOption('captions', 'track', {});
        target.setOption('cc', 'track', {});
      }
    } catch (e) {
      // Silent catch
    }
  }

  /**
   * Play / Pause Icon Update
   */
  function updatePlayPauseIcon(playing) {
    if (!playPauseBtn) return;
    if (playing) {
      playPauseBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>`;
    } else {
      playPauseBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>`;
    }
  }

  /**
   * Updates scrubber progress and time display
   */
  function startProgressLoop() {
    stopProgressLoop();
    progressInterval = setInterval(() => {
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        const currentTime = ytPlayer.getCurrentTime() || 0;
        const duration = ytPlayer.getDuration() || 0;
        if (duration > 0) {
          const pct = (currentTime / duration) * 100;
          progress.style.width = `${pct}%`;
          timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        }
      }
    }, 250);
  }

  function stopProgressLoop() {
    if (progressInterval) clearInterval(progressInterval);
  }

  function togglePlay() {
    if (!ytPlayer) return;
    if (isPlaying) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  }

  function toggleMute() {
    if (!ytPlayer) return;
    if (isMuted) {
      ytPlayer.unMute();
      isMuted = false;
      muteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>`;
      volumeSlider.value = ytPlayer.getVolume() || 80;
    } else {
      ytPlayer.mute();
      isMuted = true;
      muteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>`;
      volumeSlider.value = 0;
    }
  }

  function handleScrub(e) {
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const rect = scrubber.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const duration = ytPlayer.getDuration();
    if (duration > 0) {
      const seekTime = (clickX / width) * duration;
      ytPlayer.seekTo(seekTime, true);
      progress.style.width = `${(clickX / width) * 100}%`;
    }
  }

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  function enablePseudoFullscreen() {
    if (wrapper) wrapper.classList.add('mobile-pseudo-fullscreen');
    if (modal) modal.classList.add('mobile-pseudo-fullscreen');
    document.body.style.overflow = 'hidden';
  }

  function disablePseudoFullscreen() {
    if (wrapper) wrapper.classList.remove('mobile-pseudo-fullscreen');
    if (modal) modal.classList.remove('mobile-pseudo-fullscreen');
    document.body.style.overflow = '';
  }

  function toggleFullscreen(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    const isFullscreen = document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         (wrapper && wrapper.classList.contains('mobile-pseudo-fullscreen'));

    if (!isFullscreen) {
      if (isMobileDevice()) {
        enablePseudoFullscreen();
      } else {
        if (wrapper && wrapper.requestFullscreen) {
          wrapper.requestFullscreen().catch(() => enablePseudoFullscreen());
        } else if (wrapper && wrapper.webkitRequestFullscreen) {
          wrapper.webkitRequestFullscreen();
        } else {
          enablePseudoFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      disablePseudoFullscreen();
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) disablePseudoFullscreen();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement) disablePseudoFullscreen();
  });

  function closePlayer() {
    stopProgressLoop();
    disablePseudoFullscreen();
    if (hideControlsTimer) clearTimeout(hideControlsTimer);
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
      ytPlayer.stopVideo();
    }
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function attachControlsEventListeners() {
    if (playPauseBtn) playPauseBtn.onclick = togglePlay;
    if (muteBtn) muteBtn.onclick = toggleMute;
    if (closeBtn) closeBtn.onclick = closePlayer;

    if (fullscreenBtn) {
      fullscreenBtn.onclick = (e) => toggleFullscreen(e);
      fullscreenBtn.ontouchend = (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        toggleFullscreen(e);
      };
    }

    if (wrapper) {
      wrapper.onmousemove = showControlsTemp;
      wrapper.onmouseenter = showControlsTemp;
      wrapper.onmouseleave = handleMouseLeaveWrapper;
      wrapper.ontouchstart = () => showControlsTemp();
    }

    if (scrubber) {
      scrubber.onclick = handleScrub;
    }

    if (volumeSlider) {
      volumeSlider.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
          ytPlayer.setVolume(val);
          if (val === 0) {
            isMuted = true;
            ytPlayer.mute();
          } else {
            isMuted = false;
            ytPlayer.unMute();
          }
        }
      };
    }

    // Keyboard shortcuts
    window.onkeydown = (e) => {
      if (!modal.classList.contains('active')) return;
      showControlsTemp();
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        closePlayer();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      }
    };
  }

  return {
    initYouTubeAPI,
    openPlayer,
    closePlayer
  };
})();
