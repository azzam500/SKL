import React from 'react';
import { GraduationCap, Lock } from 'lucide-react';
import { SCHOOL_INFO } from '../constants';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <header className="bg-sman-blue text-white shadow-lg relative z-20 no-print">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-sman-gold">
               {/* In real app, use real logo. Using Icon for now */}
               <GraduationCap className="text-sman-blue w-8 h-8" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-lg md:text-xl font-bold font-serif tracking-wide text-white leading-tight lining-nums">
                {SCHOOL_INFO.name}
              </h1>
              <p className="text-xs text-sman-gold font-medium uppercase tracking-wider">
                Pengumuman Kelulusan
              </p>
            </div>
          </Link>

          {!isAdmin && (
            <Link 
              to="/admin" 
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Admin Login</span>
            </Link>
          )}
        </div>
      </div>
      
      {/* Decorative bottom border */}
      <div className="h-1 w-full bg-gradient-to-r from-sman-red via-sman-gold to-sman-red"></div>
    </header>
  );
};

export default Header;