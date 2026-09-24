export const roleNavigation = {
  contractor: {
    tabs: [
      { name: 'jobs', label: 'Jobs', title: 'Available jobs', icon: 'briefcase-outline', activeIcon: 'briefcase' },
      { name: 'bid', label: 'Bids', title: 'My bids', icon: 'document-text-outline', activeIcon: 'document-text' },
      { name: 'milestones', label: 'Proof', title: 'Proof of work', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done' },
      { name: 'chat', label: 'Chat', title: 'Messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
      { name: 'profile', label: 'Me', title: 'Profile', icon: 'person-circle-outline', activeIcon: 'person-circle' },
    ],
    details: ['bid-submit/[jobId]', 'chat/[id]'],
  },
  homeowner: {
    tabs: [
      { name: 'jobs', label: 'Jobs', title: 'My jobs', icon: 'home-outline', activeIcon: 'home' },
      { name: 'post-job', label: 'Post', title: 'Post a job', icon: 'add-circle-outline', activeIcon: 'add-circle' },
      { name: 'milestones', label: 'Steps', title: 'Project milestones', icon: 'list-outline', activeIcon: 'list' },
      { name: 'chat', label: 'Chat', title: 'Messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
      { name: 'profile', label: 'Me', title: 'Profile', icon: 'person-circle-outline', activeIcon: 'person-circle' },
    ],
    details: ['job/[id]', 'job/[id]/bids', 'chat/[id]'],
  },
} as const;
