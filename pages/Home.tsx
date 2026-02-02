import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Loader2, X, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Countdown from '../components/Countdown';

const Home: React.FC = () => {
  const { settings, searchStudent } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(() => {
    return new Date() >= new Date(settings.releaseDate);
  });
  const [showPopup, setShowPopup] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if popup is enabled in settings
    if (settings.popupEnabled !== false) { // Default to true if undefined
      setShowPopup(true);
      
      // Auto hide based on settings duration (default 10s)
      const duration = (settings.popupDuration || 10) * 1000;
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [settings.popupEnabled, settings.popupDuration]);

  const handleCountdownComplete = () => {
    setIsAnnouncementOpen(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnnouncementOpen) return;

    if (!searchQuery.trim()) {
      setError('Masukkan NISN atau Nomor Ujian.');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const query = searchQuery.trim();
      // Server-side filtered query
      const student = await searchStudent(query);

      if (student) {
        navigate(`/result/${student.id}`);
      } else {
        setError('Data siswa tidak ditemukan. Periksa kembali nomor yang Anda masukkan.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-grow w-full flex flex-col">
      {/* Hero Section - flex-grow ensures it fills the space between header and footer */}
      <div className="flex-grow w-full flex flex-col justify-center items-center bg-gradient-to-br from-sman-blue to-blue-900 py-16 md:py-24 px-4 text-center relative overflow-hidden">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sman-red/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight lining-nums">
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
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-sman-blue focus:ring-4 focus:ring-sman-blue/10 transition-all outline-none text-lg bg-white text-gray-900"
                      disabled={isSearching}
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
                  disabled={isSearching}
                  className="w-full bg-sman-red hover:bg-red-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all active:transform active:scale-95 text-lg mt-2 flex justify-center items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      MEMERIKSA DATA...
                    </>
                  ) : (
                    "CEK KELULUSAN"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Centered Popup Notification */}
      {showPopup && (
        <>
          {/* Optional: Semi-transparent backdrop to focus attention */}
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowPopup(false)}></div>
          
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-white rounded-2xl shadow-2xl p-6 border-t-4 border-sman-blue animate-fade-in-up">
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded-full p-1.5 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-blue-50 text-sman-blue p-4 rounded-full h-16 w-16 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Info className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-xl mb-2">Informasi</h4>
                <p className="text-gray-600 leading-relaxed">
                  {settings.popupText || "Gunakan NISN atau Nomor Peserta Ujian yang valid untuk mengecek status kelulusan Anda."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;