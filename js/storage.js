/**
 * NOVEL - Storage Engine & Cloud Realtime Synchronizer
 * Manages video portfolio data, YouTube URL parsing, tag extraction, custom Sobre image,
 * LocalStorage persistence, and Real-Time Multi-Device Cloud Synchronization.
 */

const StorageEngine = (() => {
  const STORAGE_VIDEOS_KEY = 'novel_portfolio_videos_v1';
  const STORAGE_ABOUT_KEY = 'novel_about_image_v1';
  const STORAGE_CLIENTS_KEY = 'novel_clients_list_v1';
  const STORAGE_PROJECTS_KEY = 'novel_projects_list_v1';
  const STORAGE_PROPOSALS_KEY = 'novel_proposals_v1';
  const CLOUD_ENDPOINT = 'https://jsonblob.com/api/jsonBlob/019f954d-319b-742c-8943-5f73c3b107a8';

  const DEFAULT_ABOUT_IMG = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80';

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
   * Retrieves videos list from LocalStorage or returns default
   */
  function getVideos() {
    try {
      const stored = localStorage.getItem(STORAGE_VIDEOS_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_VIDEOS_KEY, JSON.stringify(DEFAULT_VIDEOS));
        return DEFAULT_VIDEOS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error reading videos storage:', e);
      return DEFAULT_VIDEOS;
    }
  }

  /**
   * Retrieves custom Sobre image URL or returns default
   */
  function getAboutImage() {
    try {
      const stored = localStorage.getItem(STORAGE_ABOUT_KEY);
      return stored || DEFAULT_ABOUT_IMG;
    } catch (e) {
      return DEFAULT_ABOUT_IMG;
    }
  }

  /**
   * Retrieves clients list
   */
  function getClients() {
    try {
      const stored = localStorage.getItem(STORAGE_CLIENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Adds a new client name to storage if not already present
   */
  function saveClient(clientName) {
    if (!clientName || !clientName.trim()) return;
    const cleanName = SecurityEngine.sanitizeInput(clientName.trim());
    const clients = getClients();
    if (!clients.includes(cleanName)) {
      clients.push(cleanName);
      clients.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(clients));
      saveState();
    }
  }

  /**
   * Retrieves projects list
   */
  function getProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Adds a new project name to storage if not already present
   */
  function saveProject(projectName) {
    if (!projectName || !projectName.trim()) return;
    const cleanName = SecurityEngine.sanitizeInput(projectName.trim());
    const projects = getProjects();
    if (!projects.includes(cleanName)) {
      projects.push(cleanName);
      projects.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      saveState();
    }
  }

  /**
   * Retrieves proposals map
   */
  function getProposals() {
    try {
      const stored = localStorage.getItem(STORAGE_PROPOSALS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Gets a specific proposal by slug (e.g. "cliente-slug/projeto-slug")
   */
  function getProposalBySlug(slug) {
    if (!slug) return null;
    const proposals = getProposals();
    // Normalize slug search
    const normalizedKey = slug.toLowerCase().trim().replace(/^\/+|\/+$/g, '');
    return proposals[normalizedKey] || null;
  }

  /**
   * Saves or updates a proposal object by slug
   */
  function saveProposal(proposalData) {
    if (!proposalData || !proposalData.slug) return;
    const proposals = getProposals();
    const normalizedKey = proposalData.slug.toLowerCase().trim().replace(/^\/+|\/+$/g, '');
    proposals[normalizedKey] = {
      ...proposalData,
      updatedAt: Date.now()
    };
    localStorage.setItem(STORAGE_PROPOSALS_KEY, JSON.stringify(proposals));

    // Also auto-save client and project name
    if (proposalData.client) saveClient(proposalData.client);
    if (proposalData.project) saveProject(proposalData.project);

    saveState();
  }

  /**
   * Saves updated videos, about image, clients, projects, & proposals to LocalStorage AND syncs to Cloud
   */
  function saveState(videos = null, aboutImage = null) {
    const currentVideos = videos || getVideos();
    const currentAbout = aboutImage || getAboutImage();
    const currentClients = getClients();
    const currentProjects = getProjects();
    const currentProposals = getProposals();

    try {
      localStorage.setItem(STORAGE_VIDEOS_KEY, JSON.stringify(currentVideos));
      localStorage.setItem(STORAGE_ABOUT_KEY, currentAbout);
      localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(currentClients));
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(currentProjects));
      localStorage.setItem(STORAGE_PROPOSALS_KEY, JSON.stringify(currentProposals));
    } catch (e) {
      console.error('Error writing to local storage:', e);
    }

    syncToCloud(currentVideos, currentAbout, currentClients, currentProjects, currentProposals);
  }

  /**
   * Syncs state to Cloud JSON endpoint
   */
  async function syncToCloud(videos, aboutImage, clients = null, projects = null, proposals = null) {
    try {
      const payload = {
        videos: videos || getVideos(),
        aboutImage: aboutImage || getAboutImage(),
        clients: clients || getClients(),
        projects: projects || getProjects(),
        proposals: proposals || getProposals(),
        updatedAt: Date.now()
      };

      await fetch(CLOUD_ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Cloud sync fallback to local:', e);
    }
  }

  /**
   * Fetches state from Cloud endpoint and syncs local storage + triggers UI update
   */
  async function fetchCloudState() {
    try {
      const res = await fetch(CLOUD_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) return;

      const cloudData = await res.json();
      let cloudVideos = null;
      let cloudAbout = null;
      let cloudClients = null;
      let cloudProjects = null;
      let cloudProposals = null;

      if (Array.isArray(cloudData)) {
        cloudVideos = cloudData;
      } else if (cloudData && typeof cloudData === 'object') {
        if (Array.isArray(cloudData.videos)) cloudVideos = cloudData.videos;
        if (cloudData.aboutImage) cloudAbout = cloudData.aboutImage;
        if (Array.isArray(cloudData.clients)) cloudClients = cloudData.clients;
        if (Array.isArray(cloudData.projects)) cloudProjects = cloudData.projects;
        if (cloudData.proposals && typeof cloudData.proposals === 'object') cloudProposals = cloudData.proposals;
      }

      let stateChanged = false;

      if (cloudVideos && cloudVideos.length > 0) {
        const localVideosStr = localStorage.getItem(STORAGE_VIDEOS_KEY);
        const cloudVideosStr = JSON.stringify(cloudVideos);
        if (localVideosStr !== cloudVideosStr) {
          localStorage.setItem(STORAGE_VIDEOS_KEY, cloudVideosStr);
          stateChanged = true;
        }
      }

      if (cloudAbout) {
        const localAbout = localStorage.getItem(STORAGE_ABOUT_KEY);
        if (localAbout !== cloudAbout) {
          localStorage.setItem(STORAGE_ABOUT_KEY, cloudAbout);
          stateChanged = true;
        }
      }

      if (cloudClients) {
        const localClientsStr = localStorage.getItem(STORAGE_CLIENTS_KEY);
        const cloudClientsStr = JSON.stringify(cloudClients);
        if (localClientsStr !== cloudClientsStr) {
          localStorage.setItem(STORAGE_CLIENTS_KEY, cloudClientsStr);
          stateChanged = true;
        }
      }

      if (cloudProjects) {
        const localProjectsStr = localStorage.getItem(STORAGE_PROJECTS_KEY);
        const cloudProjectsStr = JSON.stringify(cloudProjects);
        if (localProjectsStr !== cloudProjectsStr) {
          localStorage.setItem(STORAGE_PROJECTS_KEY, cloudProjectsStr);
          stateChanged = true;
        }
      }

      if (cloudProposals) {
        const localProposalsStr = localStorage.getItem(STORAGE_PROPOSALS_KEY);
        const cloudProposalsStr = JSON.stringify(cloudProposals);
        if (localProposalsStr !== cloudProposalsStr) {
          localStorage.setItem(STORAGE_PROPOSALS_KEY, cloudProposalsStr);
          stateChanged = true;
        }
      }

      if (stateChanged) {
        window.dispatchEvent(new CustomEvent('novel_state_updated'));
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
    saveState(videos, null);
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

    saveState(videos, null);
    return videos[index];
  }

  /**
   * Removes video by ID
   */
  function deleteVideo(id) {
    let videos = getVideos();
    videos = videos.filter(v => v.id !== id);
    saveState(videos, null);
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
    saveState(videos, null);
    return videos;
  }

  /**
   * Saves new custom Sobre image DataURL & syncs to cloud
   */
  function saveAboutImage(dataUrl) {
    saveState(null, dataUrl);
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
    getClients,
    saveClient,
    getProjects,
    saveProject,
    getProposals,
    getProposalBySlug,
    saveProposal,
    fetchCloudState
  };
})();
