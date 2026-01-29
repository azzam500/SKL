import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Student, AnnouncementSettings } from '../types';
import { MOCK_STUDENTS, INITIAL_SETTINGS } from '../constants';

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In a real app, load from LocalStorage or API
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [settings, setSettings] = useState<AnnouncementSettings>(INITIAL_SETTINGS);

  // Simulate loading from local storage to persist admin changes on refresh
  useEffect(() => {
    const savedSettings = localStorage.getItem('sman1_settings');
    const savedStudents = localStorage.getItem('sman1_students');
    
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedStudents) setStudents(JSON.parse(savedStudents));
  }, []);

  const updateSettings = (newSettings: AnnouncementSettings) => {
    setSettings(newSettings);
    localStorage.setItem('sman1_settings', JSON.stringify(newSettings));
  };

  const importStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    localStorage.setItem('sman1_students', JSON.stringify(newStudents));
  };

  return (
    <AppContext.Provider value={{ students, settings, setSettings: updateSettings, importStudents }}>
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