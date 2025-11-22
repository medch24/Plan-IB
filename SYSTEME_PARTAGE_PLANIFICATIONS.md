# 🗄️ Système de Planifications Partagées

## 📋 Vue d'Ensemble

Le système permet de **partager les planifications annuelles** entre tous les enseignants d'une même matière/classe.

### Principe de Fonctionnement

```
┌─────────────────────────────────────────────┐
│         BASE DE DONNÉES LOCALE              │
│         (localStorage)                      │
├─────────────────────────────────────────────┤
│                                             │
│  "Mathématiques_PEI 3" : [6 unités]       │
│  "Sciences_PEI 2"      : [5 unités]       │
│  "Arts_PEI 4"          : [4 unités]       │
│  ...                                        │
│                                             │
└─────────────────────────────────────────────┘
```

Chaque combinaison **Matière + Classe** a sa propre planification partagée.

---

## 🎯 Fonctionnalités

### 1. ✅ Bouton Retour

**Localisation:** En haut à gauche du Dashboard

```
┌──────────────────────────────────────┐
│ [← Retour] [Planification] [+Unité] │
└──────────────────────────────────────┘
```

**Action:** 
- Déconnecte de la session actuelle
- Retourne à l'écran de sélection Matière/Classe
- Les données restent sauvegardées

---

### 2. 🔄 Chargement Automatique

**Quand:** À la connexion d'un enseignant

**Si une planification existe:**
```
Enseignant A choisit: Mathématiques + PEI 3
  → Charge automatiquement les 6 unités créées
  
Enseignant B choisit: Mathématiques + PEI 3 (plus tard)
  → Voit les MÊMES 6 unités
```

**Si aucune planification n'existe:**
```
Enseignant choisit: Sciences + PEI 5
  → Dashboard vide
  → Message: "Aucune unité pour le moment"
  → Peut créer la première planification
```

---

### 3. 🔁 Remplacement de Planification

**Scénario:** Un enseignant veut régénérer la planification

**Processus:**

1. Enseignant clique sur "Planification Annuelle"
2. Remplit le formulaire (chapitres, enseignant, ressources)
3. Clique sur "Générer les 4-6 Unités"

**Si une planification existe déjà:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ Confirmation                             │
├──────────────────────────────────────────────┤
│                                              │
│ Une planification existe déjà pour           │
│ Mathématiques - PEI 3.                      │
│                                              │
│ Voulez-vous REMPLACER l'ancienne            │
│ planification par la nouvelle ?              │
│                                              │
│ - OUI: Remplacer complètement               │
│ - NON: Annuler                              │
│                                              │
│         [Annuler]    [Remplacer]            │
└──────────────────────────────────────────────┘
```

**Si OUI:**
- ✅ Ancienne planification supprimée
- ✅ Nouvelle planification enregistrée
- ✅ Tous les enseignants verront la nouvelle
- ✅ Message de confirmation

**Si NON:**
- ❌ Opération annulée
- ✅ Ancienne planification conservée

---

## 📊 Flux Utilisateur Complet

### Scénario 1: Premier Enseignant (Planification n'existe pas)

```
1. Connexion
   ├─ Matière: Mathématiques
   └─ Classe: PEI 3

2. Dashboard vide
   "Aucune unité pour Mathématiques - PEI 3"
   
3. Clique "Planification Annuelle"
   ├─ Nom enseignant: M. Dupont
   ├─ Chapitres: Chapitre 1, 2, 3...
   └─ Ressources: Manuel page 45-60

4. Clique "Générer les 4-6 Unités"
   → Génération en cours (30s)
   
5. ✅ Planification créée
   ├─ 6 unités générées
   ├─ Enregistrée dans la base
   └─ Message: "Planification enregistrée"

6. Dashboard affiche les 6 unités
```

### Scénario 2: Deuxième Enseignant (Planification existe)

```
1. Connexion
   ├─ Matière: Mathématiques
   └─ Classe: PEI 3

2. Dashboard charge automatiquement
   ✅ 6 unités affichées (créées par M. Dupont)
   
3. L'enseignant peut:
   ├─ Voir les unités existantes
   ├─ Modifier une unité
   ├─ Ajouter une nouvelle unité
   ├─ Exporter les plans
   └─ Régénérer la planification (remplace tout)
```

### Scénario 3: Régénération de Planification

```
1. Enseignant dans Dashboard avec 6 unités

2. Clique "Planification Annuelle"

3. Remplit le nouveau programme

4. Clique "Générer"
   → ⚠️ Message de confirmation
   
5. Choisit "Remplacer"
   → Anciennes unités supprimées
   → Nouvelles unités créées
   
6. ✅ Dashboard mis à jour
   Nouvelles unités affichées
```

---

## 💾 Stockage des Données

### Structure localStorage

```json
{
  "myp_shared_planifications": {
    "Mathématiques_PEI 3": [
      {
        "id": "1732234567890",
        "title": "Algèbre linéaire",
        "subject": "Mathématiques",
        "gradeLevel": "PEI 3",
        "teacherName": "M. Dupont",
        "resources": "Manuel page 45-60",
        ...
      },
      ...
    ],
    "Sciences_PEI 2": [
      ...
    ]
  }
}
```

### Clé Unique

Format: `"${matière}_${classe}"`

Exemples:
- `"Mathématiques_PEI 3"`
- `"Sciences_PEI 2"`
- `"Arts_PEI 5"`

---

## 🔧 Implémentation Technique

### Fichiers Modifiés

#### App.tsx
```typescript
// Nouvelle structure de données partagées
const SHARED_PLANNINGS_KEY = 'myp_shared_planifications';

interface SharedPlanifications {
  [key: string]: UnitPlan[];
}

// Fonctions clés
const getPlanningKey = (subject, grade) => `${subject}_${grade}`;
const loadPlansForSubjectGrade = (subject, grade) => {...};
const savePlansForCurrentSession = (plans) => {...};
const handleAddPlans = (newPlans) => {
  // Confirmation si planification existe
  // Remplacement ou annulation
};
```

#### Dashboard.tsx
```typescript
// Nouveau prop
interface DashboardProps {
  ...
  onLogout: () => void; // ← Nouveau
}

// Nouveau bouton
<button onClick={onLogout}>
  <ArrowLeft /> Retour
</button>
```

---

## ⚡ Avantages du Système

1. **✅ Partage Automatique**
   - Pas besoin de "partager" manuellement
   - Automatique par matière/classe

2. **✅ Toujours à Jour**
   - Modifications visibles instantanément
   - Pas de synchronisation nécessaire

3. **✅ Sécurité**
   - Confirmation avant remplacement
   - Impossible de perdre des données accidentellement

4. **✅ Flexibilité**
   - Chaque enseignant peut ajouter ses propres unités
   - Régénération possible à tout moment

5. **✅ Navigation Facile**
   - Bouton Retour visible
   - Changement de matière/classe simple

---

## 🎓 Cas d'Usage

### Cas 1: Nouvelle Année Scolaire
```
Coordinateur pédagogique:
1. Se connecte à chaque matière/classe
2. Génère la planification annuelle
3. → Tous les enseignants voient la planification
```

### Cas 2: Enseignant Remplaçant
```
Enseignant remplaçant:
1. Choisit la matière/classe
2. → Voit immédiatement la planification existante
3. Peut continuer là où l'autre s'est arrêté
```

### Cas 3: Mise à Jour du Programme
```
Si le programme change:
1. N'importe quel enseignant peut régénérer
2. Confirme le remplacement
3. → Nouvelle planification pour tous
```

---

## 🐛 Résolution de Problèmes

### Problème: Planification ne se charge pas

**Solution:**
- Vérifier la console (F12)
- Vérifier localStorage: `myp_shared_planifications`
- Essayer de se déconnecter/reconnecter

### Problème: Impossible de remplacer

**Solution:**
- Vérifier que vous avez bien cliqué "Oui" sur la confirmation
- Vérifier qu'il n'y a pas d'erreur de génération AI

### Problème: Données perdues

**Solution:**
- Les données sont dans localStorage du navigateur
- Vérifier que le navigateur n'a pas vidé le cache
- Possibilité d'export manuel des plans en Word

---

## 🚀 Migration Depuis Ancienne Version

Si vous aviez l'ancienne version avec `myp_unit_plans`:

```javascript
// Les anciennes données ne sont PAS automatiquement migrées
// Pour migrer manuellement:
const oldPlans = localStorage.getItem('myp_unit_plans');
// Les réorganiser par matière/classe
// Les sauvegarder dans le nouveau format
```

---

## ✨ Résumé

✅ **Bouton Retour** - Changer de matière/classe facilement  
✅ **Chargement Auto** - Planification existante chargée automatiquement  
✅ **Partage Intégré** - Tous les enseignants voient la même planification  
✅ **Remplacement Sécurisé** - Confirmation avant écrasement  
✅ **Sauvegarde Auto** - Modifications enregistrées en temps réel  

**Le système est maintenant prêt pour une utilisation collaborative ! 🎉**
