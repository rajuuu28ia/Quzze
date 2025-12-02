import React, { useState, useRef, useEffect } from 'react';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';
import ClueIcon from './icons/ClueIcon';

declare global {
  interface Window {
    confetti: any;
  }
}

let audioContext: AudioContext | null = null;

const playSound = (type: 'correct' | 'incorrect' | 'click' | 'clue') => {
  if (typeof window === 'undefined') return;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return;
    }
  }

  if (!audioContext) return;
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);

  switch (type) {
    case 'correct':
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, now);
      oscillator.frequency.linearRampToValueAtTime(783.99, now + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      break;
    case 'incorrect':
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(100, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
    case 'click':
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'clue':
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(600, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;
  }
};

const triggerConfetti = () => {
  if (window.confetti) {
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0.5,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
    };

    const shoot = () => {
      window.confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ['circle', 'square'],
      });
      window.confetti({
        ...defaults,
        particleCount: 25,
        scalar: 0.8,
        shapes: ['circle'],
      });
    };
    
    setTimeout(shoot, 0);
    setTimeout(shoot, 150);
    setTimeout(shoot, 300);
  }
};

interface QuizItem {
  question: string;
  correctAnswer: string;
  directLink: string;
  clue?: string;
}

interface QuizCardProps {
  questions: QuizItem[];
  sessionId: string;
  roomCode?: string;
  onTooLate?: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ questions, sessionId, roomCode, onTooLate }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'incorrect' | 'correct'>('idle');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showClue, setShowClue] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'incorrect') {
      const timer = setTimeout(() => setStatus('idle'), 600);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (!isTransitioning && status === 'idle') {
      inputRef.current?.focus();
    }
  }, [isTransitioning, status]);
  
  if (!questions || questions.length === 0) {
    return (
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
        <h1 className="font-bold text-2xl text-slate-300">Tidak ada pertanyaan.</h1>
      </div>
    );
  }

  const { question, correctAnswer, clue } = questions[currentQuestionIndex];
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    if (userInput.trim().toLowerCase() === correctAnswer.toLowerCase()) {
      setStatus('correct');
      triggerConfetti();
      playSound('correct');
    } else {
      setStatus('incorrect');
      setUserInput('');
      inputRef.current?.focus();
      playSound('incorrect');
    }
  };

  const handleNextQuestion = () => {
    playSound('click');
    setShowContent(false);
    setShowClue(false);
    
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setStatus('idle');
        setUserInput('');
      }
      setShowContent(true);
    }, 300);
  };
  
  const handleClueClick = () => {
    if (!showClue) {
      playSound('clue');
    }
    setShowClue(!showClue);
  };

  const handleCompleteQuiz = async () => {
    playSound('click');
    
    try {
      const res = await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.tooLate && onTooLate) {
          onTooLate();
          return;
        }
        return;
      }
      
      if (roomCode) {
        const completedRooms = JSON.parse(localStorage.getItem('completed_rooms') || '[]');
        if (!completedRooms.includes(roomCode)) {
          completedRooms.push(roomCode);
          localStorage.setItem('completed_rooms', JSON.stringify(completedRooms));
        }
      }
      
      triggerConfetti();
      setQuizCompleted(true);
    } catch (error) {
      console.error('Error completing quiz:', error);
    }
  };

  if (quizCompleted) {
    const finalLink = questions[questions.length - 1].directLink;
    return (
      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          
          <h2 className="font-bold text-2xl text-white mb-2">Selamat!</h2>
          <p className="text-slate-400 mb-6">Kamu berhasil menyelesaikan semua pertanyaan.</p>
          
          <div className="bg-slate-700/50 rounded-xl p-4 mb-6 border border-slate-600">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <span className="font-medium">Kamu adalah pemenang!</span>
            </div>
          </div>
          
          <a
            href={finalLink}
            onClick={() => playSound('click')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            <span>Klaim Hadiah</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  if (status === 'correct') {
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    return (
      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <CheckIcon className="w-10 h-10 text-emerald-500" />
          </div>
          
          <h2 className="font-bold text-2xl text-white mb-2">Benar!</h2>
          <p className="text-slate-400 mb-6">
            {isLastQuestion ? 'Pertanyaan terakhir berhasil dijawab!' : 'Lanjut ke pertanyaan berikutnya.'}
          </p>
          
          {isLastQuestion ? (
            <button
              onClick={handleCompleteQuiz}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Selesaikan Quiz
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Lanjut
            </button>
          )}
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className={`w-full max-w-md ${status === 'incorrect' ? 'animate-shake' : ''}`}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-400">
            Pertanyaan {currentQuestionIndex + 1}/{questions.length}
          </span>
          {clue && (
            <button 
              onClick={handleClueClick} 
              className={`p-2 rounded-lg transition-all duration-200 ${showClue ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-700'}`}
            >
              <ClueIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="w-full bg-slate-700 rounded-full h-1.5 mb-6">
          <div 
            className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className={`transition-all duration-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <h1 className="font-bold text-xl text-white mb-4">{question}</h1>

          {showClue && clue && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 animate-fadeIn">
              <p className="text-sm text-amber-300">
                <span className="font-semibold">Petunjuk:</span> {clue}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ketik jawaban..."
                className={`w-full px-4 py-3 text-white bg-slate-700 border rounded-xl focus:outline-none transition-all duration-200 placeholder-slate-500
                  ${status === 'incorrect' 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-slate-600 focus:border-amber-500'
                  }`}
                disabled={status === 'incorrect'}
                autoFocus
              />
              {status === 'incorrect' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XIcon className="w-5 h-5 text-red-400" />
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              disabled={!userInput.trim()}
            >
              Jawab
            </button>
          </form>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-shake { animation: shake 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default QuizCard;
