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

function normalizeError(error, fallbackMessage) {
  console.error('Supabase error:', error);

  if (!navigator.onLine) {
    return new Error('You appear to be offline. Please reconnect and try again.');
  }

  if (error?.message) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

function resolveOnboardingComplete(profile) {
  if (!profile) {
    return false;
  }

  if (typeof profile.onboardingComplete === 'boolean') {
    return profile.onboardingComplete;
  }

  if (typeof profile.onboarding_complete === 'boolean') {
    return profile.onboarding_complete;
  }

  return Boolean(
    profile.name &&
    profile.age &&
    profile.gender &&
    profile.height &&
    profile.weight &&
    profile.goal
  );
}

function mapUserWithProfile(sessionUser, profile) {
  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    name: profile?.name || sessionUser.user_metadata?.name || sessionUser.email || 'User',
    onboardingComplete: resolveOnboardingComplete(profile),
    profile: profile || null
  };
}

async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw normalizeError(error, 'Unable to check your session.');
  }

  return data.session || null;
}

async function getProfileByUserId(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw normalizeError(error, 'Unable to load your profile.');
  }

  return data || null;
}

async function upsertProfileForUser(user, profileData = {}) {
  const supabase = getSupabaseClient();
  const payload = {
    id: user.id,
    email: user.email || '',
    ...profileData
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw normalizeError(error, 'Unable to save your profile.');
  }

  currentUserCache = mapUserWithProfile(user, data);
  return currentUserCache;
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
    throw normalizeError(error, 'Unable to create your account.');
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
    throw normalizeError(error, 'Unable to log in.');
  }

  return data;
}

async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeError(error, 'Unable to log out.');
  }

  currentUserCache = null;
}

const AuthManager = {
  async signup(name, email, password) {
    const data = await signUp(email, password, { name });
    const user = data.user;

    if (!user) {
      throw new Error('Signup succeeded, but no user was returned.');
    }

    if (!data.session) {
      currentUserCache = null;
      return {
        id: user.id,
        email: user.email || email,
        name,
        onboardingComplete: false,
        profile: null,
        emailConfirmationRequired: true
      };
    }

    await upsertProfileForUser(user, { name });
    const profile = await getProfileByUserId(user.id);
    const mappedUser = mapUserWithProfile(user, profile);
    currentUserCache = mappedUser;

    return {
      ...mappedUser,
      emailConfirmationRequired: false
    };
  },

  async login(email, password) {
    const data = await signIn(email, password);
    const sessionUser = data.user;

    if (!sessionUser) {
      throw new Error('Login succeeded, but no user was returned.');
    }

    const profile = await getProfileByUserId(sessionUser.id);
    currentUserCache = mapUserWithProfile(sessionUser, profile);
    return currentUserCache;
  },

  async logout() {
    await signOut();
    window.location.href = 'index.html';
  },

  async getCurrentUser(force = false) {
    if (currentUserCache && !force) {
      return currentUserCache;
    }

    const session = await getSession();

    if (!session?.user) {
      currentUserCache = null;
      return null;
    }

    const profile = await getProfileByUserId(session.user.id);
    currentUserCache = mapUserWithProfile(session.user, profile);
    return currentUserCache;
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
    const session = await getSession();

    if (!session?.user) {
      throw new Error('You must be logged in to update your profile.');
    }

    const payload = {
      ...profileData
    };

    if (onboardingComplete) {
      payload.onboardingComplete = true;
    }

    return upsertProfileForUser(session.user, payload);
  },

  async setOnboardingComplete() {
    const user = await this.getCurrentUser(true);

    if (!user) {
      throw new Error('You must be logged in to update your profile.');
    }

    return upsertProfileForUser(
      { id: user.id, email: user.email, user_metadata: { name: user.name } },
      {
        ...(user.profile || {}),
        onboardingComplete: true
      }
    );
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

    if (!user) {
      throw new Error('You must be logged in to update your profile.');
    }

    return this.updateProfile(
      {
        ...(user.profile || {}),
        checkInFrequency: freq
      },
      user.onboardingComplete
    );
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
  },

  getSession,
  getProfileByUserId,
  upsertProfileForUser
};

window.getSupabaseClient = getSupabaseClient;
window.AuthManager = AuthManager;
window.signUp = signUp;
window.signIn = signIn;
