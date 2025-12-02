import React from 'react';

const TooLateScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800/30 to-slate-900" />

      <div className="relative z-10 text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-8 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
          <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Oops, kamu kalah cepat nih!
        </h1>
        
        <p className="text-slate-400 text-lg mb-8">
          Slot pemenang sudah penuh. Kembali lagi yaa nanti!
        </p>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Jangan khawatir, akan ada quiz lainnya!</span>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all border border-slate-700"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

export default TooLateScreen;
