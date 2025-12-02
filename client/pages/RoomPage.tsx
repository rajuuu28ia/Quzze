import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizCard from '../../components/QuizCard';
import CountdownScreen from '../components/CountdownScreen';
import BlurredQuiz from '../components/BlurredQuiz';
import TooLateScreen from '../components/TooLateScreen';

interface QuizItem {
  question: string;
  correctAnswer: string;
  directLink: string;
  clue?: string;
}

interface QuizSettings {
  id: number;
  roomCode: string;
  title: string;
  prize: string;
  startTime: string | null;
  durationMinutes: number;
  maxParticipants: number;
  completedParticipants: number;
  redirectLink: string;
}

type PageState = 'loading' | 'not-found' | 'already-completed' | 'room-info' | 'too-late' | 'waiting' | 'countdown' | 'playing';

const getVisitorId = (): string => {
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

const isRoomCompleted = (roomCode: string): boolean => {
  const completedRooms = JSON.parse(localStorage.getItem('completed_rooms') || '[]');
  return completedRooms.includes(roomCode);
};

const RoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>('loading');
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [questions, setQuestions] = useState<QuizItem[]>([]);
  const [sessionId] = useState(() => {
    const visitorId = getVisitorId();
    return `${roomCode}_${visitorId}_${Date.now()}`;
  });

  const fetchRoom = useCallback(async () => {
    if (!roomCode) {
      setState('not-found');
      return;
    }

    if (isRoomCompleted(roomCode)) {
      setState('already-completed');
      return;
    }

    try {
      const res = await fetch(`/api/room/${roomCode}`);
      const data = await res.json();

      if (!res.ok || !data.available) {
        if (data.tooLate) {
          setState('too-late');
        } else {
          setState('not-found');
        }
        return;
      }

      setSettings(data.settings);
      setQuestions(data.questions);
      setState('room-info');
    } catch (error) {
      console.error('Error fetching room:', error);
      setState('not-found');
    }
  }, [roomCode]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const handleStartQuiz = async () => {
    if (!settings) return;

    if (settings.startTime) {
      const startTime = new Date(settings.startTime);
      const now = new Date();
      
      if (now < startTime) {
        setState('waiting');
        return;
      }
    }

    try {
      const res = await fetch('/api/quiz/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, roomCode }),
      });

      const data = await res.json();

      if (!res.ok && data.tooLate) {
        setState('too-late');
        return;
      }

      setState('countdown');
    } catch (error) {
      console.error('Error joining quiz:', error);
    }
  };

  const handleWaitingComplete = async () => {
    try {
      const res = await fetch('/api/quiz/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, roomCode }),
      });

      const data = await res.json();

      if (!res.ok && data.tooLate) {
        setState('too-late');
        return;
      }

      setState('countdown');
    } catch (error) {
      console.error('Error joining quiz:', error);
      setState('too-late');
    }
  };

  const handleCountdownComplete = () => {
    setState('playing');
  };

  const handleQuizTooLate = () => {
    setState('too-late');
  };

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Memuat...</p>
        </div>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Room Tidak Ditemukan</h1>
          <p className="text-slate-400 mb-6">Quiz dengan kode room ini tidak ada atau sudah tidak aktif.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (state === 'already-completed') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sudah Selesai</h1>
          <p className="text-slate-400 mb-6">Kamu sudah menyelesaikan quiz ini sebelumnya. Tunggu quiz berikutnya ya!</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (state === 'too-late') {
    return <TooLateScreen />;
  }

  if (state === 'waiting' && settings?.startTime) {
    return (
      <BlurredQuiz
        startTime={new Date(settings.startTime)}
        onTimeUp={handleWaitingComplete}
        title={settings.title}
        maxParticipants={settings.maxParticipants}
        currentWinners={settings.completedParticipants}
      />
    );
  }

  if (state === 'countdown') {
    return <CountdownScreen onComplete={handleCountdownComplete} />;
  }

  if (state === 'playing') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <QuizCard 
          questions={questions} 
          sessionId={sessionId} 
          roomCode={roomCode}
          onTooLate={handleQuizTooLate} 
        />
      </div>
    );
  }

  const slotsRemaining = settings ? settings.maxParticipants - settings.completedParticipants : 0;

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full mb-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-slate-400 text-sm">Room Aktif</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-4">
          <h1 className="text-2xl font-bold text-white text-center mb-2">{settings?.title}</h1>
          
          {settings?.prize && (
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <span className="font-medium">{settings.prize}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{questions.length}</p>
              <p className="text-slate-400 text-sm">Pertanyaan</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{slotsRemaining}</p>
              <p className="text-slate-400 text-sm">Slot Tersisa</p>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4 mb-6 border border-slate-600/50">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cara Bermain
            </h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Jawab semua pertanyaan dengan benar</li>
              <li>• {settings?.maxParticipants} orang tercepat akan menang</li>
              <li>• Kamu hanya bisa main sekali</li>
            </ul>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={slotsRemaining <= 0}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            {slotsRemaining <= 0 ? 'Slot Penuh' : 'Mulai Quiz'}
          </button>
        </div>

        <p className="text-center text-slate-500 text-sm">
          Kode Room: <span className="text-slate-400 font-mono">{roomCode}</span>
        </p>
      </div>
    </div>
  );
};

export default RoomPage;
