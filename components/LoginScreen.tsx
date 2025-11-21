import React, { useState } from 'react';
import { School, UserCircle, ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (teacherName: string, grade: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [teacherName, setTeacherName] = useState('');
  const [grade, setGrade] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherName.trim() && grade.trim()) {
      onLogin(teacherName, grade);
    } else {
        alert("Veuillez entrer votre nom et la classe.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-8 text-white text-center relative">
           <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              {/* Make sure logo.png is in your public folder */}
              <img 
                src="logo.png" 
                alt="Al Kawthar Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-white/20', 'backdrop-blur-sm');
                  // Show icon if image fails
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>';
                  e.currentTarget.parentElement?.appendChild(icon);
                }}
              />
           </div>
           <h1 className="text-2xl font-bold">PEI Planner</h1>
           <p className="text-blue-100 mt-2 text-sm">Écoles Internationales Al-Kawthar</p>
        </div>
        
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'enseignant(e)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserCircle className="text-slate-400" size={20} />
                        </div>
                        <input 
                            type="text"
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="ex: M. Dupont"
                            required
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Classe / Niveau (Grade)</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <School className="text-slate-400" size={20} />
                        </div>
                        <input 
                            type="text"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="ex: PEI 1"
                            required
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 ml-1">
                        Vos plans seront filtrés pour cette classe.
                    </p>
                </div>

                <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg transition transform hover:-translate-y-0.5 shadow-md"
                >
                    Accéder à mes unités
                    <ChevronRight size={18} />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
