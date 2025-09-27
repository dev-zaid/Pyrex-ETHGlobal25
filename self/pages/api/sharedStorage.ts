// Shared in-memory storage for user options and configurations
const userOptionsStorage = new Map<string, { options: any; timestamp: number }>();

// Clean up expired entries (older than 30 minutes)
export const cleanupExpiredEntries = () => {
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  for (const [key, value] of userOptionsStorage.entries()) {
    if (value.timestamp < thirtyMinutesAgo) {
      userOptionsStorage.delete(key);
    }
  }
};

// Store user options
export const setUserOptions = (userId: string, options: any) => {
  userOptionsStorage.set(userId, {
    options: options,
    timestamp: Date.now()
  });
};

// Get user options
export const getUserOptions = (userId: string): any => {
  const entry = userOptionsStorage.get(userId);
  if (!entry) {
    return null;
  }
  
  // Check if expired
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  if (entry.timestamp < thirtyMinutesAgo) {
    userOptionsStorage.delete(userId);
    return null;
  }
  
  return entry.options;
};

// Initialize default configuration for a user
export const initializeUserConfig = (userId: string) => {
  const defaultConfig = {
    minimumAge: 18,
    excludedCountries: [],
    ofac: true,
    issuing_state: false,
    name: false,
    nationality: true,
    date_of_birth: false,
    passport_number: false,
    gender: false,
    expiry_date: false
  };
  
  setUserOptions(userId, defaultConfig);
  return defaultConfig;
};
