# 🎓 Nouvelles Fonctionnalités - Module Examens et Évaluations

## Vue d'ensemble

Le système PEI Planner a été étendu avec un nouveau module dédié à la génération d'examens et d'évaluations ministériels français, alimenté par l'IA Gemini de Google.

## ✨ Fonctionnalités principales

### 1. Double Mode de Fonctionnement

À partir de l'écran de connexion, les enseignants peuvent maintenant choisir entre deux modules :

- **PEI Planner** : Planification des unités PEI (fonctionnalité existante)
- **Examens et Évaluations** : Génération d'examens ministériels (NOUVEAU)

### 2. Génération d'Examens par l'IA

#### Assistant de Génération en 4 Étapes

1. **Choix de la Classe**
   - PEI1 (6ème)
   - PEI2 (5ème)
   - PEI3 (4ème)
   - PEI4 (3ème) - Style "Brevet"
   - PEI5 (Seconde)
   - DP1 (1ère) - Style "Bac"
   - DP2 (Terminale) - Style "Bac"

2. **Sélection de la Matière**
   - Matières adaptées selon le niveau choisi
   - Tronc commun pour PEI1-PEI4
   - Matières lycée pour PEI5, DP1, DP2

3. **Configuration de l'Examen**
   - Choix du semestre (Semestre 1 ou 2)
   - Saisie des chapitres/sujets à couvrir
   - Nom de l'enseignant (optionnel)
   - Nom de la classe (optionnel)

4. **Prévisualisation et Export**
   - Prévisualisation complète de l'examen généré
   - Export au format Word (.docx) via template

### 3. Caractéristiques des Examens Générés

#### Format Standardisé
- **Durée** : 2 heures
- **Total** : 30 points exactement
- **Niveau** : Moyen à Facile (adapté au niveau)
- **Style** : Brevet (PEI4), Bac (DP1/DP2), Standard (autres)

#### Types de Questions Variés (minimum 4 types)
- QCM (Questions à Choix Multiples)
- Vrai/Faux
- Textes à trous
- Légender (schémas, cartes)
- Définitions
- Analyse de documents
- Réponse longue / Développement
- Résolution de problème

#### Différenciation Pédagogique
- **1 question de différenciation obligatoire** par examen
- Marquée explicitement pour faciliter l'identification

#### Gestion Intelligente des Ressources

**Pour Français et Anglais :**
- Texte de compréhension de minimum 20 lignes

**Pour Sciences et Mathématiques :**
- Descriptions de graphiques et courbes
- Tableaux de données

**Ressources Générales :**
- Textes complets fournis
- Descriptions détaillées pour images à insérer
- Tableaux de données formatés

### 4. Export au Format Word

#### Template Professionnel
- Basé sur le modèle ministériel français
- En-tête avec :
  - Titre de l'examen / Matière
  - Classe
  - Durée (2H)
  - Enseignant
  - Semestre
  - Date
  - Nom et prénom de l'élève
- Section notation (/30 points) et observations

#### Formatage Automatique des Questions
- Cases à cocher (□) pour les QCM
- Options Vrai/Faux formatées
- Lignes pointillées pour les réponses écrites
- Espace pour légender les schémas
- Nombre de lignes adapté au type de question

## 🔧 Architecture Technique

### Nouveaux Fichiers Créés

#### Types TypeScript (`types.ts`)
```typescript
- AppMode (PEI_PLANNER | EXAMS)
- ExamGrade (PEI1 à DP2)
- Semester (SEMESTER_1 | SEMESTER_2)
- QuestionType (QCM, Vrai/Faux, etc.)
- ExamResource (text, image, table, graph)
- ExamQuestion (structure complète des questions)
- Exam (structure complète de l'examen)
- ExamGenerationConfig (configuration de génération)
```

#### Services
1. **examGeminiService.ts**
   - Génération d'examens par l'IA avec schéma JSON strict
   - Règles spécifiques par matière
   - Validation automatique (30 points total)
   - Support multi-semestre

2. **examWordExportService.ts**
   - Export vers Word via docxtemplater
   - Formatage automatique des questions
   - Gestion des ressources (textes, images, tableaux)
   - Génération de lignes de réponse

#### Composants React
1. **ExamsWizard.tsx**
   - Assistant de génération en 4 étapes
   - Barre de progression visuelle
   - Prévisualisation interactive
   - Gestion d'état complète

2. **LoginScreen.tsx** (mis à jour)
   - Choix du mode (PEI Planner vs Examens)
   - Interface à deux écrans
   - Navigation fluide

3. **App.tsx** (mis à jour)
   - Gestion du mode examen
   - Routing conditionnel
   - State management étendu

#### Template Word
- **Template_Examen_Ministere.docx**
- Stocké dans `/public/`
- Compatible avec docxtemplater
- Placeholders standardisés

## 📋 Règles de Génération par l'IA

### Contraintes Strictes
1. **30 points exactement** - Vérification automatique
2. **4 types de questions minimum** - Diversité garantie
3. **1 question de différenciation** - Obligatoire et marquée
4. **Niveau adapté** - Moyen à facile selon la classe

### Règles par Matière

**Langues (Français, Anglais) :**
- Texte de compréhension obligatoire (20+ lignes)
- Questions de compréhension écrite
- Questions d'analyse littéraire

**Sciences (Maths, Physique, Chimie, SVT) :**
- Graphiques et courbes
- Tableaux de données
- Problèmes de résolution
- Questions d'analyse

**Histoire-Géographie, SES :**
- Analyse de documents
- Questions de connaissances
- Développements structurés

## 🎯 Utilisation

### Génération d'un Examen

1. **Connexion**
   - Sélectionner "Examens et Évaluations"
   - Choisir la matière et la classe

2. **Configuration**
   - Étape 1 : Choisir la classe (PEI1 à DP2)
   - Étape 2 : Sélectionner la matière
   - Étape 3 : Configurer (semestre, chapitres, infos enseignant)
   - Cliquer sur "Générer l'examen"

3. **Prévisualisation**
   - Vérifier les questions générées
   - Vérifier les ressources
   - Vérifier le total des points

4. **Export**
   - Cliquer sur "Télécharger (.docx)"
   - Le fichier est téléchargé automatiquement
   - Format : `Examen_Matiere_Classe_Semestre.docx`

### Modification et Régénération

- Bouton "Créer un nouvel examen" pour recommencer
- Possibilité de changer les paramètres
- Génération illimitée

## 🚀 Prochaines Améliorations Possibles

1. **Dashboard des Examens**
   - Vue par semestre
   - Historique des examens générés
   - Sauvegarde dans MongoDB

2. **Banque de Questions**
   - Réutilisation de questions existantes
   - Catégorisation par chapitre
   - Niveau de difficulté paramétrable

3. **Génération par Lots**
   - Générer les 2 semestres en une fois
   - Export en ZIP
   - Variantes d'un même examen

4. **Personnalisation Avancée**
   - Choix manuel des types de questions
   - Ajustement de la difficulté
   - Ajout de consignes spécifiques

## 🔐 Sécurité et Qualité

- Validation stricte des données d'entrée
- Gestion d'erreur robuste
- Logs détaillés pour le debugging
- Respect des normes pédagogiques françaises
- Compatibilité avec les standards ministériels

## 📚 Technologies Utilisées

- **React 19** - Interface utilisateur
- **TypeScript** - Typage strict
- **Gemini AI (gemini-2.5-flash)** - Génération intelligente
- **Docxtemplater** - Export Word
- **Tailwind CSS** - Styling
- **Lucide React** - Icônes

## 🎓 Conformité Pédagogique

Les examens générés respectent :
- Les standards du programme français
- Les formats Brevet et Baccalauréat
- Les principes de différenciation pédagogique
- Les recommandations du Ministère de l'Éducation Nationale
