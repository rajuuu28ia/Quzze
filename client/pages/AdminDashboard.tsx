import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Question {
  questionText: string;
  correctAnswer: string;
  hint: string;
}

interface Quiz {
  id: number;
  roomCode: string;
  title: string;
  prize: string;
  startTime: string | null;
  durationMinutes: number;
  maxParticipants: number;
  redirectLink: string;
  isActive: boolean;
  completedParticipants: number;
  totalParticipants: number;
  slotsRemaining: number;
}

const AdminDashboard: React.FC = () => {
  const { secretKey } = useParams<{ secretKey: string }>();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    title: 'Quiz Seru',
    prize: 'Hadiah 10rb',
    startTime: '',
    durationMinutes: 5,
    maxParticipants: 5,
    redirectLink: 'https://example.com',
    isActive: true,
  });

  const [questions, setQuestions] = useState<Question[]>([
    { questionText: '', correctAnswer: '', hint: '' }
  ]);

  useEffect(() => {
    if (!secretKey) {
      navigate('/');
      return;
    }
    
    setAuthorized(true);
    loadQuizzes();
    const interval = setInterval(loadQuizzes, 5000);
    return () => clearInterval(interval);
  }, [secretKey, navigate]);

  const loadQuizzes = async () => {
    try {
      const res = await fetch(`/api/quizzes?secretKey=${secretKey}`);
      if (res.status === 401) {
        setAuthorized(false);
        navigate('/');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingQuiz(null);
    setFormData({
      title: 'Quiz Seru',
      prize: 'Hadiah 10rb',
      startTime: '',
      durationMinutes: 5,
      maxParticipants: 5,
      redirectLink: 'https://example.com',
      isActive: true,
    });
    setQuestions([{ questionText: '', correctAnswer: '', hint: '' }]);
    setShowForm(true);
  };

  const handleEdit = async (quiz: Quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}?secretKey=${secretKey}`);
      if (res.ok) {
        const data = await res.json();
        setEditingQuiz(quiz);
        setFormData({
          title: quiz.title,
          prize: quiz.prize || '',
          startTime: quiz.startTime ? new Date(quiz.startTime).toISOString().slice(0, 16) : '',
          durationMinutes: quiz.durationMinutes,
          maxParticipants: quiz.maxParticipants,
          redirectLink: quiz.redirectLink,
          isActive: quiz.isActive,
        });
        setQuestions(data.questions.length > 0 ? data.questions.map((q: any) => ({
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          hint: q.hint || '',
        })) : [{ questionText: '', correctAnswer: '', hint: '' }]);
        setShowForm(true);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memuat data quiz' });
    }
  };

  const handleDelete = async (quizId: number) => {
    if (!confirm('Yakin ingin menghapus quiz ini?')) return;
    
    try {
      const res = await fetch(`/api/quizzes/${quizId}?secretKey=${secretKey}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Quiz berhasil dihapus' });
        loadQuizzes();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghapus quiz' });
    }
  };

  const handleSave = async () => {
    const validQuestions = questions.filter(q => q.questionText.trim() && q.correctAnswer.trim());
    
    if (validQuestions.length === 0) {
      setMessage({ type: 'error', text: 'Minimal 1 pertanyaan harus diisi' });
      return;
    }

    setSaving(true);
    try {
      const url = editingQuiz ? `/api/quizzes/${editingQuiz.id}?secretKey=${secretKey}` : `/api/quizzes?secretKey=${secretKey}`;
      const method = editingQuiz ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
          questionsList: validQuestions,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: editingQuiz ? 'Quiz berhasil diupdate!' : 'Quiz baru berhasil dibuat!' });
        setShowForm(false);
        loadQuizzes();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Gagal menyimpan' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server' });
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    if (questions.length < 5) {
      setQuestions([...questions, { questionText: '', correctAnswer: '', hint: '' }]);
    }
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const copyRoomLink = (roomCode: string) => {
    const link = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: 'Link berhasil disalin!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  if (!authorized) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7m0 6h2m-4 0h-2m0 0H7m0 0H5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h1>
          <p className="text-slate-400">Secret key tidak valid</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">
              {editingQuiz ? 'Edit Quiz' : 'Buat Quiz Baru'}
            </h1>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {message.text && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {message.text}
            </div>
          )}

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Judul Quiz</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  placeholder="Judul quiz"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hadiah</label>
                <input
                  type="text"
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  placeholder="Contoh: Pulsa 10rb"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Waktu Mulai (Opsional)</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Jumlah Pemenang</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Link Hadiah</label>
              <input
                type="url"
                value={formData.redirectLink}
                onChange={(e) => setFormData({ ...formData, redirectLink: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                placeholder="https://example.com/hadiah"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
              />
              <span className="text-slate-300 text-sm">Aktifkan Quiz</span>
            </label>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Pertanyaan ({questions.length}/5)</h2>
              {questions.length < 5 && (
                <button
                  onClick={addQuestion}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                >
                  + Tambah
                </button>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-amber-400">Pertanyaan {index + 1}</span>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      placeholder="Tulis pertanyaan..."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Jawaban benar"
                      />
                      <input
                        type="text"
                        value={q.hint}
                        onChange={(e) => updateQuestion(index, 'hint', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="Petunjuk (opsional)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-900 disabled:text-slate-500 font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Menyimpan...' : (editingQuiz ? 'Update Quiz' : 'Buat Quiz')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
            <p className="text-slate-400 text-sm">Kelola quiz Anda</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
          >
            + Buat Quiz
          </button>
        </div>

        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Belum Ada Quiz</h2>
            <p className="text-slate-400 mb-4">Buat quiz pertama Anda untuk memulai</p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
            >
              Buat Quiz Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white">{quiz.title}</h2>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${quiz.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {quiz.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    {quiz.prize && (
                      <p className="text-amber-400 text-sm">{quiz.prize}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyRoomLink(quiz.roomCode)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Salin Link"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(quiz)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{quiz.slotsRemaining}</p>
                    <p className="text-slate-400 text-xs">Slot Tersisa</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-white">{quiz.completedParticipants}</p>
                    <p className="text-slate-400 text-xs">Pemenang</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-white">{quiz.maxParticipants}</p>
                    <p className="text-slate-400 text-xs">Max Pemenang</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-mono bg-slate-700 px-2 py-1 rounded">{quiz.roomCode}</span>
                    <span>•</span>
                    <span>/room/{quiz.roomCode}</span>
                  </div>
                  {quiz.startTime && (
                    <span className="text-slate-500">
                      {new Date(quiz.startTime).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
