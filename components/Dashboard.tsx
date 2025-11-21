import React, { useState } from 'react';
import { UnitPlan } from '../types';
import { Plus, Edit2, Trash2, FileText, Calendar, Layers, Loader2, Download, X, FileCheck, Filter, FileArchive, User } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { generateCourseFromChapters } from '../services/geminiService';
import { exportUnitPlanToWord, exportAssessmentsToZip } from '../services/wordExportService';
import { SUBJECTS } from '../constants';

interface DashboardProps {
  teacherName: string;
  currentGrade: string;
  plans: UnitPlan[];
  onCreateNew: () => void;
  onEdit: (plan: UnitPlan) => void;
  onDelete: (id: string) => void;
  onAddPlans: (newPlans: UnitPlan[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ teacherName, currentGrade, plans, onCreateNew, onEdit, onDelete, onAddPlans }) => {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState('');
  // Pre-fill bulk grade from session
  const [bulkGrade, setBulkGrade] = useState(currentGrade);
  const [bulkChapters, setBulkChapters] = useState('');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Filter States (only subject needed since grade is filtered by App)
  const [filterSubject, setFilterSubject] = useState('');

  // Prepare data for charts
  const subjectData = plans.reduce((acc: Record<string, number>, plan) => {
    const subj = plan.subject || 'Non assigné';
    acc[subj] = (acc[subj] || 0) + 1;
    return acc;
  }, {});
  
  const chartData = Object.entries(subjectData).map(([name, value]) => ({ name, value }));

  // Filter Logic
  const uniqueSubjects = Array.from(new Set(plans.map(p => p.subject).filter(Boolean))).sort();

  const filteredPlans = plans.filter(plan => {
    return filterSubject ? plan.subject === filterSubject : true;
  });

  const handleBulkGenerate = async () => {
    if (!bulkSubject || !bulkGrade || !bulkChapters) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    
    setIsBulkGenerating(true);
    try {
      const newPlans = await generateCourseFromChapters(bulkChapters, bulkSubject, bulkGrade);
      if (newPlans.length > 0) {
        if (onAddPlans) {
            onAddPlans(newPlans);
        }
        setIsBulkModalOpen(false);
        setBulkChapters('');
      } else {
        alert("L'IA n'a pas retourné de plan valide.");
      }
    } catch (e) {
      alert("Erreur lors de la génération: " + e);
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleExportPlan = async (plan: UnitPlan) => {
    setExportingId(`plan-${plan.id}`);
    await exportUnitPlanToWord(plan);
    setExportingId(null);
  };

  const handleExportAssessment = async (plan: UnitPlan) => {
    setExportingId(`eval-${plan.id}`);
    await exportAssessmentsToZip(plan);
    setExportingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white shadow-md overflow-hidden border border-slate-100">
             <img 
                src="logo.png" 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={(e) => e.currentTarget.style.display = 'none'}
             />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Planificateur PEI - {currentGrade}</h1>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <User size={16} />
              <span className="font-medium">{teacherName}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
             <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-lg font-semibold shadow-lg transition transform hover:-translate-y-0.5"
            >
              <Layers size={20} />
              Planification Annuelle
            </button>
            <button 
              onClick={onCreateNew}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold shadow-lg transition transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Nouvelle unité
            </button>
        </div>
      </header>

      {/* Stats Section */}
      {plans.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Unités pour {currentGrade}</h3>
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 rounded-full text-blue-600">
                        <FileText size={32} />
                    </div>
                    <span className="text-4xl font-bold text-slate-800">{plans.length}</span>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:col-span-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Répartition par matière</h3>
                <div className="h-40 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{left: 40}}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
      )}

      {/* Plans List */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-slate-500" />
                Unités récentes
            </h2>

            {/* Filters */}
            {plans.length > 0 && (
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mr-1">
                        <Filter size={16} />
                        <span>Filtrer:</span>
                    </div>
                    <select 
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Toutes les matières</option>
                        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {filterSubject && (
                        <button 
                            onClick={() => setFilterSubject('')}
                            className="text-slate-500 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50"
                            title="Effacer"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
        
        {plans.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 shadow-sm">
                <div className="text-slate-400 mb-4 mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <Layers size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Aucune unité pour {currentGrade}</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                   C'est le moment idéal pour générer automatiquement tout votre programme annuel en une seule fois.
                </p>
                <button 
                  onClick={() => setIsBulkModalOpen(true)}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition inline-flex items-center gap-2"
                >
                  <Layers size={20} />
                  Lancer la Planification Annuelle
                </button>
                <div className="mt-4">
                     <span className="text-slate-400 text-sm">ou</span>
                     <button onClick={onCreateNew} className="ml-2 text-blue-600 hover:underline text-sm">créer une unité manuellement</button>
                </div>
            </div>
        ) : filteredPlans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 mb-2">Aucune unité ne correspond à vos filtres.</p>
                <button 
                  onClick={() => setFilterSubject('')}
                  className="text-blue-600 font-medium hover:underline text-sm"
                >
                  Effacer les filtres
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPlans.map(plan => (
                    <div key={plan.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="inline-block px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded mb-2">
                                    {plan.subject || 'Sans matière'}
                                </span>
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition">{plan.title || 'Unité sans titre'}</h3>
                                <p className="text-sm text-slate-500">{plan.gradeLevel} • {plan.duration}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => onEdit(plan)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition ml-auto"
                                    title="Modifier"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    onClick={() => onDelete(plan.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition ml-auto"
                                    title="Supprimer"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-grow">
                            {plan.statementOfInquiry ? (
                                <div className="bg-slate-50 p-3 rounded-lg mb-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Énoncé de recherche</p>
                                    <p className="text-sm text-slate-700 italic line-clamp-2">"{plan.statementOfInquiry}"</p>
                                </div>
                            ) : (
                                <div className="h-16 bg-slate-50 rounded-lg mb-4 flex items-center justify-center text-xs text-slate-400 italic">
                                    Pas d'énoncé défini
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleExportPlan(plan)}
                                    className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-100 transition"
                                    disabled={exportingId === `plan-${plan.id}`}
                                >
                                    {exportingId === `plan-${plan.id}` ? <Loader2 className="animate-spin" size={14}/> : <Download size={14}/>}
                                    Plan
                                </button>
                                <button 
                                    onClick={() => handleExportAssessment(plan)}
                                    className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition"
                                    disabled={exportingId === `eval-${plan.id}`}
                                    title={"Exporter les évaluations (Zip)"}
                                >
                                    {exportingId === `eval-${plan.id}` ? <Loader2 className="animate-spin" size={14}/> : <FileArchive size={14}/>}
                                    Exams (Zip)
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* Bulk Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-violet-600 p-4 flex justify-between items-center text-white">
                 <h3 className="text-lg font-bold flex items-center gap-2">
                    <Layers size={20} />
                    Planification Annuelle : {currentGrade}
                 </h3>
                 <button onClick={() => setIsBulkModalOpen(false)} className="hover:bg-violet-700 p-1 rounded">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="p-6 space-y-4">
                 <p className="text-slate-600 text-sm">
                    Collez le programme complet ci-dessous. L'IA va structurer 4 à 6 unités et générer tous les évaluations.
                 </p>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Matière</label>
                        <select 
                            value={bulkSubject}
                            onChange={(e) => setBulkSubject(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-sm"
                        >
                            <option value="">Sélectionner...</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Niveau</label>
                        <input 
                            type="text" 
                            value={bulkGrade}
                            onChange={(e) => setBulkGrade(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-100"
                            readOnly
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Liste des chapitres / Sujets</label>
                    <textarea 
                        value={bulkChapters}
                        onChange={(e) => setBulkChapters(e.target.value)}
                        placeholder="Collez ici le programme complet..."
                        className="w-full h-40 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                 </div>

                 <button 
                    onClick={handleBulkGenerate}
                    disabled={isBulkGenerating}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition disabled:opacity-70"
                 >
                    {isBulkGenerating ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Analyse et structuration en cours (Ceci peut prendre 30s)...
                        </>
                    ) : (
                        <>
                            <Layers size={20} />
                            Générer les 4-6 Unités
                        </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
