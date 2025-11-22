import type { UnitPlan } from '../types';

// URL de l'API - en développement local ou en production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3000/api';

export interface PlanificationData {
  key: string;
  plans: UnitPlan[];
  lastUpdated: string | null;
}

/**
 * Récupère les planifications depuis MongoDB pour une matière/classe
 */
export async function loadPlansFromDatabase(
  subject: string,
  grade: string
): Promise<UnitPlan[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/planifications?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data: PlanificationData = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('Erreur lors du chargement depuis MongoDB:', error);
    
    // Fallback vers localStorage si l'API échoue
    console.warn('Utilisation du localStorage comme fallback');
    return loadPlansFromLocalStorage(subject, grade);
  }
}

/**
 * Sauvegarde les planifications dans MongoDB
 */
export async function savePlansToDatabase(
  subject: string,
  grade: string,
  plans: UnitPlan[]
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/planifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        grade,
        plans
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Planifications sauvegardées dans MongoDB:', result);
    
    // Sauvegarder aussi dans localStorage comme backup
    savePlansToLocalStorage(subject, grade, plans);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde dans MongoDB:', error);
    
    // Fallback vers localStorage si l'API échoue
    console.warn('Sauvegarde dans localStorage comme fallback');
    savePlansToLocalStorage(subject, grade, plans);
    
    return false;
  }
}

/**
 * Supprime les planifications de MongoDB
 */
export async function deletePlansFromDatabase(
  subject: string,
  grade: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/planifications?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression depuis MongoDB:', error);
    return false;
  }
}

// ===== FALLBACK: localStorage functions =====

const SHARED_PLANNINGS_KEY = 'myp_shared_planifications';

interface SharedPlanifications {
  [key: string]: UnitPlan[];
}

function getPlanningKey(subject: string, grade: string): string {
  return `${subject}_${grade}`;
}

function loadSharedPlanifications(): SharedPlanifications {
  try {
    const saved = localStorage.getItem(SHARED_PLANNINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Erreur lecture localStorage", e);
  }
  return {};
}

function saveSharedPlanifications(planifications: SharedPlanifications): void {
  try {
    localStorage.setItem(SHARED_PLANNINGS_KEY, JSON.stringify(planifications));
  } catch (e) {
    console.error("Erreur écriture localStorage", e);
  }
}

function loadPlansFromLocalStorage(subject: string, grade: string): UnitPlan[] {
  const allPlanifications = loadSharedPlanifications();
  const key = getPlanningKey(subject, grade);
  return allPlanifications[key] || [];
}

function savePlansToLocalStorage(subject: string, grade: string, plans: UnitPlan[]): void {
  const allPlanifications = loadSharedPlanifications();
  const key = getPlanningKey(subject, grade);
  allPlanifications[key] = plans;
  saveSharedPlanifications(allPlanifications);
}
