import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { SCHOOL_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6 mt-auto border-t-4 border-sman-blue no-print">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* School Identity */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-serif font-bold mb-4 text-sman-gold">{SCHOOL_INFO.name}</h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Mewujudkan generasi yang cerdas, berkarakter, dan berdaya saing global dengan berlandaskan iman dan takwa.
            </p>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            <h4 className="text-lg font-semibold mb-2">Hubungi Kami</h4>
            <div className="flex items-start gap-3 text-gray-400 text-sm">
              <MapPin className="w-5 h-5 text-sman-red flex-shrink-0" />
              <span>{SCHOOL_INFO.address}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <Phone className="w-5 h-5 text-sman-red" />
              <span>{SCHOOL_INFO.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <Mail className="w-5 h-5 text-sman-red" />
              <span>{SCHOOL_INFO.email}</span>
            </div>
          </div>

          {/* Social Media */}
          <div className="flex flex-col items-center md:items-end">
             <h4 className="text-lg font-semibold mb-4">Ikuti Kami</h4>
             <div className="flex gap-4">
                <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-sman-blue transition-colors text-white">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-sman-blue transition-colors text-white">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-sman-blue transition-colors text-white">
                  <Twitter className="w-5 h-5" />
                </a>
             </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} {SCHOOL_INFO.name}. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;