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

  // Exact Services List & Colored Badge Classes (Matching User's Image 2)
  const SERVICE_ITEMS = [
    { name: 'Same-Day / Realtime', cls: 'svc-red' },
    { name: 'Aftermovie', cls: 'svc-peach' },
    { name: 'Institucional', cls: 'svc-grey' },
    { name: 'Trailer', cls: 'svc-grey' },
    { name: 'Mini 30s', cls: 'svc-pink' },
    { name: 'Mini 1min', cls: 'svc-pink' },
    { name: 'Mini 1m30', cls: 'svc-pink' },
    { name: 'Vários Reels', cls: 'svc-pink' },
    { name: 'Ensaio/PW Teaser', cls: 'svc-mint' },
    { name: 'Love Story', cls: 'svc-mint' },
    { name: 'Teaser Festa', cls: 'svc-mint' },
    { name: 'Short Film 7min', cls: 'svc-gold' },
    { name: 'Short Film 10m', cls: 'svc-gold' },
    { name: 'Short Film 15min', cls: 'svc-gold' },
    { name: 'Short Film 20min', cls: 'svc-gold' },
    { name: 'Film 30min', cls: 'svc-gold' },
    { name: 'Cerimônia', cls: 'svc-tan' },
    { name: 'Motion Graphics', cls: 'svc-blue' },
    { name: 'Design/ID', cls: 'svc-blue' },
    { name: 'Foto Evento', cls: 'svc-grey' },
    { name: 'Captação Evento', cls: 'svc-grey' },
    { name: 'Foto Ensaio', cls: 'svc-grey' },
    { name: 'Captação Ensaio', cls: 'svc-grey' },
    { name: 'Drone Evento', cls: 'svc-grey' },
    { name: 'Drone Ensaio', cls: 'svc-grey' },
    { name: 'Produção Completa', cls: 'svc-purple' }
  ];

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
      const parts = hash.replace(/^#\/?/, '').split('/');
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
        const parts = subPath.split('/').filter(Boolean);
        if (parts.length >= 2 && parts[0] !== 'index.html') {
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

        if (Array.isArray(pkg.services)) {
          pkg.services.forEach(servText => {
            if (servText.startsWith('Personalizado')) {
              const customCheck = document.getElementById(`${pkgId}-custom-check`);
              const customBox = document.getElementById(`${pkgId}-custom-box`);
              const customText = document.getElementById(`${pkgId}-custom-text`);
              if (customCheck) customCheck.checked = true;
              if (customBox) customBox.classList.add('active');
              if (customText) {
                const customVal = servText.replace(/^Personalizado:\s*/, '').replace(/^Personalizado\s*/, '');
                customText.value = customVal;
              }
            } else {
              const allCbs = document.querySelectorAll(`input[name="${pkgId}-service"]`);
              allCbs.forEach(cb => {
                if (cb.value === servText) cb.checked = true;
              });
            }
          });
        }

        const currencySelect = document.getElementById(`${pkgId}-currency`);
        const amountInput = document.getElementById(`${pkgId}-amount`);
        if (currencySelect && pkg.currency) currencySelect.value = pkg.currency;
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
          <svg class="package-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <div class="package-body">
        <div class="bc-form-group">
          <label>Serviços <span class="required-star">*</span></label>
          <div class="bc-checkbox-grid">
            ${SERVICE_ITEMS.map((item) => `
              <label class="bc-checkbox-item ${item.cls}">
                <input type="checkbox" name="${pkgId}-service" value="${item.name}" onchange="NovelBC.updatePackageSummary('${pkgId}')">
                <span>${item.name}</span>
              </label>
            `).join('')}
            <label class="bc-checkbox-item svc-purple">
              <input type="checkbox" id="${pkgId}-custom-check" name="${pkgId}-service" value="Personalizado" onchange="NovelBC.toggleCustomText('${pkgId}')">
              <span>Personalizado</span>
            </label>
          </div>
          
          <div class="bc-custom-service-box" id="${pkgId}-custom-box">
            <input type="text" id="${pkgId}-custom-text" class="bc-input" placeholder="Descreva o serviço personalizado..." oninput="NovelBC.updatePackageSummary('${pkgId}')">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
          
          <!-- Investment Amount -->
          <div class="bc-form-group">
            <label for="${pkgId}-amount">Investimento <span class="required-star">*</span></label>
            <div class="bc-currency-input-group">
              <select id="${pkgId}-currency" class="bc-select bc-currency-select" onchange="NovelBC.updateCurrencyConversion('${pkgId}')">
                <option value="BRL">R$</option>
                <option value="USD">US$</option>
              </select>
              <input type="number" step="0.01" min="0" id="${pkgId}-amount" class="bc-input" placeholder="0.00" required oninput="NovelBC.updateCurrencyConversion('${pkgId}')">
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
            <input type="date" id="${pkgId}-deadline" class="bc-input">
          </div>
        </div>
      </div>`;

    packagesContainer.appendChild(card);
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

  function toggleCustomText(pkgId) {
    const check = document.getElementById(`${pkgId}-custom-check`);
    const box = document.getElementById(`${pkgId}-custom-box`);
    if (check && box) {
      if (check.checked) {
        box.classList.add('active');
      } else {
        box.classList.remove('active');
      }
    }
    updatePackageSummary(pkgId);
  }

  function updateCurrencyConversion(pkgId) {
    const currencySelect = document.getElementById(`${pkgId}-currency`);
    const amountInput = document.getElementById(`${pkgId}-amount`);
    const badge = document.getElementById(`${pkgId}-conversion-badge`);
    const badgeText = document.getElementById(`${pkgId}-conversion-text`);

    if (!currencySelect || !amountInput || !badge) return;

    const val = parseFloat(amountInput.value) || 0;
    if (currencySelect.value === 'USD' && val > 0) {
      const convertedBrl = val * usdToBrlRate;
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
    const selectedServices = checkedBoxes.map(cb => {
      if (cb.value === 'Personalizado') {
        const customText = document.getElementById(`${pkgId}-custom-text`)?.value.trim();
        return customText ? `Personalizado (${customText})` : 'Personalizado';
      }
      return cb.value;
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
  function collectAndValidateFormData() {
    const selectedBrandEl = document.querySelector('input[name="bc-brand"]:checked');
    const brand = selectedBrandEl ? selectedBrandEl.value : 'novel';

    let brandColor = '#EE7000';
    let brandFooter = 'Novel Produtora Audiovisual · novel.art.br · adm@novel.art.br';
    let brandTitle = 'NOVEL';

    if (brand === 'giffu') {
      brandColor = '#FD5E01';
      brandFooter = 'Dilan Giffú · Motion Artist & Filmmaker · dilan@novel.art.br';
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

    for (let i = 0; i < packageCards.length; i++) {
      const card = packageCards[i];
      const pkgId = card.id;

      const packageNameInput = document.getElementById(`${pkgId}-name-input`);
      const packageName = packageNameInput?.value.trim() || `Pacote ${String(i + 1).padStart(2, '0')}`;

      const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${pkgId}-service"]:checked`));
      const services = checkedBoxes.map(cb => {
        if (cb.value === 'Personalizado') {
          const customText = document.getElementById(`${pkgId}-custom-text`)?.value.trim();
          return customText ? `Personalizado: ${customText}` : 'Personalizado';
        }
        return cb.value;
      });

      const currency = document.getElementById(`${pkgId}-currency`).value;
      const amount = parseFloat(document.getElementById(`${pkgId}-amount`).value);
      const deadline = document.getElementById(`${pkgId}-deadline`).value;

      if (services.length === 0 || isNaN(amount) || amount <= 0) {
        return { valid: false, message: 'Preencha os campos necessários.' };
      }

      let convertedBrl = amount;
      if (currency === 'USD') {
        convertedBrl = amount * usdToBrlRate;
      }

      packagesData.push({
        packageNumber: i + 1,
        packageName: packageName,
        services: services,
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

  function onBrandChange(brandValue) {
    const novelLabel = document.getElementById('brand-label-novel');
    const giffuLabel = document.getElementById('brand-label-giffu');

    if (brandValue === 'giffu') {
      if (novelLabel) novelLabel.classList.remove('active');
      if (giffuLabel) giffuLabel.classList.add('active');
    } else {
      if (giffuLabel) giffuLabel.classList.remove('active');
      if (novelLabel) novelLabel.classList.add('active');
    }
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
      ? 'Dilan Giffú · Motion Artist & Filmmaker · dilan@novel.art.br'
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

      return `
        <div class="proposal-package-view" style="border-top: 3px solid ${brandColor};">
          <h3>
            <span>${escapeHtml(displayName)}</span>
            ${deadlineText}
          </h3>

          <ul class="proposal-services-list">
            ${pkg.services.map(s => `
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>${s}</span>
              </li>
            `).join('')}
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
          <p>${escapeHtml(brandFooter)}</p>
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
    updateCurrencyConversion,
    updatePackageSummary,
    downloadPdf
  };

});
