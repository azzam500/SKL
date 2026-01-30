import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, Save, Settings, Users, LogOut, CheckCircle, Loader2, AlertTriangle, AlertCircle, FileSpreadsheet, Download, XCircle, Search, List, ArrowUpDown, Filter, Plus, Edit2, Trash2, X, PlusCircle, MinusCircle } from 'lucide-react';
import { Student, SubjectGrade } from '../types';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';

const Admin: React.FC = () => {
  const { user, settings, setSettings, importStudents, getAllStudents, logout, isDemoMode } = useApp();
  const [email, setEmail] = useState('admin@sman1padangan.sch.id');
  const [password, setPassword] = useState('');
  
  // JSON State
  const [jsonInput, setJsonInput] = useState('');
  
  // CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [failedRows, setFailedRows] = useState<string[]>([]); // Detailed error list
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const [activeTab, setActiveTab] = useState<'settings' | 'upload' | 'list'>('settings');
  const [tempSettings, setTempSettings] = useState(settings);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // List View State
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);

  // Student Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const initialStudentState: Student = {
    id: '',
    nisn: '',
    examNumber: '',
    name: '',
    className: '',
    status: 'LULUS',
    birthPlace: '',
    birthDate: '',
    grades: [
      { name: 'Pendidikan Agama', score: 0 },
      { name: 'Matematika', score: 0 },
      { name: 'Bahasa Indonesia', score: 0 },
    ]
  };
  const [studentForm, setStudentForm] = useState<Student>(initialStudentState);

  // Local state for demo/bypass auth
  const [demoAuth, setDemoAuth] = useState(false);

  const navigate = useNavigate();

  const fetchStudentsList = async () => {
    setIsFetchingList(true);
    try {
      const data = await getAllStudents();
      setStudentList(data);
    } catch (error) {
      console.error("Failed to fetch students", error);
      setMessage({ type: 'error', text: 'Gagal mengambil data siswa.' });
    } finally {
      setIsFetchingList(false);
    }
  };

  // Fetch student list when tab is active
  useEffect(() => {
    if (activeTab === 'list' && isAuthenticated) {
      fetchStudentsList();
    }
  }, [activeTab]);

  // Helper to convert ISO string (UTC) to local datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocalISOString = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Get the timezone offset in minutes and convert to milliseconds
    const offset = date.getTimezoneOffset() * 60000;
    // Adjust the date to local time by subtracting the offset
    // Note: getTimezoneOffset returns positive minutes for zones behind UTC (e.g., UTC-5 is 300)
    // and negative for zones ahead (e.g., UTC+7 is -420).
    // So date.getTime() - offset gives the milliseconds that correspond to the local time value in UTC representation.
    const localDate = new Date(date.getTime() - offset);
    // Return the ISO string slice for datetime-local
    return localDate.toISOString().slice(0, 16);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // 1. Check Demo Mode
    if (isDemoMode) {
      if (password === 'admin123') {
        setDemoAuth(true);
      } else {
        setMessage({ type: 'error', text: 'Password salah (Mode Demo: gunakan admin123)' });
      }
      setIsLoading(false);
      return;
    }

    // 2. Try Firebase Auth
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // 3. Fallback: Allow specific credential bypass if Firebase fails
      // This allows the user to access admin features even without the real DB password
      if (email === 'admin@sman1padangan.sch.id' && password === 'admin123') {
         setDemoAuth(true);
         setIsLoading(false);
         return;
      }

      console.error("Login Error:", error);
      
      let errorMessage = 'Login gagal. Periksa email dan password.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Akun ini telah dinonaktifkan.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Email tidak terdaftar.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Password salah.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Email atau password salah.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Gagal terhubung. Periksa koneksi internet Anda.';
          break;
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setDemoAuth(false);
    if (!isDemoMode && user) {
      await logout();
    }
    navigate('/');
  }

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      if (demoAuth && !isDemoMode && !user) {
         // If logged in via bypass but connected to firebase, we might not have permission to write to Firestore rules
         try {
            await setSettings(tempSettings);
            setMessage({ type: 'success', text: 'Pengaturan disimpan!' });
         } catch (err) {
            console.warn("Firestore write failed (expected for bypass user):", err);
            setMessage({ type: 'success', text: 'Pengaturan disimpan (Simulasi/Local)' });
         }
      } else {
         await setSettings(tempSettings);
         setMessage({ type: 'success', text: isDemoMode ? 'Pengaturan disimpan (Sementara)' : 'Pengaturan berhasil disimpan ke Database!' });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- STUDENT CRUD OPERATIONS ---

  const handleOpenAddModal = () => {
    setStudentForm(initialStudentState);
    setValidationError(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setStudentForm(JSON.parse(JSON.stringify(student))); // Deep copy
    setValidationError(null);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (student: Student) => {
    if(!window.confirm(`Yakin ingin menghapus siswa ${student.name}?`)) return;

    setIsLoading(true);
    try {
      if (!isDemoMode) {
           await deleteDoc(doc(db, 'students', student.id));
      } else {
           console.warn("Demo Mode: Delete simulated");
      }
      
      setMessage({ type: 'success', text: `Siswa ${student.name} berhasil dihapus.` });
      await fetchStudentsList();
    } catch (e: any) {
      console.error(e);
      setMessage({ type: 'error', text: 'Gagal menghapus data: ' + e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationError(null);
    
    try {
        if (!studentForm.nisn || !studentForm.name) {
            throw new Error("NISN dan Nama wajib diisi");
        }

        const studentId = studentForm.nisn; // Use NISN as ID
        const studentData = { ...studentForm, id: studentId };

        if (!isDemoMode) {
             await setDoc(doc(db, 'students', studentId), studentData);
        }
        
        setMessage({ type: 'success', text: isEditing ? 'Data siswa diperbarui!' : 'Siswa baru ditambahkan!' });
        setIsModalOpen(false);
        await fetchStudentsList();
    } catch (error: any) {
        console.error(error);
        setMessage({ type: 'error', text: 'Gagal menyimpan data: ' + error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFormChange = (field: keyof Student, value: any) => {
    setStudentForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGradeChange = (index: number, field: keyof SubjectGrade, value: any) => {
    const newGrades = [...studentForm.grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setStudentForm(prev => ({ ...prev, grades: newGrades }));
  };

  const addSubject = () => {
    setStudentForm(prev => ({
        ...prev,
        grades: [...prev.grades, { name: '', score: 0 }]
    }));
  };

  const removeSubject = (index: number) => {
    const newGrades = studentForm.grades.filter((_, i) => i !== index);
    setStudentForm(prev => ({ ...prev, grades: newGrades }));
  };

  // --- CSV UPLOAD LOGIC ---

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      // Artificial delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 800));

      const headers = ['nisn', 'examNumber', 'name', 'className', 'status', 'birthPlace', 'birthDate', 'Pendidikan Agama', 'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'];
      const dummyRow = ['1234567890', '24-001-001', 'Contoh Siswa', 'XII MIPA 1', 'LULUS', 'Bojonegoro', '2006-05-15', '85', '90', '88', '82'];
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" + dummyRow.join(",");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "template_siswa.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Template download failed:", e);
      setMessage({ type: 'error', text: 'Gagal mendownload template.' });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);
    setUploadProgress(0);
    setProcessedRecords(0);
    setFailedRows([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawData = results.data as any[];
          const parsedStudents: Student[] = [];
          const validationErrors: string[] = [];

          // 1. Handle PapaParse Specific Errors (Non-blocking if possible)
          if (results.errors && results.errors.length > 0) {
             results.errors.forEach(e => {
                 let msg = e.message;
                 if (e.code === 'MissingQuotes') msg = 'Tanda kutip tidak lengkap';
                 if (e.code === 'TooManyFields') msg = 'Terlalu banyak kolom';
                 if (e.code === 'TooFewFields') msg = 'Kurang kolom';
                 
                 const rowLoc = e.row !== undefined ? `Baris ${e.row + 1}` : 'Unknown';
                 validationErrors.push(`${rowLoc}: CSV Error - ${msg}`);
             });
          }

          if (rawData.length === 0 && validationErrors.length === 0) {
             throw new Error("File CSV kosong atau tidak terbaca.");
          }

          rawData.forEach((row, index) => {
            // PapaParse 0-indexed data corresponds to Line 2 (header is 1)
            const rowNum = index + 2;
            const nisn = row.nisn?.toString().trim();
            const name = row.name?.toString().trim();

            // Strict Validation for Required Fields
            const missingFields = [];
            if (!nisn) missingFields.push('nisn');
            if (!name) missingFields.push('name');

            if (missingFields.length > 0) {
               validationErrors.push(`Baris ${rowNum}: Gagal - Kolom wajib diisi (${missingFields.join(', ')})`);
               return; // Skip this record
            }

            // Extract Grades (Dynamic column handling could be improved, but using headers for now)
            const grades: SubjectGrade[] = [];
            Object.keys(row).forEach(key => {
              if (!['nisn', 'examNumber', 'name', 'className', 'status', 'birthPlace', 'birthDate', 'id'].includes(key)) {
                const score = parseFloat(row[key]);
                if (!isNaN(score)) {
                  grades.push({ name: key, score: score });
                }
              }
            });

            parsedStudents.push({
              id: nisn, // Use NISN as ID
              nisn: nisn,
              examNumber: row.examNumber || '',
              name: name,
              className: row.className || '',
              status: (row.status?.toUpperCase() === 'LULUS' ? 'LULUS' : 
                       row.status?.toUpperCase() === 'DITUNDA' ? 'DITUNDA' : 'TIDAK LULUS'),
              birthPlace: row.birthPlace || '',
              birthDate: row.birthDate || '', // Expects YYYY-MM-DD
              grades: grades
            });
          });

          // Only block if NO valid students found
          if (parsedStudents.length === 0) {
             setFailedRows(validationErrors);
             throw new Error(`Tidak ada data valid yang ditemukan. ${validationErrors.length} baris memiliki error.`);
          }

          setTotalRecords(parsedStudents.length);
          await uploadInChunks(parsedStudents, validationErrors);
          
          if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message });
          setIsLoading(false);
          setFailedRows(prev => prev.length > 0 ? prev : [err.message]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (err) => {
        setMessage({ type: 'error', text: `Error membaca file: ${err.message}` });
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const uploadInChunks = async (students: Student[], initialErrors: string[] = []) => {
    const CHUNK_SIZE = 400; // Safe below Firestore 500 limit
    let processed = 0;

    try {
      for (let i = 0; i < students.length; i += CHUNK_SIZE) {
        const chunk = students.slice(i, i + CHUNK_SIZE);
        
        try {
          await importStudents(chunk);
        } catch (err) {
           console.warn("Import failed (likely permission issue in bypass mode):", err);
           if (!isDemoMode && demoAuth) {
             throw new Error("Izin ditolak. Login bypass tidak memiliki akses tulis ke database.");
           }
           throw err;
        }
        
        processed += chunk.length;
        setProcessedRecords(processed);
        setUploadProgress(Math.min(100, Math.round((processed / students.length) * 100)));
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }

      const successCount = students.length;
      const failCount = initialErrors.length;
      
      if (failCount > 0) {
          setFailedRows(initialErrors);
          setMessage({ 
              type: 'error', // Use error style to ensure visibility of issues
              text: `Upload Selesai: ${successCount} berhasil, ${failCount} gagal.` 
          });
      } else {
          setMessage({ 
              type: 'success', 
              text: `Sukses! ${successCount} data siswa berhasil diupload ke database.`
          });
      }

    } catch (e: any) {
      console.error(e);
      setMessage({ type: 'error', text: e.message || 'Terjadi kesalahan saat mengupload ke database.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSON UPLOAD LOGIC ---

  const handleJsonImportData = async () => {
    setIsLoading(true);
    setMessage(null);
    setFailedRows([]);
    try {
      const parsed: Student[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].nisn) {
        throw new Error('Format JSON tidak valid');
      }
      await importStudents(parsed);
      setMessage({ type: 'success', text: (isDemoMode || demoAuth) ? 'Simulasi Import Sukses' : `Berhasil mengimpor ${parsed.length} data siswa ke Firestore!` });
      setJsonInput('');
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Gagal memproses data.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- LIST SORTING & FILTERING ---
  const requestSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedStudents = useMemo(() => {
    let result = [...studentList];

    // Filter
    if (listSearch) {
      const lowerSearch = listSearch.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(lowerSearch) || 
        s.nisn.includes(lowerSearch) ||
        s.examNumber.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [studentList, listSearch, statusFilter, sortConfig]);

  const isAuthenticated = !!user || demoAuth;
  const userEmail = user?.email || (demoAuth ? 'admin@sman1padangan.sch.id (Local)' : 'demo@local');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 transform transition-all hover:shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-sman-blue shadow-inner">
               <Users className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Portal</h2>
            <p className="text-gray-500 mt-2 text-sm">Masuk untuk mengelola data kelulusan</p>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 text-blue-800 text-sm rounded-xl flex gap-3 items-start border border-blue-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Informasi Login:</strong>
              <div className="mt-1 opacity-90">Password default: <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-mono font-bold">admin123</code></div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sman-blue focus:ring-4 focus:ring-sman-blue/10 outline-none transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sman1padangan.sch.id"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-medium text-sman-blue hover:text-blue-800 transition-colors">
                  Lupa Password?
                </a>
              </div>
              <div className="relative group">
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sman-blue focus:ring-4 focus:ring-sman-blue/10 outline-none transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {message && message.type === 'error' && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0"/>
                    <span className="font-medium">{message.text}</span>
                </div>
            )}
            
            <button 
                type="submit"
                disabled={isLoading} 
                className="w-full bg-gradient-to-r from-sman-blue to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5"/>
                  <span className="opacity-90">Memproses...</span>
                </>
              ) : (
                "Masuk ke Dashboard"
              )}
            </button>
            
            <div className="pt-2 text-center">
              <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="text-gray-500 text-sm hover:text-sman-blue transition-colors font-medium flex items-center justify-center gap-2 mx-auto group"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Kembali ke Beranda
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              Login sebagai: {userEmail}
              {(isDemoMode || demoAuth) && !user && <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">BYPASS</span>}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded transition"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 min-w-[150px] py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'settings' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Settings className="w-5 h-5" /> Pengaturan
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 min-w-[150px] py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'upload' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Users className="w-5 h-5" /> Upload Data
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 min-w-[150px] py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'list' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <List className="w-5 h-5" /> Data Siswa
            </button>
          </div>

          <div className="p-8">
            {message && (
                <div className={`p-4 mb-6 rounded flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal & Jam Pengumuman (ISO Format)</label>
                  <input
                    type="datetime-local"
                    className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-sman-blue outline-none"
                    // Use helper to display local time (YYYY-MM-DDTHH:mm) correctly in 24h format
                    value={toLocalISOString(tempSettings.releaseDate)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      // Convert local time back to ISO string (UTC)
                      setTempSettings({...tempSettings, releaseDate: new Date(e.target.value).toISOString()})
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Siswa tidak dapat melihat hasil sebelum waktu ini.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Pelajaran</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-sman-blue outline-none"
                      value={tempSettings.schoolYear}
                      onChange={(e) => setTempSettings({...tempSettings, schoolYear: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                        <input
                        type="text"
                        className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-sman-blue outline-none"
                        value={tempSettings.headmaster}
                        onChange={(e) => setTempSettings({...tempSettings, headmaster: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                        <input
                        type="text"
                        className="w-full border p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-sman-blue outline-none"
                        value={tempSettings.headmasterNip}
                        onChange={(e) => setTempSettings({...tempSettings, headmasterNip: e.target.value})}
                        />
                    </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="bg-sman-blue text-white px-6 py-2 rounded hover:bg-blue-800 flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4" />}
                  Simpan Pengaturan
                </button>
              </div>
            )}
            
            {/* Rest of the component ... */}
            {/* TAB: UPLOAD */}
            {activeTab === 'upload' && (
              <div className="space-y-8">
                
                {/* CSV Upload Section */}
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600 w-6 h-6" />
                        <h3 className="font-bold text-lg">Bulk Upload CSV</h3>
                      </div>
                      <button 
                        onClick={downloadTemplate}
                        disabled={isDownloadingTemplate}
                        className="text-sm text-sman-blue hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {isDownloadingTemplate ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Menyiapkan...
                            </>
                         ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download Template CSV
                            </>
                         )}
                      </button>
                   </div>
                   
                   <p className="text-sm text-gray-600 mb-4">
                     Upload file CSV untuk menambahkan banyak siswa sekaligus. 
                     Format kolom: <code>nisn</code>, <code>name</code>, <code>status</code>, dll. 
                     Kolom lain akan otomatis dianggap sebagai Mata Pelajaran.
                   </p>

                   <div className="flex gap-4 items-center">
                     <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".csv"
                        disabled={isLoading}
                        onChange={handleCsvUpload}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-sman-blue
                          hover:file:bg-blue-100
                        "
                      />
                      {isLoading && uploadProgress > 0 && (
                        <span className="text-sm font-bold text-sman-blue whitespace-nowrap">
                          {uploadProgress}%
                        </span>
                      )}
                   </div>

                   {/* Progress Bar */}
                   {isLoading && uploadProgress > 0 && (
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                        <div 
                          className="bg-sman-blue h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                        <p className="text-xs text-center mt-1 text-gray-500">
                          Mengupload data siswa {processedRecords} dari {totalRecords}...
                        </p>
                     </div>
                   )}

                   {/* Failed Rows Detail */}
                   {failedRows.length > 0 && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="text-red-800 font-bold flex items-center gap-2 mb-2">
                            <XCircle className="w-5 h-5" />
                            Detail Error ({failedRows.length} baris):
                        </h4>
                        <div className="max-h-40 overflow-y-auto">
                            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                {failedRows.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                   )}
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Atau gunakan JSON</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* JSON Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Import Data Raw JSON</label>
                  <textarea
                    rows={5}
                    className="w-full border p-4 rounded font-mono text-sm bg-white text-gray-900 focus:ring-2 focus:ring-sman-blue outline-none"
                    placeholder="[{ 'nisn': '123', ... }]"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  ></textarea>
                  <button
                    onClick={handleJsonImportData}
                    disabled={isLoading}
                    className="mt-2 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 text-sm"
                  >
                     {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4" />}
                     Upload JSON
                  </button>
                </div>

              </div>
            )}

            {/* TAB: LIST */}
            {activeTab === 'list' && (
              <div className="space-y-4">
                 <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    {/* Add Button */}
                    <div className="order-2 md:order-3">
                         <button 
                             onClick={handleOpenAddModal}
                             className="bg-sman-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                         >
                             <Plus className="w-4 h-4" />
                             Tambah Siswa
                         </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-1/3 order-1 md:order-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Cari Nama, NISN, atau No Ujian..." 
                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-sman-blue outline-none text-sm bg-white text-gray-900"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                      />
                    </div>
                    
                    {/* Filter Status */}
                    <div className="flex items-center gap-2 w-full md:w-auto order-3 md:order-2">
                      <Filter className="text-gray-500 w-4 h-4" />
                      <select 
                        className="border p-2 rounded-lg text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-sman-blue"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="LULUS">Lulus</option>
                        <option value="TIDAK LULUS">Tidak Lulus</option>
                        <option value="DITUNDA">Ditunda</option>
                      </select>
                    </div>
                 </div>

                 <div className="mb-2 text-sm text-gray-500">
                      Total: {processedStudents.length} Siswa
                 </div>

                 {isFetchingList ? (
                   <div className="flex justify-center py-12">
                     <Loader2 className="animate-spin text-sman-blue w-8 h-8" />
                   </div>
                 ) : (
                   <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('nisn')}
                              >
                                <div className="flex items-center gap-1">NISN <ArrowUpDown className="w-3 h-3" /></div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('name')}
                              >
                                <div className="flex items-center gap-1">Nama Lengkap <ArrowUpDown className="w-3 h-3" /></div>
                              </th>
                              <th className="px-4 py-3">Kelas</th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('status')}
                              >
                                <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                              </th>
                              <th className="px-4 py-3 text-right">Rata-rata Nilai</th>
                              <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {processedStudents.length > 0 ? (
                              processedStudents.map((student) => {
                                const avgScore = (student.grades.reduce((acc, curr) => acc + curr.score, 0) / (student.grades.length || 1)).toFixed(2);
                                return (
                                  <tr key={student.id} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-mono text-gray-600">{student.nisn}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{student.className}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold
                                        ${student.status === 'LULUS' ? 'bg-green-100 text-green-800' : 
                                          student.status === 'TIDAK LULUS' ? 'bg-red-100 text-red-800' : 
                                          'bg-yellow-100 text-yellow-800'}`}>
                                        {student.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">{avgScore}</td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex justify-center gap-2">
                                        <button 
                                          onClick={() => handleOpenEditModal(student)}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                          title="Edit"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteStudent(student)}
                                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                          title="Hapus"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                  Tidak ada data siswa yang ditemukan.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STUDENT FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-gray-800">
                        {isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                    </h3>
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSaveStudent} className="p-6 space-y-6">
                    {/* Identity Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NISN (Wajib)</label>
                            <input 
                                type="text"
                                required 
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                value={studentForm.nisn}
                                onChange={(e) => handleFormChange('nisn', e.target.value)}
                                // Disable ID editing if in edit mode (simplification)
                                disabled={isEditing} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">No. Ujian</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                value={studentForm.examNumber}
                                onChange={(e) => handleFormChange('examNumber', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap (Wajib)</label>
                            <input 
                                type="text" 
                                required
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                value={studentForm.name}
                                onChange={(e) => handleFormChange('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                value={studentForm.className}
                                onChange={(e) => handleFormChange('className', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status Kelulusan</label>
                            <select 
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white"
                                value={studentForm.status}
                                onChange={(e) => handleFormChange('status', e.target.value)}
                            >
                                <option value="LULUS">LULUS</option>
                                <option value="TIDAK LULUS">TIDAK LULUS</option>
                                <option value="DITUNDA">DITUNDA</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                value={studentForm.birthPlace}
                                onChange={(e) => handleFormChange('birthPlace', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                            <input 
                                type="date" 
                                className="w-full border border-gray-600 p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                value={studentForm.birthDate}
                                onChange={(e) => handleFormChange('birthDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-800">Nilai Mata Pelajaran</h4>
                            <button 
                                type="button"
                                onClick={addSubject}
                                className="text-sm text-sman-blue hover:underline flex items-center gap-1"
                            >
                                <PlusCircle className="w-4 h-4" /> Tambah Mapel
                            </button>
                        </div>

                        {validationError && (
                          <div className="bg-red-50 text-red-600 p-3 mb-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {validationError}
                          </div>
                        )}
                        
                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                            {studentForm.grades.map((grade, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        placeholder="Nama Mapel"
                                        className="flex-grow border border-gray-600 p-2 rounded text-sm focus:ring-2 focus:ring-sman-blue outline-none bg-gray-700 text-white placeholder-gray-400"
                                        value={grade.name}
                                        onChange={(e) => handleGradeChange(idx, 'name', e.target.value)}
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="0-99"
                                        className="w-20 border border-gray-600 p-2 rounded text-sm focus:ring-2 focus:ring-sman-blue outline-none text-center bg-gray-700 text-white placeholder-gray-400"
                                        value={grade.score === 0 ? '' : grade.score}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            
                                            // Handle Empty (reset to 0 internally)
                                            if (val === '') {
                                                handleGradeChange(idx, 'score', 0);
                                                setValidationError(null);
                                                return;
                                            }

                                            // Max 2 chars length check (string based)
                                            if (val.length > 2) {
                                                setValidationError('Maksimal 2 digit angka.');
                                                return;
                                            }

                                            const numVal = parseFloat(val);

                                            // Numeric Range Check
                                            if (numVal > 99) {
                                                setValidationError('Nilai maksimal adalah 99 (2 digit).');
                                                return;
                                            }
                                            
                                            if (numVal < 0) return; // Prevention
                                            
                                            // Clear error if valid
                                            setValidationError(null);
                                            handleGradeChange(idx, 'score', numVal);
                                        }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => removeSubject(idx)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <MinusCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {studentForm.grades.length === 0 && (
                                <p className="text-center text-gray-500 text-sm italic">Belum ada nilai yang dimasukkan.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-sman-blue text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="animate-spin w-4 h-4" />}
                            Simpan Data
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Admin;