/**
 * NOVEL - Main Application Controller
 * Orchestrates Tab navigation, Video Grid rendering, Dynamic SEO tag filtering,
 * Admin Authentication flow, Admin Dropdown Menu, Video CRUD, Manage Panel, and Contact Form.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Custom YouTube Player API
  CustomPlayer.initYouTubeAPI();

  // App State Variables
  let currentActiveTag = 'all';
  let currentSearchQuery = '';
  let editingVideoId = null;

  // DOM Elements - Navigation & Tabs
  const navLinks = document.querySelectorAll('.nav-link, .footer-links a');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const logoBtn = document.getElementById('logo-btn');

  // DOM Elements - Portfolio & Search
  const videoGrid = document.getElementById('video-grid');
  const tagFiltersContainer = document.getElementById('tag-filters-container');
  const searchInput = document.getElementById('search-input');

  // DOM Elements - Admin Dropdown & Modals
  const headerAdminBtn = document.getElementById('header-admin-btn');
  const adminBtnText = document.getElementById('admin-btn-text');
  const adminDropdownMenu = document.getElementById('admin-dropdown-menu');
  const adminItemUpload = document.getElementById('admin-item-upload');
  const adminItemManage = document.getElementById('admin-item-manage');
  const adminItemLogout = document.getElementById('admin-item-logout');

  const loginModal = document.getElementById('login-modal');
  const closeLoginBtn = document.getElementById('close-login-modal');
  const loginForm = document.getElementById('login-form');
  const loginAlert = document.getElementById('login-alert');

  const adminVideoModal = document.getElementById('admin-video-modal');
  const closeAdminBtn = document.getElementById('close-admin-modal');
  const adminVideoForm = document.getElementById('admin-video-form');
  const adminModalTitle = document.getElementById('admin-modal-title');
  const adminVideoAlert = document.getElementById('admin-video-alert');
  const adminVideoIdInput = document.getElementById('admin-video-id');
  const adminVideoUrlInput = document.getElementById('admin-video-url');
  const adminVideoThumbInput = document.getElementById('admin-video-thumb');
  const adminVideoTitleInput = document.getElementById('admin-video-title');
  const adminVideoSubtitleInput = document.getElementById('admin-video-subtitle');
  const adminVideoTagsInput = document.getElementById('admin-video-tags');
  const thumbPreviewBox = document.getElementById('thumb-preview-box');
  const thumbPreviewImg = document.getElementById('thumb-preview-img');

  // Manage Videos Modal
  const adminManageModal = document.getElementById('admin-manage-modal');
  const closeManageBtn = document.getElementById('close-manage-modal');
  const manageVideoListContainer = document.getElementById('manage-video-list-container');

  // DOM Elements - Sobre Nós Image Upload
  const aboutHeroImg = document.getElementById('about-hero-img');
  const btnChangeAboutImg = document.getElementById('btn-change-about-img');
  const aboutFileInput = document.getElementById('about-file-input');

  // DOM Elements - Contact Form
  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-status');

  // Initial Startup
  if (aboutHeroImg) {
    aboutHeroImg.src = StorageEngine.getAboutImage();
  }
  checkAdminSessionState();
  renderTagFilters();
  renderVideoGrid();

  // Cloud Realtime Multi-Device Sync
  StorageEngine.fetchCloudVideos();
  window.addEventListener('novel_videos_updated', () => {
    renderTagFilters();
    renderVideoGrid();
  });
  window.addEventListener('focus', () => StorageEngine.fetchCloudVideos());
  setInterval(() => StorageEngine.fetchCloudVideos(), 10000);

  /* ==========================================================================
     1. TAB NAVIGATION
     ========================================================================== */
  function switchTab(tabId) {
    navLinks.forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === `${tabId}-pane`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  if (logoBtn) {
    logoBtn.addEventListener('click', () => switchTab('portfolio'));
  }

  /* ==========================================================================
     2. PORTFOLIO GRID & SEO TAG FILTERING
     ========================================================================== */
  function renderTagFilters() {
    const tags = StorageEngine.getAllTags();
    tagFiltersContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn ${currentActiveTag === 'all' ? 'active' : ''}`;
    allBtn.setAttribute('data-tag', 'all');
    allBtn.textContent = 'Todos';
    allBtn.onclick = () => filterByTag('all');
    tagFiltersContainer.appendChild(allBtn);

    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = `filter-btn ${currentActiveTag === tag ? 'active' : ''}`;
      btn.setAttribute('data-tag', tag);
      btn.textContent = tag;
      btn.onclick = () => filterByTag(tag);
      tagFiltersContainer.appendChild(btn);
    });
  }

  function filterByTag(tag) {
    currentActiveTag = tag;
    
    const filterBtns = tagFiltersContainer.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      if (btn.getAttribute('data-tag') === tag) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateDynamicSeo(tag);
    renderVideoGrid();
  }

  function updateDynamicSeo(tag) {
    const seoTitle = document.getElementById('seo-title');
    const seoDesc = document.getElementById('seo-description');
    const seoKeywords = document.getElementById('seo-keywords');

    if (tag === 'all') {
      seoTitle.textContent = 'Novel | Produtora Audiovisual';
      seoDesc.setAttribute('content', 'Novel Produtora Audiovisual. Portfólio de filmes e campanhas comerciais.');
      seoKeywords.setAttribute('content', 'produtora audiovisual, cinema, comerciais, videoclipes, Novel');
    } else {
      seoTitle.textContent = `Novel | Filmes e Produções de ${tag}`;
      seoDesc.setAttribute('content', `Confira produções audiovisuais exclusivas da Novel na categoria ${tag}.`);
      seoKeywords.setAttribute('content', `${tag}, produtora audiovisual, filmes ${tag}, Novel, cinema`);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      renderVideoGrid();
    });
  }

  function renderVideoGrid() {
    const allVideos = StorageEngine.getVideos();
    const isAdmin = SecurityEngine.isAuthenticated();

    const filteredVideos = allVideos.filter(video => {
      const matchesTag = (currentActiveTag === 'all') || (Array.isArray(video.tags) && video.tags.includes(currentActiveTag));
      const matchesSearch = !currentSearchQuery || 
        video.title.toLowerCase().includes(currentSearchQuery) ||
        video.subtitle.toLowerCase().includes(currentSearchQuery) ||
        (Array.isArray(video.tags) && video.tags.some(t => t.toLowerCase().includes(currentSearchQuery)));
      
      return matchesTag && matchesSearch;
    });

    if (filteredVideos.length === 0) {
      videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h3>Nenhum vídeo encontrado</h3>
          <p>Tente ajustar sua busca ou selecionar outra tag.</p>
        </div>`;
      return;
    }

    videoGrid.innerHTML = '';

    filteredVideos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.setAttribute('data-id', video.id);

      const tagsHtml = (video.tags || [])
        .map(t => `<span class="tag-badge">${t}</span>`)
        .join('');

      const adminActionsHtml = isAdmin ? `
        <div class="card-admin-actions">
          <button class="btn-card-action btn-edit" title="Editar Vídeo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-card-action btn-delete" title="Excluir Vídeo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>` : '';

      card.innerHTML = `
        ${adminActionsHtml}
        <div class="thumb-wrapper">
          <img src="${video.thumbnailUrl}" alt="${video.title}" loading="lazy">
          <div class="play-overlay">
            <div class="play-btn-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title">${video.title}</h3>
          <p class="card-subtitle">${video.subtitle}</p>
          <div class="card-tags">
            ${tagsHtml}
          </div>
        </div>
      `;

      const thumbWrapper = card.querySelector('.thumb-wrapper');
      thumbWrapper.onclick = () => CustomPlayer.openPlayer(video);

      if (isAdmin) {
        const editBtn = card.querySelector('.btn-edit');
        const deleteBtn = card.querySelector('.btn-delete');

        if (editBtn) {
          editBtn.onclick = (e) => {
            e.stopPropagation();
            openAdminVideoModal(video);
          };
        }

        if (deleteBtn) {
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Tem certeza que deseja excluir "${video.title}"?`)) {
              StorageEngine.deleteVideo(video.id);
              renderTagFilters();
              renderVideoGrid();
            }
          };
        }
      }

      videoGrid.appendChild(card);
    });
  }

  /* ==========================================================================
     3. ADMIN AUTHENTICATION FLOW & DROPDOWN MENU
     ========================================================================== */
  function checkAdminSessionState() {
    const isAuthenticated = SecurityEngine.isAuthenticated();

    if (isAuthenticated) {
      document.body.classList.add('admin-active');
      adminBtnText.style.display = 'inline';
      adminBtnText.textContent = 'Admin ▾';

      headerAdminBtn.onclick = (e) => {
        e.stopPropagation();
        adminDropdownMenu.classList.toggle('active');
      };
    } else {
      document.body.classList.remove('admin-active');
      adminBtnText.style.display = 'none';
      adminBtnText.textContent = '';
      if (adminDropdownMenu) adminDropdownMenu.classList.remove('active');
      headerAdminBtn.onclick = () => openLoginModal();
    }
  }

  // Admin Dropdown Options
  if (adminItemUpload) {
    adminItemUpload.onclick = () => {
      if (adminDropdownMenu) adminDropdownMenu.classList.remove('active');
      openAdminVideoModal();
    };
  }

  if (adminItemManage) {
    adminItemManage.onclick = () => {
      if (adminDropdownMenu) adminDropdownMenu.classList.remove('active');
      openAdminManageModal();
    };
  }

  if (btnChangeAboutImg) {
    btnChangeAboutImg.onclick = () => triggerAboutImageUpload();
  }

  function triggerAboutImageUpload() {
    if (aboutFileInput) {
      aboutFileInput.click();
    }
  }

  if (aboutFileInput) {
    aboutFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          StorageEngine.saveAboutImage(dataUrl);
          if (aboutHeroImg) {
            aboutHeroImg.src = dataUrl;
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }

  if (adminItemLogout) {
    adminItemLogout.onclick = () => {
      if (adminDropdownMenu) adminDropdownMenu.classList.remove('active');
      SecurityEngine.logout();
      checkAdminSessionState();
      renderVideoGrid();
    };
  }

  // Close Admin Dropdown on click outside
  document.addEventListener('click', (e) => {
    if (adminDropdownMenu && !adminDropdownMenu.contains(e.target) && e.target !== headerAdminBtn && !headerAdminBtn.contains(e.target)) {
      adminDropdownMenu.classList.remove('active');
    }
  });

  function openLoginModal() {
    loginAlert.style.display = 'none';
    loginForm.reset();
    loginModal.classList.add('active');
  }

  function closeLoginModal() {
    loginModal.classList.remove('active');
  }

  if (closeLoginBtn) closeLoginBtn.onclick = closeLoginModal;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('login-user').value;
    const passVal = document.getElementById('login-pass').value;

    loginAlert.className = 'alert-message';
    loginAlert.style.display = 'none';

    const result = await SecurityEngine.authenticate(userVal, passVal);

    if (result.success) {
      closeLoginModal();
      checkAdminSessionState();
      renderTagFilters();
      renderVideoGrid();
    } else {
      loginAlert.className = 'alert-message error';
      loginAlert.textContent = result.message;
      loginAlert.style.display = 'block';
    }
  });

  /* ==========================================================================
     4. ADMIN MANAGE VIDEOS PANEL
     ========================================================================== */
  function openAdminManageModal() {
    renderManageVideoList();
    adminManageModal.classList.add('active');
  }

  function closeAdminManageModal() {
    adminManageModal.classList.remove('active');
  }

  if (closeManageBtn) closeManageBtn.onclick = closeAdminManageModal;

  function renderManageVideoList() {
    const videos = StorageEngine.getVideos();
    manageVideoListContainer.innerHTML = '';

    if (videos.length === 0) {
      manageVideoListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum vídeo cadastrado.</p>';
      return;
    }

    videos.forEach((video, index) => {
      const item = document.createElement('div');
      item.className = 'manage-video-item';
      item.innerHTML = `
        <div class="manage-reorder-btns">
          <button class="btn-reorder btn-move-up" title="Mover para cima no grid" ${index === 0 ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </button>
          <button class="btn-reorder btn-move-down" title="Mover para baixo no grid" ${index === videos.length - 1 ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>

        <img src="${video.thumbnailUrl}" alt="${video.title}" class="manage-video-thumb">

        <div class="manage-video-details">
          <h5>${video.title}</h5>
          <p>${video.subtitle}</p>
        </div>

        <div class="manage-video-actions">
          <button class="btn-card-action btn-manage-edit" title="Editar Vídeo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-card-action btn-delete btn-manage-delete" title="Excluir Vídeo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      const moveUpBtn = item.querySelector('.btn-move-up');
      const moveDownBtn = item.querySelector('.btn-move-down');
      const editBtn = item.querySelector('.btn-manage-edit');
      const deleteBtn = item.querySelector('.btn-manage-delete');

      moveUpBtn.onclick = () => {
        if (index > 0) {
          StorageEngine.reorderVideos(index, index - 1);
          renderManageVideoList();
          renderVideoGrid();
        }
      };

      moveDownBtn.onclick = () => {
        if (index < videos.length - 1) {
          StorageEngine.reorderVideos(index, index + 1);
          renderManageVideoList();
          renderVideoGrid();
        }
      };

      editBtn.onclick = () => {
        closeAdminManageModal();
        openAdminVideoModal(video);
      };

      deleteBtn.onclick = () => {
        if (confirm(`Tem certeza que deseja excluir "${video.title}"?`)) {
          StorageEngine.deleteVideo(video.id);
          renderManageVideoList();
          renderTagFilters();
          renderVideoGrid();
        }
      };

      manageVideoListContainer.appendChild(item);
    });
  }

  /* ==========================================================================
     5. ADMIN VIDEO UPLOAD / EDIT MODAL & FORM
     ========================================================================== */
  function openAdminVideoModal(videoToEdit = null) {
    adminVideoAlert.style.display = 'none';
    adminVideoForm.reset();
    thumbPreviewBox.classList.remove('has-image');
    thumbPreviewImg.src = '';

    if (videoToEdit) {
      editingVideoId = videoToEdit.id;
      adminModalTitle.innerHTML = 'Editar <span>Vídeo</span>';
      adminVideoIdInput.value = videoToEdit.id;
      adminVideoUrlInput.value = videoToEdit.youtubeUrl;
      adminVideoThumbInput.value = videoToEdit.thumbnailUrl;
      adminVideoTitleInput.value = videoToEdit.title;
      adminVideoSubtitleInput.value = videoToEdit.subtitle;
      adminVideoTagsInput.value = (videoToEdit.tags || []).join(', ');

      if (videoToEdit.thumbnailUrl) {
        thumbPreviewImg.src = videoToEdit.thumbnailUrl;
        thumbPreviewBox.classList.add('has-image');
      }
    } else {
      editingVideoId = null;
      adminModalTitle.innerHTML = 'Upload de <span>Vídeo</span>';
      adminVideoIdInput.value = '';
    }

    adminVideoModal.classList.add('active');
  }

  function closeAdminVideoModal() {
    adminVideoModal.classList.remove('active');
  }

  if (closeAdminBtn) closeAdminBtn.onclick = closeAdminVideoModal;

  function updateThumbnailPreview() {
    const url = adminVideoUrlInput.value;
    const customThumb = adminVideoThumbInput.value;

    if (customThumb && customThumb.trim() !== '') {
      thumbPreviewImg.src = customThumb;
      thumbPreviewBox.classList.add('has-image');
      return;
    }

    const youtubeId = StorageEngine.extractYouTubeId(url);
    if (youtubeId) {
      const autoThumb = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      thumbPreviewImg.src = autoThumb;
      thumbPreviewBox.classList.add('has-image');
    } else {
      thumbPreviewBox.classList.remove('has-image');
    }
  }

  adminVideoUrlInput.addEventListener('input', updateThumbnailPreview);
  adminVideoThumbInput.addEventListener('input', updateThumbnailPreview);

  adminVideoForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const videoData = {
      youtubeUrl: adminVideoUrlInput.value,
      thumbnailUrl: adminVideoThumbInput.value,
      title: adminVideoTitleInput.value,
      subtitle: adminVideoSubtitleInput.value,
      tags: adminVideoTagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0)
    };

    try {
      if (editingVideoId) {
        StorageEngine.updateVideo(editingVideoId, videoData);
      } else {
        StorageEngine.addVideo(videoData);
      }

      closeAdminVideoModal();
      renderTagFilters();
      renderVideoGrid();
    } catch (err) {
      adminVideoAlert.className = 'alert-message error';
      adminVideoAlert.textContent = err.message || 'Erro ao salvar o vídeo.';
      adminVideoAlert.style.display = 'block';
    }
  });

  /* ==========================================================================
     6. CONTACT FORM
     ========================================================================== */
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameVal = document.getElementById('contact-name').value.trim();
      const emailVal = document.getElementById('contact-email').value.trim();
      const projectVal = document.getElementById('contact-type').value;
      const dateVal = document.getElementById('contact-date').value || 'Não especificado';
      const messageVal = document.getElementById('contact-message').value.trim();

      contactStatus.className = 'alert-message';
      contactStatus.textContent = 'Enviando sua mensagem para pedido@novel.art.br...';
      contactStatus.style.display = 'block';

      try {
        const response = await fetch('https://formsubmit.co/ajax/pedido@novel.art.br', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            _subject: `Novo Contato do Site: ${nameVal} - ${projectVal}`,
            Nome: nameVal,
            Email: emailVal,
            Projeto: projectVal,
            'Prazo Sugerido': dateVal,
            Mensagem: messageVal
          })
        });

        if (response.ok) {
          contactStatus.className = 'alert-message success';
          contactStatus.textContent = 'Mensagem enviada com sucesso para pedido@novel.art.br! Responderemos em breve.';
          contactForm.reset();
        } else {
          throw new Error('Falha no envio automatizado');
        }
      } catch (err) {
        const mailtoUrl = `mailto:pedido@novel.art.br?subject=${encodeURIComponent('Projeto Audiovisual - ' + nameVal)}&body=${encodeURIComponent('Nome: ' + nameVal + '\nE-mail: ' + emailVal + '\nProjeto: ' + projectVal + '\nPrazo Sugerido: ' + dateVal + '\n\nMensagem:\n' + messageVal)}`;
        window.location.href = mailtoUrl;

        contactStatus.className = 'alert-message success';
        contactStatus.textContent = 'Mensagem direcionada para pedido@novel.art.br. Caso seu cliente de e-mail não tenha aberto, envie diretamente para pedido@novel.art.br.';
        contactForm.reset();
      }

      setTimeout(() => {
        contactStatus.style.display = 'none';
      }, 7000);
    });
  }
});
