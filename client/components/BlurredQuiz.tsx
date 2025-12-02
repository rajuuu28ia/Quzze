import React, { useState, useEffect } from 'react';

interface BlurredQuizProps {
  startTime: Date;
  onTimeUp: () => void;
  title: string;
  maxParticipants?: number;
  currentWinners?: number;
}

const BlurredQuiz: React.FC<BlurredQuizProps> = ({ startTime, onTimeUp, title, maxParticipants = 5, currentWinners = 0 }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(startTime).getTime();
      const difference = target - now;

      if (difference <= 0) {
        onTimeUp();
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      const hours = Math.floor((difference / 1000 / 60 / 60) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      const total = Math.floor(difference / 1000);

      setTotalSeconds(total);
      if (initialSeconds === 0 && total > 0) {
        setInitialSeconds(total);
      }

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, onTimeUp, initialSeconds]);

  const progress = initialSeconds > 0 ? ((initialSeconds - totalSeconds) / initialSeconds) * 100 : 0;
  const slotsRemaining = maxParticipants - currentWinners;

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-slate-900" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-400 text-sm font-medium">Menunggu Quiz Dimulai</span>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400">Bersiaplah untuk bermain!</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
          <p className="text-slate-400 text-sm text-center mb-4">Dimulai dalam</p>
          
          <div className="flex items-center justify-center gap-3">
            {timeLeft.hours > 0 && (
              <>
                <div className="bg-slate-700 rounded-xl px-4 py-3 min-w-[70px]">
                  <div className="text-3xl md:text-4xl font-bold text-white text-center tabular-nums">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-slate-500 text-xs text-center mt-1">Jam</div>
                </div>
                <span className="text-2xl text-slate-500 font-bold">:</span>
              </>
            )}
            
            <div className="bg-slate-700 rounded-xl px-4 py-3 min-w-[70px]">
              <div className="text-3xl md:text-4xl font-bold text-white text-center tabular-nums">
                {String(timeLeft.minutes).padStart(2, '0')}
              </div>
              <div className="text-slate-500 text-xs text-center mt-1">Menit</div>
            </div>
            
            <span className="text-2xl text-slate-500 font-bold animate-pulse">:</span>
            
            <div className="bg-slate-700 rounded-xl px-4 py-3 min-w-[70px]">
              <div className="text-3xl md:text-4xl font-bold text-amber-400 text-center tabular-nums">
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <div className="text-slate-500 text-xs text-center mt-1">Detik</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Slot Pemenang</p>
                <p className="text-slate-400 text-sm">Tersedia untuk {maxParticipants} orang tercepat</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-400">{slotsRemaining}</span>
              <span className="text-slate-500 text-sm">/{maxParticipants}</span>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm text-center mt-6 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" className="opacity-25" />
            <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
          </svg>
          Mohon tunggu...
        </p>
      </div>
    </div>
  );
};

export default BlurredQuiz;
