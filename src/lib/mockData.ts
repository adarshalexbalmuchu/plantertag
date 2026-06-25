export interface Tree {
  id: number;
  planter_name: string;
  species: string;
  planted_date: string;
  main_photo_url: string;
  latitude: number;
  longitude: number;
  location: string;
}

export interface TreeLog {
  id: string;
  tree_id: number;
  type: 'photo' | 'visit';
  photo_url?: string;
  note?: string;
  staff_name: string;
  created_at: string;
}

const DEFAULT_TREES: Tree[] = [
  {
    id: 1,
    planter_name: "Birsa Oraon",
    species: "Sal (Shorea robusta)",
    planted_date: "2026-06-25",
    main_photo_url: "/demo/tree_mature.png",
    latitude: 23.854120,
    longitude: 84.123450,
    location: "Kasturba School, PTR"
  },
  {
    id: 2,
    planter_name: "Karmi Munda",
    species: "Mahua (Madhuca longifolia)",
    planted_date: "2026-06-25",
    main_photo_url: "/demo/tree_mature.png",
    latitude: 23.861250,
    longitude: 84.135600,
    location: "Kasturba School, PTR"
  },
  {
    id: 3,
    planter_name: "Sukhram Ho",
    species: "Arjun (Terminalia arjuna)",
    planted_date: "2026-06-25",
    main_photo_url: "/demo/tree_growing.png",
    latitude: 23.842340,
    longitude: 84.112340,
    location: "Kasturba School, PTR"
  },
  {
    id: 4,
    planter_name: "Phulo Soren",
    species: "Neem (Azadirachta indica)",
    planted_date: "2026-06-25",
    main_photo_url: "/demo/tree_sapling.png",
    latitude: 23.871120,
    longitude: 84.148760,
    location: "Kasturba School, PTR"
  },
  {
    id: 5,
    planter_name: "Lakhiram Tudu",
    species: "Teak (Tectona grandis)",
    planted_date: "2026-06-25",
    main_photo_url: "/demo/tree_growing.png",
    latitude: 23.859000,
    longitude: 84.129900,
    location: "Kasturba School, PTR"
  }
];

const DEFAULT_LOGS: TreeLog[] = [
  // Tree 1: 3 visits, 2 photos
  {
    id: "log-1-v1",
    tree_id: 1,
    type: "visit",
    note: "Initial base fertilization complete.",
    staff_name: "Ramesh Kerketta",
    created_at: "2026-06-25T08:00:00.000Z"
  },
  {
    id: "log-1-p1",
    tree_id: 1,
    type: "photo",
    photo_url: "/demo/tree_sapling.png",
    note: "Planting day snapshot.",
    staff_name: "Sunita Tigga",
    created_at: "2026-06-25T09:15:00.000Z"
  },
  {
    id: "log-1-v2",
    tree_id: 1,
    type: "visit",
    note: "Watered in the evening, soil moisture verified.",
    staff_name: "Ajay Lakra",
    created_at: "2026-06-25T16:30:00.000Z"
  },
  {
    id: "log-1-v3",
    tree_id: 1,
    type: "visit",
    note: "Checked trunk health. Clear.",
    staff_name: "Poonam Minz",
    created_at: "2026-06-26T08:45:00.000Z"
  },
  {
    id: "log-1-p2",
    tree_id: 1,
    type: "photo",
    photo_url: "/demo/tree_tended.png",
    note: "Weeded around tree guard.",
    staff_name: "Deepak Toppo",
    created_at: "2026-06-26T14:20:00.000Z"
  },

  // Tree 2: 2 visits, 1 photo
  {
    id: "log-2-v1",
    tree_id: 2,
    type: "visit",
    note: "Soil aerated and watered.",
    staff_name: "Sunita Tigga",
    created_at: "2026-06-25T08:15:00.000Z"
  },
  {
    id: "log-2-p1",
    tree_id: 2,
    type: "photo",
    photo_url: "/demo/tree_growing.png",
    note: "Initial health checkup photo.",
    staff_name: "Ajay Lakra",
    created_at: "2026-06-25T10:00:00.000Z"
  },
  {
    id: "log-2-v2",
    tree_id: 2,
    type: "visit",
    note: "Evening checking. Watering complete.",
    staff_name: "Deepak Toppo",
    created_at: "2026-06-25T17:00:00.000Z"
  },

  // Tree 3: 4 visits, 2 photos
  {
    id: "log-3-v1",
    tree_id: 3,
    type: "visit",
    note: "Planting support post set up.",
    staff_name: "Ramesh Kerketta",
    created_at: "2026-06-25T07:45:00.000Z"
  },
  {
    id: "log-3-p1",
    tree_id: 3,
    type: "photo",
    photo_url: "/demo/tree_sapling.png",
    note: "Planted sapling profile.",
    staff_name: "Poonam Minz",
    created_at: "2026-06-25T09:00:00.000Z"
  },
  {
    id: "log-3-v2",
    tree_id: 3,
    type: "visit",
    note: "Root watered thoroughly.",
    staff_name: "Ajay Lakra",
    created_at: "2026-06-25T16:15:00.000Z"
  },
  {
    id: "log-3-v3",
    tree_id: 3,
    type: "visit",
    note: "Pest barrier applied.",
    staff_name: "Sunita Tigga",
    created_at: "2026-06-26T09:10:00.000Z"
  },
  {
    id: "log-3-p2",
    tree_id: 3,
    type: "photo",
    photo_url: "/demo/tree_tended.png",
    note: "Tended base check.",
    staff_name: "Deepak Toppo",
    created_at: "2026-06-26T15:00:00.000Z"
  },
  {
    id: "log-3-v4",
    tree_id: 3,
    type: "visit",
    note: "Standard morning watering.",
    staff_name: "Ramesh Kerketta",
    created_at: "2026-06-27T08:00:00.000Z"
  },

  // Tree 4: 1 visit, 1 photo
  {
    id: "log-4-v1",
    tree_id: 4,
    type: "visit",
    note: "First watering visit logged.",
    staff_name: "Poonam Minz",
    created_at: "2026-06-25T08:30:00.000Z"
  },
  {
    id: "log-4-p1",
    tree_id: 4,
    type: "photo",
    photo_url: "/demo/tree_sapling.png",
    note: "Neem sapling initial capture.",
    staff_name: "Ramesh Kerketta",
    created_at: "2026-06-25T11:30:00.000Z"
  },

  // Tree 5: 2 visits, 2 photos
  {
    id: "log-5-v1",
    tree_id: 5,
    type: "visit",
    note: "Base cleared and watered.",
    staff_name: "Ajay Lakra",
    created_at: "2026-06-25T08:45:00.000Z"
  },
  {
    id: "log-5-p1",
    tree_id: 5,
    type: "photo",
    photo_url: "/demo/tree_sapling.png",
    note: "Initial teak sapling photo.",
    staff_name: "Sunita Tigga",
    created_at: "2026-06-25T10:15:00.000Z"
  },
  {
    id: "log-5-v2",
    tree_id: 5,
    type: "visit",
    note: "Evening checking and watering.",
    staff_name: "Deepak Toppo",
    created_at: "2026-06-25T17:15:00.000Z"
  },
  {
    id: "log-5-p2",
    tree_id: 5,
    type: "photo",
    photo_url: "/demo/tree_growing.png",
    note: "Tended progress check.",
    staff_name: "Poonam Minz",
    created_at: "2026-06-26T11:00:00.000Z"
  }
];

export function getTrees(): Tree[] {
  if (typeof window === 'undefined') return DEFAULT_TREES;
  const stored = localStorage.getItem('ptr_trees');
  if (!stored) {
    localStorage.setItem('ptr_trees', JSON.stringify(DEFAULT_TREES));
    return DEFAULT_TREES;
  }
  return JSON.parse(stored);
}

export function getLogs(): TreeLog[] {
  if (typeof window === 'undefined') return DEFAULT_LOGS;
  const stored = localStorage.getItem('ptr_logs');
  if (!stored) {
    localStorage.setItem('ptr_logs', JSON.stringify(DEFAULT_LOGS));
    return DEFAULT_LOGS;
  }
  return JSON.parse(stored);
}

export function addLog(log: Omit<TreeLog, 'id' | 'created_at'>) {
  if (typeof window === 'undefined') return;
  const logs = getLogs();
  const newLog: TreeLog = {
    ...log,
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  logs.push(newLog);
  localStorage.setItem('ptr_logs', JSON.stringify(logs));
}

export function getSession(): { email: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('ptr_session');
  return stored ? JSON.parse(stored) : null;
}

export function signIn() {
  if (typeof window === 'undefined') return;
  const session = { email: 'demo@ptr.org', name: 'Demo Staff' };
  localStorage.setItem('ptr_session', JSON.stringify(session));
}

export function signOut() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ptr_session');
}
