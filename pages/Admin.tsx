import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, Save, Settings, Users, LogOut, CheckCircle, Loader2, AlertTriangle, AlertCircle, FileSpreadsheet, Download } from 'lucide-react';
import { Student, SubjectGrade } from '../types';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import Papa from 'papaparse';

const Admin: React.FC = () => {
  const { user, settings, setSettings, importStudents, logout, isDemoMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // JSON State
  const [jsonInput, setJsonInput] = useState('');
  
  // CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [processedRecords, setProcessedRecords] = useState(0);

  const [activeTab, setActiveTab] = useState<'settings' | 'data'>('settings');
  const [tempSettings, setTempSettings] = useState(settings);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Local state for demo mode auth
  const [demoAuth, setDemoAuth] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (isDemoMode) {
      if (password === 'admin123') {
        setDemoAuth(true);
      } else {
        setMessage({ type: 'error', text: 'Password salah (Mode Demo: gunakan admin123)' });
      }
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Login gagal. Periksa email dan password.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setDemoAuth(false);
    } else {
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

  // --- CSV UPLOAD LOGIC ---

  const downloadTemplate = () => {
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
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);
    setUploadProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawData = results.data as any[];
          if (rawData.length === 0) throw new Error("File CSV kosong");

          const parsedStudents: Student[] = [];
          
          // Helper to check if a column is a bio data field
          const isBioField = (key: string) => 
            ['nisn', 'examNumber', 'name', 'className', 'status', 'birthPlace', 'birthDate', 'id'].includes(key);

          rawData.forEach((row, index) => {
            if (!row.nisn || !row.name) {
               console.warn(`Row ${index + 1} skipped: Missing NISN or Name`);
               return;
            }

            const grades: SubjectGrade[] = [];
            
            // Extract Grades: Any key that isn't a bio field is treated as a subject
            Object.keys(row).forEach(key => {
              if (!isBioField(key) && row[key]) {
                const score = parseFloat(row[key]);
                if (!isNaN(score)) {
                  grades.push({ name: key, score: score });
                }
              }
            });

            parsedStudents.push({
              id: row.nisn, // Use NISN as ID
              nisn: row.nisn,
              examNumber: row.examNumber || '',
              name: row.name,
              className: row.className || '',
              status: (row.status?.toUpperCase() === 'LULUS' ? 'LULUS' : 
                       row.status?.toUpperCase() === 'DITUNDA' ? 'DITUNDA' : 'TIDAK LULUS'),
              birthPlace: row.birthPlace || '',
              birthDate: row.birthDate || '', // Expects YYYY-MM-DD
              grades: grades
            });
          });

          setTotalRecords(parsedStudents.length);
          await uploadInChunks(parsedStudents);
          
          if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        } catch (err: any) {
          setMessage({ type: 'error', text: `Gagal memproses CSV: ${err.message}` });
          setIsLoading(false);
        }
      },
      error: (err) => {
        setMessage({ type: 'error', text: `Error parsing CSV: ${err.message}` });
        setIsLoading(false);
      }
    });
  };

  const uploadInChunks = async (students: Student[]) => {
    const CHUNK_SIZE = 400; // Safe below Firestore 500 limit
    let processed = 0;

    try {
      for (let i = 0; i < students.length; i += CHUNK_SIZE) {
        const chunk = students.slice(i, i + CHUNK_SIZE);
        await importStudents(chunk);
        
        processed += chunk.length;
        setProcessedRecords(processed);
        setUploadProgress(Math.min(100, Math.round((processed / students.length) * 100)));
        
        // Small delay to allow UI to update and not freeze browser
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }

      setMessage({ 
        type: 'success', 
        text: `Sukses! ${processed} data siswa berhasil diupload.` 
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengupload ke database.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSON UPLOAD LOGIC ---

  const handleJsonImportData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const parsed: Student[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].nisn) {
        throw new Error('Format JSON tidak valid');
      }
      await importStudents(parsed);
      setMessage({ type: 'success', text: isDemoMode ? 'Simulasi Import Sukses (Mode Demo)' : `Berhasil mengimpor ${parsed.length} data siswa ke Firestore!` });
      setJsonInput('');
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal memproses data. Pastikan format JSON valid.' });
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = isDemoMode ? demoAuth : !!user;
  const userEmail = isDemoMode ? 'demo@local' : user?.email;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center text-sman-blue mb-6">Admin Login</h2>
          
          {isDemoMode && (
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg flex gap-2 items-start border border-yellow-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong>Mode Demo Aktif:</strong> Firebase belum dikonfigurasi.
                <br />Gunakan password: <code>admin123</code>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required={!isDemoMode}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sman1padangan.sch.id"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full border p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message && message.type === 'error' && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4"/>
                    {message.text}
                </div>
            )}
            <button 
                type="submit"
                disabled={isLoading} 
                className="w-full bg-sman-blue text-white py-2 rounded hover:bg-blue-800 transition flex justify-center items-center"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : "Masuk"}
            </button>
            <button type="button" onClick={() => navigate('/')} className="w-full text-gray-500 text-sm hover:underline text-center">
                Kembali ke Beranda
            </button>
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
              {isDemoMode && <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">DEMO</span>}
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
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'settings' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Settings className="w-5 h-5" /> Pengaturan Pengumuman
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'data' ? 'bg-blue-50 text-sman-blue border-b-2 border-sman-blue' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Users className="w-5 h-5" /> Upload Data Siswa
            </button>
          </div>

          <div className="p-8">
            {message && (
                <div className={`p-4 mb-6 rounded flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal & Jam Pengumuman (ISO Format)</label>
                  <input
                    type="datetime-local"
                    className="w-full border p-2 rounded"
                    // Simple conversion for datetime-local input compatibility
                    value={new Date(tempSettings.releaseDate).toISOString().slice(0, 16)}
                    onChange={(e) => setTempSettings({...tempSettings, releaseDate: new Date(e.target.value).toISOString()})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Siswa tidak dapat melihat hasil sebelum waktu ini.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Pelajaran</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded"
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
                        className="w-full border p-2 rounded"
                        value={tempSettings.headmaster}
                        onChange={(e) => setTempSettings({...tempSettings, headmaster: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                        <input
                        type="text"
                        className="w-full border p-2 rounded"
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

            {activeTab === 'data' && (
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
                        className="text-sm text-sman-blue hover:underline flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" /> Download Template CSV
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
                          Mengupload {processedRecords} dari {totalRecords} data...
                        </p>
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
                    className="w-full border p-4 rounded font-mono text-sm focus:ring-2 focus:ring-sman-blue outline-none"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;