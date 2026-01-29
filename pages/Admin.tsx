import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, Save, Settings, Users, LogOut, CheckCircle } from 'lucide-react';
import { Student } from '../types';
import { useNavigate } from 'react-router-dom';

const Admin: React.FC = () => {
  const { students, settings, setSettings, importStudents } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'data'>('settings');
  const [tempSettings, setTempSettings] = useState(settings);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const navigate = useNavigate();

  // Mock Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Password salah!');
    }
  };

  const setError = (msg: string | null) => {
      if(msg) setMessage({ type: 'error', text: msg });
      else setMessage(null);
  }

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportData = () => {
    try {
      const parsed: Student[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].nisn) {
        throw new Error('Format JSON tidak valid');
      }
      importStudents(parsed);
      setMessage({ type: 'success', text: `Berhasil mengimpor ${parsed.length} data siswa!` });
      setJsonInput('');
    } catch (e) {
      setError('Gagal memproses data. Pastikan format JSON valid.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center text-sman-blue mb-6">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-sman-blue outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message && message.type === 'error' && <p className="text-red-500 text-sm">{message.text}</p>}
            <button className="w-full bg-sman-blue text-white py-2 rounded hover:bg-blue-800 transition">
              Masuk
            </button>
            <button type="button" onClick={() => navigate('/')} className="w-full text-gray-500 text-sm hover:underline">
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded transition"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-sman-blue">
            <h3 className="text-gray-500 text-sm uppercase">Total Siswa</h3>
            <p className="text-3xl font-bold text-gray-800">{students.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <h3 className="text-gray-500 text-sm uppercase">Lulus</h3>
            <p className="text-3xl font-bold text-gray-800">{students.filter(s => s.status === 'LULUS').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
            <h3 className="text-gray-500 text-sm uppercase">Tidak Lulus/Tunda</h3>
            <p className="text-3xl font-bold text-gray-800">{students.filter(s => s.status !== 'LULUS').length}</p>
          </div>
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
              <Users className="w-5 h-5" /> Data Siswa
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
                  className="bg-sman-blue text-white px-6 py-2 rounded hover:bg-blue-800 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Simpan Pengaturan
                </button>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Import Data Siswa (JSON)</label>
                  <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800 mb-2 border border-yellow-200">
                    <p className="font-bold">Format JSON yang dibutuhkan:</p>
                    <code className="block mt-1 font-mono text-xs">
                      [{`{ "id": "1", "nisn": "...", "name": "...", "status": "LULUS", "grades": [...] }`}, ...]
                    </code>
                  </div>
                  <textarea
                    rows={10}
                    className="w-full border p-4 rounded font-mono text-sm focus:ring-2 focus:ring-sman-blue outline-none"
                    placeholder="Paste JSON data here..."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  ></textarea>
                </div>
                <button
                  onClick={handleImportData}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Import Data
                </button>

                <div className="mt-8">
                    <h3 className="font-bold mb-4">Preview Data Saat Ini (5 Data Teratas)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3">NISN</th>
                                    <th className="p-3">Nama</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.slice(0, 5).map(s => (
                                    <tr key={s.id} className="border-b">
                                        <td className="p-3">{s.nisn}</td>
                                        <td className="p-3">{s.name}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs ${s.status === 'LULUS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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