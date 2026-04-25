/* ═══════════════════════════════════════
   FLUX — User Profile Manager
   ═══════════════════════════════════════ */

const FluxProfile = {
  isBound: false,
  activeUser: null,
  storageKey: 'flux_profile',
  data: {
    displayName: '',
    username: '',
    bio: '',
    goalHours: 4,
    banner: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
    photoURL: '',
  },

  init(user) {
    this.activeUser = user || null;
    this.storageKey = this.getStorageKey(user);

    if (!user) {
      const btn = document.getElementById('profile-avatar-btn');
      if (btn) btn.classList.add('hidden');
      return;
    }

    // Migrate legacy profile key to user-scoped key once.
    const legacy = Flux.load('flux_profile', null);
    const saved = Flux.load(this.storageKey, legacy || {});
    if (legacy && !Flux.load(this.storageKey, null)) {
      Flux.saveNow(this.storageKey, legacy);
    }

    // Merge auth provider data with saved profile
    if (user) {
      this.data.displayName = Flux.cleanText(saved.displayName || user.displayName || '', 40);
      this.data.username    = Flux.cleanText(saved.username || '', 24);
      this.data.bio         = Flux.cleanText(saved.bio || '', 120);
      this.data.goalHours   = saved.goalHours || 4;
      this.data.banner      = saved.banner || 'linear-gradient(135deg,#8b5cf6,#06b6d4)';
      this.data.photoURL    = saved.photoURL || user.photoURL || '';
    }

    this.renderHeader(user);
    if (!this.isBound) this.bindEvents();
  },

  getStorageKey(user) {
    const uid = Flux.cleanText(user?.uid || 'guest', 64);
    return `flux_profile_${uid}`;
  },

  getFallbackAvatar(name) {
    const fallback = window.FluxAuthUtils?.fallbackAvatarDataUri;
    if (typeof fallback === 'function') {
      return fallback(name);
    }

    const safeName = Flux.cleanText(name || 'Flux User', 40) || 'Flux User';
    const initials = safeName.slice(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect width="200" height="200" rx="100" fill="url(#g)"/><text x="100" y="118" font-size="72" font-family="Arial,sans-serif" text-anchor="middle" fill="#fff">${initials}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  getAvatarSource(user) {
    if (this.data.photoURL) return this.data.photoURL;
    return this.getFallbackAvatar(this.data.displayName || user?.displayName || user?.email || 'Flux User');
  },

  optimizeAvatarFile(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        try {
          const targetSize = 320;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas not supported'));
            return;
          }

          const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
          const sx = Math.floor((image.naturalWidth - cropSize) / 2);
          const sy = Math.floor((image.naturalHeight - cropSize) / 2);

          ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);

          const optimized = canvas.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(objectUrl);
          resolve(optimized);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load selected image'));
      };

      image.src = objectUrl;
    });
  },

  renderHeader(user) {
    const btn = document.getElementById('profile-avatar-btn');
    const img = document.getElementById('profile-avatar-img');
    const initials = document.getElementById('profile-avatar-initials');

    if (!btn) return;
    btn.classList.remove('hidden');

    const fallbackName = this.data.displayName || user?.displayName || user?.email || 'Flux User';
    img.src = this.getAvatarSource(user);
    img.alt = this.data.displayName || user?.displayName || user?.email || 'Profile photo';
    img.style.display = 'block';
    img.onerror = () => {
      this.data.photoURL = '';
      img.src = this.getFallbackAvatar(fallbackName);
      this.persist();
    };
    if (initials) initials.style.display = 'none';
  },

  openMenu() {
    const menu = document.getElementById('profile-avatar-menu');
    if (!menu) return;
    menu.classList.remove('hidden');
  },

  closeMenu() {
    const menu = document.getElementById('profile-avatar-menu');
    if (!menu) return;
    menu.classList.add('hidden');
  },

  toggleMenu() {
    const menu = document.getElementById('profile-avatar-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
  },

  openModal() {
    const overlay = document.getElementById('profile-modal-overlay');
    overlay.classList.remove('hidden');
    this.populateModal();
    requestAnimationFrame(() => overlay.classList.add('open'));
  },

  closeModal() {
    const overlay = document.getElementById('profile-modal-overlay');
    overlay.classList.remove('open');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  },

  populateModal() {
    // Banner
    document.getElementById('profile-banner').style.background = this.data.banner;
    document.querySelectorAll('.banner-color-opt').forEach(el => {
      el.classList.toggle('active', el.dataset.color === this.data.banner);
    });

    // Avatar
    const mImg = document.getElementById('profile-modal-avatar-img');
    const mInit = document.getElementById('profile-modal-avatar-initials');
    mImg.src = this.getAvatarSource(this.activeUser);
    mImg.style.display = 'block';
    mImg.onerror = () => {
      mImg.src = this.getFallbackAvatar(this.data.displayName || this.activeUser?.displayName || this.activeUser?.email || 'Flux User');
    };
    if (mInit) mInit.style.display = 'none';

    const removeBtn = document.getElementById('profile-photo-remove-btn');
    if (removeBtn) removeBtn.disabled = !this.data.photoURL;

    // Fields
    document.getElementById('profile-display-name').value = this.data.displayName;
    document.getElementById('profile-username').value = this.data.username;
    document.getElementById('profile-bio').value = this.data.bio;
    document.getElementById('profile-goal-slider').value = this.data.goalHours;
    document.getElementById('profile-goal-val').textContent = this.data.goalHours + 'h';

    // Stats strip
    const stats = Flux.load('flux_stats', {});
    const todos = Flux.load('flux_todos', []);
    document.getElementById('pstrip-streak').textContent = stats.streak || 0;
    document.getElementById('pstrip-sessions').textContent =
      Object.values(stats.sessions || {}).reduce((a, b) => a + b, 0);
    document.getElementById('pstrip-tasks').textContent =
      todos.filter(t => t.completed).length;
  },

  bindEvents() {
    this.isBound = true;

    document.getElementById('profile-avatar-btn')?.addEventListener('click', () => {
      this.toggleMenu();
      FluxAudio.buttonClick();
    });

    document.getElementById('profile-menu-open')?.addEventListener('click', () => {
      this.closeMenu();
      this.openModal();
      FluxAudio.buttonClick();
    });

    document.getElementById('profile-menu-signout')?.addEventListener('click', () => {
      this.closeMenu();
      window.FluxAuth?.signOut();
      FluxAudio.buttonClick();
    });

    document.addEventListener('click', (e) => {
      const btn = document.getElementById('profile-avatar-btn');
      const menu = document.getElementById('profile-avatar-menu');
      if (!btn || !menu) return;
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        this.closeMenu();
      }
    });

    document.getElementById('profile-modal-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('profile-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('profile-modal-overlay')) this.closeModal();
    });

    // Banner color picks
    document.getElementById('profile-banner')?.addEventListener('click', (e) => {
      const opt = e.target.closest('.banner-color-opt');
      if (!opt) return;
      this.data.banner = opt.dataset.color;
      document.getElementById('profile-banner').style.background = this.data.banner;
      document.querySelectorAll('.banner-color-opt').forEach(el => el.classList.remove('active'));
      opt.classList.add('active');
    });

    // Goal slider
    document.getElementById('profile-goal-slider')?.addEventListener('input', (e) => {
      this.data.goalHours = parseInt(e.target.value);
      document.getElementById('profile-goal-val').textContent = this.data.goalHours + 'h';
    });

    document.getElementById('profile-photo-upload-btn')?.addEventListener('click', () => {
      document.getElementById('profile-photo-input')?.click();
      FluxAudio.buttonClick();
    });

    document.getElementById('profile-photo-input')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const maxSizeBytes = 2 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        Flux.showToast('Image too large (max 2MB).');
        e.target.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        Flux.showToast('Please select a valid image file.');
        e.target.value = '';
        return;
      }

      try {
        const optimizedUrl = await this.optimizeAvatarFile(file);
        this.data.photoURL = optimizedUrl;
        this.renderHeader();
        this.populateModal();
        this.persist();
        Flux.showToast('Profile photo updated and optimized.');
      } catch {
        Flux.showToast('Could not process image. Try another file.');
      }

      e.target.value = '';
    });

    document.getElementById('profile-photo-remove-btn')?.addEventListener('click', () => {
      this.data.photoURL = '';
      this.renderHeader();
      this.populateModal();
      this.persist();
      Flux.showToast('Profile photo removed.');
      FluxAudio.buttonClick();
    });

    // Save
    document.getElementById('profile-save-btn')?.addEventListener('click', () => {
      this.data.displayName = Flux.cleanText(document.getElementById('profile-display-name').value, 40);
      this.data.username = Flux.cleanText(document.getElementById('profile-username').value.replace(/\s/g, ''), 24);
      this.data.bio = Flux.cleanText(document.getElementById('profile-bio').value, 120);
      this.persist();

      this.renderHeader();

      // Refresh stats strip
      document.getElementById('pstrip-streak').textContent = Flux.load('flux_stats', {}).streak || 0;

      Flux.showToast('Profile saved ✨');
      FluxAudio.taskComplete();
      this.closeModal();
    });

    // Sign out from modal
    document.getElementById('profile-signout-btn')?.addEventListener('click', () => {
      window.FluxAuth?.signOut();
      this.closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeMenu();
    });
  },

  persist() {
    Flux.saveNow(this.storageKey, this.data);
  }
};

if (window.FluxAuthState?.user) {
  FluxProfile.init(window.FluxAuthState.user);
}

window.addEventListener('flux-auth-ready', (event) => {
  FluxProfile.init(event.detail?.user || null);
});
