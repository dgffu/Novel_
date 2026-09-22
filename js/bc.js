/**
 * NOVEL - BUDGET CENTER (BC) CONTROLLER
 * Handles Routing, Authentication, Combobox Persistence, Dynamic Package Questionnaire,
 * Real-Time USD to BRL Currency Conversion, Proposal Auto-Expiration, and PDF Generation.
 */

document.addEventListener('DOMContentLoaded', () => {

  // State Variables
  let usdToBrlRate = 5.65; // Default fallback rate
  let packageCounter = 0;

  // DOM Elements
  const headerActionsContainer = document.getElementById('bc-header-actions');
  const globalAlert = document.getElementById('bc-global-alert');
  const loginView = document.getElementById('bc-login-view');
  const generatorView = document.getElementById('bc-generator-view');
  const proposalView = document.getElementById('bc-proposal-view');

  const loginForm = document.getElementById('bc-login-form');
  const userInput = document.getElementById('bc-user-input');
  const passInput = document.getElementById('bc-pass-input');

  const budgetForm = document.getElementById('bc-budget-form');
  const clientInput = document.getElementById('bc-client-input');
  const dateInput = document.getElementById('bc-date-input');
  const projectInput = document.getElementById('bc-project-input');
  const expirationInput = document.getElementById('bc-expiration-input');
  const clientsDatalist = document.getElementById('bc-clients-datalist');
  const projectsDatalist = document.getElementById('bc-projects-datalist');
  const packagesContainer = document.getElementById('bc-packages-container');
  const btnAddPackage = document.getElementById('bc-btn-add-package');
  const btnSaveDraft = document.getElementById('bc-btn-save-draft');

  // Exact Services List & Prices (Matching User Specification)
  const SERVICE_ITEMS = [
    { id: 'same_day', name: 'Same-Day / Realtime', price: 700, cls: 'svc-red' },
    { id: 'aftermovie', name: 'Aftermovie', price: 700, cls: 'svc-peach' },
    { id: 'institucional', name: 'Institucional', price: 700, cls: 'svc-grey' },
    { id: 'trailer', name: 'Trailer', price: 600, cls: 'svc-grey' },
    { id: 'mini_30s', name: 'Mini 30s', price: 180, cls: 'svc-pink' },
    { id: 'mini_1min', name: 'Mini 1min', price: 240, cls: 'svc-pink' },
    { id: 'mini_1m30', name: 'Mini 1m30', price: 330, cls: 'svc-pink' },
    { id: 'reels', name: 'Vários Reels', type: 'reels', cls: 'svc-pink' },
    { id: 'ensaio_pw', name: 'Ensaio/PW Teaser', price: 400, cls: 'svc-mint' },
    { id: 'love_story', name: 'Love Story', price: 600, cls: 'svc-mint' },
    { id: 'teaser_festa', name: 'Teaser Festa', price: 400, cls: 'svc-mint' },
    { id: 'short_7min', name: 'Short Film 7min', price: 700, cls: 'svc-gold' },
    { id: 'short_10min', name: 'Short Film 10m', price: 850, cls: 'svc-gold' },
    { id: 'short_15min', name: 'Short Film 15min', price: 940, cls: 'svc-gold' },
    { id: 'short_20min', name: 'Short Film 20min', price: 1200, cls: 'svc-gold' },
    { id: 'film_30min', name: 'Film 30min', price: 1600, cls: 'svc-gold' },
    { id: 'cerimonia', name: 'Cerimônia', price: 800, cls: 'svc-tan' },
    { id: 'motion', name: 'Motion Graphics', type: 'motion', cls: 'svc-blue' },
    { id: 'design_id', name: 'Design/ID', price: 700, cls: 'svc-blue' },
    { id: 'foto_evento', name: 'Foto Evento', price: 1200, cls: 'svc-grey' },
    { id: 'captacao_evento', name: 'Captação Evento', price: 1600, cls: 'svc-grey' },
    { id: 'foto_ensaio', name: 'Foto Ensaio', price: 800, cls: 'svc-grey' },
    { id: 'captacao_ensaio', name: 'Captação Ensaio', price: 900, cls: 'svc-grey' },
    { id: 'drone_evento', name: 'Drone Evento', price: 600, cls: 'svc-grey' },
    { id: 'drone_ensaio', name: 'Drone Ensaio', price: 400, cls: 'svc-grey' },
    { id: 'producao_completa', name: 'Produção Completa', price: 3890, cls: 'svc-purple' }
  ];

  function calculateReelsPrice(qty) {
    const q = Math.max(1, parseInt(qty) || 1);
    let total = 0;
    let label = '';
    if (q === 1) {
      total = 300;
      label = '1 Reel';
    } else if (q === 2) {
      total = 500;
      label = '2 Reels';
    } else if (q >= 10) {
      total = q * 160;
      label = `${q} Reels`;
    } else {
      total = q * 200;
      label = `${q} Reels`;
    }
    return { total, label, qty: q };
  }

  function calculateMotionPrice(mins) {
    const m = Math.max(1, parseInt(mins) || 1);
    let total = 0;
    let label = '';
    if (m === 1) {
      total = 400;
      label = 'Motion Graphics (1 min)';
    } else if (m === 2) {
      total = 600;
      label = 'Motion Graphics (2 min)';
    } else {
      total = m * 250;
      label = `Motion Graphics (${m} min)`;
    }
    return { total, label, mins: m };
  }

  /* ==========================================================================
     1. INITIALIZATION & ROUTING
     ========================================================================== */
  init();

  async function init() {
    // Default dates to today & 15 days ahead
    if (dateInput) dateInput.value = formatDateForInput(new Date());
    if (expirationInput) {
      const defaultExp = new Date();
      defaultExp.setDate(defaultExp.getDate() + 15);
      expirationInput.value = formatDateForInput(defaultExp);
    }

    // Fetch Live Exchange Rate
    fetchUsdExchangeRate();

    // Check Cloud Updates
    StorageEngine.fetchCloudState();

    // Route Handler
    route();

    window.addEventListener('novel_state_updated', () => {
      populateDatalists();
    });
  }

  function route() {
    const routeInfo = parseRoute();

    if (routeInfo.isProposalRoute) {
      // Public Proposal View for Client
      renderHeaderActions(false);
      hideAllViews();
      renderProposalPage(routeInfo.clientSlug, routeInfo.projectSlug);
    } else {
      // Budget Center Admin View
      if (!SecurityEngine.isAuthenticated()) {
        renderHeaderActions(false);
        hideAllViews();
        loginView.style.display = 'block';
      } else {
        renderHeaderActions(true);
        hideAllViews();
        generatorView.style.display = 'block';
        populateDatalists();
        if (packagesContainer.children.length === 0) {
          addPackageCard(); // Adds initial "Pacote 01"
        }
      }
    }
  }

  function parseRoute() {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    const urlParams = new URLSearchParams(search);
    let clientSlug = urlParams.get('c') || urlParams.get('client');
    let projectSlug = urlParams.get('p') || urlParams.get('project');

    if (!clientSlug && hash.includes('/')) {
      const parts = hash.replace(/^#\/?/, '').split('/').filter(p => p && p !== 'index.html');
      if (parts.length >= 2) {
        clientSlug = parts[0];
        projectSlug = parts[1];
      }
    }

    if (!clientSlug) {
      // Extract from path e.g. /bc/nome-cliente/nome-projeto
      const bcIndex = path.indexOf('/bc');
      if (bcIndex !== -1) {
        const subPath = path.substring(bcIndex + 3).replace(/^\/+|\/+$/g, '');
        const parts = subPath.split('/').filter(p => p && p !== 'index.html');
        if (parts.length >= 2) {
          clientSlug = parts[0];
          projectSlug = parts[1];
        }
      }
    }

    return {
      isProposalRoute: Boolean(clientSlug && projectSlug),
      clientSlug: clientSlug ? slugify(clientSlug) : '',
      projectSlug: projectSlug ? slugify(projectSlug) : ''
    };
  }

  function hideAllViews() {
    if (loginView) loginView.style.display = 'none';
    if (generatorView) generatorView.style.display = 'none';
    if (proposalView) proposalView.style.display = 'none';
  }

  function renderHeaderActions(isAdminLoggedIn) {
    if (!headerActionsContainer) return;
    if (isAdminLoggedIn) {
      headerActionsContainer.innerHTML = `
        <button type="button" id="bc-btn-logout" class="bc-btn bc-btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>`;
      document.getElementById('bc-btn-logout').onclick = () => {
        SecurityEngine.logout();
        showAlert('Sessão encerrada.', 'success');
        route();
      };
    } else {
      headerActionsContainer.innerHTML = `
        <a href="../index.html" class="bc-btn bc-btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          Voltar ao Site
        </a>`;
    }
  }

  /* ==========================================================================
     2. CURRENCY API FETCHING
     ========================================================================== */
  async function fetchUsdExchangeRate() {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates && data.rates.BRL) {
          usdToBrlRate = data.rates.BRL;
          updateAllCurrencyBadges();
          return;
        }
      }
    } catch (e) {
      // Fallback API
    }

    try {
      const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      if (response.ok) {
        const data = await response.json();
        if (data && data.USDBRL && data.USDBRL.bid) {
          usdToBrlRate = parseFloat(data.USDBRL.bid);
          updateAllCurrencyBadges();
        }
      }
    } catch (e) {
      // Silent fallback
    }
  }

  /* ==========================================================================
     3. AUTHENTICATION & LOGIN
     ========================================================================== */
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = userInput.value.trim();
      const pass = passInput.value.trim();

      const result = await SecurityEngine.authenticate(user, pass);
      if (result.success) {
        showAlert('Autenticado com sucesso!', 'success');
        userInput.value = '';
        passInput.value = '';
        route();
      } else {
        showAlert(result.message, 'danger');
      }
    });
  }

  /* ==========================================================================
     4. COMBOBOX PERSISTENCE & AUTO-LOAD SAVED PROPOSALS
     ========================================================================== */
  let lastLoadedProposalKey = '';

  function populateDatalists() {
    const clients = StorageEngine.getClients();
    const projects = StorageEngine.getProjects();

    if (clientsDatalist) {
      clientsDatalist.innerHTML = clients.map(c => `<option value="${c}">`).join('');
    }
    if (projectsDatalist) {
      projectsDatalist.innerHTML = projects.map(p => `<option value="${p}">`).join('');
    }
  }

  function checkAndAutoLoadProposal() {
    const clientVal = clientInput ? clientInput.value.trim() : '';
    const projectVal = projectInput ? projectInput.value.trim() : '';

    if (!projectVal && !clientVal) return;

    const proposals = StorageEngine.getProposals();
    let matchedProposal = null;

    // 1. Try exact slug match client + project
    if (clientVal && projectVal) {
      const slugKey = `${slugify(clientVal)}/${slugify(projectVal)}`;
      matchedProposal = proposals[slugKey] || null;
    }

    // 2. Try project name match if no exact slug match
    if (!matchedProposal && projectVal) {
      const projSlug = slugify(projectVal);
      for (const key in proposals) {
        if (proposals[key] && (key.endsWith('/' + projSlug) || slugify(proposals[key].project) === projSlug)) {
          matchedProposal = proposals[key];
          break;
        }
      }
    }

    if (matchedProposal) {
      const proposalKey = matchedProposal.slug || `${matchedProposal.client}/${matchedProposal.project}`;
      if (proposalKey !== lastLoadedProposalKey) {
        lastLoadedProposalKey = proposalKey;
        loadProposalIntoForm(matchedProposal);
      }
    }
  }

  function loadProposalIntoForm(proposal) {
    if (!proposal) return;

    // Set Brand
    if (proposal.brand === 'giffu') {
      const radio = document.querySelector('input[name="bc-brand"][value="giffu"]');
      if (radio) { radio.checked = true; onBrandChange('giffu'); }
    } else {
      const radio = document.querySelector('input[name="bc-brand"][value="novel"]');
      if (radio) { radio.checked = true; onBrandChange('novel'); }
    }

    if (clientInput && proposal.client) clientInput.value = proposal.client;
    if (dateInput && proposal.date) dateInput.value = proposal.date;
    if (projectInput && proposal.project) projectInput.value = proposal.project;
    if (expirationInput && proposal.expirationDate) expirationInput.value = proposal.expirationDate;

    // Clear existing packages & rebuild
    packagesContainer.innerHTML = '';
    packageCounter = 0;

    if (Array.isArray(proposal.packages) && proposal.packages.length > 0) {
      proposal.packages.forEach((pkg) => {
        addPackageCard();
        const pkgId = `pkg_${packageCounter}`;

        const nameInput = document.getElementById(`${pkgId}-name-input`);
        if (nameInput && pkg.packageName) nameInput.value = pkg.packageName;

        const currencySelect = document.getElementById(`${pkgId}-currency`);
        if (currencySelect && pkg.currency) {
          currencySelect.value = pkg.currency;
          onCurrencyChange(pkgId);
        }

        const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;

        // Restore custom items if available
        if (Array.isArray(pkg.customItems) && pkg.customItems.length > 0) {
          const customCheck = document.getElementById(`${pkgId}-custom-check`);
          const customBox = document.getElementById(`${pkgId}-custom-box`);
          if (customCheck) customCheck.checked = true;
          if (customBox) customBox.classList.add('active');
          renderCustomItems(pkgId, pkg.customItems);
        }

        // Restore itemized services & prices
        if (Array.isArray(pkg.itemizedServices)) {
          pkg.itemizedServices.forEach(itemized => {
            if (itemized.name.startsWith('Personalizado')) {
              if (!pkg.customItems || pkg.customItems.length === 0) {
                const customCheck = document.getElementById(`${pkgId}-custom-check`);
                const customBox = document.getElementById(`${pkgId}-custom-box`);
                if (customCheck) customCheck.checked = true;
                if (customBox) customBox.classList.add('active');
                const parsedText = itemized.name.replace(/^Personalizado:\s*/, '').replace(/^Personalizado\s*/, '');
                const curVal = pkg.currency === 'USD' ? (itemized.price / rate) : itemized.price;
                renderCustomItems(pkgId, [{ text: parsedText, price: (curVal > 0 ? curVal : '') }]);
              }
            } else if (itemized.name.includes('Reel')) {
              const cb = document.getElementById(`${pkgId}-svc-reels`);
              if (cb) {
                cb.checked = true;
                onServiceCheckChange(pkgId, 'reels');
                const match = itemized.name.match(/(\d+)\s*Reels?/i);
                if (match) {
                  const qtyInput = document.getElementById(`${pkgId}-reels-qty`);
                  if (qtyInput) qtyInput.value = match[1];
                }
                const priceInput = document.getElementById(`${pkgId}-price-reels`);
                if (priceInput && itemized.price) {
                  const curVal = pkg.currency === 'USD' ? (itemized.price / rate) : itemized.price;
                  priceInput.value = curVal.toFixed(2);
                }
              }
            } else if (itemized.name.includes('Motion Graphics')) {
              const cb = document.getElementById(`${pkgId}-svc-motion`);
              if (cb) {
                cb.checked = true;
                onServiceCheckChange(pkgId, 'motion');
                const match = itemized.name.match(/(\d+)\s*min/i);
                if (match) {
                  const minsInput = document.getElementById(`${pkgId}-motion-mins`);
                  if (minsInput) minsInput.value = match[1];
                }
                const priceInput = document.getElementById(`${pkgId}-price-motion`);
                if (priceInput && itemized.price) {
                  const curVal = pkg.currency === 'USD' ? (itemized.price / rate) : itemized.price;
                  priceInput.value = curVal.toFixed(2);
                }
              }
            } else {
              const itemObj = SERVICE_ITEMS.find(s => s.name === itemized.name);
              if (itemObj) {
                const cb = document.getElementById(`${pkgId}-svc-${itemObj.id}`);
                if (cb) {
                  cb.checked = true;
                  onServiceCheckChange(pkgId, itemObj.id);
                  const priceInput = document.getElementById(`${pkgId}-price-${itemObj.id}`);
                  if (priceInput && itemized.price) {
                    const curVal = pkg.currency === 'USD' ? (itemized.price / rate) : itemized.price;
                    priceInput.value = curVal.toFixed(2);
                  }
                }
              }
            }
          });
        }

        // Restore subfields if saved
        if (pkg.subfields) {
          Object.keys(pkg.subfields).forEach(itemId => {
            const subs = pkg.subfields[itemId];
            if (Array.isArray(subs) && subs.length > 0) {
              const wrap = document.getElementById(`${pkgId}-subfields-wrap-${itemId}`);
              if (wrap) wrap.classList.add('active');
              renderSubfields(pkgId, itemId, subs);
            }
          });
        }

        const amountInput = document.getElementById(`${pkgId}-amount`);
        if (amountInput && pkg.amount) amountInput.value = pkg.amount;
        updateCurrencyConversion(pkgId);

        const deadlineInput = document.getElementById(`${pkgId}-deadline`);
        if (deadlineInput && pkg.deadline) deadlineInput.value = pkg.deadline;

        updatePackageSummary(pkgId);
      });
    }

    showAlert(`Orçamento de "${proposal.project}" carregado automaticamente!`, 'success');
  }

  if (projectInput) {
    projectInput.addEventListener('change', checkAndAutoLoadProposal);
    projectInput.addEventListener('input', checkAndAutoLoadProposal);
  }
  if (clientInput) {
    clientInput.addEventListener('change', checkAndAutoLoadProposal);
    clientInput.addEventListener('input', checkAndAutoLoadProposal);
  }

  /* ==========================================================================
     5. DYNAMIC PACKAGE QUESTIONNAIRE & EDITABLE TITLE
     ========================================================================== */
  if (btnAddPackage) {
    btnAddPackage.addEventListener('click', () => {
      addPackageCard();
    });
  }

  function addPackageCard() {
    packageCounter++;
    const pkgId = `pkg_${packageCounter}`;
    const pkgNumberStr = String(packageCounter).padStart(2, '0');
    const defaultPackageName = `Pacote ${pkgNumberStr}`;

    const card = document.createElement('div');
    card.className = 'package-card';
    card.id = pkgId;
    card.dataset.currentCurrency = 'BRL';

    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 20);
    const deadlineFormatted = formatDateForInput(defaultDeadline);

    card.innerHTML = `
      <div class="package-header" onclick="NovelBC.togglePackageCollapse('${pkgId}')">
        <div class="package-title-group">
          <!-- Editable Package Name Input -->
          <input type="text" id="${pkgId}-name-input" class="package-title-input" value="${defaultPackageName}" onclick="event.stopPropagation()" oninput="NovelBC.updatePackageSummary('${pkgId}')" title="Clique para renomear este pacote">
          <span class="package-summary" id="${pkgId}-summary">Resumo do pacote...</span>
        </div>
        <div class="package-header-actions">
          ${packageCounter > 1 ? `
            <button type="button" class="bc-btn-danger-icon" onclick="event.stopPropagation(); NovelBC.removePackage('${pkgId}')" title="Remover Pacote">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>` : ''}
          <div class="package-collapse-toggle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <div class="package-body">
        <div class="bc-form-group">
          <label>Serviços <span class="required-star">*</span></label>
          <div class="bc-checkbox-grid">
            ${SERVICE_ITEMS.map((item) => {
              const isReels = item.type === 'reels';
              const isMotion = item.type === 'motion';
              const defaultPrice = item.price || (isReels ? 300 : (isMotion ? 400 : 0));
              return `
                <div class="bc-service-item-wrapper" id="${pkgId}-wrap-${item.id}">
                  <label class="bc-checkbox-item ${item.cls}">
                    <input type="checkbox" id="${pkgId}-svc-${item.id}" name="${pkgId}-service" value="${item.name}" data-item-id="${item.id}" onchange="NovelBC.onServiceCheckChange('${pkgId}', '${item.id}')">
                    <span>${item.name}</span>
                  </label>
                  
                  <div class="bc-service-config-box" id="${pkgId}-config-${item.id}">
                    ${isReels ? `
                      <div class="bc-service-qty-box active" id="${pkgId}-reels-qty-box">
                        <span>Qtd Reels:</span>
                        <input type="number" min="1" value="1" id="${pkgId}-reels-qty" oninput="NovelBC.onReelsQtyChange('${pkgId}')">
                      </div>` : ''}
                    ${isMotion ? `
                      <div class="bc-service-qty-box active" id="${pkgId}-motion-qty-box">
                        <span>Minutos Motion:</span>
                        <input type="number" min="1" value="1" id="${pkgId}-motion-mins" oninput="NovelBC.onMotionMinsChange('${pkgId}')">
                      </div>` : ''}
                    <div class="bc-service-price-box">
                      <span class="bc-service-price-label">Valor:</span>
                      <div class="bc-price-input-group">
                        <span class="bc-price-cur ${pkgId}-cur-symbol">R$</span>
                        <input type="number" step="10" min="0" id="${pkgId}-price-${item.id}" class="bc-item-price-input" data-default-price="${defaultPrice}" value="${defaultPrice}" placeholder="0.00" oninput="NovelBC.onItemPriceInput('${pkgId}')" onchange="NovelBC.onItemPriceInput('${pkgId}')">
                      </div>
                    </div>

                    <!-- Subfields Toggle Button -->
                    <div class="bc-subfields-toggle-row">
                      <button type="button" class="bc-btn-toggle-subfields" onclick="NovelBC.toggleSubfields('${pkgId}', '${item.id}')" title="Adicionar subcampos com descritivo e valor (não saem no PDF)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Subcampos</span>
                        <span class="bc-subfields-badge" id="${pkgId}-sub-badge-${item.id}" style="display: none;">0</span>
                      </button>
                    </div>

                    <!-- Subfields Container -->
                    <div class="bc-subfields-wrapper" id="${pkgId}-subfields-wrap-${item.id}">
                      <div class="bc-subfields-header">
                        <span class="bc-subfields-title">Subcampos (não saem no PDF):</span>
                      </div>
                      <div class="bc-subfields-list" id="${pkgId}-subfields-list-${item.id}">
                        <!-- dynamic subfield rows -->
                      </div>
                      <button type="button" class="bc-btn-add-subfield" onclick="NovelBC.addSubfield('${pkgId}', '${item.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Adicionar subcampo
                      </button>
                    </div>

                    <!-- Item Total Badge (shows exact sum of main field + subfields) -->
                    <div class="bc-item-total-badge" id="${pkgId}-item-total-${item.id}">
                      <span>Total do item:</span>
                      <strong id="${pkgId}-item-total-val-${item.id}">R$ 0,00</strong>
                    </div>
                  </div>
                </div>`;
            }).join('')}

            <!-- Personalizado Checkbox -->
            <div class="bc-service-item-wrapper" id="${pkgId}-wrap-custom">
              <label class="bc-checkbox-item svc-purple">
                <input type="checkbox" id="${pkgId}-custom-check" name="${pkgId}-service" value="Personalizado" onchange="NovelBC.toggleCustomText('${pkgId}')">
                <span>Personalizado</span>
              </label>
            </div>
          </div>
          
          <!-- Custom Services Expandable Container -->
          <div class="bc-custom-service-box" id="${pkgId}-custom-box">
            <div class="bc-custom-menu-bar">
              <div class="bc-custom-menu-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Itens Personalizados</span>
              </div>

              <div class="bc-custom-qty-wrapper">
                <label for="${pkgId}-custom-qty-input" class="bc-custom-qty-label">Qtd de itens:</label>
                <div class="bc-custom-qty-stepper">
                  <button type="button" class="bc-stepper-btn" onclick="NovelBC.adjustCustomItemsQty('${pkgId}', -1)" title="Diminuir quantidade">−</button>
                  <input type="number" id="${pkgId}-custom-qty-input" class="bc-custom-qty-input" min="1" max="25" value="1" onchange="NovelBC.onCustomQtyInputChange('${pkgId}', this.value)" oninput="NovelBC.onCustomQtyInputChange('${pkgId}', this.value)">
                  <button type="button" class="bc-stepper-btn" onclick="NovelBC.adjustCustomItemsQty('${pkgId}', 1)" title="Aumentar quantidade">+</button>
                </div>
                <button type="button" class="bc-btn-add-item-chip" onclick="NovelBC.adjustCustomItemsQty('${pkgId}', 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Adicionar item
                </button>
              </div>
            </div>

            <!-- Dynamic List of Custom Boxes -->
            <div class="bc-custom-items-list" id="${pkgId}-custom-items-list">
              <!-- Populated dynamically via JS -->
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
          
          <!-- Investment Amount -->
          <div class="bc-form-group">
            <label for="${pkgId}-amount">Investimento <span class="required-star">*</span></label>
            <div class="bc-currency-input-group">
              <select id="${pkgId}-currency" class="bc-select bc-currency-select" onchange="NovelBC.onCurrencyChange('${pkgId}')">
                <option value="BRL">R$</option>
                <option value="USD">US$</option>
              </select>
              <input type="number" step="10" min="0" id="${pkgId}-amount" class="bc-input" placeholder="0.00" required oninput="NovelBC.updateCurrencyConversion('${pkgId}')" onchange="NovelBC.updateCurrencyConversion('${pkgId}')">
            </div>
            <div id="${pkgId}-conversion-badge" class="bc-currency-conversion-badge" style="display: none;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span id="${pkgId}-conversion-text">US$ 0,00 ≈ R$ 0,00</span>
            </div>
          </div>

          <!-- Target Delivery Date (Optional) -->
          <div class="bc-form-group">
            <label for="${pkgId}-deadline">Prazo</label>
            <input type="date" id="${pkgId}-deadline" class="bc-input" value="${deadlineFormatted}">
          </div>
        </div>
      </div>`;

    packagesContainer.appendChild(card);
    renderCustomItems(pkgId, [{ text: '', price: '' }]);
    updatePackageSummary(pkgId);
  }

  function onCurrencyChange(pkgId) {
    const card = document.getElementById(pkgId);
    if (!card) return;

    const currencySelect = document.getElementById(`${pkgId}-currency`);
    const newCurrency = currencySelect?.value || 'BRL';
    const oldCurrency = card.dataset.currentCurrency || 'BRL';

    if (newCurrency === oldCurrency) return;
    card.dataset.currentCurrency = newCurrency;

    const isUsd = (newCurrency === 'USD');
    const symbol = isUsd ? 'US$' : 'R$';

    // Update currency symbol text badges across the package
    const symEls = card.querySelectorAll(`.${pkgId}-cur-symbol, .bc-custom-cur-badge`);
    symEls.forEach(el => el.textContent = symbol);

    // Rate multiplier to convert existing prices in inputs
    const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;
    const factor = isUsd ? (1 / rate) : rate;

    // Convert all service price inputs
    SERVICE_ITEMS.forEach(item => {
      const inp = document.getElementById(`${pkgId}-price-${item.id}`);
      if (inp && inp.value) {
        const curVal = parseFloat(inp.value);
        if (!isNaN(curVal) && curVal > 0) {
          inp.value = (curVal * factor).toFixed(2);
        }
      }
    });

    // Convert all custom items price inputs
    const customInps = card.querySelectorAll('.bc-custom-item-price-input');
    customInps.forEach(inp => {
      if (inp.value) {
        const curVal = parseFloat(inp.value);
        if (!isNaN(curVal) && curVal > 0) {
          inp.value = (curVal * factor).toFixed(2);
        }
      }
    });

    // Convert all subfield price inputs
    const subfieldInps = card.querySelectorAll('.bc-subfield-price-input');
    subfieldInps.forEach(inp => {
      if (inp.value) {
        const curVal = parseFloat(inp.value);
        if (!isNaN(curVal) && curVal > 0) {
          inp.value = (curVal * factor).toFixed(2);
        }
      }
    });

    recalculatePackageSum(pkgId);
  }

  function onServiceCheckChange(pkgId, itemId) {
    const cb = document.getElementById(`${pkgId}-svc-${itemId}`);
    const configBox = document.getElementById(`${pkgId}-config-${itemId}`);
    if (!cb || !configBox) return;

    if (cb.checked) {
      configBox.classList.add('active');
      const priceInput = document.getElementById(`${pkgId}-price-${itemId}`);
      if (priceInput && (!priceInput.value || parseFloat(priceInput.value) <= 0)) {
        const curSelect = document.getElementById(`${pkgId}-currency`);
        const isUsd = curSelect?.value === 'USD';
        let defPrice = parseFloat(priceInput.dataset.defaultPrice) || 0;
        if (itemId === 'reels') {
          const qty = parseInt(document.getElementById(`${pkgId}-reels-qty`)?.value) || 1;
          defPrice = calculateReelsPrice(qty).total;
        } else if (itemId === 'motion') {
          const mins = parseInt(document.getElementById(`${pkgId}-motion-mins`)?.value) || 1;
          defPrice = calculateMotionPrice(mins).total;
        }
        const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;
        const finalVal = isUsd ? (defPrice / rate) : defPrice;
        priceInput.value = finalVal.toFixed(2);
      }
    } else {
      configBox.classList.remove('active');
    }

    recalculatePackageSum(pkgId);
  }

  function onItemPriceInput(pkgId) {
    recalculatePackageSum(pkgId);
  }

  function onReelsQtyChange(pkgId) {
    const qty = parseInt(document.getElementById(`${pkgId}-reels-qty`)?.value) || 1;
    const res = calculateReelsPrice(qty);
    const curSelect = document.getElementById(`${pkgId}-currency`);
    const isUsd = (curSelect?.value === 'USD');
    const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;
    const priceInput = document.getElementById(`${pkgId}-price-reels`);
    if (priceInput) {
      const val = isUsd ? (res.total / rate) : res.total;
      priceInput.value = val.toFixed(2);
      priceInput.dataset.defaultPrice = res.total;
    }
    recalculatePackageSum(pkgId);
  }

  function onMotionMinsChange(pkgId) {
    const mins = parseInt(document.getElementById(`${pkgId}-motion-mins`)?.value) || 1;
    const res = calculateMotionPrice(mins);
    const curSelect = document.getElementById(`${pkgId}-currency`);
    const isUsd = (curSelect?.value === 'USD');
    const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;
    const priceInput = document.getElementById(`${pkgId}-price-motion`);
    if (priceInput) {
      const val = isUsd ? (res.total / rate) : res.total;
      priceInput.value = val.toFixed(2);
      priceInput.dataset.defaultPrice = res.total;
    }
    recalculatePackageSum(pkgId);
  }

  /* Subfields Helper Functions */
  function getSubfieldsData(pkgId, itemId) {
    const listEl = document.getElementById(`${pkgId}-subfields-list-${itemId}`);
    if (!listEl) return [];
    const rows = listEl.querySelectorAll('.bc-subfield-row');
    const items = [];
    rows.forEach(row => {
      const descInput = row.querySelector('.bc-subfield-desc-input');
      const priceInput = row.querySelector('.bc-subfield-price-input');
      items.push({
        desc: descInput ? descInput.value : '',
        price: priceInput ? priceInput.value : ''
      });
    });
    return items;
  }

  function renderSubfields(pkgId, itemId, subfieldsArray) {
    const listEl = document.getElementById(`${pkgId}-subfields-list-${itemId}`);
    const badgeEl = document.getElementById(`${pkgId}-sub-badge-${itemId}`);
    if (!listEl) return;

    const curSelect = document.getElementById(`${pkgId}-currency`);
    const curSymbol = (curSelect?.value === 'USD') ? 'US$' : 'R$';

    if (!Array.isArray(subfieldsArray)) subfieldsArray = [];

    listEl.innerHTML = subfieldsArray.map((sub, idx) => `
      <div class="bc-subfield-row" data-subfield-index="${idx}">
        <input type="text" class="bc-subfield-desc-input" placeholder="Descritivo do subitem..." value="${escapeHtml(sub.desc || '')}" oninput="NovelBC.onSubfieldChange('${pkgId}', '${itemId}')">
        <div class="bc-subfield-price-group">
          <span class="bc-subfield-cur ${pkgId}-cur-symbol">${curSymbol}</span>
          <input type="number" step="10" min="0" class="bc-subfield-price-input" placeholder="0.00" value="${sub.price !== undefined && sub.price !== null && sub.price !== '' ? sub.price : ''}" oninput="NovelBC.onSubfieldChange('${pkgId}', '${itemId}')" onchange="NovelBC.onSubfieldChange('${pkgId}', '${itemId}')">
        </div>
        <button type="button" class="bc-subfield-btn-remove" onclick="NovelBC.removeSubfield('${pkgId}', '${itemId}', ${idx})" title="Remover este subcampo">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');

    if (badgeEl) {
      if (subfieldsArray.length > 0) {
        badgeEl.textContent = subfieldsArray.length;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  }

  function toggleSubfields(pkgId, itemId) {
    const wrap = document.getElementById(`${pkgId}-subfields-wrap-${itemId}`);
    if (!wrap) return;

    const isActive = wrap.classList.contains('active');
    if (!isActive) {
      wrap.classList.add('active');
      const current = getSubfieldsData(pkgId, itemId);
      if (current.length === 0) {
        renderSubfields(pkgId, itemId, [{ desc: '', price: '' }]);
      }
    } else {
      wrap.classList.remove('active');
    }
  }

  function addSubfield(pkgId, itemId) {
    const wrap = document.getElementById(`${pkgId}-subfields-wrap-${itemId}`);
    if (wrap) wrap.classList.add('active');

    const current = getSubfieldsData(pkgId, itemId);
    current.push({ desc: '', price: '' });
    renderSubfields(pkgId, itemId, current);
    recalculateItemFromSubfields(pkgId, itemId);
  }

  function removeSubfield(pkgId, itemId, index) {
    const current = getSubfieldsData(pkgId, itemId);
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
    }
    renderSubfields(pkgId, itemId, current);
    recalculateItemFromSubfields(pkgId, itemId);
  }

  function onSubfieldChange(pkgId, itemId) {
    recalculateItemFromSubfields(pkgId, itemId);
  }

  function updateItemTotalBadge(pkgId, itemId, fieldVal, subTotal, itemTotal) {
    const badge = document.getElementById(`${pkgId}-item-total-${itemId}`);
    const valEl = document.getElementById(`${pkgId}-item-total-val-${itemId}`);
    if (!badge || !valEl) return;

    const curSelect = document.getElementById(`${pkgId}-currency`);
    const symbol = (curSelect?.value === 'USD') ? 'US$' : 'R$';

    if (subTotal > 0) {
      badge.classList.add('active');
      valEl.textContent = `${symbol} ${formatNumber(itemTotal)}`;
    } else {
      badge.classList.remove('active');
    }
  }

  function recalculateItemFromSubfields(pkgId, itemId) {
    // Keep the main field value untouched; recalculatePackageSum computes (fieldVal + subTotal)
    recalculatePackageSum(pkgId);
  }

  /* Custom Items Helper Functions */
  function getCustomItemsData(pkgId) {
    const container = document.getElementById(`${pkgId}-custom-items-list`);
    if (!container) return [];
    const rows = container.querySelectorAll('.bc-custom-item-row');
    const items = [];
    rows.forEach(row => {
      const textInput = row.querySelector('.bc-custom-text-input');
      const priceInput = row.querySelector('.bc-custom-item-price-input');
      items.push({
        text: textInput ? textInput.value : '',
        price: priceInput ? priceInput.value : ''
      });
    });
    return items;
  }

  function renderCustomItems(pkgId, itemsArray) {
    const container = document.getElementById(`${pkgId}-custom-items-list`);
    if (!container) return;

    const curSelect = document.getElementById(`${pkgId}-currency`);
    const curSymbol = (curSelect?.value === 'USD') ? 'US$' : 'R$';

    if (!itemsArray || itemsArray.length === 0) {
      itemsArray = [{ text: '', price: '' }];
    }

    container.innerHTML = itemsArray.map((item, idx) => `
      <div class="bc-custom-item-row" data-custom-index="${idx}">
        <div class="bc-custom-item-idx-badge">#${idx + 1}</div>
        <div class="bc-custom-item-desc-col">
          <input type="text" class="bc-input bc-custom-text-input" placeholder="Descreva o serviço personalizado..." value="${escapeHtml(item.text || '')}" oninput="NovelBC.onCustomItemChange('${pkgId}')">
        </div>
        <div class="bc-custom-item-price-col">
          <div class="bc-custom-price-wrapper">
            <span class="bc-custom-cur-badge">${curSymbol}</span>
            <input type="number" step="10" min="0" class="bc-custom-item-price-input" placeholder="0.00" value="${item.price !== undefined && item.price !== null && item.price !== '' ? item.price : ''}" oninput="NovelBC.onCustomItemChange('${pkgId}')" onchange="NovelBC.onCustomItemChange('${pkgId}')">
          </div>
        </div>
        ${itemsArray.length > 1 ? `
          <button type="button" class="bc-btn-remove-custom-item" onclick="NovelBC.removeSpecificCustomItem('${pkgId}', ${idx})" title="Remover este item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>` : ''}
      </div>
    `).join('');

    const qtyInput = document.getElementById(`${pkgId}-custom-qty-input`);
    if (qtyInput) qtyInput.value = itemsArray.length;
  }

  function toggleCustomText(pkgId) {
    const check = document.getElementById(`${pkgId}-custom-check`);
    const box = document.getElementById(`${pkgId}-custom-box`);
    if (check && box) {
      if (check.checked) {
        box.classList.add('active');
        const container = document.getElementById(`${pkgId}-custom-items-list`);
        if (container && container.children.length === 0) {
          renderCustomItems(pkgId, [{ text: '', price: '' }]);
        }
      } else {
        box.classList.remove('active');
      }
    }
    recalculatePackageSum(pkgId);
    updatePackageSummary(pkgId);
  }

  function adjustCustomItemsQty(pkgId, delta) {
    const currentItems = getCustomItemsData(pkgId);
    const newCount = Math.max(1, Math.min(25, currentItems.length + delta));
    setCustomItemsCount(pkgId, newCount);
  }

  function onCustomQtyInputChange(pkgId, val) {
    const count = parseInt(val) || 1;
    setCustomItemsCount(pkgId, count);
  }

  function setCustomItemsCount(pkgId, targetCount) {
    const count = Math.max(1, Math.min(25, parseInt(targetCount) || 1));
    const currentItems = getCustomItemsData(pkgId);

    while (currentItems.length < count) {
      currentItems.push({ text: '', price: '' });
    }
    if (currentItems.length > count) {
      currentItems.length = count;
    }

    renderCustomItems(pkgId, currentItems);
    recalculatePackageSum(pkgId);
    updatePackageSummary(pkgId);
  }

  function removeSpecificCustomItem(pkgId, index) {
    const currentItems = getCustomItemsData(pkgId);
    if (currentItems.length > 1) {
      currentItems.splice(index, 1);
      renderCustomItems(pkgId, currentItems);
      recalculatePackageSum(pkgId);
      updatePackageSummary(pkgId);
    }
  }

  function onCustomItemChange(pkgId) {
    recalculatePackageSum(pkgId);
    updatePackageSummary(pkgId);
  }

  function recalculatePackageSum(pkgId) {
    const card = document.getElementById(pkgId);
    if (!card) return;

    const curSelect = document.getElementById(`${pkgId}-currency`);
    const isUsd = (curSelect?.value === 'USD');
    const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;

    let totalPackageCur = 0;

    // 1. Standard checked services: Exact sum of main field + subfields
    const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${pkgId}-service"]:checked`));

    checkedBoxes.forEach(cb => {
      if (cb.value === 'Personalizado') return;

      const itemId = cb.dataset.itemId;
      const priceInput = document.getElementById(`${pkgId}-price-${itemId}`);
      let fieldVal = parseFloat(priceInput?.value);

      if (isNaN(fieldVal) || fieldVal < 0) {
        if (itemId === 'reels') {
          const qty = parseInt(document.getElementById(`${pkgId}-reels-qty`)?.value) || 1;
          fieldVal = calculateReelsPrice(qty).total;
        } else if (itemId === 'motion') {
          const mins = parseInt(document.getElementById(`${pkgId}-motion-mins`)?.value) || 1;
          fieldVal = calculateMotionPrice(mins).total;
        } else {
          const itemObj = SERVICE_ITEMS.find(s => s.id === itemId || s.name === cb.value);
          fieldVal = itemObj?.price || 0;
        }
        if (isUsd) fieldVal = fieldVal / rate;
        if (priceInput) priceInput.value = fieldVal.toFixed(2);
      }

      // Sum all subfields for this item
      const subfields = getSubfieldsData(pkgId, itemId);
      let subTotal = 0;
      subfields.forEach(s => {
        const p = parseFloat(s.price);
        if (!isNaN(p) && p > 0) subTotal += p;
      });

      // EXACT SUM: field value + all subfield values
      const itemTotal = Math.round((fieldVal + subTotal) * 100) / 100;
      totalPackageCur += itemTotal;

      // Update item total indicator badge
      updateItemTotalBadge(pkgId, itemId, fieldVal, subTotal, itemTotal);
    });

    // Hide badges on unchecked services
    SERVICE_ITEMS.forEach(sItem => {
      const cb = document.getElementById(`${pkgId}-svc-${sItem.id}`);
      if (!cb || !cb.checked) {
        const badge = document.getElementById(`${pkgId}-item-total-${sItem.id}`);
        if (badge) badge.classList.remove('active');
      }
    });

    // 2. Custom Items (if Personalizado is checked)
    const customCheck = document.getElementById(`${pkgId}-custom-check`);
    if (customCheck && customCheck.checked) {
      const customContainer = document.getElementById(`${pkgId}-custom-items-list`);
      if (customContainer) {
        const priceInputs = customContainer.querySelectorAll('.bc-custom-item-price-input');
        priceInputs.forEach(inp => {
          const val = parseFloat(inp.value);
          if (!isNaN(val) && val > 0) {
            totalPackageCur += val;
          }
        });
      }
    }

    totalPackageCur = Math.round(totalPackageCur * 100) / 100;

    const amountInput = document.getElementById(`${pkgId}-amount`);
    if (amountInput) {
      amountInput.value = totalPackageCur > 0 ? totalPackageCur.toFixed(2) : '';
    }

    updateCurrencyConversion(pkgId);
    updatePackageSummary(pkgId);
  }

  function togglePackageCollapse(pkgId) {
    const card = document.getElementById(pkgId);
    if (card) {
      card.classList.toggle('collapsed');
    }
  }

  function removePackage(pkgId) {
    const card = document.getElementById(pkgId);
    if (card && packagesContainer.children.length > 1) {
      card.remove();
    }
  }

  function updateCurrencyConversion(pkgId) {
    const currencySelect = document.getElementById(`${pkgId}-currency`);
    const amountInput = document.getElementById(`${pkgId}-amount`);
    const badge = document.getElementById(`${pkgId}-conversion-badge`);
    const badgeText = document.getElementById(`${pkgId}-conversion-text`);

    if (!currencySelect || !amountInput || !badge) return;

    const val = parseFloat(amountInput.value) || 0;
    const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;
    if (currencySelect.value === 'USD' && val > 0) {
      const convertedBrl = val * rate;
      badgeText.textContent = `US$ ${formatNumber(val)} ≈ R$ ${formatNumber(convertedBrl)} (Cotado em tempo real)`;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }

    updatePackageSummary(pkgId);
  }

  function updateAllCurrencyBadges() {
    const cards = packagesContainer.querySelectorAll('.package-card');
    cards.forEach(c => updateCurrencyConversion(c.id));
  }

  function updatePackageSummary(pkgId) {
    const summarySpan = document.getElementById(`${pkgId}-summary`);
    if (!summarySpan) return;

    const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${pkgId}-service"]:checked`));
    const selectedServices = [];

    checkedBoxes.forEach(cb => {
      if (cb.value === 'Personalizado') {
        const customRows = document.querySelectorAll(`#${pkgId}-custom-items-list .bc-custom-item-row`);
        if (customRows.length > 0) {
          customRows.forEach(row => {
            const t = row.querySelector('.bc-custom-text-input')?.value.trim();
            selectedServices.push(t ? `Personalizado (${t})` : 'Personalizado');
          });
        } else {
          selectedServices.push('Personalizado');
        }
      } else if (cb.value === 'Vários Reels') {
        const qty = parseInt(document.getElementById(`${pkgId}-reels-qty`)?.value) || 1;
        selectedServices.push(calculateReelsPrice(qty).label);
      } else if (cb.value === 'Motion Graphics') {
        const mins = parseInt(document.getElementById(`${pkgId}-motion-mins`)?.value) || 1;
        selectedServices.push(calculateMotionPrice(mins).label);
      } else {
        selectedServices.push(cb.value);
      }
    });

    const currencySelect = document.getElementById(`${pkgId}-currency`);
    const amountInput = document.getElementById(`${pkgId}-amount`);
    const currency = currencySelect?.value === 'USD' ? 'US$' : 'R$';
    const amount = parseFloat(amountInput?.value) || 0;

    let summaryText = selectedServices.length > 0 
      ? selectedServices.join(', ')
      : 'Nenhum serviço selecionado';

    if (amount > 0) {
      summaryText += ` • ${currency} ${formatNumber(amount)}`;
    }

    summarySpan.textContent = summaryText;
  }

  /* ==========================================================================
     6. SAVE DRAFT & REQUISITAR FORM HANDLING
     ========================================================================== */
  let currentSelectedBrand = 'novel';

  function onBrandChange(brandValue) {
    currentSelectedBrand = (brandValue === 'giffu') ? 'giffu' : 'novel';

    const novelLabel = document.getElementById('brand-label-novel');
    const giffuLabel = document.getElementById('brand-label-giffu');
    const novelRadio = document.querySelector('input[name="bc-brand"][value="novel"]');
    const giffuRadio = document.querySelector('input[name="bc-brand"][value="giffu"]');

    if (currentSelectedBrand === 'giffu') {
      if (novelLabel) novelLabel.classList.remove('active');
      if (giffuLabel) giffuLabel.classList.add('active');
      if (giffuRadio) giffuRadio.checked = true;
      if (novelRadio) novelRadio.checked = false;
    } else {
      if (giffuLabel) giffuLabel.classList.remove('active');
      if (novelLabel) novelLabel.classList.add('active');
      if (novelRadio) novelRadio.checked = true;
      if (giffuRadio) giffuRadio.checked = false;
    }
  }

  function collectAndValidateFormData() {
    const selectedBrandEl = document.querySelector('input[name="bc-brand"]:checked');
    const brand = selectedBrandEl ? selectedBrandEl.value : currentSelectedBrand;

    let brandColor = '#EE7000';
    let brandFooter = 'Novel Produtora Audiovisual · novel.art.br · adm@novel.art.br';
    let brandTitle = 'NOVEL';

    if (brand === 'giffu') {
      brandColor = '#FD5E01';
      brandFooter = 'Dilan Giffú · Motion Artist & Filmmaker · Portfólio: https://giffu.com.br';
      brandTitle = 'GIFFÚ';
    }

    const client = clientInput.value.trim();
    const date = dateInput.value;
    const project = projectInput.value.trim();
    const expirationDate = expirationInput.value;

    if (!client || !date || !project || !expirationDate) {
      return { valid: false, message: 'Preencha os campos necessários.' };
    }

    // Collect Packages Info
    const packageCards = Array.from(packagesContainer.querySelectorAll('.package-card'));
    const packagesData = [];
    const rate = (usdToBrlRate > 0) ? usdToBrlRate : 5.4;

    for (let i = 0; i < packageCards.length; i++) {
      const card = packageCards[i];
      const pkgId = card.id;

      const packageNameInput = document.getElementById(`${pkgId}-name-input`);
      const packageName = packageNameInput?.value.trim() || `Pacote ${String(i + 1).padStart(2, '0')}`;

      let sumItemizedBrl = 0;
      const itemizedServices = [];
      const customItemsData = [];
      const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${pkgId}-service"]:checked`));

      const currency = document.getElementById(`${pkgId}-currency`).value;
      const amount = parseFloat(document.getElementById(`${pkgId}-amount`).value);
      const deadline = document.getElementById(`${pkgId}-deadline`).value;

      checkedBoxes.forEach(cb => {
        if (cb.value === 'Vários Reels') {
          const qty = parseInt(document.getElementById(`${pkgId}-reels-qty`)?.value) || 1;
          const res = calculateReelsPrice(qty);
          const priceInput = document.getElementById(`${pkgId}-price-reels`);
          let basePrice = parseFloat(priceInput?.value);
          if (isNaN(basePrice) || basePrice < 0) basePrice = (currency === 'USD' ? (res.total / rate) : res.total);

          const subfields = getSubfieldsData(pkgId, 'reels');
          let subTotal = 0;
          subfields.forEach(s => {
            const p = parseFloat(s.price);
            if (!isNaN(p) && p > 0) subTotal += p;
          });

          // Exact sum of main field + all subfields
          const itemTotalCur = Math.round((basePrice + subTotal) * 100) / 100;
          const itemTotalBrl = (currency === 'USD') ? Math.round(itemTotalCur * rate * 100) / 100 : itemTotalCur;

          itemizedServices.push({ name: res.label, price: itemTotalBrl, displayPrice: itemTotalCur });
          sumItemizedBrl += itemTotalBrl;
        } else if (cb.value === 'Motion Graphics') {
          const mins = parseInt(document.getElementById(`${pkgId}-motion-mins`)?.value) || 1;
          const res = calculateMotionPrice(mins);
          const priceInput = document.getElementById(`${pkgId}-price-motion`);
          let basePrice = parseFloat(priceInput?.value);
          if (isNaN(basePrice) || basePrice < 0) basePrice = (currency === 'USD' ? (res.total / rate) : res.total);

          const subfields = getSubfieldsData(pkgId, 'motion');
          let subTotal = 0;
          subfields.forEach(s => {
            const p = parseFloat(s.price);
            if (!isNaN(p) && p > 0) subTotal += p;
          });

          // Exact sum of main field + all subfields
          const itemTotalCur = Math.round((basePrice + subTotal) * 100) / 100;
          const itemTotalBrl = (currency === 'USD') ? Math.round(itemTotalCur * rate * 100) / 100 : itemTotalCur;

          itemizedServices.push({ name: res.label, price: itemTotalBrl, displayPrice: itemTotalCur });
          sumItemizedBrl += itemTotalBrl;
        } else if (cb.value === 'Personalizado') {
          const customRows = document.querySelectorAll(`#${pkgId}-custom-items-list .bc-custom-item-row`);
          customRows.forEach(row => {
            const customText = row.querySelector('.bc-custom-text-input')?.value.trim() || '';
            const customPriceVal = parseFloat(row.querySelector('.bc-custom-item-price-input')?.value) || 0;
            const priceBrl = (currency === 'USD') ? Math.round(customPriceVal * rate * 100) / 100 : customPriceVal;
            const name = customText ? `Personalizado: ${customText}` : 'Personalizado';
            itemizedServices.push({
              name: name,
              price: priceBrl,
              displayPrice: customPriceVal,
              customText: customText,
              customPrice: customPriceVal
            });
            sumItemizedBrl += priceBrl;
            customItemsData.push({ text: customText, price: customPriceVal });
          });
        } else {
          const itemId = cb.dataset.itemId;
          const itemObj = SERVICE_ITEMS.find(s => s.id === itemId || s.name === cb.value);
          const defaultPrice = itemObj?.price || 0;
          const priceInput = document.getElementById(`${pkgId}-price-${itemId}`);
          let basePrice = parseFloat(priceInput?.value);
          if (isNaN(basePrice) || basePrice < 0) basePrice = (currency === 'USD' ? (defaultPrice / rate) : defaultPrice);

          const subfields = getSubfieldsData(pkgId, itemId);
          let subTotal = 0;
          subfields.forEach(s => {
            const p = parseFloat(s.price);
            if (!isNaN(p) && p > 0) subTotal += p;
          });

          // Exact sum of main field + all subfields
          const itemTotalCur = Math.round((basePrice + subTotal) * 100) / 100;
          const itemTotalBrl = (currency === 'USD') ? Math.round(itemTotalCur * rate * 100) / 100 : itemTotalCur;

          itemizedServices.push({ name: cb.value, price: itemTotalBrl, displayPrice: itemTotalCur });
          sumItemizedBrl += itemTotalBrl;
        }
      });

      const services = itemizedServices.map(s => s.name);

      if (services.length === 0 || isNaN(amount) || amount <= 0) {
        return { valid: false, message: 'Preencha os campos necessários.' };
      }

      let convertedBrl = amount;
      if (currency === 'USD') {
        convertedBrl = amount * rate;
      }

      // Check difference for Discount or Total adjustment
      const diffBrl = Math.round((convertedBrl - sumItemizedBrl) * 100) / 100;
      if (diffBrl < -0.05) {
        const discountVal = Math.abs(diffBrl);
        const discountDisplay = currency === 'USD' ? (discountVal / rate) : discountVal;
        itemizedServices.push({
          name: 'Desconto',
          price: -discountVal,
          displayPrice: -discountDisplay,
          isDiscount: true
        });
      } else if (diffBrl > 0.05) {
        const adjustVal = diffBrl;
        const adjustDisplay = currency === 'USD' ? (adjustVal / rate) : adjustVal;
        itemizedServices.push({
          name: 'Acréscimo / Ajuste',
          price: adjustVal,
          displayPrice: adjustDisplay,
          isCustomAdjust: true
        });
      }

      // Collect subfields mapping for draft restoration
      const subfieldsMap = {};
      SERVICE_ITEMS.forEach(sItem => {
        const sSubs = getSubfieldsData(pkgId, sItem.id);
        if (sSubs.length > 0) {
          subfieldsMap[sItem.id] = sSubs;
        }
      });

      packagesData.push({
        packageNumber: i + 1,
        packageName: packageName,
        services: services,
        itemizedServices: itemizedServices,
        subfields: subfieldsMap,
        customItems: customItemsData,
        currency: currency,
        amount: amount,
        convertedBrl: convertedBrl,
        deadline: deadline || ''
      });
    }

    // Create Proposal Payload & Slug
    const clientSlug = slugify(client);
    const projectSlug = slugify(project);
    const fullSlug = `${clientSlug}/${projectSlug}`;

    const proposalPayload = {
      slug: fullSlug,
      brand: brand,
      brandColor: brandColor,
      brandFooter: brandFooter,
      brandTitle: brandTitle,
      client: client,
      project: project,
      date: date,
      expirationDate: expirationDate,
      exchangeRate: usdToBrlRate,
      packages: packagesData,
      createdAt: Date.now()
    };

    return { valid: true, payload: proposalPayload, clientSlug, projectSlug };
  }

  if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', () => {
      const result = collectAndValidateFormData();
      if (!result.valid) {
        showAlert(result.message, 'danger');
        return;
      }

      StorageEngine.saveProposal(result.payload);
      populateDatalists();
      showAlert('Orçamento salvo com sucesso!', 'success');
    });
  }

  if (budgetForm) {
    budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = collectAndValidateFormData();
      if (!result.valid) {
        showAlert(result.message, 'danger');
        return;
      }

      StorageEngine.saveProposal(result.payload);
      showAlert('Orçamento gerado e publicado com sucesso!', 'success');

      // Update URL route to proposal view e.g. /bc/cliente/projeto or ?c=...&p=...
      const proposalUrl = `${window.location.pathname}?c=${result.clientSlug}&p=${result.projectSlug}`;
      window.history.pushState({}, '', proposalUrl);
      route();
    });
  }

  /* ==========================================================================
     7. CLIENT PROPOSAL VIEW RENDERER & EXPIRED CHECK
     ========================================================================== */
  function renderProposalPage(clientSlug, projectSlug) {
    const slugKey = `${clientSlug}/${projectSlug}`;
    const proposal = StorageEngine.getProposalBySlug(slugKey);

    if (!proposal) {
      proposalView.style.display = 'block';
      proposalView.innerHTML = `
        <div class="proposal-expired-card">
          <h2>Orçamento Não Encontrado</h2>
          <p>Não encontramos uma proposta para este link. Verifique a URL ou entre em contato com a equipe da Novel.</p>
          <a href="../index.html" class="bc-btn bc-btn-primary" style="margin-top: 1.5rem;">Ir para o Site da Novel</a>
        </div>`;
      return;
    }

    // Check Auto-Expiration Date
    const todayStr = formatDateForInput(new Date());
    if (todayStr > proposal.expirationDate) {
      proposalView.style.display = 'block';
      proposalView.innerHTML = `
        <div class="proposal-expired-card">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d9534f" stroke-width="2" style="margin-bottom: 1rem;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2>Proposta Expirada</h2>
          <p style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 1.5rem;">
            Proposta expirada em <strong>${formatDateToBR(proposal.expirationDate)}</strong>.<br>
            Entre em contato com a Novel para atualizar seu orçamento.
          </p>
          <a href="mailto:adm@novel.art.br" class="bc-btn bc-btn-primary">Falar com a Novel</a>
        </div>`;
      return;
    }

    // Render Active Proposal
    proposalView.style.display = 'block';

    const brandColor = proposal.brandColor || (proposal.brand === 'giffu' ? '#FD5E01' : '#EE7000');
    const brandFooter = proposal.brandFooter || (proposal.brand === 'giffu'
      ? 'Dilan Giffú · Motion Artist & Filmmaker · Portfólio: giffu.com.br'
      : 'Novel Produtora Audiovisual · novel.art.br · adm@novel.art.br');
    const brandTagTitle = proposal.brand === 'giffu' ? 'PROPOSTA COMERCIAL • GIFFÚ' : 'PROPOSTA COMERCIAL';

    const packagesHtml = proposal.packages.map(pkg => {
      const currencySymbol = pkg.currency === 'USD' ? 'US$' : 'R$';
      const formattedAmount = formatNumber(pkg.amount);
      const conversionHtml = pkg.currency === 'USD'
        ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
            Equivalente a <strong>R$ ${formatNumber(pkg.convertedBrl)}</strong> (Cotado em tempo real)
           </div>`
        : '';

      const displayName = pkg.packageName || `Pacote ${String(pkg.packageNumber).padStart(2, '0')}`;
      const deadlineText = pkg.deadline ? `<span style="font-size: 0.9rem; font-weight: 500; color: var(--text-muted);">Prazo: ${formatDateToBR(pkg.deadline)}</span>` : '';

      const itemsList = pkg.itemizedServices || pkg.services.map(s => ({ name: s, price: 0 }));

      return `
        <div class="proposal-package-view" style="border-top: 3px solid ${brandColor};">
          <h3>
            <span>${escapeHtml(displayName)}</span>
            ${deadlineText}
          </h3>

          <ul class="proposal-services-list" style="display: flex; flex-direction: column; gap: 0.65rem;">
            ${itemsList.map(s => {
              const symbol = pkg.currency === 'USD' ? 'US$' : 'R$';
              let priceBadge = '';
              if (s.isDiscount) {
                const val = Math.abs(s.displayPrice || s.price);
                priceBadge = `<span style="color: #d9534f; font-weight: 700; margin-left: auto;">-${symbol} ${formatNumber(val)}</span>`;
              } else if (s.isCustomAdjust) {
                const val = s.displayPrice || s.price;
                priceBadge = `<span style="color: var(--primary); font-weight: 700; margin-left: auto;">+${symbol} ${formatNumber(val)}</span>`;
              } else if (s.price !== undefined && s.price !== null) {
                const val = (s.displayPrice !== undefined && s.displayPrice !== null) ? s.displayPrice : (pkg.currency === 'USD' ? (s.price / (proposal.exchangeRate || usdToBrlRate)) : s.price);
                priceBadge = `<span style="font-weight: 700; margin-left: auto; color: var(--dark-slate);">${symbol} ${formatNumber(val)}</span>`;
              }

              return `
                <li style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; border-bottom: 1px dashed rgba(64,64,64,0.12); padding-bottom: 0.45rem;">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span style="font-weight: 500;">${escapeHtml(s.name)}</span>
                  </div>
                  ${priceBadge}
                </li>`;
            }).join('')}
          </ul>

          <div class="proposal-investment-box" style="border-top-color: ${brandColor};">
            <div>
              <span style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--dark-slate); font-weight: 600;">Investimento Total</span>
              ${conversionHtml}
            </div>
            <div class="proposal-investment-amount">${currencySymbol} ${formattedAmount}</div>
          </div>
        </div>`;
    }).join('');

    proposalView.innerHTML = `
      <!-- Action Bar (Web Only, Excluded from PDF) -->
      <div class="no-print" style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" id="bc-btn-download-pdf" class="bc-btn bc-btn-primary" style="background-color: ${brandColor};" onclick="NovelBC.downloadPdf()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Baixar PDF
        </button>
      </div>

      <!-- Printable Proposal Container (PDF Export Target) -->
      <div id="proposal-printable-area">
        <!-- Hero Card -->
        <div class="proposal-header-hero">
          <div>
            <span style="font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; color: ${brandColor}; font-weight: 700;">${brandTagTitle}</span>
            <h1 style="font-size: 2.2rem; color: #fff; margin-top: 0.25rem;">${escapeHtml(proposal.project)}</h1>
          </div>

          <div class="proposal-meta-grid">
            <div class="proposal-meta-item">
              <small>Cliente</small>
              <span>${escapeHtml(proposal.client)}</span>
            </div>
            <div class="proposal-meta-item">
              <small>Data de Emissão</small>
              <span>${formatDateToBR(proposal.date)}</span>
            </div>
            <div class="proposal-meta-item">
              <small>Validade da Proposta</small>
              <span>${formatDateToBR(proposal.expirationDate)}</span>
            </div>
          </div>
        </div>

        <!-- Packages List -->
        <div>
          ${packagesHtml}
        </div>

        <!-- Brand Footer Note -->
        <div style="text-align: center; margin-top: 3rem; padding-top: 1.5rem; border-top: var(--border-fine); color: var(--text-muted); font-size: 0.85rem;">
          <p>
            ${proposal.brand === 'giffu'
              ? `Dilan Giffú · Motion Artist & Filmmaker · Portfólio: <a href="https://giffu.com.br" target="_blank" style="color: ${brandColor}; text-decoration: underline; font-weight: 600;">https://giffu.com.br</a>`
              : `Novel Produtora Audiovisual · <a href="https://novel.art.br" target="_blank" style="color: ${brandColor}; text-decoration: underline; font-weight: 600;">novel.art.br</a> · <a href="mailto:adm@novel.art.br" style="color: inherit; text-decoration: underline;">adm@novel.art.br</a>`
            }
          </p>
        </div>
      </div>`;
  }

  /* ==========================================================================
     8. PDF GENERATION EXPORTER
     ========================================================================== */
  function downloadPdf() {
    const element = document.getElementById('proposal-printable-area');
    if (!element) return;

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Orçamento_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  }

  /* ==========================================================================
     9. UTILITIES & ALERTS
     ========================================================================== */
  function showAlert(message, type = 'danger') {
    if (!globalAlert) return;
    globalAlert.className = `bc-alert bc-alert-${type}`;
    globalAlert.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>`;
    globalAlert.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      globalAlert.style.display = 'none';
    }, 6000);
  }

  function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove non-word chars
      .replace(/\-\-+/g, '-');        // Replace multiple - with single -
  }

  function formatDateForInput(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateToBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function formatNumber(val) {
    return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return SecurityEngine.sanitizeInput(str || '');
  }

  // Global namespace exports for inline onclick handlers
  window.NovelBC = {
    onBrandChange,
    togglePackageCollapse,
    removePackage,
    toggleCustomText,
    adjustCustomItemsQty,
    onCustomQtyInputChange,
    setCustomItemsCount,
    removeSpecificCustomItem,
    onCustomItemChange,
    onServiceCheckChange,
    onItemPriceInput,
    onReelsQtyChange,
    onMotionMinsChange,
    onCurrencyChange,
    addSubfield,
    removeSubfield,
    onSubfieldChange,
    toggleSubfields,
    updateCurrencyConversion,
    updatePackageSummary,
    recalculatePackageSum,
    downloadPdf
  };
});
