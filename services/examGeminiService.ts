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
1. L'examen doit être sur EXACTEMENT 30 points.
2. Niveau de difficulté : MOYEN à FACILE (adapté au niveau demandé).
3. Il doit y avoir EXACTEMENT 1 question de différenciation explicite (marquée comme telle).
4. Barème ÉQUILIBRÉ : répartir les points de manière logique selon la difficulté des questions.
5. Types de questions VARIÉS OBLIGATOIRES (minimum 4 types différents par examen) :
   - QCM (Questions à Choix Multiples)
   - Vrai/Faux
   - Textes à trous
   - Légender (schémas, cartes, etc.)
   - Définitions
   - Analyse de documents
   - Réponse longue / Développement
   - Résolution de problème

RÈGLES SPÉCIFIQUES PAR MATIÈRE :
- Pour Français : OBLIGATOIREMENT inclure un texte littéraire de MINIMUM 20 lignes pour la compréhension.
- Pour Anglais : L'EXAMEN COMPLET doit être en ANGLAIS (questions, instructions, texte). Inclure un texte de MINIMUM 20 lignes.
- Pour Sciences/Maths : OBLIGATOIREMENT inclure des graphiques, courbes ou tableaux de données avec description détaillée.
- Pour Histoire-Géo-EMC : Inclure des documents historiques/géographiques à analyser.

GESTION DES RESSOURCES :
- Si une question nécessite un texte : fournis-le INTÉGRALEMENT dans le champ "content".
- Si une question nécessite une image/schéma : écris "[Insérer Image : description détaillée]".
- Si une question nécessite un tableau : fournis le tableau complet en format texte.

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
  "totalPoints": 30,
  "duration": "2H",
  "difficulty": "Moyen",
  "style": "Brevet" | "Bac" | "Standard",
  "resources": [
    {
      "type": "text" | "image" | "table" | "graph",
      "title": "Titre de la ressource",
      "content": "Contenu complet...",
      "imageDescription": "Description pour image si applicable"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "QCM" | "Vrai/Faux" | "Textes à trous" | "Légender" | "Définitions" | "Analyse de documents" | "Réponse longue",
      "title": "Titre de la question",
      "content": "Énoncé complet de la question",
      "points": 3,
      "hasResource": true/false,
      "resource": { ... } (si applicable),
      "options": ["option1", "option2", ...] (pour QCM),
      "statements": [{"statement": "...", "isTrue": true/false}] (pour Vrai/Faux),
      "expectedLines": 5 (pour réponse longue),
      "isDifferentiation": false (true pour UNE seule question)
    }
  ]
}

IMPORTANT : 
- Retourne UNIQUEMENT le JSON valide, sans texte d'introduction ou de conclusion.
- Assure-toi que la somme des points de toutes les questions = 30.
- Varie les types de questions pour rendre l'examen complet et équilibré.
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
    Generate a complete English exam for:
    
    Subject: ${config.subject}
    Grade Level: ${config.grade}
    Topics to cover: ${config.chapters}
    
    Exam Style: ${style}
    ${styleGuidelines}
    ${needsText ? 'IMPORTANT: Include a comprehension text of MINIMUM 20 lines.' : ''}
    
    Duration: 2H
    Total: EXACTLY 30 points
    Difficulty: Medium to Easy
    
    Make sure to:
    - Vary question types (minimum 4 different types)
    - Include EXACTLY 1 differentiation question
    - Provide complete resources (texts, descriptions)
    - ALL questions and instructions must be in ENGLISH
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
    Total : 30 points EXACTEMENT
    Niveau : Moyen à Facile
    
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
    
    // Créer l'objet Exam complet
    const exam: Exam = {
      id: Date.now().toString(),
      subject: config.subject,
      grade: config.grade,
      semester: config.semester,
      teacherName: config.teacherName || "",
      className: config.className || "",
      duration: parsed.duration || "2H",
      totalPoints: 30, // Force 30 points
      title: parsed.title || `Examen de ${config.subject}`,
      questions: parsed.questions || [],
      resources: parsed.resources || [],
      difficulty: parsed.difficulty || "Moyen",
      style: style,
      chapters: config.chapters,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Vérifier que la somme des points = 30
    const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    if (totalPoints !== 30) {
      console.warn(`⚠️ Total des points (${totalPoints}) ne fait pas 30. Ajustement...`);
      // Ajustement simple : répartir la différence
      const diff = 30 - totalPoints;
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
