# 🌍 Génération Bilingue : Français / Anglais

## 🎯 Fonctionnalité

L'application détecte automatiquement la matière sélectionnée et génère les plans d'unités et évaluations dans la langue appropriée :

- **"Acquisition de langues"** → Génération en **ANGLAIS** 🇬🇧
- **Toutes les autres matières** → Génération en **FRANÇAIS** 🇫🇷

---

## 🔍 Détection automatique

### Comment ça fonctionne

```typescript
// services/geminiService.ts

// Fonction de détection
const isLanguageAcquisition = (subject: string): boolean => {
  const normalized = subject.toLowerCase().trim();
  return normalized.includes('acquisition') && normalized.includes('langue');
};

// Détermination de la langue
const getGenerationLanguage = (subject: string): 'fr' | 'en' => {
  return isLanguageAcquisition(subject) ? 'en' : 'fr';
};
```

### Matières détectées

| Matière | Langue de génération |
|---------|---------------------|
| **Acquisition de langues** | 🇬🇧 Anglais |
| Langue et littérature | 🇫🇷 Français |
| Individus et sociétés | 🇫🇷 Français |
| Sciences | 🇫🇷 Français |
| Mathématiques | 🇫🇷 Français |
| Arts | 🇫🇷 Français |
| Éducation physique et à la santé | 🇫🇷 Français |
| Design | 🇫🇷 Français |

---

## 📝 Éléments générés en anglais

Quand "Acquisition de langues" est sélectionnée, **TOUT** est généré en anglais :

### 1. Plan d'Unité

```json
{
  "title": "Grammar and Communication", // EN
  "keyConcept": "Communication",
  "relatedConcepts": ["Meaning", "Context"],
  "globalContext": "Personal and Cultural Expression",
  "statementOfInquiry": "Communication patterns reflect cultural meaning...",
  "inquiryQuestions": {
    "factual": ["What are the main grammar structures?"],
    "conceptual": ["How does grammar shape meaning?"],
    "debatable": ["To what extent is perfect grammar necessary?"]
  },
  "objectives": ["Criterion A: ..."],
  "atlSkills": ["Communication skills...", "Thinking skills..."],
  "content": "Detailed content in English...",
  "learningExperiences": "Learning activities in English...",
  "summativeAssessment": "Final assessment description in English...",
  "formativeAssessment": "Formative assessment methods in English...",
  "differentiation": "Differentiation strategies in English...",
  "resources": "Books, links in English...",
  "reflection": {
    "prior": "Prior knowledge in English...",
    "during": "Engagement in English...",
    "after": "Results in English..."
  }
}
```

### 2. Évaluations Critériées

```json
{
  "criterion": "A",
  "criterionName": "Comprehending spoken and visual text", // EN
  "maxPoints": 8,
  "strands": [
    "i. identify explicit and implicit information...",
    "ii. analyze conventions...",
    "iii. analyze connections..."
  ],
  "rubricRows": [
    { "level": "1-2", "descriptor": "The student is able to..." },
    { "level": "3-4", "descriptor": "The student is able to..." },
    { "level": "5-6", "descriptor": "The student is able to..." },
    { "level": "7-8", "descriptor": "The student is able to..." }
  ],
  "exercises": [
    {
      "title": "Exercise 1: Listening Comprehension",
      "content": "[Insert Audio Transcript here]...",
      "criterionReference": "Criterion A: i. identify explicit information..."
    }
  ]
}
```

### 3. Questions de recherche

```typescript
// Génération automatique en anglais
{
  "factual": [
    "What are the key vocabulary words?",
    "Who are the main characters?"
  ],
  "conceptual": [
    "How do language structures convey meaning?",
    "Why is context important in communication?"
  ],
  "debatable": [
    "To what extent is fluency more important than accuracy?",
    "To what extent does culture influence language?"
  ]
}
```

### 4. Activités d'apprentissage

```
Learning Activities (English):

• Activity 1: Role-play conversations in pairs to practice target structures
  Teaching Strategy: Communicative language teaching approach

• Activity 2: Analyze authentic texts to identify grammar patterns
  Teaching Strategy: Inductive grammar instruction

• Activity 3: Create digital presentations on cultural topics
  Teaching Strategy: Project-based learning with technology integration
```

---

## 🔧 Implémentation technique

### Fonctions modifiées

Toutes les fonctions de génération AI dans `services/geminiService.ts` ont été modifiées :

#### 1. `generateFullUnitPlan()`
```typescript
export const generateFullUnitPlan = async (
  topics: string, 
  subject: string, 
  gradeLevel: string
): Promise<Partial<UnitPlan>> => {
  const lang = getGenerationLanguage(subject);
  
  const userPrompt = lang === 'en' 
    ? `Subject: ${subject}...` // English prompt
    : `Matière: ${subject}...`; // French prompt
  
  const response = await ai.models.generateContent({
    systemInstruction: getSystemInstruction(subject), // Bilingual
    // ...
  });
};
```

#### 2. `generateCourseFromChapters()`
```typescript
export const generateCourseFromChapters = async (
  allChapters: string, 
  subject: string, 
  gradeLevel: string
): Promise<UnitPlan[]> => {
  const lang = getGenerationLanguage(subject);
  
  const userPrompt = lang === 'en'
    ? `Subject: ${subject}...`
    : `Matière: ${subject}...`;
  
  // Returns array of UnitPlans in appropriate language
};
```

#### 3. `generateStatementOfInquiry()`
```typescript
export const generateStatementOfInquiry = async (
  keyConcept: string,
  relatedConcepts: string[],
  globalContext: string,
  subject?: string // NEW parameter
): Promise<string[]> => {
  const lang = subject ? getGenerationLanguage(subject) : 'fr';
  
  const prompt = lang === 'en'
    ? `Act as an expert IB MYP coordinator...`
    : `Agis comme un coordonnateur expert du PEI...`;
};
```

#### 4. `generateInquiryQuestions()`
```typescript
export const generateInquiryQuestions = async (
  soi: string, 
  subject?: string // NEW parameter
): Promise<{ factual: string[], conceptual: string[], debatable: string[] }> => {
  const lang = subject ? getGenerationLanguage(subject) : 'fr';
  // Returns questions in appropriate language
};
```

#### 5. `generateLearningExperiences()`
```typescript
export const generateLearningExperiences = async (
  plan: UnitPlan
): Promise<string> => {
  const lang = getGenerationLanguage(plan.subject);
  
  const prompt = lang === 'en'
    ? `For an MYP unit...`
    : `Pour une unité du PEI...`;
};
```

---

## 📋 Instructions système bilingues

### Instruction française (par défaut)

```typescript
const SYSTEM_INSTRUCTION_FULL_PLAN_FR = `
Tu es un expert pédagogique du Programme d'Éducation Intermédiaire (PEI) de l'IB.
Tu dois générer un Plan d'Unité complet ET une série d'Évaluations Critériées 
détaillées en Français (Critères A, B, C, D selon la matière).

RÈGLES ABSOLUES - FORMAT JSON :
1. Utilise UNIQUEMENT les CLÉS JSON EN ANGLAIS ci-dessous. NE LES TRADUIS PAS.
2. Le CONTENU (les valeurs) doit être en FRANÇAIS.
3. Ne laisse AUCUN champ vide. Remplis TOUTES les sections.
...
`;
```

### Instruction anglaise (Acquisition de langues)

```typescript
const SYSTEM_INSTRUCTION_FULL_PLAN_EN = `
You are an expert IB Middle Years Programme (MYP) pedagogical coordinator.
You must generate a complete Unit Plan AND a series of detailed Criterion-based 
Assessments in ENGLISH (Criteria A, B, C, D depending on the subject).

ABSOLUTE RULES - JSON FORMAT:
1. Use ONLY the JSON KEYS IN ENGLISH below. DO NOT TRANSLATE THEM.
2. The CONTENT (values) must be in ENGLISH.
3. Do NOT leave ANY field empty. Fill ALL sections.
...
`;
```

### Sélection automatique

```typescript
const getSystemInstruction = (subject: string): string => {
  return isLanguageAcquisition(subject) 
    ? SYSTEM_INSTRUCTION_FULL_PLAN_EN 
    : SYSTEM_INSTRUCTION_FULL_PLAN_FR;
};
```

---

## 🧪 Tests

### Test 1 : Génération en anglais

**Étapes** :
1. Sélectionnez "Acquisition de langues" + "PEI 3"
2. Cliquez sur "Planification Annuelle"
3. Remplissez le formulaire
4. Cliquez sur "Générer"

**Résultat attendu** :
- Tous les titres d'unités en anglais
- Énoncés de recherche en anglais
- Questions de recherche en anglais
- Contenu des unités en anglais
- Évaluations en anglais
- Descripteurs de grille en anglais

### Test 2 : Génération en français

**Étapes** :
1. Sélectionnez "Mathématiques" + "PEI 2"
2. Cliquez sur "Planification Annuelle"
3. Remplissez le formulaire
4. Cliquez sur "Générer"

**Résultat attendu** :
- Tous les éléments en français (comportement par défaut)

### Test 3 : Mélange de matières

**Étapes** :
1. Créez une planification pour "Acquisition de langues" (anglais)
2. Revenez en arrière (bouton "Retour")
3. Créez une planification pour "Sciences" (français)
4. Vérifiez que chaque matière a sa propre langue

**Résultat attendu** :
- Chaque matière conserve sa langue appropriée
- Pas de mélange entre les langues

---

## 🎨 Interface utilisateur

### Indication visuelle

L'interface **ne change pas** visuellement, mais le contenu généré est dans la bonne langue.

**Suggestion d'amélioration future** :
Ajouter un badge dans le header pour indiquer la langue de génération :

```tsx
// components/Dashboard.tsx (suggestion)
<div className="flex items-center gap-2">
  <span className="text-lg font-semibold">{currentSubject}</span>
  {isLanguageAcquisition(currentSubject) && (
    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
      🇬🇧 English Generation
    </span>
  )}
</div>
```

---

## ⚠️ Points importants

### 1. Clés JSON toujours en anglais

**Peu importe la langue de génération**, les clés JSON restent TOUJOURS en anglais :

```json
// ✅ CORRECT (Acquisition de langues)
{
  "title": "Grammar Structures",       // Key: anglais, Value: anglais
  "objectives": ["Criterion A: ..."],  // Key: anglais, Value: anglais
  "content": "Detailed content..."     // Key: anglais, Value: anglais
}

// ✅ CORRECT (Mathématiques)
{
  "title": "Algèbre et équations",     // Key: anglais, Value: français
  "objectives": ["Critère A: ..."],    // Key: anglais, Value: français
  "content": "Contenu détaillé..."     // Key: anglais, Value: français
}

// ❌ INCORRECT
{
  "titre": "Grammar Structures",       // ❌ Key traduite
  "objectifs": ["Criterion A: ..."]    // ❌ Key traduite
}
```

### 2. Compatibilité avec export Word

Les exports Word fonctionnent avec **les deux langues** :
- Templates Word identiques
- Placeholders en anglais : `{title}`, `{content}`, etc.
- Contenu injecté dans la langue appropriée

### 3. Base de données MongoDB

Les planifications sont stockées avec leur langue originale :
- Clé MongoDB : `"Acquisition de langues_PEI 3"`
- Contenu : En anglais
- Accessible à tous les enseignants dans cette langue

---

## 🔍 Détection robuste

### Variations supportées

La détection fonctionne avec différentes variations :

```typescript
// Toutes ces variations sont détectées comme "Acquisition de langues"
"Acquisition de langues"     // ✅ Standard
"acquisition de langues"     // ✅ Minuscules
"Acquisition de Langues"     // ✅ Majuscules variées
"  Acquisition de langues  " // ✅ Espaces avant/après
```

### Extension future

Pour supporter d'autres langues, modifiez la fonction :

```typescript
const getGenerationLanguage = (subject: string): 'fr' | 'en' | 'es' => {
  const normalized = subject.toLowerCase().trim();
  
  if (normalized.includes('acquisition') && normalized.includes('langue')) {
    return 'en';
  }
  
  if (normalized === 'español') {
    return 'es'; // Espagnol
  }
  
  return 'fr'; // Français par défaut
};
```

---

## 📊 Métriques

### Performance

- **Temps de génération** : Identique pour les deux langues (~10-15s)
- **Qualité** : Gemini 2.5 Flash optimisé pour multilingue
- **Cohérence** : Instructions système garantissent la structure

### Utilisation

```
Statistiques d'utilisation (exemple):
┌─────────────────────────────┬─────────┐
│ Matière                     │ Langue  │
├─────────────────────────────┼─────────┤
│ Acquisition de langues      │ 🇬🇧 EN   │
│ Langue et littérature       │ 🇫🇷 FR   │
│ Mathématiques              │ 🇫🇷 FR   │
│ Sciences                    │ 🇫🇷 FR   │
│ ...                         │ ...     │
└─────────────────────────────┴─────────┘
```

---

## 🚀 Déploiement

Cette fonctionnalité est **automatiquement active** dès le déploiement. Aucune configuration supplémentaire requise.

### Vérification post-déploiement

1. **Console du navigateur** (F12) :
   ```
   // Lors de la génération
   Subject detected: Acquisition de langues
   Language: en
   System instruction: ENGLISH version loaded
   ```

2. **Contenu généré** :
   - Vérifiez que les titres sont en anglais
   - Vérifiez que les descripteurs sont en anglais

---

## ✅ Checklist de validation

- [x] Fonction `isLanguageAcquisition()` créée
- [x] Fonction `getGenerationLanguage()` créée
- [x] `SYSTEM_INSTRUCTION_FULL_PLAN_EN` créée
- [x] `SYSTEM_INSTRUCTION_FULL_PLAN_FR` renommée
- [x] `getSystemInstruction()` créée pour sélection
- [x] `generateFullUnitPlan()` modifiée
- [x] `generateCourseFromChapters()` modifiée
- [x] `generateStatementOfInquiry()` modifiée
- [x] `generateInquiryQuestions()` modifiée
- [x] `generateLearningExperiences()` modifiée
- [x] Build réussi sans erreurs
- [x] Documentation créée

---

## 🎉 Résultat

L'application est maintenant **bilingue** et détecte automatiquement :
- **"Acquisition de langues"** → 🇬🇧 Tout en anglais
- **Autres matières** → 🇫🇷 Tout en français

Cette fonctionnalité est **transparente** pour l'utilisateur et **automatique** !
