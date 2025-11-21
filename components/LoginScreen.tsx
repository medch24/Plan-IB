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
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-8 text-white text-center">
           <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <School size={32} />
           </div>
           <h1 className="text-2xl font-bold">Bienvenue sur MYP Planner</h1>
           <p className="text-blue-100 mt-2 text-sm">Planification et Évaluation assistées par IA</p>
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