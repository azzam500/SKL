import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface CountdownProps {
  targetDate: string;
  onComplete: () => void;
}

const Countdown: React.FC<CountdownProps> = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
        onComplete();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className="w-full max-w-3xl mx-auto my-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
      <div className="flex items-center justify-center gap-2 mb-4 text-white">
        <Timer className="w-5 h-5 animate-pulse" />
        <span className="uppercase tracking-widest text-sm font-semibold">Menuju Pengumuman</span>
      </div>
      <div className="grid grid-cols-4 gap-4 text-center">
        {[
          { label: 'Hari', value: timeLeft.days },
          { label: 'Jam', value: timeLeft.hours },
          { label: 'Menit', value: timeLeft.minutes },
          { label: 'Detik', value: timeLeft.seconds }
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-3xl md:text-5xl font-bold text-white font-mono bg-sman-blue/50 rounded-lg py-2 md:py-4 border border-sman-blue shadow-inner">
              {item.value.toString().padStart(2, '0')}
            </span>
            <span className="text-xs md:text-sm text-sman-gold mt-2 font-medium uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Countdown;