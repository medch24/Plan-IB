import { GoogleGenAI } from "@google/genai";
import { UnitPlan, AssessmentData } from "../types";

const getClient = () => {
  // Get API key from environment variable only
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("⚠️ GEMINI_API_KEY non définie. Veuillez configurer la clé API dans les variables d'environnement Vercel ou dans .env.local");
  }
  
  return new GoogleGenAI({ apiKey });
};

// Helper function to detect if subject should use English generation
const isLanguageAcquisition = (subject: string): boolean => {
  const normalized = subject.toLowerCase().trim();
  return normalized.includes('acquisition') && normalized.includes('langue');
};

// Get language code based on subject
const getGenerationLanguage = (subject: string): 'fr' | 'en' => {
  return isLanguageAcquisition(subject) ? 'en' : 'fr';
};

// Robust JSON extractor with better error handling
const cleanJsonText = (text: string): string => {
  if (!text) return "{}";
  
  try {
    // Remove markdown blocks first to clean up obvious noise
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Remove any leading/trailing text that's not JSON
    clean = clean.replace(/^[^{\[]*/, '').replace(/[^}\]]*$/, '');
    
    // Find the index of the first '{' or '['
    const firstCurly = clean.indexOf('{');
    const firstSquare = clean.indexOf('[');
    
    let start = -1;
    let end = -1;

    // Determine if it's an Object or Array based on which comes first
    if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        start = firstCurly;
        end = clean.lastIndexOf('}');
    } else if (firstSquare !== -1) {
        start = firstSquare;
        end = clean.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
        const extracted = clean.substring(start, end + 1);
        // Validate it's parseable
        JSON.parse(extracted);
        return extracted;
    }
  } catch (e) {
    console.warn("JSON cleaning failed:", e);
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
  globalContext: string,
  subject?: string
): Promise<string[]> => {
  try {
    const ai = getClient();
    const lang = subject ? getGenerationLanguage(subject) : 'fr';
    const relatedStr = relatedConcepts.join(", ");
    
    const prompt = lang === 'en'
      ? `
        Act as an expert IB MYP coordinator.
        Create 3 distinct options for a "Statement of Inquiry" based on the following elements:
        
        Key Concept: ${keyConcept}
        Related Concepts: ${relatedStr}
        Global Context: ${globalContext}
        
        The statement of inquiry should be a meaningful and transferable statement that combines these elements without directly mentioning the specific content of the subject.
        Return ONLY the 3 statements as plain text list, separated by line breaks. Do not number or add introductory text.
      `
      : `
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
    const errorMsg = lang === 'en' 
      ? "Error generating suggestions."
      : "Erreur lors de la génération des suggestions.";
    return [errorMsg];
  }
};

export const generateInquiryQuestions = async (
  soi: string, 
  subject?: string
): Promise<{ factual: string[], conceptual: string[], debatable: string[] }> => {
  try {
    const ai = getClient();
    const lang = subject ? getGenerationLanguage(subject) : 'fr';
    
    const prompt = lang === 'en'
      ? `
        Based on this MYP Statement of Inquiry: "${soi}",
        generate inquiry questions in English:
        - 2 Factual Questions (What/Who... ?)
        - 2 Conceptual Questions (How... ? Why... ?)
        - 2 Debatable Questions (To what extent... ?)
        
        Return the result in valid JSON format with these EXACT KEYS (in English):
        {
          "factual": ["q1", "q2"],
          "conceptual": ["q1", "q2"],
          "debatable": ["q1", "q2"]
        }
        Return ONLY the JSON.
      `
      : `
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
    const lang = getGenerationLanguage(plan.subject);
    
    const prompt = lang === 'en'
      ? `
        For an MYP unit titled "${plan.title}" with the statement of inquiry "${plan.statementOfInquiry}",
        suggest 3 specific and engaging learning activities.
        Include teaching strategies.
        Respond in English, bullet list format.
      `
      : `
        Pour une unité du PEI intitulée "${plan.title}" avec l'énoncé de recherche "${plan.statementOfInquiry}",
        suggère 3 activités d'apprentissage spécifiques et engageantes.
        Inclue les stratégies d'enseignement.
        Réponds en Français, format liste à puces.
      `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    const errorMsg = getGenerationLanguage(plan.subject) === 'en'
      ? "Generation error."
      : "Erreur de génération.";
    return errorMsg;
  }
};

// Shared System Prompt for consistent generation (French)
const SYSTEM_INSTRUCTION_FULL_PLAN_FR = `
Tu es un expert pédagogique du Programme d'Éducation Intermédiaire (PEI) de l'IB.
Tu dois générer un Plan d'Unité complet ET une série d'Évaluations Critériées détaillées en Français (Critères A, B, C, D selon la matière).

RÈGLES ABSOLUES - FORMAT JSON :
1. Utilise UNIQUEMENT les CLÉS JSON EN ANGLAIS ci-dessous. NE LES TRADUIS PAS.
2. Le CONTENU (les valeurs) doit être en FRANÇAIS.
3. Ne laisse AUCUN champ vide. Remplis TOUTES les sections.

CHAMPS OBLIGATOIRES ET DÉTAILLÉS :
- "learningExperiences": Détaille les ACTIVITÉS D'APPRENTISSAGE et les STRATÉGIES D'ENSEIGNEMENT (ex: Apprentissage par enquête, travail collaboratif...).
- "formativeAssessment": Précise les méthodes d'ÉVALUATION FORMATIVE (ex: tickets de sortie, quiz rapide, observation...).
- "differentiation": Précise les stratégies de DIFFÉRENCIATION (Contenu, Processus, Produit) pour les élèves en difficulté et avancés.

RÈGLES SPÉCIFIQUES POUR LES EXERCICES (CRUCIAL):
1. Pour CHAQUE aspect (strand) listé dans "strands" (ex: i, ii, iii), tu DOIS générer EXACTEMENT UN exercice correspondant.
2. Si le critère a 3 aspects, il doit y avoir 3 exercices.
3. VARIE les types d'exercices pour couvrir différents niveaux cognitifs.
4. La clé "criterionReference" de l'exercice doit correspondre EXPLICITEMENT à l'aspect (exemple: "Critère A : i. sélectionner...").

GESTION DES RESSOURCES DANS LES EXERCICES :
- Si l'exercice nécessite l'analyse d'un texte, FOURNIS LE TEXTE complet dans le champ "content".
- Si l'exercice nécessite une image, écris EXPLICITEMENT : "[Insérer Image/Schéma ici : description détaillée]".

Structure JSON attendue :
{
  "title": "Titre en Français",
  "duration": "XX heures",
  "keyConcept": "Un concept clé",
  "relatedConcepts": ["Concept 1", "Concept 2"],
  "globalContext": "Un contexte mondial",
  "statementOfInquiry": "Phrase complète...",
  "inquiryQuestions": {
    "factual": ["Q1", "Q2"],
    "conceptual": ["Q1", "Q2"],
    "debatable": ["Q1", "Q2"]
  },
  "objectives": ["Critère A: ...", "Critère B: ..."],
  "atlSkills": ["Compétence 1...", "Compétence 2..."],
  "content": "Contenu détaillé...",
  "learningExperiences": "Activités ET stratégies d'enseignement détaillées...",
  "summativeAssessment": "Description de la tâche finale...",
  "formativeAssessment": "Description des évaluations formatives...",
  "differentiation": "Stratégies de différenciation...",
  "resources": "Livres, liens...",
  "reflection": {
     "prior": "Connaissances préalables...",
     "during": "Engagement...",
     "after": "Résultats..."
  },
  "assessments": [
    {
       "criterion": "A",
       "criterionName": "Connaissances",
       "maxPoints": 8,
       "strands": ["i. sélectionner...", "ii. appliquer...", "iii. résoudre..."],
       "rubricRows": [
          { "level": "1-2", "descriptor": "..." },
          { "level": "3-4", "descriptor": "..." },
          { "level": "5-6", "descriptor": "..." },
          { "level": "7-8", "descriptor": "..." }
       ],
       "exercises": [
          {
             "title": "Exercice 1 (Aspect i)",
             "content": "Question...",
             "criterionReference": "Critère A : i. sélectionner..."
          }
       ]
    }
  ]
}
`;

// Shared System Prompt for English generation (Language Acquisition)
const SYSTEM_INSTRUCTION_FULL_PLAN_EN = `
You are an expert IB Middle Years Programme (MYP) pedagogical coordinator.
You must generate a complete Unit Plan AND a series of detailed Criterion-based Assessments in ENGLISH (Criteria A, B, C, D depending on the subject).

ABSOLUTE RULES - JSON FORMAT:
1. Use ONLY the JSON KEYS IN ENGLISH below. DO NOT TRANSLATE THEM.
2. The CONTENT (values) must be in ENGLISH.
3. Do NOT leave ANY field empty. Fill ALL sections.

MANDATORY AND DETAILED FIELDS:
- "learningExperiences": Detail the LEARNING ACTIVITIES and TEACHING STRATEGIES (e.g., Inquiry-based learning, collaborative work...).
- "formativeAssessment": Specify FORMATIVE ASSESSMENT methods (e.g., exit tickets, quick quiz, observation...).
- "differentiation": Specify DIFFERENTIATION strategies (Content, Process, Product) for struggling and advanced students.

SPECIFIC RULES FOR EXERCISES (CRUCIAL):
1. For EACH aspect (strand) listed in "strands" (e.g., i, ii, iii), you MUST generate EXACTLY ONE corresponding exercise.
2. If the criterion has 3 aspects, there must be 3 exercises.
3. VARY the types of exercises to cover different cognitive levels.
4. The "criterionReference" key of the exercise must EXPLICITLY correspond to the aspect (example: "Criterion A: i. select...").

RESOURCE MANAGEMENT IN EXERCISES:
- If the exercise requires analysis of a text, PROVIDE THE COMPLETE TEXT in the "content" field.
- If the exercise requires an image, write EXPLICITLY: "[Insert Image/Diagram here: detailed description]".

Expected JSON Structure:
{
  "title": "Title in English",
  "duration": "XX hours",
  "keyConcept": "A key concept",
  "relatedConcepts": ["Concept 1", "Concept 2"],
  "globalContext": "A global context",
  "statementOfInquiry": "Complete sentence...",
  "inquiryQuestions": {
    "factual": ["Q1", "Q2"],
    "conceptual": ["Q1", "Q2"],
    "debatable": ["Q1", "Q2"]
  },
  "objectives": ["Criterion A: ...", "Criterion B: ..."],
  "atlSkills": ["Skill 1...", "Skill 2..."],
  "content": "Detailed content...",
  "learningExperiences": "Activities AND detailed teaching strategies...",
  "summativeAssessment": "Description of final task...",
  "formativeAssessment": "Description of formative assessments...",
  "differentiation": "Differentiation strategies...",
  "resources": "Books, links...",
  "reflection": {
     "prior": "Prior knowledge...",
     "during": "Engagement...",
     "after": "Results..."
  },
  "assessments": [
    {
       "criterion": "A",
       "criterionName": "Knowledge",
       "maxPoints": 8,
       "strands": ["i. select...", "ii. apply...", "iii. solve..."],
       "rubricRows": [
          { "level": "1-2", "descriptor": "..." },
          { "level": "3-4", "descriptor": "..." },
          { "level": "5-6", "descriptor": "..." },
          { "level": "7-8", "descriptor": "..." }
       ],
       "exercises": [
          {
             "title": "Exercise 1 (Aspect i)",
             "content": "Question...",
             "criterionReference": "Criterion A: i. select..."
          }
       ]
    }
  ]
}
`;

// Get appropriate system instruction based on subject
const getSystemInstruction = (subject: string): string => {
  return isLanguageAcquisition(subject) 
    ? SYSTEM_INSTRUCTION_FULL_PLAN_EN 
    : SYSTEM_INSTRUCTION_FULL_PLAN_FR;
};

export const generateFullUnitPlan = async (
  topics: string, 
  subject: string, 
  gradeLevel: string
): Promise<Partial<UnitPlan>> => {
  try {
    const ai = getClient();
    const lang = getGenerationLanguage(subject);
    
    const userPrompt = lang === 'en' 
      ? `
        Subject: ${subject}
        Grade Level: ${gradeLevel}
        Topics to cover: ${topics}
        
        Generate the complete plan and 4 criterion-based assessments (A, B, C, D).
        Make sure to fill in the 'Activities/Strategies', 'Formative Assessment' and 'Differentiation' sections.
      `
      : `
        Matière: ${subject}
        Niveau: ${gradeLevel}
        Sujets à couvrir: ${topics}
        
        Génère le plan complet et 4 évaluations critériées (A, B, C, D).
        Assure-toi de bien remplir les sections 'Activités/Stratégies', 'Évaluation formative' et 'Différenciation'.
      `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: getSystemInstruction(subject),
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from API");
    
    console.log("Raw AI response length:", text.length);
    
    const cleanedJson = cleanJsonText(text);
    console.log("Cleaned JSON length:", cleanedJson.length);
    
    if (!cleanedJson || cleanedJson === "{}") {
      throw new Error("Failed to extract valid JSON from AI response");
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Problematic JSON:", cleanedJson.substring(0, 500));
      throw new Error("Invalid JSON format from AI: " + parseError);
    }
    
    return sanitizeUnitPlan(parsed, subject, gradeLevel);

  } catch (error: any) {
    console.error("Error generating full plan:", error);
    const errorMsg = error?.message || "Erreur inconnue lors de la génération";
    throw new Error(`Échec de génération: ${errorMsg}`);
  }
};

export const generateCourseFromChapters = async (
    allChapters: string, 
    subject: string, 
    gradeLevel: string
  ): Promise<UnitPlan[]> => {
    try {
      const ai = getClient();
      const lang = getGenerationLanguage(subject);
      
      const taskInstruction = lang === 'en'
        ? `
        TASK: Divide the provided curriculum into 4 to 6 logical units.
        Return a JSON LIST (Array) of UnitPlan objects.
        `
        : `
        TACHE : Divise le programme fourni en 4 à 6 unités logiques.
        Retourne une LISTE JSON (Array) d'objets UnitPlan.
        `;
      
      const systemInstruction = `
      ${getSystemInstruction(subject)}
      ${taskInstruction}
      `;
  
      const userPrompt = lang === 'en'
        ? `
          Subject: ${subject}
          Grade Level: ${gradeLevel}
          Complete Curriculum:
          ${allChapters}
        `
        : `
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
      if (!text) {
        console.warn("No text response from AI");
        return [];
      }
      
      const cleanedJson = cleanJsonText(text);
      
      if (!cleanedJson || cleanedJson === "{}") {
        console.warn("Failed to extract valid JSON");
        return [];
      }
      
      let plans;
      try {
        plans = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error("JSON Parse Error in bulk generation:", parseError);
        console.error("Problematic JSON:", cleanedJson.substring(0, 500));
        return [];
      }
      
      if (!Array.isArray(plans)) {
        console.warn("AI did not return an array of plans");
        return [];
      }

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
