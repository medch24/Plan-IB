import React, { useState, useEffect } from 'react';
import { UnitPlan, AppView } from './types';
import Dashboard from './components/Dashboard';
import UnitPlanForm from './components/UnitPlanForm';
import LoginScreen from './components/LoginScreen';
import { sanitizeUnitPlan } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [plans, setPlans] = useState<UnitPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<UnitPlan | undefined>(undefined);
  
  // Session State (simulating Database connection)
  const [session, setSession] = useState<{teacher: string, grade: string} | null>(null);

  // Load plans from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('myp_unit_plans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Sanitize loaded plans to prevent crashes from old data versions
          const sanitized = parsed.map(p => sanitizeUnitPlan(p, p.subject || "", p.gradeLevel || ""));
          setPlans(sanitized);
        }
      } catch (e) {
        console.error("Failed to load plans", e);
      }
    }
  }, []);

  // Save plans to localStorage whenever they change
  useEffect(() => {
    if (plans.length > 0) {
        localStorage.setItem('myp_unit_plans', JSON.stringify(plans));
    }
  }, [plans]);

  const handleLogin = (teacher: string, grade: string) => {
      setSession({ teacher, grade });
      setView(AppView.DASHBOARD);
  };

  const handleCreateNew = () => {
    setEditingPlan({
        ...sanitizeUnitPlan({}, "", session?.grade || ""),
        teacherName: session?.teacher || "",
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
      setPlans(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSavePlan = (plan: UnitPlan) => {
    // Ensure teacher name is attached
    const planToSave = { 
        ...plan, 
        teacherName: plan.teacherName || session?.teacher || "" 
    };

    if (editingPlan && editingPlan.id) {
      setPlans(prev => prev.map(p => p.id === planToSave.id ? planToSave : p));
    } else {
      setPlans(prev => [planToSave, ...prev]);
    }
    setView(AppView.DASHBOARD);
  };

  const handleAddPlans = (newPlans: UnitPlan[]) => {
    // Attach session teacher name to generated plans
    const signedPlans = newPlans.map(p => ({
        ...p,
        teacherName: session?.teacher || ""
    }));
    setPlans(prev => [...signedPlans, ...prev]);
  };

  const handleCancel = () => {
    setView(AppView.DASHBOARD);
  };
  
  // Filter plans for the current session grade/class
  const sessionPlans = session 
    ? plans.filter(p => p.gradeLevel.trim().toLowerCase() === session.grade.trim().toLowerCase())
    : [];

  if (view === AppView.LOGIN) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {view === AppView.DASHBOARD && session ? (
        <Dashboard 
          teacherName={session.teacher}
          currentGrade={session.grade}
          plans={sessionPlans} 
          onCreateNew={handleCreateNew} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          onAddPlans={handleAddPlans}
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