import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, AnnouncementSettings } from '../types';
import { INITIAL_SETTINGS } from '../constants';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

interface AppContextType {
  user: User | null;
  settings: AnnouncementSettings;
  loading: boolean;
  setSettings: (settings: AnnouncementSettings) => Promise<void>;
  searchStudent: (queryStr: string) => Promise<Student | null>;
  getStudentById: (id: string) => Promise<Student | null>;
  importStudents: (students: Student[]) => Promise<void>;
  logout: () => Promise<void>;
  isDemoMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Fallback data for Demo Mode
const FALLBACK_STUDENT: Student = {
  id: "demo-1",
  nisn: "1234567890",
  examNumber: "24-001-001",
  name: "AHMAD SANTOSO (DEMO)",
  className: "XII MIPA 1",
  status: "LULUS",
  birthPlace: "Bojonegoro",
  birthDate: "2006-05-15",
  grades: [
    { name: "Pendidikan Agama", score: 88 },
    { name: "Matematika", score: 82 },
    { name: "Bahasa Indonesia", score: 90 },
  ]
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettingsState] = useState<AnnouncementSettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Initialize Auth and Fetch Settings
  useEffect(() => {
    // If config is missing, skip Firebase init
    if (!isFirebaseConfigured) {
      console.warn("Firebase config is missing. App running in Demo Mode.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'announcement');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettingsState(docSnap.data() as AnnouncementSettings);
        } else {
          // Initialize DB with default settings if not exists
          await setDoc(docRef, INITIAL_SETTINGS);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: AnnouncementSettings) => {
    setSettingsState(newSettings);
    if (!isFirebaseConfigured) return;
    
    try {
      await setDoc(doc(db, 'config', 'announcement'), newSettings);
    } catch (e) {
      console.error("Error saving settings:", e);
      throw e;
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  const searchStudent = async (queryStr: string): Promise<Student | null> => {
    // Fallback for Demo Mode
    if (!isFirebaseConfigured) {
      if (queryStr === '1234567890') return FALLBACK_STUDENT;
      return null;
    }

    // 1. Try finding by NISN
    const studentsRef = collection(db, 'students');
    const qNisn = query(studentsRef, where("nisn", "==", queryStr));
    const snapshotNisn = await getDocs(qNisn);

    if (!snapshotNisn.empty) {
      const docData = snapshotNisn.docs[0].data();
      return { ...docData, id: snapshotNisn.docs[0].id } as Student;
    }

    // 2. Try finding by Exam Number
    const qExam = query(studentsRef, where("examNumber", "==", queryStr));
    const snapshotExam = await getDocs(qExam);

    if (!snapshotExam.empty) {
      const docData = snapshotExam.docs[0].data();
      return { ...docData, id: snapshotExam.docs[0].id } as Student;
    }

    return null;
  };

  const getStudentById = async (id: string): Promise<Student | null> => {
    if (!isFirebaseConfigured) {
      if (id === 'demo-1') return FALLBACK_STUDENT;
      return null;
    }

    try {
      const docRef = doc(db, 'students', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Student;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  const importStudents = async (newStudents: Student[]) => {
    if (!isFirebaseConfigured) {
      alert("Mode Demo: Data tidak disimpan ke database.");
      return;
    }

    const batch = writeBatch(db);
    newStudents.forEach((student) => {
      const docRef = doc(db, 'students', student.nisn); 
      batch.set(docRef, student);
    });
    await batch.commit();
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      settings, 
      loading, 
      setSettings: updateSettings, 
      searchStudent, 
      getStudentById,
      importStudents,
      logout,
      isDemoMode: !isFirebaseConfigured
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};