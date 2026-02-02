export interface SubjectGrade {
  name: string;
  score: number;
}

export interface Student {
  id: string;
  nisn: string;
  examNumber: string;
  name: string;
  className: string;
  status: 'LULUS' | 'TIDAK LULUS' | 'DITUNDA';
  grades: SubjectGrade[];
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
}

export interface AnnouncementSettings {
  releaseDate: string; // ISO String
  isLive: boolean;
  schoolYear: string;
  headmaster: string;
  headmasterNip: string;
  // Popup Configuration
  popupEnabled?: boolean;
  popupText?: string;
  popupDuration?: number; // in seconds
}

export interface AppState {
  students: Student[];
  settings: AnnouncementSettings;
  setSettings: (settings: AnnouncementSettings) => void;
  importStudents: (students: Student[]) => void;
  getAllStudents: () => Promise<Student[]>;
}