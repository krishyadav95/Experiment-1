const SUPABASE_URL = 'https://tyyflyitcpsuqhbnvyjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5eWZseWl0Y3BzdXFoYm52eWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjkxMDcsImV4cCI6MjA5MTI0NTEwN30.4rTwXx7iDAKs8IX9lL9StlQ_qXbqY8oRr1ktUusJsGo';

let supabaseClientInstance = null;
let currentUserCache = null;

function getSupabaseClient() {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase library failed to load. Refresh the page and try again.');
  }

  supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClientInstance;
}

function normalizeAuthError(error, fallbackMessage) {
  console.error('Supabase request failed:', error);

  if (!navigator.onLine) {
    return new Error('You appear to be offline. Please reconnect and try again.');
  }

  if (error?.message) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

async function ensureProfile(user, profile = {}) {
  const supabase = getSupabaseClient();
  const payload = {
    id: user.id,
    email: user.email,
    name: profile.name || user.user_metadata?.name || ''
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.warn('Profile upsert skipped:', error);
  }

  return payload;
}

async function loadUserProfile(user) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Profile lookup skipped:', error);
  }

  const mergedUser = {
    id: user.id,
    email: user.email,
    name: data?.name || user.user_metadata?.name || user.email,
    onboardingComplete: Boolean(data?.onboardingComplete ?? data?.onboarding_complete),
    profile: data || null
  };

  currentUserCache = mergedUser;
  return mergedUser;
}

async function signUp(email, password, metadata = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (error) {
    throw normalizeAuthError(error, 'Unable to create your account.');
  }

  return data;
}

async function signIn(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw normalizeAuthError(error, 'Unable to log in.');
  }

  return data;
}

async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeAuthError(error, 'Unable to log out.');
  }

  currentUserCache = null;
}

const AuthManager = {
  async signup(name, email, password) {
    try {
      const data = await signUp(email, password, { name });
      const user = data.user;

      if (!user) {
        throw new Error('Signup succeeded, but no user was returned.');
      }

      if (!data.session) {
        currentUserCache = null;
        return {
          id: user.id,
          email: user.email,
          name,
          onboardingComplete: false,
          profile: null,
          emailConfirmationRequired: true
        };
      }

      await ensureProfile(user, { name });
      const profileUser = await loadUserProfile(user);
      return {
        ...profileUser,
        emailConfirmationRequired: false
      };
    } catch (error) {
      throw normalizeAuthError(error, 'Signup failed.');
    }
  },

  async login(email, password) {
    try {
      const data = await signIn(email, password);
      const user = data.user;

      if (!user) {
        throw new Error('Login succeeded, but no user was returned.');
      }

      return loadUserProfile(user);
    } catch (error) {
      throw normalizeAuthError(error, 'Login failed.');
    }
  },

  async logout() {
    await signOut();
    window.location.href = 'index.html';
  },

  async getCurrentUser(force = false) {
    if (currentUserCache && !force) {
      return currentUserCache;
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!data?.user) {
        currentUserCache = null;
        return null;
      }

      return loadUserProfile(data.user);
    } catch (error) {
      throw normalizeAuthError(error, 'Unable to check your session.');
    }
  },

  async requireAuth(redirectTo = 'index.html') {
    const user = await this.getCurrentUser(true);
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    return user;
  },

  async updateProfile(profileData, onboardingComplete = false) {
    const user = await this.getCurrentUser(true);

    if (!user) {
      throw new Error('You must be logged in to update your profile.');
    }

    const supabase = getSupabaseClient();
    const payload = {
      id: user.id,
      email: user.email,
      ...profileData,
      onboardingComplete
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw normalizeAuthError(error, 'Unable to save your profile.');
    }

    currentUserCache = {
      ...user,
      name: data?.name || user.name,
      onboardingComplete: Boolean(data?.onboardingComplete),
      profile: data
    };

    return currentUserCache;
  },

  async setOnboardingComplete() {
    const user = await this.getCurrentUser(true);
    return this.updateProfile(user?.profile || {}, true);
  },

  async isLoggedIn(force = false) {
    return Boolean(await this.getCurrentUser(force));
  },

  async hasCompletedOnboarding() {
    const user = await this.getCurrentUser(true);
    return Boolean(user?.onboardingComplete);
  },

  async getLatestReport() {
    return null;
  },

  async getReports() {
    return [];
  },

  async setCheckInFrequency(freq) {
    const user = await this.getCurrentUser(true);
    const profile = user?.profile || {};
    return this.updateProfile({ ...profile, checkInFrequency: freq }, user?.onboardingComplete || false);
  },

  async getAiStatus() {
    return {
      connected: true,
      message: ''
    };
  },

  trackEvent(eventName, metadata = {}) {
    console.info('Analytics event:', eventName, metadata);
    return Promise.resolve();
  }
};

window.getSupabaseClient = getSupabaseClient;
window.signUp = signUp;
window.signIn = signIn;
window.AuthManager = AuthManager;
