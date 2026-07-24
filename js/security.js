/**
 * NOVEL - Security Engine
 * Performs salted cryptographic SHA-256 verification via WebCrypto API.
 * Ensures zero plaintext credentials exist in client source code.
 * Includes rate-limiting, lockout timer, XSS sanitization, and session state.
 */

const SecurityEngine = (() => {
  const SALT = 'novel_audiovisual_2026_salt_v1';
  
  // Pre-computed salted SHA-256 hashes for credentials
  const EXPECTED_USER_HASH = '1c5b5409680fc3bee41f0973780e47b67d67902b50162f4111ebc8c852576263';
  const EXPECTED_PASS_HASH = '23743a248bacf7cd2449837501cd4c92bf05b6f7c2154aeef9e6216be1c3e581';
  
  const MAX_FAILED_ATTEMPTS = 3;
  const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds
  const SESSION_KEY = 'novel_admin_session_token_v1';
  
  let failedAttempts = 0;
  let lockoutUntil = 0;

  /**
   * Calculates SHA-256 hash using browser native Web Crypto API
   */
  async function computeSha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sanitizes string against XSS injection
   */
  function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Verifies login credentials using cryptographic comparison
   */
  async function authenticate(usernameInput, passwordInput) {
    const now = Date.now();
    if (now < lockoutUntil) {
      const remainingSecs = Math.ceil((lockoutUntil - now) / 1000);
      return {
        success: false,
        message: `Muitas tentativas incorretas. Tente novamente em ${remainingSecs} segundos.`
      };
    }

    const inputUserHash = await computeSha256(usernameInput.trim());
    const inputPassHash = await computeSha256(passwordInput.trim());

    if (inputUserHash === EXPECTED_USER_HASH && inputPassHash === EXPECTED_PASS_HASH) {
      // Reset rate limit counters
      failedAttempts = 0;
      lockoutUntil = 0;

      // Generate cryptographically secure random session token
      const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
        
      const sessionData = {
        token: sessionToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours validity
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      return { success: true, message: 'Autenticado com sucesso.' };
    } else {
      failedAttempts += 1;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        return {
          success: false,
          message: `Credenciais incorretas. Conta bloqueada temporariamente por 60 segundos.`
        };
      }
      return {
        success: false,
        message: `Usuário ou senha inválidos. (${MAX_FAILED_ATTEMPTS - failedAttempts} tentativa(s) restante(s))`
      };
    }
  }

  /**
   * Checks if user currently holds a valid admin session
   */
  function isAuthenticated() {
    try {
      const rawSession = sessionStorage.getItem(SESSION_KEY);
      if (!rawSession) return false;
      const session = JSON.parse(rawSession);
      if (Date.now() > session.expiresAt) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Destroys current session token
   */
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  return {
    authenticate,
    isAuthenticated,
    logout,
    sanitizeInput
  };
})();
