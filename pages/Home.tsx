import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Countdown from '../components/Countdown';

const Home: React.FC = () => {
  const { settings, students } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(() => {
    return new Date() >= new Date(settings.releaseDate);
  });
  const navigate = useNavigate();

  const handleCountdownComplete = () => {
    setIsAnnouncementOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnnouncementOpen) return;

    if (!searchQuery.trim()) {
      setError('Masukkan NISN atau Nomor Ujian.');
      return;
    }

    const query = searchQuery.trim();
    const student = students.find(s => s.nisn === query || s.examNumber === query);

    if (student) {
      navigate(`/result/${student.id}`);
    } else {
      setError('Data siswa tidak ditemukan. Periksa kembali nomor yang Anda masukkan.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-br from-sman-blue to-blue-900 py-16 md:py-24 px-4 text-center relative overflow-hidden">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sman-red/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            Pengumuman Kelulusan <br/>
            <span className="text-sman-gold">Tahun Pelajaran {settings.schoolYear}</span>
          </h1>
          <p className="text-blue-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            Selamat datang di portal resmi pengumuman kelulusan SMA Negeri 1 Padangan.
            Silakan cek status kelulusan Anda di bawah ini.
          </p>

          {!isAnnouncementOpen ? (
            <Countdown targetDate={settings.releaseDate} onComplete={handleCountdownComplete} />
          ) : (
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 max-w-xl mx-auto transform hover:-translate-y-1 transition-transform duration-300">
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="text-left">
                  <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                    Masukkan NISN atau Nomor Ujian
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setError('');
                      }}
                      placeholder="Contoh: 1234567890"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-sman-blue focus:ring-4 focus:ring-sman-blue/10 transition-all outline-none text-lg"
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 text-sman-red bg-red-50 p-3 rounded-lg text-sm animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-sman-red hover:bg-red-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all active:transform active:scale-95 text-lg mt-2"
                >
                  CEK KELULUSAN
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-50 text-sman-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Masukkan Data</h3>
              <p className="text-gray-600 text-sm">Gunakan Nomor Induk Siswa Nasional (NISN) atau Nomor Peserta Ujian yang valid.</p>
           </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-50 text-sman-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Lihat Status</h3>
              <p className="text-gray-600 text-sm">Sistem akan menampilkan identitas siswa beserta status kelulusan (LULUS/TIDAK).</p>
           </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-50 text-sman-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" /> {/* Reusing icon for simplicity */}
              </div>
              <h3 className="font-bold text-lg mb-2">3. Cetak SKL</h3>
              <p className="text-gray-600 text-sm">Jika dinyatakan lulus, Anda dapat mencetak Surat Keterangan Lulus (SKL) Sementara.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Home;