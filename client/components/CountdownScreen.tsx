import React, { useState, useEffect } from 'react';

interface CountdownScreenProps {
  onComplete: () => void;
}

const CountdownScreen: React.FC<CountdownScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'go'>('ready');
  const [count, setCount] = useState(5);

  useEffect(() => {
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 1500));
      setPhase('countdown');
      
      for (let i = 5; i >= 1; i--) {
        setCount(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      
      setPhase('go');
      await new Promise(r => setTimeout(r, 1000));
      onComplete();
    };

    sequence();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800/30 to-slate-900" />

      <div className="relative z-10 text-center">
        {phase === 'ready' && (
          <div className="animate-fadeIn">
            <div className="w-24 h-24 mx-auto mb-8 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
              <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">SIAP?</h1>
            <p className="text-slate-400 text-lg">Bersiap-siaplah...</p>
            
            <div className="mt-8 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div>
            <div
              key={count}
              className="text-[10rem] md:text-[14rem] font-bold text-white leading-none animate-pop"
            >
              {count}
            </div>
            
            <div className="flex justify-center mt-6 gap-2">
              {[5, 4, 3, 2, 1].map((n) => (
                <div
                  key={n}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    n >= count ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'go' && (
          <div className="animate-pop">
            <div className="w-24 h-24 mx-auto mb-6 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-emerald-500">GO!</h1>
            <p className="text-slate-400 text-lg mt-4">Jawab dengan cepat!</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
        <div 
          className="h-full bg-amber-500 transition-all duration-1000"
          style={{ 
            width: phase === 'ready' ? '0%' : phase === 'go' ? '100%' : `${((5 - count) / 5) * 100}%` 
          }}
        />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-pop { animation: pop 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default CountdownScreen;
