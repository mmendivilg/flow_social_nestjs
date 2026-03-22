export type ConfidenceTestProfile = {
  id: string;
  instagramHandle: string;
  avatarUrl: string;
  lastSeen: string;
  backgroundImageUrl: string;
};

export const CONFIDENCE_TEST_PROFILES: ConfidenceTestProfile[] = [
  {
    id: 'luna.ramirez',
    instagramHandle: '@luna.ramirez',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&h=256&auto=format&fit=crop',
    lastSeen: 'Seen 12m ago',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 'mia.soto',
    instagramHandle: '@mia.soto',
    avatarUrl:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=256&h=256&auto=format&fit=crop',
    lastSeen: 'Seen 1h ago',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 'nora.valdes',
    instagramHandle: '@nora.valdes',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop',
    lastSeen: 'Seen 3h ago',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 'sofia.cortez',
    instagramHandle: '@sofia.cortez',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&auto=format&fit=crop',
    lastSeen: 'Seen yesterday',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1974&auto=format&fit=crop',
  },
];
