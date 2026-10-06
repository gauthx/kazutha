
const IS_DEV = process.env.NODE_ENV !== 'production';

export const FeatureFlags = {
  evictStaleRooms: !IS_DEV,
} as const;
