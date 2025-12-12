import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import FileSaver from "file-saver";
import JSZip from "jszip";
import { UnitPlan, AssessmentData } from "../types";
import { PLAN_TEMPLATE_URL, EVAL_TEMPLATE_URL } from "../constants";
import { loadAllPlansForGrade } from "./databaseService";

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

    // Get the generated zip
    const generatedZip = doc.getZip();
    
    // Force LTR (Left-to-Right) text direction by modifying document.xml settings
    try {
        const documentXml = generatedZip.file("word/document.xml")?.asText();
        if (documentXml) {
            // Ensure bidi="0" (LTR) is set in all paragraphs
            let modifiedXml = documentXml;
            
            // Add rtl="0" to paragraph properties if not present
            // This ensures left-to-right direction
            modifiedXml = modifiedXml.replace(
                /<w:pPr>/g,
                '<w:pPr><w:bidi w:val="0"/>'
            );
            
            // Also add to run properties for extra safety
            modifiedXml = modifiedXml.replace(
                /<w:rPr>/g,
                '<w:rPr><w:rtl w:val="0"/>'
            );
            
            generatedZip.file("word/document.xml", modifiedXml);
        }
    } catch (dirError) {
        console.warn("Could not modify text direction, using default:", dirError);
    }

    return generatedZip.generate({
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

// Export consolidated document for all subjects in a grade
export const exportConsolidatedPlanByGrade = async (grade: string) => {
  try {
    // Load ALL plans for this grade (all subjects)
    const allPlans = await loadAllPlansForGrade(grade);
    
    if (!allPlans || allPlans.length === 0) {
      alert("Aucun plan à exporter pour cette classe.");
      return;
    }

    // Group plans by subject
    const plansBySubject: Record<string, UnitPlan[]> = {};
    
    allPlans.forEach(plan => {
      const subject = plan.subject || "Sans matière";
      if (!plansBySubject[subject]) {
        plansBySubject[subject] = [];
      }
      plansBySubject[subject].push(plan);
    });

    // Create document content as HTML
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: landscape;
            margin: 15mm;
          }
          
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.3;
            color: #333;
            font-size: 11px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2563eb;
          }
          
          .header h1 {
            color: #1e40af;
            font-size: 20px;
            margin: 0 0 5px 0;
            padding: 0;
          }
          
          .header h2 {
            color: #64748b;
            font-size: 14px;
            font-weight: normal;
            margin: 0;
            padding: 0;
          }
          
          .subject-page {
            page-break-after: always;
            padding: 10px;
          }
          
          .subject-title {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #dc2626;
            padding: 8px 15px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 6px;
            margin: 0 0 10px 0;
            text-align: center;
          }
          
          .units-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          
          .unit-card {
            background: #f8fafc;
            border: 2px solid #3b82f6;
            border-radius: 6px;
            padding: 10px;
            break-inside: avoid;
          }
          
          .unit-header {
            background: #dbeafe;
            color: #1e40af;
            font-weight: bold;
            font-size: 13px;
            padding: 5px 10px;
            margin: -10px -10px 8px -10px;
            border-radius: 4px 4px 0 0;
          }
          
          .field-group {
            margin-bottom: 6px;
          }
          
          .field-label {
            font-weight: bold;
            color: #475569;
            font-size: 10px;
            text-transform: uppercase;
            margin: 0 0 2px 0;
            padding: 0;
          }
          
          .field-value {
            color: #334155;
            font-size: 10px;
            margin: 0;
            padding: 0;
            line-height: 1.2;
          }
          
          .objectives-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 3px;
          }
          
          .objective-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 10px;
            display: inline-block;
          }
          
          @media print {
            .subject-page {
              page-break-after: always;
            }
            .unit-card {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📚 Planification Annuelle - Classe ${clean(grade)}</h1>
          <h2>Programme d'éducation intermédiaire (PEI)</h2>
        </div>
    `;

    // Generate content for each subject (each subject on one page)
    Object.entries(plansBySubject).sort(([a], [b]) => a.localeCompare(b)).forEach(([subject, subjectPlans]) => {
      htmlContent += `
        <div class="subject-page">
          <div class="subject-title">📖 Groupe de matière : ${clean(subject)}</div>
          <div class="units-container">
      `;
      
      // Generate all units for this subject
      subjectPlans.forEach((plan, index) => {
        // Extract assessment criteria letters (A, B, C, D) from assessments
        let criteriaLetters: string[] = [];
        
        if (plan.assessments && plan.assessments.length > 0) {
          // Use actual assessments
          criteriaLetters = plan.assessments
            .map(a => a.criterion)
            .filter(Boolean)
            .map(c => c.toUpperCase());
        } else if (plan.assessmentData) {
          // Fallback to legacy single assessment
          criteriaLetters = [plan.assessmentData.criterion?.toUpperCase()].filter(Boolean);
        } else {
          // Last resort: try to extract from objectives text
          const objectives = Array.isArray(plan.objectives) 
            ? plan.objectives 
            : (plan.objectives || "").split(/[,\n]/).filter(Boolean);
          
          criteriaLetters = objectives.map(obj => {
            const match = obj.match(/^([A-D])/i);
            return match ? match[1].toUpperCase() : null;
          }).filter(Boolean) as string[];
        }
        
        // Remove duplicates and sort
        criteriaLetters = Array.from(new Set(criteriaLetters)).sort();
        
        const objectivesHtml = criteriaLetters.length > 0
          ? criteriaLetters.map(letter => `<span class="objective-badge">Critère ${clean(letter)}</span>`).join('')
          : '<span style="font-size: 10px;">Non défini</span>';

        htmlContent += `
          <div class="unit-card">
            <div class="unit-header">Unité ${index + 1} : ${clean(plan.title || "Sans titre")}</div>
            
            <div class="field-group">
              <div class="field-label">📌 Énoncé de recherche</div>
              <div class="field-value">${clean(plan.statementOfInquiry || "Non défini")}</div>
            </div>

            <div class="field-group">
              <div class="field-label">🔑 Concept clé</div>
              <div class="field-value">${clean(plan.keyConcept || "Non défini")}</div>
            </div>

            <div class="field-group">
              <div class="field-label">🔗 Concepts connexes</div>
              <div class="field-value">${clean(Array.isArray(plan.relatedConcepts) ? plan.relatedConcepts.join(", ") : plan.relatedConcepts || "Non défini")}</div>
            </div>

            <div class="field-group">
              <div class="field-label">🌍 Contexte mondial</div>
              <div class="field-value">${clean(plan.globalContext || "Non défini")}</div>
            </div>

            <div class="field-group">
              <div class="field-label">📖 Chapitres et leçons</div>
              <div class="field-value" style="padding-left: 10px;">
                ${plan.chapters 
                  ? plan.chapters.split('\n')
                      .filter((line: string) => line.trim())
                      .map((line: string) => line.trim().startsWith('-') ? line.trim() : `- ${line.trim()}`)
                      .join('<br/>')
                  : 'Non défini'}
              </div>
            </div>
          </div>
        `;
      });
      
      htmlContent += `
          </div>
        </div>
      `;
    });

    htmlContent += `
      </body>
      </html>
    `;

    // Convert HTML to Blob and download
    const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    // Use FileSaver to download
    const saveAs = (FileSaver as any).saveAs || FileSaver;
    saveAs(blob, `Planification_Annuelle_${clean(grade).replace(/ /g, '_')}.doc`);
    
  } catch (error: any) {
    console.error("Error generating consolidated document:", error);
    alert("Erreur lors de la génération du document consolidé: " + error.message);
  }
};