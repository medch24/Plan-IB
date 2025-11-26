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
 * Récupère TOUTES les planifications pour une classe donnée (toutes les matières)
 */
export async function loadAllPlansForGrade(grade: string): Promise<UnitPlan[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/planifications?grade=${encodeURIComponent(grade)}`
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    // L'API retourne un tableau de planifications
    if (Array.isArray(data)) {
      // Fusionner tous les plans
      const allPlans: UnitPlan[] = [];
      data.forEach((planData: PlanificationData) => {
        if (planData.plans && Array.isArray(planData.plans)) {
          allPlans.push(...planData.plans);
        }
      });
      return allPlans;
    }
    
    return [];
  } catch (error) {
    console.error('Erreur lors du chargement de toutes les planifications:', error);
    
    // Fallback vers localStorage
    console.warn('Utilisation du localStorage comme fallback');
    return loadAllPlansForGradeFromLocalStorage(grade);
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

function loadAllPlansForGradeFromLocalStorage(grade: string): UnitPlan[] {
  const allPlanifications = loadSharedPlanifications();
  const allPlans: UnitPlan[] = [];
  
  // Parcourir toutes les clés et filtrer par grade
  Object.keys(allPlanifications).forEach(key => {
    if (key.endsWith(`_${grade}`) || key.includes(`_${grade.replace(' ', '_')}`)) {
      const plans = allPlanifications[key];
      if (Array.isArray(plans)) {
        allPlans.push(...plans);
      }
    }
  });
  
  return allPlans;
}

// ===== MIGRATION AUTOMATIQUE localStorage → MongoDB =====

/**
 * Migre automatiquement toutes les planifications de localStorage vers MongoDB
 * Appelé au démarrage de l'application pour synchroniser les données locales
 */
export async function migrateLocalStorageToMongoDB(): Promise<{
  success: boolean;
  migrated: number;
  errors: number;
}> {
  console.log('🔄 Vérification des données localStorage à migrer vers MongoDB...');
  
  const localPlanifications = loadSharedPlanifications();
  const keys = Object.keys(localPlanifications);
  
  if (keys.length === 0) {
    console.log('ℹ️ Aucune donnée localStorage à migrer');
    return { success: true, migrated: 0, errors: 0 };
  }
  
  console.log(`📦 ${keys.length} planification(s) trouvée(s) dans localStorage`);
  
  let migrated = 0;
  let errors = 0;
  
  // Migrer chaque planification
  for (const key of keys) {
    try {
      // Extraire subject et grade depuis la clé (format: "Mathématiques_PEI 3")
      const parts = key.split('_');
      if (parts.length < 2) {
        console.warn(`⚠️ Clé invalide ignorée: ${key}`);
        continue;
      }
      
      const subject = parts.slice(0, -2).join('_'); // Tout sauf les 2 derniers
      const grade = parts.slice(-2).join(' '); // Les 2 derniers (ex: "PEI 3")
      
      const localPlans = localPlanifications[key];
      
      if (!Array.isArray(localPlans) || localPlans.length === 0) {
        console.log(`⏭️ Planification vide ignorée: ${key}`);
        continue;
      }
      
      console.log(`🔄 Migration de ${key} (${localPlans.length} plan(s))...`);
      
      // Vérifier si des données existent déjà dans MongoDB
      const existingPlans = await loadPlansFromDatabase(subject, grade);
      
      if (existingPlans.length > 0) {
        console.log(`ℹ️ ${key} existe déjà dans MongoDB (${existingPlans.length} plan(s)), ignoré`);
        continue;
      }
      
      // Sauvegarder dans MongoDB
      const success = await savePlansToDatabase(subject, grade, localPlans);
      
      if (success) {
        migrated++;
        console.log(`✅ ${key} migré avec succès (${localPlans.length} plan(s))`);
      } else {
        errors++;
        console.error(`❌ Échec de la migration de ${key}`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Erreur lors de la migration de ${key}:`, error);
    }
  }
  
  console.log(`\n📊 Résumé de la migration:`);
  console.log(`   ✅ Migrés: ${migrated}`);
  console.log(`   ❌ Erreurs: ${errors}`);
  console.log(`   ⏭️ Ignorés: ${keys.length - migrated - errors}`);
  
  return {
    success: errors === 0,
    migrated,
    errors
  };
}

/**
 * Vérifie si une migration est nécessaire
 */
export function needsMigration(): boolean {
  const localPlanifications = loadSharedPlanifications();
  return Object.keys(localPlanifications).length > 0;
}
