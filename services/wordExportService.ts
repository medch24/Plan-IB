import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import FileSaver from "file-saver";
import JSZip from "jszip";
import { UnitPlan, AssessmentData } from "../types";
import { PLAN_TEMPLATE_URL, EVAL_TEMPLATE_URL } from "../constants";

// Helper function to fetch the template with retries and different proxies
const loadFile = async (url: string): Promise<ArrayBuffer> => {
  // Add timestamp to bypass cache
  const uniqueUrl = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
  
  // List of proxies to try in order
  const proxies = [
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://cors-anywhere.herokuapp.com/${u}` // Fallback
  ];

  for (const proxyGen of proxies) {
    try {
      const proxyUrl = proxyGen(uniqueUrl);
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        console.warn(`Proxy failed: ${proxyUrl}`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      // Basic check: if buffer is too small, it might be an empty error file
      if (buffer.byteLength < 100) {
         continue;
      }
      return buffer;
    } catch (error) {
      console.warn("Error loading template with proxy:", error);
    }
  }
  
  throw new Error("Impossible de télécharger le modèle Word. Vérifiez votre connexion ou réessayez plus tard.");
};

// Helper to remove characters that break Docxtemplater
const clean = (text: any): string => {
  if (text === null || text === undefined) return "";
  
  // Ensure text is string
  let str = String(text);
  
  // Replace curly braces to prevent them from being interpreted as tags
  return str.replace(/{/g, "[").replace(/}/g, "]");
};

const generateDocumentBlob = (templateContent: ArrayBuffer, data: any): Blob => {
    let zip;
    try {
        zip = new PizZip(templateContent);
    } catch(e) {
        throw new Error("Le fichier modèle est corrompu.");
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: false, // Must be false for table loops
      linebreaks: true,
      nullGetter: () => ""
    });

    try {
        doc.render(data);
    } catch (error: any) {
        if (error.properties && error.properties.errors) {
            const errorMessages = error.properties.errors.map((e: any) => {
                return `Tag error: ${e.tag} - ${e.message}`;
            }).join("\n");
            console.error("Template Errors:", errorMessages);
            throw new Error(`Erreur balises Word:\n${errorMessages}`);
        }
        throw error;
    }

    return doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
};

const generateDocument = async (templateUrl: string, data: any, fileName: string) => {
  try {
    const content = await loadFile(templateUrl);
    const blob = generateDocumentBlob(content, data);
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, fileName);
  } catch (error: any) {
    console.error("Error generating document:", error);
    alert("Erreur lors de la génération du document Word: " + error.message);
  }
};

// Map AssessmentData to Word Template format
const mapAssessmentToTemplate = (plan: UnitPlan, ad: AssessmentData) => {
  const strands = (ad.strands && Array.isArray(ad.strands) && ad.strands.length > 0) 
    ? ad.strands 
    : ["(Aucun aspect défini)"];

  const rubrics = (ad.rubricRows && Array.isArray(ad.rubricRows) && ad.rubricRows.length > 0) 
    ? ad.rubricRows 
    : [
        { level: "1-8", descriptor: "(Aucune rubrique définie)" }
      ];

  const exercises = (ad.exercises && Array.isArray(ad.exercises) && ad.exercises.length > 0) 
    ? ad.exercises 
    : [
        { title: "Exercice 1", content: "(Aucun exercice généré)", criterionReference: "" }
      ];

  return {
    // Header Info
    classe: clean(plan.gradeLevel || "PEI"),
    matiere: clean(plan.subject || "Matière"),
    unite: clean(plan.title || "Unité"),
    enonce_de_recherche: clean(plan.statementOfInquiry),
    enonce: clean(plan.statementOfInquiry), // Alias for safety
    enseignant: clean(plan.teacherName),
    
    // Criterion Info
    critere: clean(ad.criterion || "A"),
    nom_critere: clean(ad.criterionName || "Connaissances"),
    lettre_critere: clean(ad.criterion || "A"), // Alias
    max: ad.maxPoints || 8,
    
    nom_objectif_specifique: clean(ad.criterionName), 

    // Table 2: Aspects / Strands Loop
    aspects: strands.map(s => ({ text: clean(s) })),

    // Table 3: Rubric / Niveaux Loop
    rubriques: rubrics.map(r => ({
        niveau: clean(r.level),
        descripteur: clean(r.descriptor)
    })),

    // Exercises List Loop
    exercices: exercises.map((ex, index) => ({
        numero: index + 1,
        titre: clean(ex.title),
        contenu: clean(ex.content),
        ref: clean(ex.criterionReference),
    }))
  };
};

export const exportUnitPlanToWord = async (plan: UnitPlan) => {
  // Data mapping for Unit Plan Template
  const data = {
    enseignant: clean(plan.teacherName) || "____________________",
    groupe_matiere: clean(plan.subject),
    titre_unite: clean(plan.title),
    annee_pei: clean(plan.gradeLevel),
    duree: clean(plan.duration),
    concept_cle: clean(plan.keyConcept),
    concepts_connexes: Array.isArray(plan.relatedConcepts) ? clean(plan.relatedConcepts.join(", ")) : clean(plan.relatedConcepts),
    contexte_mondial: clean(plan.globalContext),
    enonce_de_recherche: clean(plan.statementOfInquiry),
    
    questions_factuelles: clean(plan.inquiryQuestions?.factual?.join("\n") || ""),
    questions_conceptuelles: clean(plan.inquiryQuestions?.conceptual?.join("\n") || ""),
    questions_debat: clean(plan.inquiryQuestions?.debatable?.join("\n") || ""),
    
    objectifs_specifiques: clean(Array.isArray(plan.objectives) ? plan.objectives.join("\n") : plan.objectives),
    evaluation_sommative: clean(plan.summativeAssessment),
    approches_apprentissage: clean(Array.isArray(plan.atlSkills) ? plan.atlSkills.join("\n") : plan.atlSkills),
    
    contenu: clean(plan.content),
    processus_apprentissage: clean(plan.learningExperiences),
    evaluation_formative: clean(plan.formativeAssessment),
    differenciation: clean(plan.differentiation),
    ressources: clean(plan.resources),
    
    reflexion_avant: clean(plan.reflection?.prior),
    reflexion_pendant: clean(plan.reflection?.during),
    reflexion_apres: clean(plan.reflection?.after)
  };

  await generateDocument(PLAN_TEMPLATE_URL, data, `Plan_Unite_${(plan.title || 'Sans_Titre').replace(/[^a-z0-9]/gi, '_')}.docx`);
};

export const exportAssessmentsToZip = async (plan: UnitPlan) => {
  try {
    // 1. Gather assessments to export
    let assessmentsToExport: AssessmentData[] = [];
    
    if (plan.assessments && plan.assessments.length > 0) {
        assessmentsToExport = plan.assessments;
    } else if (plan.assessmentData) {
        // Fallback for legacy single assessment
        assessmentsToExport = [plan.assessmentData];
    } else {
        alert("Aucune donnée d'évaluation trouvée. Veuillez régénérer le plan.");
        return;
    }

    // 2. Load Template Once
    const templateContent = await loadFile(EVAL_TEMPLATE_URL);
    
    // 3. Create Zip
    const zip = new JSZip();
    const folderName = `Evaluations_${clean(plan.title).replace(/ /g, '_')}`;
    const folder = zip.folder(folderName);

    // 4. Generate each doc and add to zip
    for (const assessment of assessmentsToExport) {
        const data = mapAssessmentToTemplate(plan, assessment);
        const blob = generateDocumentBlob(templateContent, data);
        const fileName = `Eval_Critere_${assessment.criterion}_${clean(plan.title).substring(0, 20)}.docx`;
        folder?.file(fileName, blob);
    }

    // 5. Generate and download zip
    const zipContent = await zip.generateAsync({ type: "blob" });
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(zipContent, `${folderName}.zip`);

  } catch (error: any) {
    console.error("Error generating zip:", error);
    alert("Erreur lors de la création du fichier ZIP: " + error.message);
  }
};

// Legacy single file export kept for compatibility if needed, but updated to use clean
export const exportAssessmentToWord = async (plan: UnitPlan) => {
    await exportAssessmentsToZip(plan);
};