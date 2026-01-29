import { Student, AnnouncementSettings } from './types';

export const SCHOOL_INFO = {
  name: "SMA NEGERI 1 PADANGAN",
  address: "Jl. Dr. Sutomo No. 2, Padangan, Bojonegoro, Jawa Timur 62162",
  phone: "(0353) 551465",
  email: "info@sman1padangan.sch.id",
  website: "www.sman1padangan.sch.id",
  logoPlaceholder: "https://via.placeholder.com/100x100/003366/FFD700?text=SMAN1"
};

export const INITIAL_SETTINGS: AnnouncementSettings = {
  // Default to 1 hour from now for demo purposes, or a fixed date
  releaseDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), 
  isLive: false,
  schoolYear: "2023/2024",
  headmaster: "Drs. H. MASYHADI, M.Pd.",
  headmasterNip: "19680101 199003 1 005"
};

export const MOCK_STUDENTS: Student[] = [
  {
    id: "1",
    nisn: "1234567890",
    examNumber: "24-001-001",
    name: "AHMAD SANTOSO",
    className: "XII MIPA 1",
    status: "LULUS",
    birthPlace: "Bojonegoro",
    birthDate: "2006-05-15",
    grades: [
      { name: "Pendidikan Agama", score: 88 },
      { name: "PPKn", score: 85 },
      { name: "Bahasa Indonesia", score: 90 },
      { name: "Matematika", score: 82 },
      { name: "Sejarah Indonesia", score: 86 },
      { name: "Bahasa Inggris", score: 89 },
      { name: "Seni Budaya", score: 85 },
      { name: "PJOK", score: 88 },
      { name: "Fisika", score: 80 },
      { name: "Kimia", score: 84 },
      { name: "Biologi", score: 87 },
    ]
  },
  {
    id: "2",
    nisn: "0987654321",
    examNumber: "24-001-002",
    name: "SITI AMINAH",
    className: "XII IPS 2",
    status: "LULUS",
    birthPlace: "Padangan",
    birthDate: "2006-08-20",
    grades: [
      { name: "Pendidikan Agama", score: 92 },
      { name: "PPKn", score: 88 },
      { name: "Bahasa Indonesia", score: 94 },
      { name: "Matematika", score: 85 },
      { name: "Sejarah Indonesia", score: 90 },
      { name: "Bahasa Inggris", score: 91 },
      { name: "Seni Budaya", score: 90 },
      { name: "PJOK", score: 85 },
      { name: "Geografi", score: 88 },
      { name: "Sejarah", score: 89 },
      { name: "Sosiologi", score: 92 },
    ]
  },
   {
    id: "3",
    nisn: "1122334455",
    examNumber: "24-001-003",
    name: "BUDI PRAKOSO",
    className: "XII MIPA 3",
    status: "TIDAK LULUS",
    birthPlace: "Cepu",
    birthDate: "2005-12-10",
    grades: [
      { name: "Pendidikan Agama", score: 70 },
      { name: "Matematika", score: 45 },
      { name: "Bahasa Indonesia", score: 60 },
    ]
  }
];