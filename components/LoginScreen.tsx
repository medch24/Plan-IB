import React, { useState } from 'react';
import { School, BookOpen, ChevronRight, FileText } from 'lucide-react';
import { SUBJECTS } from '../constants';
import { AppMode } from '../types';

interface LoginScreenProps {
  onLogin: (subject: string, grade: string, mode: AppMode) => void;
}

// Classes pour PEI Planner (Programme IB)
const PEI_GRADES = ['PEI 1', 'PEI 2', 'PEI 3', 'PEI 4', 'PEI 5'];

// Classes pour Examens (Programme Français)
const EXAM_GRADES = ['6ème', '5ème', '4ème', '3ème', 'Seconde', '1ère', 'Terminale'];

// Matières pour Examens (Programme Français)
const EXAM_SUBJECTS = [
  'Français',
  'Anglais',
  'Mathématiques',
  'SVT',
  'Physique-Chimie',
  'Histoire-Géographie-EMC',
  'Technologie',
  'Sciences Numériques et Technologiques (SNT)',
  'Sciences Économiques et Sociales (SES)'
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AppMode | null>(null);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');

  const handleModeSelect = (selectedMode: AppMode) => {
    setMode(selectedMode);
    setSubject('');
    setGrade('');
  };

  const handleBack = () => {
    setMode(null);
    setSubject('');
    setGrade('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && grade.trim() && mode) {
      onLogin(subject, grade, mode);
    } else {
        alert("Veuillez sélectionner la matière et la classe.");
    }
  };

  // Déterminer les listes selon le mode
  const currentGrades = mode === AppMode.EXAMS ? EXAM_GRADES : PEI_GRADES;
  const currentSubjects = mode === AppMode.EXAMS ? EXAM_SUBJECTS : SUBJECTS;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-8 text-white text-center relative">
           <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
              <img 
                src="/logo-alkawtar.png" 
                alt="Al Kawthar Logo" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-white/20', 'backdrop-blur-sm');
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>';
                  e.currentTarget.parentElement?.appendChild(icon);
                }}
              />
           </div>
           <h1 className="text-2xl font-bold">{mode ? (mode === AppMode.PEI_PLANNER ? 'PEI Planner' : 'Examens et Évaluations') : 'Plateforme Pédagogique'}</h1>
           <p className="text-blue-100 mt-2 text-sm">Les Écoles Internationales Al-Kawthar</p>
        </div>
        
        <div className="p-8">
            {!mode ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 mb-4 text-center">Choisissez votre module</h2>
                
                <button
                  onClick={() => handleModeSelect(AppMode.PEI_PLANNER)}
                  className="w-full flex items-center gap-4 p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-500 transition-colors">
                    <BookOpen className="text-blue-600 group-hover:text-white" size={28} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-800 text-lg">PEI Planner</h3>
                    <p className="text-sm text-slate-600">Planification des unités PEI (Programme IB)</p>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:text-blue-600" size={24} />
                </button>

                <button
                  onClick={() => handleModeSelect(AppMode.EXAMS)}
                  className="w-full flex items-center gap-4 p-6 border-2 border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 transition-all group"
                >
                  <div className="bg-violet-100 p-3 rounded-lg group-hover:bg-violet-500 transition-colors">
                    <FileText className="text-violet-600 group-hover:text-white" size={28} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-800 text-lg">Examens et Évaluations</h3>
                    <p className="text-sm text-slate-600">Génération d'examens ministériels français</p>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:text-violet-600" size={24} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleBack}
                  className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition"
                >
                  <ChevronRight className="rotate-180" size={18} />
                  <span className="text-sm">Retour</span>
                </button>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <BookOpen className="text-slate-400" size={20} />
                            </div>
                            <select 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition appearance-none bg-white"
                                required
                            >
                                <option value="">Sélectionner la matière...</option>
                                {currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Classe / Niveau</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <School className="text-slate-400" size={20} />
                            </div>
                            <select 
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition appearance-none bg-white"
                                required
                            >
                                <option value="">Sélectionner la classe...</option>
                                {currentGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 ml-1">
                            {mode === AppMode.PEI_PLANNER 
                              ? 'Affiche les unités PEI pour cette matière et cette classe.'
                              : 'Sélectionnez la classe pour générer des examens français.'}
                        </p>
                    </div>

                    <button 
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg transition transform hover:-translate-y-0.5 shadow-md"
                    >
                        {mode === AppMode.PEI_PLANNER ? 'Accéder aux unités PEI' : 'Créer un examen'}
                        <ChevronRight size={18} />
                    </button>
                </form>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
