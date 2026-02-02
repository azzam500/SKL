import { AnnouncementSettings } from './types';

export const SCHOOL_INFO = {
  name: "SMA NEGERI 1 PADANGAN",
  address: "Jl. Dr. Sutomo No. 2, Padangan, Bojonegoro, Jawa Timur 62162",
  phone: "(0353) 551465",
  email: "info@sman1padangan.sch.id",
  website: "www.sman1padangan.sch.id",
  logoPlaceholder: "https://via.placeholder.com/100x100/003366/FFD700?text=SMAN1"
};

export const INITIAL_SETTINGS: AnnouncementSettings = {
  // Default fallback settings
  releaseDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), 
  isLive: false,
  schoolYear: "2023/2024",
  headmaster: "Drs. H. MASYHADI, M.Pd.",
  headmasterNip: "19680101 199003 1 005",
  // Popup Defaults
  popupEnabled: true,
  popupText: "Gunakan NISN atau Nomor Peserta Ujian yang valid untuk mengecek status kelulusan Anda.",
  popupDuration: 10
};

// MOCK_STUDENTS removed to ensure data security via Firestore