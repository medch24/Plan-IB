import { GoogleGenAI } from "@google/genai";
import { UnitPlan, AssessmentData } from "../types";

const getClient = () => {
  // Get API key from environment variable only
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                  process.env.GEMINI_API_KEY || 
                  process.env.API_KEY;
  
  if (!apiKey) {
    const errorMsg = `
⚠️ ERREUR DE CONFIGURATION API

La clé API Gemini n'est pas configurée.

POUR RÉSOUDRE CE PROBLÈME:

1. Si vous êtes en développement local:
   - Créez un fichier .env.local à la racine du projet
   - Ajoutez: VITE_GEMINI_API_KEY=votre_clé_api_ici
   - Obtenez une clé gratuite sur: https://aistudio.google.com/app/apikey
   - Redémarrez le serveur de développement

2. Si vous êtes sur Vercel (production):
   - Allez dans Settings > Environment Variables
   - Ajoutez: GEMINI_API_KEY=votre_clé_api_ici
   - Redéployez l'application

La génération IA ne fonctionnera pas sans cette clé.
    `.trim();
    
    throw new Error(errorMsg);
  }
  
  return new GoogleGenAI({ apiKey });
};

// Helper function to detect if subject should use English generation
const isLanguageAcquisition = (subject: string): boolean => {
  const normalized = subject.toLowerCase().trim();
  return normalized.includes('acquisition') && normalized.includes('langue');
};

// Helper function to detect if subject is ART or EPS (need Arabic version)
const isArtOrEPS = (subject: string): boolean => {
  const normalized = subject.toLowerCase().trim();
  return normalized.includes('arts') || 
         normalized.includes('art') || 
         normalized.includes('éducation physique') || 
         normalized.includes('eps') ||
         normalized.includes('santé');
};

// Get language code based on subject
const getGenerationLanguage = (subject: string): 'fr' | 'en' | 'bilingual' => {
  if (isLanguageAcquisition(subject)) return 'en';
  if (isArtOrEPS(subject)) return 'bilingual'; // Français + Arabe
  return 'fr';
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
    chapters: plan.chapters || plan.chapitres || "",
    
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
  const lang = subject ? getGenerationLanguage(subject) : 'fr';
  try {
    const ai = getClient();
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
  "chapters": "- Chapitre 1: ...\n- Chapitre 2: ...\n- Chapitre 3: ...",
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

// Shared System Prompt for Bilingual generation (ART and EPS - French + Arabic)
const SYSTEM_INSTRUCTION_FULL_PLAN_BILINGUAL = `
Tu es un expert coordinateur pédagogique du Programme d'Éducation Intermédiaire (PEI) de l'IB.
Tu dois générer un plan d'unité complet BILINGUE (FRANÇAIS + ARABE) ET une série d'évaluations détaillées basées sur les critères.

⚠️ RÈGLE CRUCIALE POUR ART ET EPS : GÉNÉRATION BILINGUE
Pour les matières Arts et Éducation Physique et à la santé, TOUTES les sections doivent être générées en DEUX VERSIONS:
1. VERSION FRANÇAISE (originale)
2. VERSION ARABE (traduction complète et fidèle)

FORMAT BILINGUE POUR CHAQUE SECTION:
- Champ français: "nomChamp": "Contenu en français..."
- Champ arabe: "nomChamp_ar": "المحتوى بالعربية..."

RÈGLES ABSOLUES - FORMAT JSON:
1. Utilise UNIQUEMENT les CLÉS JSON EN FRANÇAIS ci-dessous. NE PAS LES TRADUIRE.
2. Le CONTENU (valeurs) doit être en FRANÇAIS ET EN ARABE (deux champs séparés).
3. Ne laisse AUCUN champ vide. Remplis TOUTES les sections en français ET en arabe.
4. La traduction arabe doit être précise, naturelle et pédagogiquement appropriée.

CHAMPS OBLIGATOIRES ET DÉTAILLÉS (avec versions arabes):
- "learningExperiences": Détailler les ACTIVITÉS D'APPRENTISSAGE et STRATÉGIES PÉDAGOGIQUES (enquête, collaboration...).
- "learningExperiences_ar": النسخة العربية الكاملة للأنشطة التعليمية والاستراتيجيات
- "formativeAssessment": Préciser les méthodes d'ÉVALUATION FORMATIVE (tickets de sortie, quiz rapide, observation...).
- "formativeAssessment_ar": النسخة العربية الكاملة لطرق التقييم التكويني
- "differentiation": Préciser les stratégies de DIFFÉRENCIATION (Contenu, Processus, Produit) pour élèves en difficulté et avancés.
- "differentiation_ar": النسخة العربية الكاملة لاستراتيجيات التمايز

RÈGLES SPÉCIFIQUES POUR LES EXERCICES (CRUCIAL):
1. Pour CHAQUE aspect (strand) listé dans "strands", tu DOIS générer EXACTEMENT UN exercice correspondant.
2. Si le critère a 3 aspects, il doit y avoir 3 exercices.
3. VARIER les types d'exercices pour couvrir différents niveaux cognitifs.
4. La clé "criterionReference" de l'exercice doit correspondre EXPLICITEMENT à l'aspect (exemple: "Critère A: i. sélectionner...").
5. CHAQUE exercice doit avoir une version arabe complète (title_ar, content_ar, criterionReference_ar).

GESTION DES RESSOURCES DANS LES EXERCICES:
- Si l'exercice nécessite l'analyse d'un texte, FOURNIR LE TEXTE COMPLET dans le champ "content" (français) et "content_ar" (arabe).
- Si l'exercice nécessite une image, écrire EXPLICITEMENT: "[Insérer Image/Schéma ici: description détaillée]".

Structure JSON attendue (avec champs arabes):
{
  "title": "Titre en français",
  "title_ar": "العنوان بالعربية",
  "duration": "XX heures",
  "duration_ar": "XX ساعة",
  "chapters": "- Chapitre 1: ...\n- Chapitre 2: ...\n- Chapitre 3: ...",
  "chapters_ar": "- الفصل الأول: ...\n- الفصل الثاني: ...\n- الفصل الثالث: ...",
  "keyConcept": "Un concept clé",
  "keyConcept_ar": "مفهوم رئيسي",
  "relatedConcepts": ["Concept 1", "Concept 2"],
  "relatedConcepts_ar": ["المفهوم الأول", "المفهوم الثاني"],
  "globalContext": "Un contexte mondial",
  "globalContext_ar": "سياق عالمي",
  "statementOfInquiry": "Phrase complète...",
  "statementOfInquiry_ar": "جملة كاملة...",
  "inquiryQuestions": {
    "factual": ["Q1", "Q2"],
    "factual_ar": ["س1", "س2"],
    "conceptual": ["Q1", "Q2"],
    "conceptual_ar": ["س1", "س2"],
    "debatable": ["Q1", "Q2"],
    "debatable_ar": ["س1", "س2"]
  },
  "objectives": ["Critère A: ...", "Critère B: ..."],
  "objectives_ar": ["المعيار أ: ...", "المعيار ب: ..."],
  "atlSkills": ["Compétence 1...", "Compétence 2..."],
  "atlSkills_ar": ["المهارة الأولى...", "المهارة الثانية..."],
  "content": "Contenu détaillé...",
  "content_ar": "المحتوى المفصل...",
  "learningExperiences": "Activités ET stratégies pédagogiques détaillées...",
  "learningExperiences_ar": "الأنشطة والاستراتيجيات التعليمية المفصلة...",
  "summativeAssessment": "Description de la tâche finale...",
  "summativeAssessment_ar": "وصف المهمة النهائية...",
  "formativeAssessment": "Description des évaluations formatives...",
  "formativeAssessment_ar": "وصف التقييمات التكوينية...",
  "differentiation": "Stratégies de différenciation...",
  "differentiation_ar": "استراتيجيات التمايز...",
  "resources": "Livres, liens...",
  "resources_ar": "الكتب، الروابط...",
  "reflection": {
     "prior": "Connaissances préalables...",
     "prior_ar": "المعرفة المسبقة...",
     "during": "Engagement...",
     "during_ar": "المشاركة...",
     "after": "Résultats...",
     "after_ar": "النتائج..."
  },
  "assessments": [
    {
       "criterion": "A",
       "criterionName": "Connaissance",
       "criterionName_ar": "المعرفة",
       "maxPoints": 8,
       "strands": ["i. sélectionner...", "ii. appliquer...", "iii. résoudre..."],
       "strands_ar": ["١. اختيار...", "٢. تطبيق...", "٣. حل..."],
       "rubricRows": [
          { "level": "1-2", "descriptor": "...", "descriptor_ar": "..." },
          { "level": "3-4", "descriptor": "...", "descriptor_ar": "..." },
          { "level": "5-6", "descriptor": "...", "descriptor_ar": "..." },
          { "level": "7-8", "descriptor": "...", "descriptor_ar": "..." }
       ],
       "exercises": [
          {
             "title": "Exercice 1 (Aspect i)",
             "title_ar": "التمرين ١ (الجانب الأول)",
             "content": "Question...",
             "content_ar": "السؤال...",
             "criterionReference": "Critère A: i. sélectionner...",
             "criterionReference_ar": "المعيار أ: ١. اختيار..."
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
  "chapters": "- Chapter 1: ...\n- Chapter 2: ...\n- Chapter 3: ...",
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
  const lang = getGenerationLanguage(subject);
  if (lang === 'en') return SYSTEM_INSTRUCTION_FULL_PLAN_EN;
  if (lang === 'bilingual') return SYSTEM_INSTRUCTION_FULL_PLAN_BILINGUAL;
  return SYSTEM_INSTRUCTION_FULL_PLAN_FR;
};

export const generateFullUnitPlan = async (
  topics: string, 
  subject: string, 
  gradeLevel: string
): Promise<Partial<UnitPlan>> => {
  try {
    const ai = getClient();
    const lang = getGenerationLanguage(subject);
    
    let userPrompt = '';
    
    if (lang === 'en') {
      userPrompt = `
        Subject: ${subject}
        Grade Level: ${gradeLevel}
        Topics to cover: ${topics}
        
        Generate the complete plan and criterion-based assessments (choose appropriate criteria: A, B, C, D based on subject).
        Make sure to:
        1. Fill in ALL sections including 'Activities/Strategies', 'Formative Assessment' and 'Differentiation'
        2. Include a "chapters" field listing the chapters/lessons covered in this unit (bullet points format)
        3. Select ONLY the relevant assessment criteria for this subject (not necessarily all 4)
        4. Return a valid, complete JSON structure
      `;
    } else if (lang === 'bilingual') {
      userPrompt = `
        Matière: ${subject}
        Niveau: ${gradeLevel}
        Sujets à couvrir: ${topics}
        
        ⚠️ ATTENTION: Cette matière (ART ou EPS) nécessite une GÉNÉRATION BILINGUE (FRANÇAIS + ARABE).
        
        Génère le plan complet et les évaluations critériées EN DEUX VERSIONS:
        1. VERSION FRANÇAISE (tous les champs standards)
        2. VERSION ARABE (tous les champs avec suffixe _ar)
        
        Assure-toi de:
        1. Générer TOUTES les sections en français ET en arabe (ex: "title" ET "title_ar")
        2. Bien remplir 'Activités/Stratégies', 'Évaluation formative' et 'Différenciation' (versions française et arabe)
        3. Inclure un champ "chapters" et "chapters_ar" listant les chapitres/leçons en français et en arabe
        4. Sélectionner UNIQUEMENT les critères d'évaluation pertinents pour cette matière
        5. Pour chaque exercice, fournir: title, title_ar, content, content_ar, criterionReference, criterionReference_ar
        6. Retourner une structure JSON valide et complète avec TOUS les champs bilingues
        
        La traduction arabe doit être pédagogiquement appropriée et naturelle.
      `;
    } else {
      userPrompt = `
        Matière: ${subject}
        Niveau: ${gradeLevel}
        Sujets à couvrir: ${topics}
        
        Génère le plan complet et les évaluations critériées (choisis les critères appropriés: A, B, C, D selon la matière).
        Assure-toi de:
        1. Bien remplir TOUTES les sections incluant 'Activités/Stratégies', 'Évaluation formative' et 'Différenciation'
        2. Inclure un champ "chapters" listant les chapitres/leçons couverts dans cette unité (format tirets)
        3. Sélectionner UNIQUEMENT les critères d'évaluation pertinents pour cette matière (pas forcément les 4)
        4. Retourner une structure JSON valide et complète
      `;
    }

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
    if (!text || text.trim() === "") {
      throw new Error("L'IA n'a retourné aucune réponse. Veuillez réessayer.");
    }
    
    console.log("✓ Réponse AI reçue, longueur:", text.length);
    
    const cleanedJson = cleanJsonText(text);
    console.log("✓ JSON nettoyé, longueur:", cleanedJson.length);
    
    if (!cleanedJson || cleanedJson === "{}") {
      console.error("Échec du nettoyage JSON. Texte brut:", text.substring(0, 200));
      throw new Error("L'IA n'a pas retourné de plan valide. Le format JSON est invalide.");
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("❌ Erreur de parsing JSON:", parseError);
      console.error("JSON problématique:", cleanedJson.substring(0, 500));
      throw new Error("Le plan généré contient des erreurs de format. Veuillez réessayer.");
    }
    
    // Vérifier que le plan contient des données essentielles
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Le plan généré est incomplet. Veuillez réessayer.");
    }
    
    const sanitized = sanitizeUnitPlan(parsed, subject, gradeLevel);
    console.log("✓ Plan sanitarisé avec succès");
    
    return sanitized;

  } catch (error: any) {
    console.error("❌ Erreur génération plan complet:", error);
    const errorMsg = error?.message || "Erreur inconnue lors de la génération";
    
    // Message d'erreur plus clair pour l'utilisateur
    if (errorMsg.includes("API") || errorMsg.includes("key") || errorMsg.includes("GEMINI_API_KEY")) {
      throw new Error("❌ Erreur de connexion à l'IA. Vérifiez votre clé API dans les paramètres Vercel.");
    } else if (errorMsg.includes("JSON") || errorMsg.includes("format") || errorMsg.includes("parse")) {
      throw new Error("❌ L'IA n'a pas retourné de plan valide. Veuillez réessayer avec des sujets plus précis.\n\nConseils:\n- Soyez plus spécifique dans les chapitres\n- Essayez avec moins de sujets à la fois\n- Attendez quelques instants et réessayez");
    } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
      throw new Error("❌ Limite d'utilisation de l'IA atteinte. Veuillez réessayer dans quelques minutes.");
    }
    
    throw new Error(`❌ Erreur: ${errorMsg}`);
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
      
      let taskInstruction = '';
      
      if (lang === 'en') {
        taskInstruction = `
        TASK: Divide the provided curriculum into 4 to 6 logical units.
        Return a JSON LIST (Array) of UnitPlan objects.
        `;
      } else if (lang === 'bilingual') {
        taskInstruction = `
        TACHE : Divise le programme fourni en 4 à 6 unités logiques.
        Retourne une LISTE JSON (Array) d'objets UnitPlan BILINGUES (français + arabe).
        ⚠️ CHAQUE unité doit avoir TOUS les champs en version française ET arabe (suffixe _ar).
        `;
      } else {
        taskInstruction = `
        TACHE : Divise le programme fourni en 4 à 6 unités logiques.
        Retourne une LISTE JSON (Array) d'objets UnitPlan.
        `;
      }
      
      const systemInstruction = `
      ${getSystemInstruction(subject)}
      ${taskInstruction}
      `;
  
      let userPrompt = '';
      
      if (lang === 'en') {
        userPrompt = `
          Subject: ${subject}
          Grade Level: ${gradeLevel}
          Complete Curriculum:
          ${allChapters}
        `;
      } else if (lang === 'bilingual') {
        userPrompt = `
          Matière: ${subject}
          Niveau: ${gradeLevel}
          Programme complet:
          ${allChapters}
          
          ⚠️ RAPPEL: Génération BILINGUE requise (français + arabe avec suffixe _ar pour tous les champs).
        `;
      } else {
        userPrompt = `
          Matière: ${subject}
          Niveau: ${gradeLevel}
          Programme complet:
          ${allChapters}
        `;
      }
  
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
      if (!text || text.trim() === "") {
        console.error("❌ L'IA n'a retourné aucune réponse");
        throw new Error("L'IA n'a pas retourné de plan valide. Veuillez réessayer.");
      }
      
      console.log("✓ Réponse AI reçue pour planification, longueur:", text.length);
      
      const cleanedJson = cleanJsonText(text);
      
      if (!cleanedJson || cleanedJson === "{}" || cleanedJson === "[]") {
        console.error("❌ Échec du nettoyage JSON. Texte brut:", text.substring(0, 200));
        throw new Error("L'IA n'a pas retourné de plan valide. Le format JSON est invalide. Veuillez vérifier que les chapitres sont bien formatés et réessayer.");
      }
      
      console.log("✓ JSON nettoyé pour planification, longueur:", cleanedJson.length);
      
      let plans;
      try {
        plans = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error("❌ Erreur de parsing JSON:", parseError);
        console.error("JSON problématique:", cleanedJson.substring(0, 500));
        throw new Error("Le format des plans générés est invalide. Veuillez réessayer avec des chapitres plus clairs.");
      }
      
      if (!Array.isArray(plans)) {
        console.error("❌ L'IA n'a pas retourné un tableau de plans");
        throw new Error("L'IA n'a pas retourné de plan valide. Veuillez réessayer.");
      }
      
      if (plans.length === 0) {
        console.error("❌ L'IA a retourné un tableau vide");
        throw new Error("Aucun plan n'a été généré. Veuillez vérifier que les chapitres sont bien renseignés et réessayer.");
      }
      
      console.log(`✓ ${plans.length} plan(s) validé(s) avec succès`);

      return plans.map((p: any, index: number) => {
        const sanitized = sanitizeUnitPlan(p, subject, gradeLevel);
        return {
          ...sanitized,
          id: Date.now().toString() + "-" + index
        };
      });
  
    } catch (error: any) {
      console.error("❌ Erreur génération planification complète:", error);
      const errorMsg = error?.message || String(error);
      
      // Propager l'erreur pour la gestion au niveau du Dashboard
      if (errorMsg.includes("API") || errorMsg.includes("key") || errorMsg.includes("GEMINI_API_KEY")) {
        throw new Error("❌ Erreur de connexion à l'IA. Vérifiez votre clé API.");
      } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
        throw new Error("❌ Limite d'utilisation de l'IA atteinte. Réessayez dans quelques minutes.");
      }
      
      throw new Error(`❌ Erreur lors de la génération de la planification: ${errorMsg}`);
    }
  };
