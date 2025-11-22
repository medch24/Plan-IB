import React, { useState, useEffect } from 'react';
import { UnitPlan, AppView } from './types';
import Dashboard from './components/Dashboard';
import UnitPlanForm from './components/UnitPlanForm';
import LoginScreen from './components/LoginScreen';
import { sanitizeUnitPlan } from './services/geminiService';

// Clé pour les planifications partagées par matière/classe
const SHARED_PLANNINGS_KEY = 'myp_shared_planifications';

// Structure: { "Mathématiques_PEI 3": [...plans], "Sciences_PEI 2": [...plans] }
interface SharedPlanifications {
  [key: string]: UnitPlan[];
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [currentPlans, setCurrentPlans] = useState<UnitPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<UnitPlan | undefined>(undefined);
  
  // Session State - Filter by subject and grade
  const [session, setSession] = useState<{subject: string, grade: string} | null>(null);

  // Générer la clé unique pour matière + classe
  const getPlanningKey = (subject: string, grade: string) => {
    return `${subject}_${grade}`;
  };

  // Charger les planifications partagées depuis localStorage
  const loadSharedPlanifications = (): SharedPlanifications => {
    try {
      const saved = localStorage.getItem(SHARED_PLANNINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load shared planifications", e);
    }
    return {};
  };

  // Sauvegarder les planifications partagées dans localStorage
  const saveSharedPlanifications = (planifications: SharedPlanifications) => {
    try {
      localStorage.setItem(SHARED_PLANNINGS_KEY, JSON.stringify(planifications));
    } catch (e) {
      console.error("Failed to save shared planifications", e);
    }
  };

  // Charger les plans pour une matière/classe spécifique
  const loadPlansForSubjectGrade = (subject: string, grade: string): UnitPlan[] => {
    const allPlanifications = loadSharedPlanifications();
    const key = getPlanningKey(subject, grade);
    const plans = allPlanifications[key] || [];
    
    // Sanitize loaded plans
    return plans.map(p => sanitizeUnitPlan(p, subject, grade));
  };

  // Sauvegarder les plans pour la session courante
  const savePlansForCurrentSession = (plans: UnitPlan[]) => {
    if (!session) return;
    
    const allPlanifications = loadSharedPlanifications();
    const key = getPlanningKey(session.subject, session.grade);
    allPlanifications[key] = plans;
    saveSharedPlanifications(allPlanifications);
  };

  // Charger les plans quand la session change
  useEffect(() => {
    if (session) {
      const plans = loadPlansForSubjectGrade(session.subject, session.grade);
      setCurrentPlans(plans);
    }
  }, [session]);

  // Sauvegarder automatiquement quand les plans changent
  useEffect(() => {
    if (session && currentPlans.length > 0) {
      savePlansForCurrentSession(currentPlans);
    }
  }, [currentPlans, session]);

  const handleLogin = (subject: string, grade: string) => {
    setSession({ subject, grade });
    setView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentPlans([]);
    setView(AppView.LOGIN);
  };

  const handleCreateNew = () => {
    setEditingPlan({
        ...sanitizeUnitPlan({}, session?.subject || "", session?.grade || ""),
        teacherName: "",
        subject: session?.subject || "",
        gradeLevel: session?.grade || ""
    });
    setView(AppView.EDITOR);
  };

  const handleEdit = (plan: UnitPlan) => {
    setEditingPlan(plan);
    setView(AppView.EDITOR);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce plan ?")) {
      setCurrentPlans(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSavePlan = (plan: UnitPlan) => {
    // Ensure subject and grade are attached from session
    const planToSave = { 
        ...plan,
        subject: plan.subject || session?.subject || "",
        gradeLevel: plan.gradeLevel || session?.grade || ""
    };

    if (editingPlan && editingPlan.id) {
      setCurrentPlans(prev => prev.map(p => p.id === planToSave.id ? planToSave : p));
    } else {
      setCurrentPlans(prev => [planToSave, ...prev]);
    }
    setView(AppView.DASHBOARD);
  };

  const handleAddPlans = (newPlans: UnitPlan[]) => {
    if (!session) return;

    // Demander confirmation si des plans existent déjà
    if (currentPlans.length > 0) {
      const confirm = window.confirm(
        `⚠️ Une planification existe déjà pour ${session.subject} - ${session.grade}.\n\n` +
        `Voulez-vous REMPLACER l'ancienne planification par la nouvelle ?\n\n` +
        `- OUI: Remplacer complètement\n` +
        `- NON: Annuler`
      );
      
      if (!confirm) {
        return; // L'utilisateur annule
      }
    }

    // Ajouter ou remplacer les plans
    const signedPlans = newPlans.map(p => ({
        ...p,
        subject: session.subject,
        gradeLevel: session.grade
    }));

    // REMPLACER les anciens plans par les nouveaux
    setCurrentPlans(signedPlans);
    
    // Message de confirmation
    alert(`✅ Planification enregistrée pour ${session.subject} - ${session.grade}\n\n` +
          `${signedPlans.length} unités créées.\n\n` +
          `Cette planification est maintenant disponible pour tous les enseignants de cette matière/classe.`);
  };

  const handleCancel = () => {
    setView(AppView.DASHBOARD);
  };

  if (view === AppView.LOGIN) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {view === AppView.DASHBOARD && session ? (
        <Dashboard 
          currentSubject={session.subject}
          currentGrade={session.grade}
          plans={currentPlans} 
          onCreateNew={handleCreateNew} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          onAddPlans={handleAddPlans}
          onLogout={handleLogout}
        />
      ) : (
        <div className="p-4 md:p-8">
          <UnitPlanForm 
            initialPlan={editingPlan} 
            onSave={handleSavePlan} 
            onCancel={handleCancel} 
          />
        </div>
      )}
    </div>
  );
};

export default App;
