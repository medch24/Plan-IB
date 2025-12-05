# 🧪 Guide de Test - Modules Séparés

## ✅ PROBLÈME CORRIGÉ

**Avant** : Les deux modules utilisaient les mêmes classes (PEI 1-5) et les mêmes matières  
**Maintenant** : Chaque module a ses propres listes indépendantes! ✨

---

## 📋 Test 1 : Module PEI Planner

### Étapes à suivre :

1. **Lancer l'application** : `npm run dev`
2. **Écran de choix** : Vous voyez 2 boutons
   - 🔵 PEI Planner (bleu)
   - 🟣 Examens et Évaluations (violet)

3. **Cliquer sur "PEI Planner"** (bouton bleu)

### ✅ Résultat Attendu :

**Classes affichées :**
- PEI 1
- PEI 2
- PEI 3
- PEI 4
- PEI 5

**Matières affichées :**
- Langue et littérature (Français)
- Acquisition de langue (Anglais)
- Individu et Sociétés
- Sciences
- Mathématiques
- Arts
- Éducation Physique et à la santé
- Design

**Destination :** Dashboard PEI avec planification d'unités IB

---

## 📋 Test 2 : Module Examens et Évaluations

### Étapes à suivre :

1. **Retour à l'écran de choix** (cliquer sur "Retour")
2. **Cliquer sur "Examens et Évaluations"** (bouton violet)

### ✅ Résultat Attendu :

**Classes affichées :**
- 6ème
- 5ème
- 4ème
- 3ème
- Seconde
- 1ère
- Terminale

**Matières affichées :**
- Français
- Anglais
- Mathématiques
- SVT
- Physique-Chimie
- Histoire-Géographie-EMC
- Technologie
- Sciences Numériques et Technologiques (SNT)
- Sciences Économiques et Sociales (SES)

**Destination :** Assistant de génération d'examens (ExamsWizard)

---

## 🎯 Scénario de Test Complet

### Scénario A : Générer un examen de Mathématiques pour la 3ème

1. Écran de choix → **Examens et Évaluations**
2. Matière → **Mathématiques**
3. Classe → **3ème**
4. Cliquer sur **"Créer un examen"**
5. Vous arrivez sur l'assistant (wizard) avec 4 étapes
6. **Étape 1** : Classe (devrait afficher 6ème à Terminale)
7. **Étape 2** : Matière (devrait afficher les matières françaises)
8. **Étape 3** : Saisir les chapitres (ex: "Théorème de Pythagore, Fractions")
9. **Étape 4** : Générer et télécharger

### Scénario B : Planifier une unité PEI

1. Écran de choix → **PEI Planner**
2. Matière → **Mathématiques**
3. Classe → **PEI 3**
4. Cliquer sur **"Accéder aux unités PEI"**
5. Vous arrivez sur le Dashboard PEI
6. Créer une nouvelle unité avec concepts clés IB

---

## 🔍 Points de Vérification

### ✅ LoginScreen doit afficher :

| Quand vous cliquez sur... | Classes | Matières |
|---------------------------|---------|----------|
| **PEI Planner** | PEI 1 à PEI 5 | Matières IB (Langue et littérature, etc.) |
| **Examens et Évaluations** | 6ème à Terminale | Matières françaises (Français, etc.) |

### ✅ Navigation doit mener à :

| Mode sélectionné | Destination |
|------------------|-------------|
| **PEI Planner** | Dashboard PEI (avec liste des unités) |
| **Examens et Évaluations** | ExamsWizard (assistant en 4 étapes) |

---

## 🐛 Si vous voyez encore PEI 1-5 dans Examens...

**Cause possible** : Cache du navigateur

**Solution** :
1. Arrêter le serveur dev (`Ctrl+C`)
2. Supprimer le cache : `rm -rf node_modules/.vite`
3. Rebuild : `npm run build`
4. Relancer : `npm run dev`
5. Rafraîchir le navigateur avec `Ctrl+Shift+R` (hard reload)

---

## 📸 Captures d'écran Attendues

### Écran 1 : Choix du Module
```
┌─────────────────────────────────────┐
│  Plateforme Pédagogique            │
│  Choisissez votre module            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 📘 PEI Planner               │ │
│  │ Planification des unités PEI  │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 📝 Examens et Évaluations    │ │
│  │ Génération d'examens français │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Écran 2a : PEI Planner (sélection)
```
┌─────────────────────────────────────┐
│  PEI Planner                        │
│                                     │
│  Matière: [Sélectionner...]         │
│  ▼ Langue et littérature (Français) │
│    Acquisition de langue (Anglais)  │
│    Mathématiques                    │
│    Sciences                         │
│    ...                              │
│                                     │
│  Classe: [Sélectionner...]          │
│  ▼ PEI 1                           │
│    PEI 2                           │
│    PEI 3                           │
│    PEI 4                           │
│    PEI 5                           │
│                                     │
│  [Accéder aux unités PEI]          │
└─────────────────────────────────────┘
```

### Écran 2b : Examens (sélection)
```
┌─────────────────────────────────────┐
│  Examens et Évaluations             │
│                                     │
│  Matière: [Sélectionner...]         │
│  ▼ Français                        │
│    Anglais                         │
│    Mathématiques                   │
│    SVT                             │
│    Physique-Chimie                 │
│    Histoire-Géographie-EMC         │
│    ...                             │
│                                     │
│  Classe: [Sélectionner...]          │
│  ▼ 6ème                            │
│    5ème                            │
│    4ème                            │
│    3ème                            │
│    Seconde                         │
│    1ère                            │
│    Terminale                       │
│                                     │
│  [Créer un examen]                 │
└─────────────────────────────────────┘
```

---

## ✨ Confirmation Visuelle

Si vous voyez :
- ✅ **"6ème, 5ème, 4ème"** dans Examens → **CORRECT!**
- ✅ **"PEI 1, PEI 2, PEI 3"** dans PEI Planner → **CORRECT!**
- ❌ **"PEI 1, PEI 2, PEI 3"** dans Examens → **ERREUR!** (cache à nettoyer)

---

## 🎓 Résumé

**Maintenant fonctionnel :**
- ✅ 2 systèmes complètement séparés
- ✅ Classes différentes (PEI 1-5 vs 6ème-Terminale)
- ✅ Matières différentes (IB vs Français)
- ✅ Navigation indépendante
- ✅ Aucun croisement entre les modules

**Le bug est corrigé! 🎉**
