import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Printer, Download, CheckCircle, XCircle } from 'lucide-react';
import Confetti from '../components/Confetti';
import { SCHOOL_INFO } from '../constants';

const Result: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { students, settings } = useApp();
  const [student, setStudent] = useState(students.find(s => s.id === id));

  // Find student again if students list updates (rare but good practice)
  useEffect(() => {
    setStudent(students.find(s => s.id === id));
  }, [students, id]);

  const handlePrint = () => {
    window.print();
  };

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Siswa Tidak Ditemukan</h2>
        <Link to="/" className="text-sman-blue hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const isPassed = student.status === 'LULUS';
  const averageScore = (student.grades.reduce((acc, curr) => acc + curr.score, 0) / student.grades.length).toFixed(2);

  return (
    <div className="bg-gray-100 min-h-screen pb-12">
      {isPassed && <Confetti />}
      
      {/* Screen Only Header / Navigation */}
      <div className="container mx-auto px-4 py-6 no-print">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-sman-blue transition-colors mb-6 font-medium">
          <ArrowLeft className="w-5 h-5" /> Kembali ke Pencarian
        </Link>
        
        <div className={`rounded-xl shadow-lg p-6 mb-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 ${isPassed ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}>
          <div className="flex items-center gap-4">
            {isPassed ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
            <div>
              <p className="text-sm opacity-90 uppercase tracking-wider font-semibold">Status Kelulusan</p>
              <h2 className="text-3xl font-bold">{student.status}</h2>
            </div>
          </div>
          {isPassed && (
            <button 
              onClick={handlePrint}
              className="bg-white text-green-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Cetak SKL
            </button>
          )}
        </div>
      </div>

      {/* Printable Area / SKL View */}
      <div id="printable-area" className="bg-white max-w-[210mm] mx-auto p-[2cm] shadow-2xl printable-sheet">
        {/* SKL Header */}
        <div className="border-b-4 border-black pb-4 mb-8 flex items-center gap-6">
          <img src={SCHOOL_INFO.logoPlaceholder} alt="Logo Sekolah" className="w-24 h-24 object-contain grayscale-0" />
          <div className="text-center flex-1">
            <h3 className="text-lg font-bold uppercase tracking-wide">Pemerintah Provinsi Jawa Timur</h3>
            <h3 className="text-lg font-bold uppercase tracking-wide">Dinas Pendidikan</h3>
            <h2 className="text-2xl font-black font-serif uppercase text-black my-1">{SCHOOL_INFO.name}</h2>
            <p className="text-sm">{SCHOOL_INFO.address}</p>
            <p className="text-sm">Telp: {SCHOOL_INFO.phone} | Email: {SCHOOL_INFO.email}</p>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-bold underline decoration-2 underline-offset-4">SURAT KETERANGAN LULUS</h1>
          <p className="text-sm mt-1">Tahun Pelajaran {settings.schoolYear}</p>
        </div>

        <p className="mb-6 text-justify leading-relaxed">
          Yang bertanda tangan di bawah ini, Kepala {SCHOOL_INFO.name}, menerangkan bahwa:
        </p>

        <table className="w-full mb-8 ml-4">
          <tbody>
            <tr>
              <td className="w-48 py-1">Nama Peserta Didik</td>
              <td className="w-4">:</td>
              <td className="font-bold uppercase">{student.name}</td>
            </tr>
            <tr>
              <td className="py-1">Tempat, Tanggal Lahir</td>
              <td>:</td>
              <td>{student.birthPlace}, {new Date(student.birthDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
            </tr>
            <tr>
              <td className="py-1">Nomor Induk Siswa Nasional</td>
              <td>:</td>
              <td>{student.nisn}</td>
            </tr>
            <tr>
              <td className="py-1">Nomor Peserta Ujian</td>
              <td>:</td>
              <td>{student.examNumber}</td>
            </tr>
            <tr>
              <td className="py-1">Kelas</td>
              <td>:</td>
              <td>{student.className}</td>
            </tr>
          </tbody>
        </table>

        <p className="mb-6 text-justify leading-relaxed">
          Berdasarkan hasil Rapat Pleno Dewan Guru tentang Penentuan Kelulusan Peserta Didik Tahun Pelajaran {settings.schoolYear}, yang bersangkutan dinyatakan:
        </p>

        <div className="text-center mb-10 py-4 border-y-2 border-black/10 bg-gray-50">
           <span className={`text-3xl font-black tracking-[0.2em] ${isPassed ? 'text-black' : 'text-red-600'}`}>
             {student.status}
           </span>
        </div>

        {isPassed && (
            <>
                <p className="mb-4 font-semibold">Daftar Nilai Ujian Sekolah:</p>
                <table className="w-full border-collapse border border-black mb-8 text-sm">
                <thead>
                    <tr className="bg-gray-100">
                    <th className="border border-black px-4 py-2 text-left w-12">No</th>
                    <th className="border border-black px-4 py-2 text-left">Mata Pelajaran</th>
                    <th className="border border-black px-4 py-2 text-center w-24">Nilai</th>
                    </tr>
                </thead>
                <tbody>
                    {student.grades.map((grade, index) => (
                    <tr key={index}>
                        <td className="border border-black px-4 py-1 text-center">{index + 1}</td>
                        <td className="border border-black px-4 py-1">{grade.name}</td>
                        <td className="border border-black px-4 py-1 text-center">{grade.score}</td>
                    </tr>
                    ))}
                    <tr className="font-bold bg-gray-50">
                        <td colSpan={2} className="border border-black px-4 py-2 text-right">Rata-rata</td>
                        <td className="border border-black px-4 py-2 text-center">{averageScore}</td>
                    </tr>
                </tbody>
                </table>
            </>
        )}

        <div className="flex justify-end mt-12">
          <div className="text-center w-64">
            <p>Padangan, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
            <p className="mb-20">Kepala Sekolah,</p>
            <p className="font-bold underline">{settings.headmaster}</p>
            <p>NIP. {settings.headmasterNip}</p>
          </div>
        </div>
        
        <div className="mt-8 text-xs text-center text-gray-500 italic border-t pt-4">
            Dokumen ini dicetak secara komputerisasi dan sah tanpa tanda tangan basah jika terdapat kode verifikasi sistem.
        </div>
      </div>
    </div>
  );
};

export default Result;