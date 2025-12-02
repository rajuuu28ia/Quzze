import React from 'react';

const QuizPage: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
          <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Quiz Giveaway</h1>
        <p className="text-slate-400 mb-6">
          Untuk bermain quiz, gunakan link room yang diberikan oleh penyelenggara.
        </p>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">
            Format link: <span className="text-slate-300 font-mono">/room/KODE</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
