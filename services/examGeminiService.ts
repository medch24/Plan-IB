import { GoogleGenAI } from "@google/genai";
import { Exam, ExamQuestion, ExamResource, ExamGenerationConfig, QuestionType, ExamGrade } from "../types";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("⚠️ GEMINI_API_KEY non définie. Veuillez configurer la clé API dans les variables d'environnement.");
  }
  
  return new GoogleGenAI({ apiKey });
};

// Nettoyer le JSON retourné par l'IA
const cleanJsonText = (text: string): string => {
  if (!text) return "{}";
  
  try {
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    clean = clean.replace(/^[^{\[]*/, '').replace(/[^}\]]*$/, '');
    
    const firstCurly = clean.indexOf('{');
    const firstSquare = clean.indexOf('[');
    
    let start = -1;
    let end = -1;

    if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        start = firstCurly;
        end = clean.lastIndexOf('}');
    } else if (firstSquare !== -1) {
        start = firstSquare;
        end = clean.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
        const extracted = clean.substring(start, end + 1);
        JSON.parse(extracted);
        return extracted;
    }
  } catch (e) {
    console.warn("JSON cleaning failed:", e);
  }

  return "{}";
};

// Déterminer le style d'examen basé sur le grade
const getExamStyle = (grade: ExamGrade): 'Brevet' | 'Bac' | 'Standard' => {
  if (grade === ExamGrade.PEI4) return 'Brevet';
  if (grade === ExamGrade.DP1 || grade === ExamGrade.DP2) return 'Bac';
  return 'Standard';
};

// Vérifier si la matière nécessite un texte de compréhension
const needsComprehensionText = (subject: string): boolean => {
  const normalized = subject.toLowerCase();
  return normalized.includes('français') || 
         normalized.includes('anglais') || 
         normalized.includes('langue') ||
         normalized.includes('littérature');
};

// Vérifier si la matière nécessite des graphiques/courbes
const needsGraphResource = (subject: string): boolean => {
  const normalized = subject.toLowerCase();
  return normalized.includes('math') || 
         normalized.includes('physique') || 
         normalized.includes('chimie') ||
         normalized.includes('svt') ||
         normalized.includes('sciences');
};

// Vérifier si c'est un examen d'anglais
const isEnglishExam = (subject: string): boolean => {
  const normalized = subject.toLowerCase();
  return normalized.includes('anglais') || normalized === 'english';
};

// Prompt système pour la génération d'examens
const SYSTEM_INSTRUCTION_EXAM = `
Tu es un expert pédagogique spécialisé dans la création d'examens selon les normes du programme français.
Tu dois générer un examen complet et structuré.

RÈGLES ABSOLUES :
1. BARÈME STRICT PAR CLASSE :
   - Classes 5ème, 4ème, 3ème, Seconde, 1ère, Terminale : EXACTEMENT 30 points
   - Classe 6ème UNIQUEMENT : EXACTEMENT 20 points
2. Niveau de difficulté : MOYEN (ni trop facile ni trop difficile, adapté au niveau demandé).
3. Il doit y avoir EXACTEMENT 1 question de différenciation explicite (marquée comme telle).
4. BARÈME ÉQUILIBRÉ ET DIVISIBLE :
   - Pour QCM : 1 point par choix OU points divisibles (2pts, 3pts, 5pts)
   - Pour Vrai/Faux : OBLIGATOIREMENT 1 point par affirmation
   - Pour exercices : points logiques et divisibles (2, 3, 4, 5, 6, 8, 10)
   - Répartir les points de manière progressive
5. Types de questions VARIÉS OBLIGATOIRES (minimum 5 types différents par examen) :
   - QCM (Questions à Choix Multiples) - ÉVITER pour Mathématiques
   - Vrai/Faux - ÉVITER pour Mathématiques
   - Textes à trous
   - Légender (schémas, cartes, figures géométriques, etc.)
   - Relier par flèche (tableaux avec deux colonnes à associer)
   - Définitions (ÉVITER en Mathématiques - privilégier calculs et résolution)
   - Analyse de documents
   - Réponse longue / Développement
   - Résolution de problème / Calculs
   - Compléter un tableau

ORGANISATION DE L'EXAMEN PAR SECTIONS :

**MATHÉMATIQUES** - Structure obligatoire :
- ÉVITER les QCM, Vrai/Faux ET Définitions (privilégier calculs, résolution de problèmes, constructions)
- ÉCRITURE MATHÉMATIQUE CORRECTE OBLIGATOIRE :
  * Fractions : utiliser notation Unicode (½, ¼, ¾) ou format LaTeX (\frac{a}{b})
  * Puissances : utiliser exposants Unicode (x², x³, 10⁴) ou format LaTeX (x^2, x^3)
  * Racines : √ ou \sqrt{x}
  * Symboles : ≤, ≥, ≠, ∈, ∉, ∀, ∃, π, etc.
- EXPRESSIONS MATHÉMATIQUES :
  * TOUJOURS donner PLUSIEURS expressions (minimum 3-5 expressions par exercice)
  * Exemples : Si exercice sur simplification, donner 5 expressions à simplifier
  * Si exercice sur calculs, donner 4-6 calculs différents
- PARTIE I : ALGÈBRE (15 ou 10 points selon le total)
  * Calculs numériques avec fractions, puissances, racines carrées
  * Équations, inéquations, systèmes
  * Développement, factorisation, identités remarquables
  * Fonctions (tableaux de valeurs, graphiques, résolution)
  * Exercices progressifs de calcul et résolution
  * DONNER plusieurs expressions/équations par question
- PARTIE II : GÉOMÉTRIE (15 ou 10 points selon le total)
  * Figures, théorèmes (Pythagore, Thalès, trigonométrie)
  * Constructions géométriques précises
  * OBLIGATOIRE : Inclure au moins un schéma/figure à légender ou à compléter
  * Calculs de périmètres, aires, volumes avec notations correctes
  * Démonstrations géométriques
  * Transformations (symétries, rotations, translations)

**HISTOIRE-GÉOGRAPHIE-EMC** - Structure obligatoire :
- PARTIE I : HISTOIRE (10 points)
  * Analyse de documents historiques
  * Questions de cours et développement
- PARTIE II : GÉOGRAPHIE (10 points)
  * Cartes, croquis, documents géographiques
  * Analyse spatiale
- PARTIE III : EMC (Enseignement Moral et Civique) (10 points)
  * Valeurs républicaines, citoyenneté
  * Réflexion éthique

**FRANÇAIS** - Structure obligatoire :
- PARTIE I : COMPRÉHENSION DE TEXTE (10 points)
  * Texte littéraire de MINIMUM 20 lignes fourni DANS L'ÉNONCÉ de l'exercice
  * ⚠️ OBLIGATOIRE : Source en bas du texte : (Auteur, Titre, Éditeur, Année)
  * Exemples sources valides :
    - (Victor Hugo, Les Misérables, Gallimard, 1862)
    - (Émile Zola, Germinal, Fasquelle, 1885)
    - (Albert Camus, L'Étranger, Gallimard, 1942)
  * Questions de compréhension
- PARTIE II : LANGUE (Grammaire, Conjugaison, Orthographe, Vocabulaire) (10 points)
  * Exercices variés de maîtrise de la langue
- PARTIE III : PRODUCTION ÉCRITE (10 points)
  * Rédaction/Expression écrite

**ANGLAIS** - Structure obligatoire (TOUT EN ANGLAIS) :
- PART I : READING COMPREHENSION (10 points)
  * Text of MINIMUM 20 lines provided IN THE EXERCISE CONTENT
  * ⚠️ MANDATORY: Source below the text: (Author, Title, Publisher, Year)
  * Valid source examples:
    - (Charles Dickens, Oliver Twist, Penguin Books, 1838)
    - (Jane Austen, Pride and Prejudice, T. Egerton, 1813)
    - (George Orwell, 1984, Secker & Warburg, 1949)
  * Comprehension questions
- PART II : LANGUAGE (Grammar, Vocabulary) (10 points)
  * Varied language exercises
- PART III : WRITING (10 points)
  * Written expression

**SCIENCES (SVT, Physique-Chimie)** - Inclure obligatoirement :
- Graphiques, courbes, tableaux de données avec descriptions détaillées DANS L'ÉNONCÉ
- Schémas à légender
- Protocoles expérimentaux
- ⚠️ Si texte scientifique utilisé : ajouter source (Journal/Revue, Article, Année)

**HISTOIRE-GÉOGRAPHIE** - Sources obligatoires :
- Documents historiques : (Type de document, Auteur si connu, Date)
- Articles : (Publication, Titre, Date)
- Cartes : (Source, Année)

**AUTRES MATIÈRES** - Structure adaptée mais équilibrée
- ⚠️ Tout texte ou document doit avoir sa SOURCE

GESTION DES RESSOURCES (TRÈS IMPORTANT) :
⚠️ LES RESSOURCES DOIVENT ÊTRE INTÉGRÉES DIRECTEMENT DANS L'ÉNONCÉ DE CHAQUE EXERCICE.
NE PAS créer de section "resources" séparée au niveau de l'examen.

- **Textes** : Intégrer le texte COMPLET dans l'énoncé de l'exercice (minimum 20 lignes)
  * OBLIGATOIRE : Ajouter la SOURCE en bas du texte
  * Format source : (Auteur, Titre de l'œuvre, Éditeur/Journal, Année)
  * Exemple source : (Victor Hugo, Les Misérables, Éditions Gallimard, 1862)
  * Exemple source : (Le Monde, "Article sur le climat", 15 novembre 2023)
  
- **Tableaux** : Intégrer le tableau dans l'énoncé
  Format structuré : | Colonne 1 | Colonne 2 | Colonne 3 |
  
- **Graphiques/Courbes** : Description DÉTAILLÉE dans l'énoncé
  Exemple : [Graphique : Évolution température vs temps
  Axe X : 0-10 min (grad. 2 min), Axe Y : 0-100°C (grad. 10°C)
  Courbe : Croissance linéaire 20°C→80°C puis stabilisation]
  
- **Images/Schémas** : Description dans l'énoncé
  Exemple : [Image : Schéma système digestif avec œsophage, estomac, intestins]

STYLE D'EXAMEN PAR NIVEAU :

**3ème - STYLE BREVET DES COLLÈGES (DNB)** :
- Questions typiques du DNB (Diplôme National du Brevet)
- Pour Français : Compréhension de texte (10 pts), Grammaire/Langue (10 pts), Rédaction/Expression écrite (10 pts)
- Pour Maths : Exercices indépendants, calcul, géométrie, problèmes
- Pour Histoire-Géo-EMC : Analyse de documents + développement construit
- Progressivité : questions simples au début, plus complexes à la fin

**1ère/Terminale - STYLE BACCALAURÉAT** :
- Questions typiques du Baccalauréat français
- Pour Français : Commentaire de texte, dissertation, question de grammaire
- Pour Philosophie (Terminale) : Dissertation, explication de texte
- Pour Sciences : Exercices de spécialité, analyse de documents scientifiques
- Niveau supérieur avec réflexion approfondie

**Autres niveaux (6ème, 5ème, 4ème, Seconde)** :
- Style standard adapté au niveau du collège/lycée
- Questions variées et progressives

FORMAT JSON ATTENDU :
{
  "title": "Titre de l'examen",
  "totalPoints": 30 (ou 20 pour 6ème uniquement),
  "duration": "2H",
  "difficulty": "Moyen",
  "style": "Brevet" | "Bac" | "Standard",

  "questions": [
    {
      "id": "q1",
      "section": "Partie I : ALGÈBRE" (indiquer la section pour organisation),
      "type": "QCM" | "Vrai/Faux" | "Textes à trous" | "Légender" | "Définitions" | "Analyse de documents" | "Réponse longue",
      "title": "Titre de l'exercice",
      "content": "Énoncé complet de l'exercice",
      "points": 3,
      "pointsPerStatement": 1 (OBLIGATOIRE pour Vrai/Faux : 1 point par affirmation),

      "options": ["option1", "option2", ...] (pour QCM),
      "correctAnswer": "A" (OBLIGATOIRE pour QCM : lettre de la bonne réponse),
      
      "statements": [{"statement": "...", "isTrue": true/false}] (pour Vrai/Faux),
      
      "expectedLines": 5 (pour réponse longue),
      "answer": "Réponse détaillée et complète du corrigé" (OBLIGATOIRE pour toutes les questions),
      
      "isDifferentiation": false (true pour UNE seule question)
    }
  ]
}

⚠️ RÈGLES CRITIQUES FINALES :
- NE PAS créer de champ "resources" au niveau de l'examen
- INTÉGRER tous les textes/tableaux/graphiques dans le "content" de chaque question
- TOUJOURS ajouter la source après les textes : (Auteur, Titre, Éditeur, Année)
- Exemples de sources :
  * Texte littéraire : (Victor Hugo, Les Misérables, Gallimard, 1862)
  * Article : (Le Monde, "Titre de l'article", 15 novembre 2023)
  * Document historique : (Lettre de Voltaire à D'Alembert, 1757)

⚠️ EXERCICE "RELIER PAR FLÈCHE" :
- Pour ce type d'exercice, présenter deux colonnes :
  Colonne A          |  Colonne B
  1. Élément 1       |  a. Définition A
  2. Élément 2       |  b. Définition B
  3. Élément 3       |  c. Définition C
- Instructions : "Reliez chaque élément de la colonne A à sa correspondance dans la colonne B."
- Type de question : "Relier par flèche"

⚠️ CORRECTION / RÉPONSES (OBLIGATOIRE) :
- CHAQUE question DOIT avoir son champ "answer" avec la réponse complète
- Pour QCM : "correctAnswer" avec la lettre (ex: "A", "B", "C")
- Pour Vrai/Faux : "isTrue" rempli pour chaque affirmation
- Pour questions ouvertes : "answer" avec réponse détaillée et justification
- Pour problèmes : "answer" avec solution complète étape par étape
- Les réponses doivent être claires, précises et pédagogiques

- Retourne UNIQUEMENT le JSON valide, sans texte d'introduction
- Somme des points = 30 EXACTEMENT
- Varie les types de questions (minimum 4 types différents)
`;

export const generateExam = async (config: ExamGenerationConfig): Promise<Exam> => {
  try {
    const ai = getClient();
    const style = getExamStyle(config.grade);
    const needsText = needsComprehensionText(config.subject);
    const needsGraph = needsGraphResource(config.subject);
    const isEnglish = isEnglishExam(config.subject);
    
    // Détails spécifiques selon le style d'examen
    let styleGuidelines = '';
    if (style === 'Brevet') {
      styleGuidelines = `
      IMPORTANT - FORMAT BREVET (DNB) :
      - Structure en 3 parties équilibrées
      - Questions progressives (facile → moyen → difficile)
      - Compréhension (10 pts) + Compétences spécifiques (10 pts) + Production/Analyse (10 pts)
      - Inclure des questions de maîtrise de la langue pour Français
      `;
    } else if (style === 'Bac') {
      styleGuidelines = `
      IMPORTANT - FORMAT BACCALAURÉAT :
      - Exercices indépendants de niveau lycée
      - Analyse approfondie et réflexion critique
      - Questions de cours (5-10 pts) + Exercices d'application (10-15 pts) + Problème/Synthèse (10-15 pts)
      - Niveau de rigueur académique supérieur
      `;
    }
    
    const userPrompt = isEnglish ? `
    ⚠️ CRITICAL: This is an ENGLISH exam - EVERYTHING must be in ENGLISH (no French at all)
    
    Generate a complete English exam for:
    
    Subject: ${config.subject}
    Grade Level: ${config.grade}
    Topics to cover: ${config.chapters}
    
    Exam Style: ${style}
    ${styleGuidelines}
    ${needsText ? 'IMPORTANT: Include a comprehension text of MINIMUM 20 lines IN ENGLISH.' : ''}
    
    Duration: 2H
    Total: EXACTLY ${config.grade === ExamGrade.SIXIEME ? '20' : '30'} points
    Difficulty: Medium (balanced - not too easy, not too hard)
    
    ⚠️ MANDATORY RULES FOR ENGLISH EXAM:
    - ALL text must be in ENGLISH (titles, questions, instructions, content)
    - NO French words or phrases allowed
    - Section names in ENGLISH (e.g., "PART I: READING COMPREHENSION")
    - Question types in ENGLISH (e.g., "Multiple Choice", "True/False", "Fill in the blanks")
    - Instructions in ENGLISH (e.g., "Read the following text", "Answer the questions")
    - Sources in ENGLISH format: (Author, Title, Publisher, Year)
    
    Make sure to:
    - Vary question types (minimum 4 different types)
    - Include EXACTLY 1 differentiation question
    - Provide complete resources (texts, descriptions) IN ENGLISH
    - Follow ${style} exam format and standards
    - Use balanced scoring (points well distributed)
    ` : `
    Génère un examen complet pour :
    
    Matière : ${config.subject}
    Niveau : ${config.grade}
    Chapitres/Sujets à couvrir : ${config.chapters}
    
    Style d'examen : ${style}
    ${styleGuidelines}
    ${needsText ? 'IMPORTANT : Inclus un texte de compréhension de MINIMUM 20 lignes dans les ressources.' : ''}
    ${needsGraph ? 'IMPORTANT : Inclus des descriptions de graphiques, courbes ou tableaux de données.' : ''}
    
    Durée : 2H
    Total : ${config.grade === ExamGrade.SIXIEME ? '20' : '30'} points EXACTEMENT
    Niveau : MOYEN (ni trop facile ni trop difficile)
    
    Assure-toi de :
    - Varier les types de questions (minimum 4 types différents)
    - Inclure EXACTEMENT 1 question de différenciation
    - Fournir des ressources complètes (textes, tableaux, descriptions d'images)
    - Respecter les contraintes spécifiques à la matière
    - Suivre le format ${style === 'Brevet' ? 'Brevet des collèges' : style === 'Bac' ? 'Baccalauréat' : 'standard'}
    - Barème équilibré et logique
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_EXAM,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) throw new Error("Pas de réponse de l'IA");
    
    const cleanedJson = cleanJsonText(text);
    if (!cleanedJson || cleanedJson === "{}") {
      throw new Error("JSON invalide retourné par l'IA");
    }
    
    const parsed = JSON.parse(cleanedJson);
    
    // Vérification CRITIQUE: config.subject doit être défini
    if (!config.subject) {
      console.error('❌ [GEMINI] config.subject est undefined ou vide!');
      throw new Error('Le paramètre subject est obligatoire pour générer un examen');
    }
    
    console.log('✅ [GEMINI] config.subject =', config.subject);
    
    // Créer l'objet Exam complet (sans resources - tout est intégré dans les questions)
    const exam: Exam = {
      id: Date.now().toString(),
      subject: config.subject, // IMPORTANT: Utiliser directement config.subject sans fallback
      grade: config.grade,
      semester: config.semester,
      teacherName: config.teacherName || "",
      className: config.className || config.grade || "",
      duration: parsed.duration || "2H",
      totalPoints: config.grade === ExamGrade.SIXIEME ? 20 : 30, // 20 pour 6ème, 30 pour les autres
      title: parsed.title || `Examen de ${config.subject}`,
      questions: parsed.questions || [],
      resources: [], // Tableau vide - tout est dans le content des questions
      difficulty: parsed.difficulty || "Moyen",
      style: style,
      chapters: config.chapters,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // LOG de vérification finale
    console.log('✅ [GEMINI] Examen créé avec subject =', exam.subject);
    
    // Vérifier que la somme des points correspond au total attendu
    const expectedTotal = config.grade === ExamGrade.SIXIEME ? 20 : 30;
    const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    if (totalPoints !== expectedTotal) {
      console.warn(`⚠️ Total des points (${totalPoints}) ne fait pas ${expectedTotal}. Ajustement...`);
      // Ajustement simple : répartir la différence
      const diff = expectedTotal - totalPoints;
      if (exam.questions.length > 0) {
        exam.questions[0].points += diff;
      }
    }
    
    return exam;
    
  } catch (error: any) {
    console.error("Erreur lors de la génération de l'examen:", error);
    throw new Error(`Échec de génération: ${error?.message || "Erreur inconnue"}`);
  }
};

// Générer plusieurs examens (pour les deux semestres)
export const generateExamsForBothSemesters = async (
  subject: string,
  grade: ExamGrade,
  chapters: string,
  teacherName?: string,
  className?: string
): Promise<{ semester1: Exam; semester2: Exam }> => {
  try {
    console.log(`📝 Génération des examens pour les 2 semestres...`);
    
    const exam1 = await generateExam({
      subject,
      grade,
      semester: 'Semestre 1' as any,
      chapters: chapters + " (Première partie du programme)",
      teacherName,
      className
    });
    
    const exam2 = await generateExam({
      subject,
      grade,
      semester: 'Semestre 2' as any,
      chapters: chapters + " (Deuxième partie du programme)",
      teacherName,
      className
    });
    
    return { semester1: exam1, semester2: exam2 };
  } catch (error: any) {
    console.error("Erreur lors de la génération des examens:", error);
    throw new Error(`Échec: ${error?.message}`);
  }
};
