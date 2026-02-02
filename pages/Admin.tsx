import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, Save, Settings, Users, LogOut, CheckCircle, Loader2, AlertTriangle, AlertCircle, FileSpreadsheet, Download, XCircle, Search, List, ArrowUpDown, Filter, Plus, Edit2, Trash2, X, PlusCircle, MinusCircle, MessageSquare } from 'lucide-react';
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

  // Update tempSettings when settings change (e.g. initial load)
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  // Helper to convert ISO string (UTC) to local datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocalISOString = (isoString: string) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
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
      if (email === 'admin@sman1padangan.sch.id' && password === 'admin123') {
         setDemoAuth(true);
         setIsLoading(false);
         return;
      }

      console.error("Login Error:", error);
      let errorMessage = 'Login gagal. Periksa email dan password.';
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
      await setSettings(tempSettings);
      setMessage({ type: 'success', text: isDemoMode ? 'Pengaturan disimpan (Sementara)' : 'Pengaturan berhasil disimpan ke Database!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ... (Other handlers unchanged for brevity)
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
        if (studentForm.birthDate) {
            const selectedDate = new Date(studentForm.birthDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(selectedDate.getTime())) throw new Error("Format tanggal lahir tidak valid.");
            if (selectedDate > today) throw new Error("Tanggal lahir tidak boleh di masa depan.");
        }
        const studentId = studentForm.nisn; 
        const studentData = { ...studentForm, id: studentId };
        if (!isDemoMode) {
             await setDoc(doc(db, 'students', studentId), studentData);
        }
        setMessage({ type: 'success', text: isEditing ? 'Data siswa diperbarui!' : 'Siswa baru ditambahkan!' });
        setIsModalOpen(false);
        await fetchStudentsList();
    } catch (error: any) {
        if (isModalOpen) setValidationError(error.message);
        else setMessage({ type: 'error', text: 'Gagal menyimpan data: ' + error.message });
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
    setStudentForm(prev => ({...prev, grades: [...prev.grades, { name: '', score: 0 }]}));
  };
  const removeSubject = (index: number) => {
    const newGrades = studentForm.grades.filter((_, i) => i !== index);
    setStudentForm(prev => ({ ...prev, grades: newGrades }));
  };

  // --- CSV & JSON UPLOAD (Unchanged logic needed for full file) ---
  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const headers = ['nisn', 'examNumber', 'name', 'className', 'status', 'birthPlace', 'birthDate', 'Pendidikan Agama', 'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'];
      const dummyRow = ['1234567890', '24-001-001', 'Contoh Siswa', 'XII MIPA 1', 'LULUS', 'Bojonegoro', '2006-05-15', '85', '90', '88', '82'];
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + dummyRow.join(",");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "template_siswa.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Template download failed:", e);
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
          if (results.errors && results.errors.length > 0) {
             results.errors.forEach(e => {
                 let msg = e.message;
                 const rowLoc = e.row !== undefined ? `Baris ${e.row + 1}` : 'Unknown';
                 validationErrors.push(`${rowLoc}: CSV Error - ${msg}`);
             });
          }
          if (rawData.length === 0 && validationErrors.length === 0) throw new Error("File CSV kosong.");
          rawData.forEach((row, index) => {
            const rowNum = index + 2;
            const nisn = row.nisn?.toString().trim();
            const name = row.name?.toString().trim();
            if (!nisn || !name) {
               validationErrors.push(`Baris ${rowNum}: Gagal - Kolom wajib diisi`);
               return; 
            }
            const grades: SubjectGrade[] = [];
            Object.keys(row).forEach(key => {
              if (!['nisn', 'examNumber', 'name', 'className', 'status', 'birthPlace', 'birthDate', 'id'].includes(key)) {
                const score = parseFloat(row[key]);
                if (!isNaN(score)) grades.push({ name: key, score: score });
              }
            });
            parsedStudents.push({
              id: nisn,
              nisn: nisn,
              examNumber: row.examNumber || '',
              name: name,
              className: row.className || '',
              status: (row.status?.toUpperCase() === 'LULUS' ? 'LULUS' : row.status?.toUpperCase() === 'DITUNDA' ? 'DITUNDA' : 'TIDAK LULUS'),
              birthPlace: row.birthPlace || '',
              birthDate: row.birthDate || '',
              grades: grades
            });
          });
          if (parsedStudents.length === 0) {
             setFailedRows(validationErrors);
             throw new Error(`Tidak ada data valid yang ditemukan.`);
          }
          setTotalRecords(parsedStudents.length);
          await uploadInChunks(parsedStudents, validationErrors);
          if (fileInputRef.current) fileInputRef.current.value = ""; 
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message });
          setIsLoading(false);
          setFailedRows(prev => prev.length > 0 ? prev : [err.message]);
        }
      },
      error: (err) => {
        setMessage({ type: 'error', text: `Error: ${err.message}` });
        setIsLoading(false);
      }
    });
  };
  const uploadInChunks = async (students: Student[], initialErrors: string[] = []) => {
    const CHUNK_SIZE = 400; 
    let processed = 0;
    try {
      for (let i = 0; i < students.length; i += CHUNK_SIZE) {
        const chunk = students.slice(i, i + CHUNK_SIZE);
        await importStudents(chunk);
        processed += chunk.length;
        setProcessedRecords(processed);
        setUploadProgress(Math.min(100, Math.round((processed / students.length) * 100)));
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }
      const successCount = students.length;
      const failCount = initialErrors.length;
      if (failCount > 0) {
          setFailedRows(initialErrors);
          setMessage({ type: 'error', text: `Upload Selesai: ${successCount} berhasil, ${failCount} gagal.` });
      } else {
          setMessage({ type: 'success', text: `Sukses! ${successCount} data siswa berhasil diupload.`});
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };
  const handleJsonImportData = async () => {
    setIsLoading(true);
    setMessage(null);
    setFailedRows([]);
    try {
      const parsed: Student[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].nisn) throw new Error('Format JSON tidak valid');
      await importStudents(parsed);
      setMessage({ type: 'success', text: 'Import JSON Sukses!' });
      setJsonInput('');
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };
  const requestSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  const processedStudents = useMemo(() => {
    let result = [...studentList];
    if (listSearch) {
      const lowerSearch = listSearch.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(lowerSearch) || s.nisn.includes(lowerSearch));
    }
    if (statusFilter !== 'ALL') result = result.filter(s => s.status === statusFilter);
    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [studentList, listSearch, statusFilter, sortConfig]);

  const isAuthenticated = !!user || demoAuth;
  const userEmail = user?.email || (demoAuth ? 'admin@sman1padangan.sch.id (Local)' : 'demo@local');

  if (!isAuthenticated) {
     return (
         <div className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-8 md:py-12">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-sm md:max-w-md w-full border border-gray-100">
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Admin Portal</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" required className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-sman-blue outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                    <input type="password" required className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-sman-blue outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                    {message && message.type === 'error' && <div className="text-red-600 text-sm">{message.text}</div>}
                    <button type="submit" disabled={isLoading} className="w-full bg-sman-blue text-white font-bold py-3.5 rounded-xl hover:bg-blue-800 transition-colors shadow-lg">{isLoading ? "Loading..." : "Masuk"}</button>
                    <button type="button" onClick={() => navigate('/')} className="w-full text-center text-sm text-gray-500 hover:text-sman-blue mt-2">Kembali</button>
                </form>
            </div>
         </div>
     )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
            <p className="text-sm text-gray-500">Login sebagai: {userEmail}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded transition"><LogOut className="w-5 h-5" /> Logout</button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[150px] py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'settings' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}><Settings className="w-5 h-5" /> Pengaturan</button>
            <button onClick={() => setActiveTab('upload')} className={`flex-1 min-w-[150px] py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'upload' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}><Users className="w-5 h-5" /> Upload Data</button>
            <button onClick={() => setActiveTab('list')} className={`flex-1 min-w-[150px] py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'list' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}><List className="w-5 h-5" /> Data Siswa</button>
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
              <div className="space-y-8 max-w-3xl">
                {/* General Settings */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-sman-blue" /> Umum
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pengumuman</label>
                        <input
                            type="date"
                            required
                            className="w-full border p-2 rounded bg-white"
                            value={toLocalISOString(tempSettings.releaseDate).split('T')[0]}
                            onChange={(e) => {
                            const newDateVal = e.target.value;
                            if(!newDateVal) return;
                            const currentTimeVal = toLocalISOString(tempSettings.releaseDate).split('T')[1];
                            const newDate = new Date(`${newDateVal}T${currentTimeVal}`);
                            setTempSettings({...tempSettings, releaseDate: newDate.toISOString()});
                            }}
                        />
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jam (WIB)</label>
                        <input
                            type="time"
                            required
                            className="w-full border p-2 rounded bg-white"
                            value={toLocalISOString(tempSettings.releaseDate).split('T')[1]}
                            onChange={(e) => {
                            const newTimeVal = e.target.value;
                            if(!newTimeVal) return;
                            const currentDateVal = toLocalISOString(tempSettings.releaseDate).split('T')[0];
                            const newDate = new Date(`${currentDateVal}T${newTimeVal}`);
                            setTempSettings({...tempSettings, releaseDate: newDate.toISOString()});
                            }}
                        />
                        </div>
                        <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Pelajaran</label>
                                <input type="text" className="w-full border p-2 rounded bg-white" value={tempSettings.schoolYear} onChange={(e) => setTempSettings({...tempSettings, schoolYear: e.target.value})} />
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                                <input type="text" className="w-full border p-2 rounded bg-white" value={tempSettings.headmaster} onChange={(e) => setTempSettings({...tempSettings, headmaster: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                                <input type="text" className="w-full border p-2 rounded bg-white" value={tempSettings.headmasterNip} onChange={(e) => setTempSettings({...tempSettings, headmasterNip: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Popup Settings */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                    <h3 className="font-bold text-lg mb-4 text-blue-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" /> Pengaturan Pop-up Informasi
                    </h3>
                    <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                id="popupEnabled"
                                checked={tempSettings.popupEnabled !== false}
                                onChange={(e) => setTempSettings({...tempSettings, popupEnabled: e.target.checked})}
                                className="w-5 h-5 text-sman-blue rounded focus:ring-sman-blue cursor-pointer"
                            />
                            <label htmlFor="popupEnabled" className="text-gray-800 font-medium cursor-pointer">
                                Aktifkan Pop-up di Halaman Utama
                            </label>
                         </div>
                         
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teks Informasi</label>
                            <textarea 
                                className="w-full border p-3 rounded-lg bg-white focus:ring-2 focus:ring-sman-blue outline-none text-sm"
                                rows={3}
                                value={tempSettings.popupText || ''}
                                placeholder="Masukkan pesan informasi..."
                                onChange={(e) => setTempSettings({...tempSettings, popupText: e.target.value})}
                            />
                         </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Durasi Tampil (detik)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="1"
                                    max="60"
                                    className="w-24 border p-2 rounded bg-white focus:ring-2 focus:ring-sman-blue outline-none"
                                    value={tempSettings.popupDuration || 10}
                                    onChange={(e) => setTempSettings({...tempSettings, popupDuration: parseInt(e.target.value) || 5})}
                                />
                                <span className="text-gray-500 text-sm">Detik (Otomatis hilang)</span>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    className="bg-sman-blue text-white px-6 py-3 rounded-lg hover:bg-blue-800 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4" />}
                    Simpan Semua Pengaturan
                    </button>
                </div>
              </div>
            )}

            {/* TAB: UPLOAD (Content preserved via minimal change, assuming file structure stays same) */}
            {activeTab === 'upload' && (
              <div className="space-y-8">
                 {/* ... Same content as before ... */}
                 <div className="bg-white border rounded-lg p-6 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600 w-6 h-6" />
                        <h3 className="font-bold text-lg">Bulk Upload CSV</h3>
                      </div>
                      <button onClick={downloadTemplate} disabled={isDownloadingTemplate} className="text-sm text-sman-blue hover:underline flex items-center gap-1 disabled:opacity-50">
                         {isDownloadingTemplate ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan...</> : <><Download className="w-4 h-4" /> Download Template CSV</>}
                      </button>
                   </div>
                   <p className="text-sm text-gray-600 mb-4">Upload file CSV. Format: <code>nisn</code>, <code>name</code>, etc.</p>
                   <div className="flex gap-4 items-center">
                     <input ref={fileInputRef} type="file" accept=".csv" disabled={isLoading} onChange={handleCsvUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-sman-blue hover:file:bg-blue-100" />
                     {isLoading && uploadProgress > 0 && <span className="text-sm font-bold text-sman-blue">{uploadProgress}%</span>}
                   </div>
                   {isLoading && uploadProgress > 0 && (
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4"><div className="bg-sman-blue h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>
                   )}
                   {failedRows.length > 0 && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="text-red-800 font-bold flex items-center gap-2 mb-2"><XCircle className="w-5 h-5" /> Detail Error:</h4>
                        <div className="max-h-40 overflow-y-auto"><ul className="list-disc list-inside text-sm text-red-700">{failedRows.map((err, idx) => <li key={idx}>{err}</li>)}</ul></div>
                    </div>
                   )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Import Data Raw JSON</label>
                  <textarea rows={5} className="w-full border p-4 rounded font-mono text-sm bg-white" placeholder="[{ 'nisn': '123', ... }]" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}></textarea>
                  <button onClick={handleJsonImportData} disabled={isLoading} className="mt-2 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 text-sm">{isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4" />} Upload JSON</button>
                </div>
              </div>
            )}

            {/* TAB: LIST (Content preserved) */}
            {activeTab === 'list' && (
              <div className="space-y-4">
                 <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <div className="order-2 md:order-3">
                         <button onClick={handleOpenAddModal} className="bg-sman-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><Plus className="w-4 h-4" /> Tambah Siswa</button>
                    </div>
                    <div className="relative w-full md:w-1/3 order-1 md:order-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="text" placeholder="Cari Nama, NISN..." className="w-full pl-9 pr-4 py-2 border rounded-lg" value={listSearch} onChange={(e) => setListSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto order-3 md:order-2">
                      <Filter className="text-gray-500 w-4 h-4" />
                      <select className="border p-2 rounded-lg text-sm bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">Semua Status</option>
                        <option value="LULUS">Lulus</option>
                        <option value="TIDAK LULUS">Tidak Lulus</option>
                        <option value="DITUNDA">Ditunda</option>
                      </select>
                    </div>
                 </div>
                 <div className="mb-2 text-sm text-gray-500">Total: {processedStudents.length} Siswa</div>
                 {isFetchingList ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sman-blue w-8 h-8" /></div> : (
                   <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                              <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('nisn')}>NISN <ArrowUpDown className="w-3 h-3 inline" /></th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>Nama <ArrowUpDown className="w-3 h-3 inline" /></th>
                              <th className="px-4 py-3">Kelas</th>
                              <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('status')}>Status <ArrowUpDown className="w-3 h-3 inline" /></th>
                              <th className="px-4 py-3 text-right">Rata-rata</th>
                              <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {processedStudents.length > 0 ? processedStudents.map((student) => (
                                  <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono">{student.nisn}</td>
                                    <td className="px-4 py-3 font-medium">{student.name}</td>
                                    <td className="px-4 py-3">{student.className}</td>
                                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${student.status === 'LULUS' ? 'bg-green-100 text-green-800' : student.status === 'TIDAK LULUS' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{student.status}</span></td>
                                    <td className="px-4 py-3 text-right font-mono">{(student.grades.reduce((a,b)=>a+b.score,0)/student.grades.length||0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                                        <button onClick={() => handleOpenEditModal(student)} className="text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteStudent(student)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                  </tr>
                                )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada data.</td></tr>}
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

      {/* STUDENT FORM MODAL (Preserved) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSaveStudent} className="p-6 space-y-6">
                    {validationError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{validationError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">NISN</label><input type="text" required className="w-full border p-2 rounded" value={studentForm.nisn} onChange={(e) => handleFormChange('nisn', e.target.value)} disabled={isEditing} /></div>
                        <div><label className="block text-sm font-medium">No. Ujian</label><input type="text" className="w-full border p-2 rounded" value={studentForm.examNumber} onChange={(e) => handleFormChange('examNumber', e.target.value)} /></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium">Nama</label><input type="text" required className="w-full border p-2 rounded" value={studentForm.name} onChange={(e) => handleFormChange('name', e.target.value)} /></div>
                        <div><label className="block text-sm font-medium">Kelas</label><input type="text" className="w-full border p-2 rounded" value={studentForm.className} onChange={(e) => handleFormChange('className', e.target.value)} /></div>
                        <div><label className="block text-sm font-medium">Status</label><select className="w-full border p-2 rounded" value={studentForm.status} onChange={(e) => handleFormChange('status', e.target.value)}><option value="LULUS">LULUS</option><option value="TIDAK LULUS">TIDAK LULUS</option><option value="DITUNDA">DITUNDA</option></select></div>
                        <div><label className="block text-sm font-medium">Tempat Lahir</label><input type="text" className="w-full border p-2 rounded" value={studentForm.birthPlace} onChange={(e) => handleFormChange('birthPlace', e.target.value)} /></div>
                        <div><label className="block text-sm font-medium">Tanggal Lahir</label><input type="date" className="w-full border p-2 rounded" value={studentForm.birthDate} onChange={(e) => handleFormChange('birthDate', e.target.value)} /></div>
                    </div>
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4"><h4 className="font-semibold">Nilai</h4><button type="button" onClick={addSubject} className="text-sm text-sman-blue flex items-center gap-1"><PlusCircle className="w-4 h-4" /> Tambah</button></div>
                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                            {studentForm.grades.map((grade, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input type="text" placeholder="Mapel" className="flex-grow border p-2 rounded text-sm" value={grade.name} onChange={(e) => handleGradeChange(idx, 'name', e.target.value)} />
                                    <input type="number" className="w-20 border p-2 rounded text-sm text-center" value={grade.score} onChange={(e) => handleGradeChange(idx, 'score', parseFloat(e.target.value) || 0)} />
                                    <button type="button" onClick={() => removeSubject(idx)} className="text-red-500"><MinusCircle className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded">Batal</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-sman-blue text-white rounded">{isLoading ? "Menyimpan..." : "Simpan"}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Admin;