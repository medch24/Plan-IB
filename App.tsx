import React, { useState, useEffect } from 'react';
import { UnitPlan, AppView, AppMode } from './types';
import Dashboard from './components/Dashboard';
import UnitPlanForm from './components/UnitPlanForm';
import LoginScreen from './components/LoginScreen';
import AuthenticationScreen from './components/AuthenticationScreen';
import ExamsWizard from './components/ExamsWizard';
import { sanitizeUnitPlan } from './services/geminiService';
import { loadPlansFromDatabase, savePlansToDatabase, migrateLocalStorageToMongoDB, needsMigration } from './services/databaseService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [currentPlans, setCurrentPlans] = useState<UnitPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<UnitPlan | undefined>(undefined);
  const [migrationDone, setMigrationDone] = useState(false);
  
  // Session State - Filter by subject, grade and mode
  const [session, setSession] = useState<{subject: string, grade: string, mode?: AppMode} | null>(null);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    };
    
    checkAuth();
  }, []);

  // Migration automatique au démarrage de l'application
  useEffect(() => {
    const runMigration = async () => {
      if (migrationDone) return;
      
      try {
        // Vérifier si une migration est nécessaire
        if (needsMigration()) {
          console.log('🚀 Démarrage de la migration automatique localStorage → MongoDB');
          
          const result = await migrateLocalStorageToMongoDB();
          
          if (result.migrated > 0) {
            console.log(`\n✅ Migration réussie : ${result.migrated} planification(s) migrée(s) vers MongoDB`);
            console.log('📢 Ces données sont maintenant accessibles à tous les enseignants !');
          }
          
          if (result.errors > 0) {
            console.warn(`⚠️ ${result.errors} erreur(s) lors de la migration`);
          }
        } else {
          console.log('✅ Aucune migration nécessaire (localStorage vide ou déjà migré)');
        }
        
        setMigrationDone(true);
      } catch (error) {
        console.error('❌ Erreur lors de la migration automatique:', error);
        setMigrationDone(true); // Marquer comme fait même en cas d'erreur pour éviter les boucles
      }
    };
    
    runMigration();
  }, []); // Exécuter une seule fois au montage du composant

  // Charger les plans quand la session change (depuis MongoDB)
  useEffect(() => {
    if (session) {
      const loadPlans = async () => {
        try {
          console.log(`🔄 Chargement des plans depuis MongoDB pour ${session.subject} - ${session.grade}`);
          const plans = await loadPlansFromDatabase(session.subject, session.grade);
          
          // Sanitize loaded plans
          const sanitizedPlans = plans.map(p => sanitizeUnitPlan(p, session.subject, session.grade));
          setCurrentPlans(sanitizedPlans);
          
          if (sanitizedPlans.length > 0) {
            console.log(`✅ ${sanitizedPlans.length} plan(s) chargé(s) depuis MongoDB`);
          } else {
            console.log('ℹ️ Aucun plan trouvé pour cette matière/classe');
          }
        } catch (error) {
          console.error('❌ Erreur lors du chargement des plans:', error);
        }
      };
      
      loadPlans();
    }
  }, [session]);

  // Sauvegarder automatiquement quand les plans changent (vers MongoDB)
  useEffect(() => {
    if (session && currentPlans.length > 0) {
      const savePlans = async () => {
        try {
          console.log(`💾 Sauvegarde de ${currentPlans.length} plan(s) dans MongoDB...`);
          const success = await savePlansToDatabase(session.subject, session.grade, currentPlans);
          
          if (success) {
            console.log('✅ Plans sauvegardés avec succès dans MongoDB');
          } else {
            console.warn('⚠️ Sauvegarde dans localStorage seulement (fallback)');
          }
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde des plans:', error);
        }
      };
      
      savePlans();
    }
  }, [currentPlans, session]);

  const handleLogin = (subject: string, grade: string, mode: AppMode) => {
    // Pour le mode examens, passer directement à l'assistant de génération
    if (mode === AppMode.EXAMS) {
      // Passer directement à la génération sans stocker de session
      setSession({ subject: '', grade: '', mode });
      setView(AppView.EXAMS_WIZARD);
    } else {
      setSession({ subject, grade, mode });
      setView(AppView.DASHBOARD);
    }
  };

  const handleLogout = () => {
    // Déconnexion complète : effacer la session et l'authentification
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authTimestamp');
    setIsAuthenticated(false);
    setSession(null);
    setCurrentPlans([]);
    setView(AppView.LOGIN);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
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

  // Si pas authentifié, afficher l'écran d'authentification
  if (!isAuthenticated) {
    return <AuthenticationScreen onAuthenticated={handleAuthenticated} />;
  }

  // Si authentifié mais pas encore de session (mode/matière/classe), afficher l'écran de sélection
  if (view === AppView.LOGIN) {
    return <LoginScreen onLogin={handleLogin} onLogout={handleLogout} />;
  }

  // Mode Examens
  if (view === AppView.EXAMS_WIZARD) {
    return (
      <ExamsWizard 
        onBack={handleLogout}
      />
    );
  }

  // Mode PEI Planner
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
