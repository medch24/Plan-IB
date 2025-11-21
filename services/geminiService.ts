import { GoogleGenAI } from "@google/genai";
import { UnitPlan, AssessmentData } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Robust JSON extractor
const cleanJsonText = (text: string): string => {
  if (!text) return "{}";
  
  // Remove markdown blocks first to clean up obvious noise
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  // Find the index of the first '{' or '['
  const firstCurly = clean.indexOf('{');
  const firstSquare = clean.indexOf('[');
  
  let start = -1;
  let end = -1;
  let type = 'object';

  // Determine if it's an Object or Array based on which comes first
  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
      start = firstCurly;
      end = clean.lastIndexOf('}');
      type = 'object';
  } else if (firstSquare !== -1) {
      start = firstSquare;
      end = clean.lastIndexOf(']');
      type = 'array';
  }

  if (start !== -1 && end !== -1) {
      return clean.substring(start, end + 1);
  }

  return "{}";
};

const sanitizeAssessmentData = (data: any): AssessmentData | undefined => {
  // If data is missing or empty, return a safe default structure to prevent export crashes
  if (!data || typeof data !== 'object') return undefined;
  
  return {
    criterion: String(data.criterion || data.critere || "A"),
    criterionName: String(data.criterionName || data.nom_critere || "Connaissances"),
    maxPoints: Number(data.maxPoints || 8),
    // Handle potential key variations (strands vs aspects)
    strands: (Array.isArray(data.strands) ? data.strands : 
             Array.isArray(data.aspects) ? data.aspects : 
             ["i. Aspect 1", "ii. Aspect 2", "iii. Aspect 3"]).map(String),
    
    rubricRows: (Array.isArray(data.rubricRows) ? data.rubricRows : [
        { level: "1-2", descriptor: "L'élève est capable de..." },
        { level: "3-4", descriptor: "L'élève est capable de..." },
        { level: "5-6", descriptor: "L'élève est capable de..." },
        { level: "7-8", descriptor: "L'élève est capable de..." }
    ]).map((r: any) => ({
        level: String(r?.level || r?.niveau || ""),
        descriptor: String(r?.descriptor || r?.description || r?.descripteur || "")
    })),
    
    exercises: (Array.isArray(data.exercises) ? data.exercises : []).map((e: any) => ({
        title: String(e?.title || e?.titre || "Exercice"),
        content: String(e?.content || e?.contenu || "Énoncé..."),
        criterionReference: String(e?.criterionReference || e?.ref || "Critère A..."),
        workspaceNeeded: !!(e?.workspaceNeeded || true)
    }))
  };
};

// Helper to sanitize Plan data from AI
export const sanitizeUnitPlan = (plan: any, subject: string, gradeLevel: string): UnitPlan => {
  // Ensure inquiryQuestions is always an object with arrays
  const iq = plan.inquiryQuestions || plan.questions_recherche || {};
  
  // Handle assessments: could be in 'assessments' (array) or legacy 'assessmentData' (object)
  let assessments: AssessmentData[] = [];
  if (Array.isArray(plan.assessments)) {
      assessments = plan.assessments.map(sanitizeAssessmentData).filter((a: any): a is AssessmentData => !!a);
  } else if (plan.assessmentData) {
      const single = sanitizeAssessmentData(plan.assessmentData);
      if (single) assessments.push(single);
  }

  return {
    id: plan.id || Date.now().toString(),
    teacherName: plan.teacherName || "",
    title: plan.title || plan.titre || "Nouvelle Unité",
    subject: subject || plan.subject || plan.matiere || "",
    gradeLevel: gradeLevel || plan.gradeLevel || plan.niveau || "",
    duration: plan.duration || plan.duree || "10 heures",
    
    keyConcept: plan.keyConcept || plan.concept_cle || "",
    relatedConcepts: Array.isArray(plan.relatedConcepts) ? plan.relatedConcepts : 
                     Array.isArray(plan.concepts_connexes) ? plan.concepts_connexes : [],
    
    globalContext: plan.globalContext || plan.contexte_mondial || "",
    statementOfInquiry: plan.statementOfInquiry || plan.enonce_recherche || "",
    
    inquiryQuestions: {
      factual: Array.isArray(iq.factual) ? iq.factual : Array.isArray(iq.factuelles) ? iq.factuelles : [],
      conceptual: Array.isArray(iq.conceptual) ? iq.conceptual : Array.isArray(iq.conceptuelles) ? iq.conceptuelles : [],
      debatable: Array.isArray(iq.debatable) ? iq.debatable : Array.isArray(iq.debat) ? iq.debat : []
    },
    
    objectives: Array.isArray(plan.objectives) ? plan.objectives : Array.isArray(plan.objectifs) ? plan.objectifs : [],
    atlSkills: Array.isArray(plan.atlSkills) ? plan.atlSkills : Array.isArray(plan.approches_apprentissage) ? plan.approches_apprentissage : [],
    
    // Check for content/contenu
    content: plan.content || plan.contenu || "",
    learningExperiences: plan.learningExperiences || plan.activites_apprentissage || plan.processus_apprentissage || "",
    
    summativeAssessment: plan.summativeAssessment || plan.evaluation_sommative || "",
    formativeAssessment: plan.formativeAssessment || plan.evaluation_formative || "",
    differentiation: plan.differentiation || plan.differenciation || "",
    resources: plan.resources || plan.ressources || "",
    
    reflection: {
      prior: plan.reflection?.prior || plan.reflexion?.avant || "",
      during: plan.reflection?.during || plan.reflexion?.pendant || "",
      after: plan.reflection?.after || plan.reflexion?.apres || ""
    },
    
    generatedAssessmentDocument: plan.generatedAssessmentDocument || "",
    assessmentData: sanitizeAssessmentData(plan.assessmentData || plan.donnees_evaluation),
    assessments: assessments
  };
};

export const generateStatementOfInquiry = async (
  keyConcept: string,
  relatedConcepts: string[],
  globalContext: string
): Promise<string[]> => {
  try {
    const ai = getClient();
    const relatedStr = relatedConcepts.join(", ");
    const prompt = `
      Agis comme un coordonnateur expert du PEI de l'IB.
      Crée 3 options distinctes pour un "Énoncé de recherche" (Statement of Inquiry) basé sur les éléments suivants :
      
      Concept clé : ${keyConcept}
      Concepts connexes : ${relatedStr}
      Contexte mondial : ${globalContext}
      
      L'énoncé de recherche doit être une déclaration significative et transférable qui combine ces éléments sans mentionner directement le contenu spécifique de la matière.
      Retourne UNIQUEMENT les 3 énoncés sous forme de liste de texte brut, séparés par des retours à la ligne. Ne pas numéroter ni ajouter de texte d'introduction.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    return text.split('\n').filter(line => line.trim().length > 0).map(l => l.replace(/^- /, '').trim());
  } catch (error) {
    console.error("Error generating SOI:", error);
    return ["Erreur lors de la génération des suggestions."];
  }
};

export const generateInquiryQuestions = async (soi: string): Promise<{ factual: string[], conceptual: string[], debatable: string[] }> => {
  try {
    const ai = getClient();
    const prompt = `
      Basé sur cet Énoncé de recherche du PEI : "${soi}",
      génère des questions de recherche en Français :
      - 2 Questions Factuelles (Quoi/Qui... ?)
      - 2 Questions Conceptuelles (Comment... ? Pourquoi... ?)
      - 2 Questions Invitant au débat (Dans quelle mesure... ?)
      
      Retourne le résultat au format JSON valide avec ces CLÉS EXACTES (en anglais) :
      {
        "factual": ["q1", "q2"],
        "conceptual": ["q1", "q2"],
        "debatable": ["q1", "q2"]
      }
      Retourne UNIQUEMENT le JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const jsonText = cleanJsonText(response.text || "");
    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error("Error generating questions:", error);
    return { factual: [], conceptual: [], debatable: [] };
  }
};

export const generateLearningExperiences = async (plan: UnitPlan): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      Pour une unité du PEI intitulée "${plan.title}" avec l'énoncé de recherche "${plan.statementOfInquiry}",
      suggère 3 activités d'apprentissage spécifiques et engageantes.
      Réponds en Français, format liste à puces.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    return "Erreur de génération.";
  }
};

// Shared System Prompt for consistent generation
const SYSTEM_INSTRUCTION_FULL_PLAN = `
Tu es un expert pédagogique du Programme d'Éducation Intermédiaire (PEI) de l'IB.
Tu dois générer un Plan d'Unité complet ET une série d'Évaluations Critériées détaillées en Français (Critères A, B, C, D selon la matière).

RÈGLES ABSOLUES - FORMAT JSON :
1. Utilise UNIQUEMENT les CLÉS JSON EN ANGLAIS ci-dessous. NE LES TRADUIS PAS.
2. Le CONTENU (les valeurs) doit être en FRANÇAIS.
3. Ne laisse AUCUN champ vide. Remplis TOUTES les sections, y compris la réflexion (invente des pistes) et la différenciation.

RÈGLES SPÉCIFIQUES POUR LES EXERCICES (CRUCIAL):
1. Pour CHAQUE aspect (strand) listé dans "strands" (ex: i, ii, iii), tu DOIS générer EXACTEMENT UN exercice correspondant.
2. Si le critère a 3 aspects, il doit y avoir 3 exercices.
3. VARIE les types d'exercices pour couvrir différents niveaux cognitifs :
   - Exercice pour l'aspect i : Peut être une question de connaissance, QCM ou définition.
   - Exercice pour l'aspect ii : Peut être une application, un calcul ou un schéma.
   - Exercice pour l'aspect iii : Peut être une résolution de problème complexe, une analyse ou une justification.
4. La clé "criterionReference" de l'exercice doit correspondre EXPLICITEMENT à l'aspect (exemple: "Critère A : i. sélectionner...").

GESTION DES RESSOURCES DANS LES EXERCICES :
- Si l'exercice nécessite l'analyse d'un texte, FOURNIS LE TEXTE complet dans le champ "content".
- Si l'exercice nécessite une image, un schéma ou un document visuel que tu ne peux pas générer, écris EXPLICITEMENT entre crochets : "[Insérer Image/Schéma ici : description détaillée de l'image requise (ex: Graphique montrant l'évolution de X...)]".

Structure JSON attendue :
{
  "title": "Titre en Français",
  "duration": "XX heures",
  "keyConcept": "Un concept clé",
  "relatedConcepts": ["Concept 1", "Concept 2"],
  "globalContext": "Un contexte mondial",
  "statementOfInquiry": "Phrase complète...",
  "inquiryQuestions": {
    "factual": ["Question 1", "Question 2"],
    "conceptual": ["Question 1", "Question 2"],
    "debatable": ["Question 1", "Question 2"]
  },
  "objectives": ["Critère A: ...", "Critère B: ..."],
  "atlSkills": ["Compétence 1...", "Compétence 2..."],
  "content": "Contenu détaillé (minimum 50 mots)...",
  "learningExperiences": "Activités détaillées (minimum 50 mots)...",
  "summativeAssessment": "Description de la tâche finale...",
  "formativeAssessment": "Quiz, tickets de sortie...",
  "differentiation": "Stratégies pour élèves...",
  "resources": "Livres, liens...",
  "reflection": {
     "prior": "Connaissances préalables suggérées...",
     "during": "Questions sur l'engagement...",
     "after": "Analyse des résultats..."
  },
  "assessments": [
    {
       "criterion": "A",
       "criterionName": "Connaissances",
       "maxPoints": 8,
       "strands": ["i. sélectionner...", "ii. appliquer...", "iii. résoudre..."],
       "rubricRows": [
          { "level": "1-2", "descriptor": "L'élève est capable de..." },
          { "level": "3-4", "descriptor": "L'élève est capable de..." },
          { "level": "5-6", "descriptor": "L'élève est capable de..." },
          { "level": "7-8", "descriptor": "L'élève est capable de..." }
       ],
       "exercises": [
          {
             "title": "Exercice 1: Connaissance (Aspect i)",
             "content": "Question : Définir le terme... \n [Insérer Image : Schéma d'une cellule animale]",
             "criterionReference": "Critère A : i. sélectionner..."
          },
          {
             "title": "Exercice 2: Application (Aspect ii)",
             "content": "Lisez le texte suivant : '...texte source...'. Question : Calculez...",
             "criterionReference": "Critère A : ii. appliquer..."
          }
       ]
    }
  ]
}
`;

export const generateFullUnitPlan = async (
  topics: string, 
  subject: string, 
  gradeLevel: string
): Promise<Partial<UnitPlan>> => {
  try {
    const ai = getClient();
    
    const userPrompt = `
      Matière: ${subject}
      Niveau: ${gradeLevel}
      Sujets à couvrir: ${topics}
      
      Génère le plan complet et 4 évaluations critériées (A, B, C, D) en suivant strictement la règle : 1 aspect = 1 exercice.
      N'oublie pas de fournir les textes sources ou les descriptions d'images pour les exercices.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_FULL_PLAN,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    
    const cleanedJson = cleanJsonText(text);
    const parsed = JSON.parse(cleanedJson);
    
    return sanitizeUnitPlan(parsed, subject, gradeLevel);

  } catch (error) {
    console.error("Error generating full plan:", error);
    throw error;
  }
};

export const generateCourseFromChapters = async (
    allChapters: string, 
    subject: string, 
    gradeLevel: string
  ): Promise<UnitPlan[]> => {
    try {
      const ai = getClient();
      
      const systemInstruction = `
      ${SYSTEM_INSTRUCTION_FULL_PLAN}
      
      TACHE : Divise le programme fourni en 4 à 6 unités logiques.
      Retourne une LISTE JSON (Array) d'objets UnitPlan suivant la structure ci-dessus.
      Assure-toi que chaque unité a ses évaluations complètes (1 exercice par aspect).
      `;
  
      const userPrompt = `
        Matière: ${subject}
        Niveau: ${gradeLevel}
        Programme complet:
        ${allChapters}
      `;
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });
  
      const text = response.text;
      if (!text) return [];
      
      const cleanedJson = cleanJsonText(text);
      const plans = JSON.parse(cleanedJson);
      
      if (!Array.isArray(plans)) return [];

      return plans.map((p: any, index: number) => {
        const sanitized = sanitizeUnitPlan(p, subject, gradeLevel);
        return {
          ...sanitized,
          id: Date.now().toString() + "-" + index
        };
      });
  
    } catch (error) {
      console.error("Error generating course:", error);
      return [];
    }
  };