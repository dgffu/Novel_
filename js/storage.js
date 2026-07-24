/**
 * NOVEL - Storage Engine & Cloud Realtime Synchronizer
 * Manages video data, YouTube URL parsing, tag extraction, LocalStorage persistence,
 * and Real-Time Online Cloud Synchronization across all devices.
 */

const StorageEngine = (() => {
  const STORAGE_KEY = 'novel_portfolio_videos_v1';
  const CLOUD_ENDPOINT = 'https://jsonblob.com/api/jsonBlob/019f954d-319b-742c-8943-5f73c3b107a8';

  // Default initial videos showcasing Novel's portfolio
  const DEFAULT_VIDEOS = [
    {
      id: 'v_101',
      youtubeUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      youtubeId: 'LXb3EKWsInQ',
      thumbnailUrl: 'https://img.youtube.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
      title: 'Cinematic Reel 2026',
      subtitle: 'Direção de Fotografia & Color Grading de Alta Performance',
      tags: ['Showreel', 'Cinema', 'Color Grading', 'Publicidade']
    },
    {
      id: 'v_102',
      youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      youtubeId: 'aqz-KE-bpKQ',
      thumbnailUrl: 'https://img.youtube.com/vi/aqz-KE-bpKQ/maxresdefault.jpg',
      title: 'Vozes da Floresta',
      subtitle: 'Documentário autoral gravado em resolução 6K anamórfica',
      tags: ['Documentário', 'Anamórfico', 'Direção', 'Autoral']
    },
    {
      id: 'v_103',
      youtubeUrl: 'https://www.youtube.com/watch?v=d9MyW72ELq0',
      youtubeId: 'd9MyW72ELq0',
      thumbnailUrl: 'https://img.youtube.com/vi/d9MyW72ELq0/maxresdefault.jpg',
      title: 'Campanha Porsche Experience',
      subtitle: 'Comercial de alta velocidade produzido para mercado automotivo',
      tags: ['Comercial', 'Automotivo', 'High-Speed', 'VFX']
    },
    {
      id: 'v_104',
      youtubeUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      youtubeId: 'kJQP7kiw5Fk',
      thumbnailUrl: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
      title: 'Sombras do Amanhã',
      subtitle: 'Videoclipe musical premiado em festivais internacionais',
      tags: ['Videoclipe', 'Música', 'Direção de Arte', 'Narrativo']
    },
    {
      id: 'v_105',
      youtubeUrl: 'https://www.youtube.com/watch?v=e-ORhEE9VVg',
      youtubeId: 'e-ORhEE9VVg',
      thumbnailUrl: 'https://img.youtube.com/vi/e-ORhEE9VVg/maxresdefault.jpg',
      title: 'Urban Architectures',
      subtitle: 'Vídeo institucional conceito para grande grupo imobiliário',
      tags: ['Institucional', 'Arquitetura', 'Drone 4K', 'Design']
    },
    {
      id: 'v_106',
      youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      youtubeId: '9bZkp7q19f0',
      thumbnailUrl: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
      title: 'Sensações - Perfumaria Premium',
      subtitle: 'Fashion Film com estética minimalista e luz dramática',
      tags: ['Fashion Film', 'Moda', 'Estética', 'Iluminação']
    }
  ];

  /**
   * Helper to parse YouTube Video ID from any valid YouTube URL
   */
  function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  /**
   * Retrieves videos list from LocalStorage or sets initial defaults
   */
  function getVideos() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VIDEOS));
        return DEFAULT_VIDEOS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error reading storage:', e);
      return DEFAULT_VIDEOS;
    }
  }

  /**
   * Saves updated videos array to LocalStorage AND syncs to cloud
   */
  function saveVideos(videos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
      syncToCloud(videos);
    } catch (e) {
      console.error('Error writing to storage:', e);
    }
  }

  /**
   * Syncs videos array to Cloud JSON endpoint for real-time multi-device sync
   */
  async function syncToCloud(videos) {
    try {
      await fetch(CLOUD_ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(videos)
      });
    } catch (e) {
      console.warn('Cloud sync offline fallback to local:', e);
    }
  }

  /**
   * Fetches latest videos from online Cloud endpoint and notifies app if changed
   */
  async function fetchCloudVideos() {
    try {
      const res = await fetch(CLOUD_ENDPOINT, { cache: 'no-store' });
      if (res.ok) {
        const cloudVideos = await res.json();
        if (Array.isArray(cloudVideos) && cloudVideos.length > 0) {
          const currentLocalStr = localStorage.getItem(STORAGE_KEY);
          const cloudStr = JSON.stringify(cloudVideos);

          if (currentLocalStr !== cloudStr) {
            localStorage.setItem(STORAGE_KEY, cloudStr);
            window.dispatchEvent(new CustomEvent('novel_videos_updated', { detail: cloudVideos }));
          }
        }
      }
    } catch (e) {
      // Silent catch
    }
  }

  /**
   * Adds a new video object to portfolio
   */
  function addVideo(videoData) {
    const videos = getVideos();
    const youtubeId = extractYouTubeId(videoData.youtubeUrl);
    if (!youtubeId) {
      throw new Error('Link do YouTube inválido. Verifique a URL fornecida.');
    }

    const defaultThumb = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    
    const newVideo = {
      id: 'v_' + Date.now(),
      youtubeUrl: SecurityEngine.sanitizeInput(videoData.youtubeUrl),
      youtubeId: youtubeId,
      thumbnailUrl: videoData.thumbnailUrl && videoData.thumbnailUrl.trim() !== '' 
        ? SecurityEngine.sanitizeInput(videoData.thumbnailUrl)
        : defaultThumb,
      title: SecurityEngine.sanitizeInput(videoData.title),
      subtitle: SecurityEngine.sanitizeInput(videoData.subtitle),
      tags: videoData.tags.map(t => SecurityEngine.sanitizeInput(t)).filter(t => t.length > 0)
    };

    videos.unshift(newVideo);
    saveVideos(videos);
    return newVideo;
  }

  /**
   * Updates an existing video in portfolio
   */
  function updateVideo(id, videoData) {
    const videos = getVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Vídeo não encontrado.');

    const youtubeId = extractYouTubeId(videoData.youtubeUrl);
    if (!youtubeId) throw new Error('Link do YouTube inválido.');

    const defaultThumb = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

    videos[index] = {
      ...videos[index],
      youtubeUrl: SecurityEngine.sanitizeInput(videoData.youtubeUrl),
      youtubeId: youtubeId,
      thumbnailUrl: videoData.thumbnailUrl && videoData.thumbnailUrl.trim() !== ''
        ? SecurityEngine.sanitizeInput(videoData.thumbnailUrl)
        : defaultThumb,
      title: SecurityEngine.sanitizeInput(videoData.title),
      subtitle: SecurityEngine.sanitizeInput(videoData.subtitle),
      tags: videoData.tags.map(t => SecurityEngine.sanitizeInput(t)).filter(t => t.length > 0)
    };

    saveVideos(videos);
    return videos[index];
  }

  /**
   * Removes video by ID
   */
  function deleteVideo(id) {
    let videos = getVideos();
    videos = videos.filter(v => v.id !== id);
    saveVideos(videos);
  }

  /**
   * Reorders video at fromIndex to toIndex in portfolio
   */
  function reorderVideos(fromIndex, toIndex) {
    const videos = getVideos();
    if (fromIndex < 0 || fromIndex >= videos.length || toIndex < 0 || toIndex >= videos.length) {
      return videos;
    }
    const [movedItem] = videos.splice(fromIndex, 1);
    videos.splice(toIndex, 0, movedItem);
    saveVideos(videos);
    return videos;
  }

  /**
   * Returns list of all unique SEO tags extracted from videos
   */
  function getAllTags() {
    const videos = getVideos();
    const tagSet = new Set();
    videos.forEach(v => {
      if (Array.isArray(v.tags)) {
        v.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }

  /**
   * Retrieves custom Sobre Nós image URL or returns default
   */
  const ABOUT_IMG_KEY = 'novel_about_image_v1';
  const DEFAULT_ABOUT_IMG = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80';

  function getAboutImage() {
    try {
      const stored = localStorage.getItem(ABOUT_IMG_KEY);
      return stored || DEFAULT_ABOUT_IMG;
    } catch (e) {
      return DEFAULT_ABOUT_IMG;
    }
  }

  function saveAboutImage(dataUrl) {
    try {
      localStorage.setItem(ABOUT_IMG_KEY, dataUrl);
    } catch (e) {
      console.error('Error saving about image:', e);
    }
  }

  return {
    getVideos,
    addVideo,
    updateVideo,
    deleteVideo,
    reorderVideos,
    getAllTags,
    extractYouTubeId,
    getAboutImage,
    saveAboutImage,
    fetchCloudVideos
  };
})();
