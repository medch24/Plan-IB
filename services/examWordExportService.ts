import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { Exam, QuestionType } from '../types';

// Charger le template Word original
const loadTemplate = async (): Promise<ArrayBuffer> => {
  const response = await fetch('/Template_Examen_Ministere.docx');
  if (!response.ok) {
    throw new Error('Impossible de charger le template d\'examen');
  }
  return await response.arrayBuffer();
};

// Convertir les formules LaTeX simples en texte lisible
const convertLaTeXToText = (text: string): string => {
  if (!text) return text;
  
  let converted = text;
  
  // Convertir les formules LaTeX inline: $...$ 
  // Exemples: $f$ → f, $x^2$ → x², $\mathbb{R}$ → ℝ
  
  // Conversions de symboles mathématiques courants
  const mathSymbols: { [key: string]: string } = {
    '\\mathbb{R}': 'ℝ',
    '\\mathbb{N}': 'ℕ',
    '\\mathbb{Z}': 'ℤ',
    '\\mathbb{Q}': 'ℚ',
    '\\mathbb{C}': 'ℂ',
    '\\times': '×',
    '\\div': '÷',
    '\\pm': '±',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\infty': '∞',
    '\\sqrt': '√',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\Delta': 'Δ',
    '\\pi': 'π',
    '\\theta': 'θ'
  };
  
  // Remplacer les symboles LaTeX
  for (const [latex, symbol] of Object.entries(mathSymbols)) {
    converted = converted.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), symbol);
  }
  
  // Convertir les exposants: x^2 → x², x^3 → x³
  converted = converted.replace(/\^2/g, '²');
  converted = converted.replace(/\^3/g, '³');
  converted = converted.replace(/\^(\d+)/g, '⁽$1⁾');
  
  // Supprimer les dollars $ autour des formules simples
  converted = converted.replace(/\$([a-zA-Z0-9_\s\+\-\*\/\(\)\[\]²³⁰¹⁴⁵⁶⁷⁸⁹]+)\$/g, '$1');
  
  // Nettoyer les commandes LaTeX restantes
  converted = converted.replace(/\\/g, '');
  
  return converted;
};

// Générer les lignes pointillées pour les réponses (~24 cm de longueur avec interligne 1,5)
const generateAnswerLines = (numberOfLines: number): string => {
  // ~120 points pour atteindre environ 24 cm (selon la police)
  // Ajout de ligne vide entre chaque ligne pour simuler interligne 1,5
  const longLine = '............................................................................................................................';
  return Array(numberOfLines).fill(longLine).join('\n\n');
};

// Formater un exercice selon son type
const formatQuestion = (question: any, index: number, isEnglish: boolean = false): string => {
  const pointsLabel = isEnglish 
    ? (question.points > 1 ? 'points' : 'point')
    : (question.points > 1 ? 'points' : 'point');
  
  const exerciseLabel = isEnglish ? 'EXERCISE' : 'EXERCICE';
  
  // EN-TÊTE DE L'EXERCICE avec marqueur pour mise en gras
  let formatted = `\n**${exerciseLabel} ${index + 1} : ${convertLaTeXToText(question.title)}** (${question.points} ${pointsLabel})\n`;
  
  if (question.isDifferentiation) {
    const diffLabel = isEnglish ? '⭐ Differentiation exercise' : '⭐ Exercice de différenciation';
    formatted += `${diffLabel}\n`;
  }
  
  // ÉNONCÉ DE L'EXERCICE (contenu) en GRAS - Convertir LaTeX
  formatted += `\n**${convertLaTeXToText(question.content)}**\n`;
  
  // Formater selon le type de question
  switch (question.type) {
    case QuestionType.QCM:
      if (question.options && Array.isArray(question.options)) {
        formatted += `\n`;
        question.options.forEach((opt: string, i: number) => {
          formatted += `☐ ${String.fromCharCode(65 + i)}. ${convertLaTeXToText(opt)}\n`;
        });
      }
      break;
      
    case QuestionType.VRAI_FAUX:
      if (question.statements && Array.isArray(question.statements)) {
        formatted += `\n`;
        question.statements.forEach((stmt: any, i: number) => {
          const pointsPerStatement = question.pointsPerStatement || 1;
          formatted += `${i + 1}. ${stmt.statement} (${pointsPerStatement} pt)\n   ☐ Vrai   ☐ Faux\n\n`;
        });
      }
      break;
      
    case QuestionType.TEXTE_A_TROUS:
      formatted += `\n${generateAnswerLines(2)}\n`;
      break;
      
    case QuestionType.LEGENDER:
      const labelText = isEnglish ? '[Space to label the diagram/image]' : '[Espace pour légender le schéma/image]';
      formatted += `\n${labelText}\n`;
      formatted += `${generateAnswerLines(3)}\n`;
      break;
      
    case 'Relier par flèche':
      // Déjà formaté dans le content (tableau avec colonnes)
      formatted += `\n`;
      break;
      
    case 'Compléter un tableau':
      // Déjà formaté dans le content (tableau)
      formatted += `\n`;
      break;
      
    case QuestionType.DEFINITIONS:
      formatted += `\n${generateAnswerLines(3)}\n`;
      break;
      
    case QuestionType.ANALYSE_DOCUMENTS:
      formatted += `\n${generateAnswerLines(5)}\n`;
      break;
      
    case QuestionType.REPONSE_LONGUE:
    case QuestionType.PROBLEME:
      const lines = question.expectedLines || 8;
      formatted += `\n${generateAnswerLines(lines)}\n`;
      break;
      
    default:
      formatted += `\n${generateAnswerLines(4)}\n`;
  }
  
  return formatted;
};

// Organiser les questions par sections
const organizeQuestionsBySection = (questions: any[]): Map<string, any[]> => {
  const sections = new Map<string, any[]>();
  
  questions.forEach(question => {
    const section = question.section || 'Exercices';
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push(question);
  });
  
  return sections;
};

// Formater toutes les questions de l'examen organisées par sections
const formatExercises = (exam: Exam): string => {
  let exercisesText = '';
  
  // Détecter si c'est un examen d'anglais
  const isEnglish = exam.subject?.toLowerCase().includes('anglais') || 
                    exam.subject?.toLowerCase() === 'english';
  
  // Organiser les questions par sections
  if (exam.questions && exam.questions.length > 0) {
    const sections = organizeQuestionsBySection(exam.questions);
    let globalIndex = 0;
    
    sections.forEach((questions, sectionName) => {
      // Titre de la section EN GRAS avec marqueurs **
      if (sectionName !== 'Exercices') {
        exercisesText += `\n**${sectionName.toUpperCase()}**\n\n`;
      }
      
      // Questions de cette section
      questions.forEach((question) => {
        exercisesText += formatQuestion(question, globalIndex, isEnglish);
        exercisesText += `\n`;
        globalIndex++;
      });
    });
  }
  
  return exercisesText;
};

// Exporter un examen vers Word
export const exportExamToWord = async (exam: Exam): Promise<void> => {
  try {
    console.log('📄 [EXPORT] Début de l\'export Word');
    console.log('📊 [EXPORT] Données exam:', {
      subject: exam.subject,
      grade: exam.grade,
      semester: exam.semester,
      teacherName: exam.teacherName,
      className: exam.className,
      questionsCount: exam.questions?.length || 0
    });
    
    if (!exam.subject) {
      throw new Error('Le champ subject est obligatoire pour l\'export');
    }
    
    const templateBuffer = await loadTemplate();
    console.log('✅ [EXPORT] Template chargé');
    
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // IMPORTANT: Vérification que subject est bien défini
    console.log('🔍 [DEBUG] exam.subject =', exam.subject);
    console.log('🔍 [DEBUG] typeof exam.subject =', typeof exam.subject);
    
    if (!exam.subject || exam.subject === 'undefined') {
      console.error('❌ [EXPORT] exam.subject est vide ou undefined!');
      throw new Error('Le nom de la matière est requis pour générer l\'examen');
    }
    
    // Préparer les données pour le template
    // La balise dans le template est {Matiere} - on assure qu'elle soit bien remplie
    const data = {
      Matiere: exam.subject,  // BALISE PRINCIPALE utilisée dans le template
      Classe: exam.className || exam.grade || '',
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: exam.date || '',  // Date saisie par l'enseignant (format: JJ/MM/AAAA)
      Exercices: formatExercises(exam)
    };
    
    console.log('📋 [EXPORT] Données pour template:', {
      Matiere: data.Matiere,
      'Matiere (type)': typeof data.Matiere,
      'exam.subject': exam.subject,
      'exam.subject (type)': typeof exam.subject,
      Classe: data.Classe,
      Semestre: data.Semestre,
      ExercicesLength: data.Exercices.length
    });
    
    // Vérification finale avant render
    if (!data.Matiere || data.Matiere === 'undefined') {
      console.error('❌ [EXPORT] ATTENTION: Matiere est undefined ou vide!');
      console.error('exam complet:', JSON.stringify(exam, null, 2));
      throw new Error(`Le sujet de l'examen est vide ou undefined. Veuillez renseigner la matière.`);
    }
    
    doc.render(data);
    console.log('✅ [EXPORT] Template rempli');
    
    // Obtenir le zip généré
    const generatedZip = doc.getZip();
    
    // Modifier le XML pour mettre en gras les énoncés (texte entre **)
    try {
      const documentXml = generatedZip.file("word/document.xml")?.asText();
      if (documentXml) {
        let modifiedXml = documentXml;
        
        // Stratégie améliorée pour le formatage gras
        // On cherche tous les patterns **texte** y compris sur plusieurs lignes
        
        // 1. Pattern simple sur une seule balise <w:t>
        modifiedXml = modifiedXml.replace(
          /<w:t([^>]*)>([^<]*?)\*\*([^*]+?)\*\*([^<]*?)<\/w:t>/g,
          function(match, attrs, before, content, after) {
            return `<w:t${attrs}>${before}</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t${attrs}>${content}</w:t></w:r><w:r><w:t${attrs}>${after}`;
          }
        );
        
        // 2. Nettoyer les ** restants (cas où ils sont séparés)
        modifiedXml = modifiedXml.replace(/\*\*/g, '');
        
        generatedZip.file("word/document.xml", modifiedXml);
        console.log('✅ [EXPORT] Formatage gras appliqué aux énoncés');
      }
    } catch (boldError) {
      console.warn('⚠️ Impossible d\'appliquer le formatage gras:', boldError);
      // Continue sans le formatage
    }
    
    const output = generatedZip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    const fileName = `Examen_${exam.subject.replace(/\s+/g, '_')}_${exam.grade}_${exam.semester.replace(/\s+/g, '_')}.docx`;
    console.log(`✅ [EXPORT] Téléchargement: ${fileName}`);
    
    saveAs(output, fileName);
    
  } catch (error: any) {
    console.error('❌ [EXPORT] Erreur:', error);
    console.error('❌ [EXPORT] Stack:', error.stack);
    throw new Error(`Échec de l'export: ${error?.message || 'Erreur inconnue'}`);
  }
};

// Formater un exercice avec sa CORRECTION
const formatQuestionWithCorrection = (question: any, index: number, isEnglish: boolean = false): string => {
  const exerciseLabel = isEnglish ? 'EXERCISE' : 'EXERCICE';
  const pointsLabel = isEnglish 
    ? (question.points > 1 ? 'points' : 'point')
    : (question.points > 1 ? 'points' : 'point');
  
  // EN-TÊTE en GRAS
  let formatted = `\n**${exerciseLabel} ${index + 1} : ${convertLaTeXToText(question.title)}** (${question.points} ${pointsLabel})\n`;
  
  if (question.isDifferentiation) {
    const diffLabel = isEnglish ? '⭐ Differentiation exercise' : '⭐ Exercice de différenciation';
    formatted += `${diffLabel}\n`;
  }
  
  // ÉNONCÉ en GRAS - Convertir LaTeX
  formatted += `\n**${convertLaTeXToText(question.content)}**\n`;
  
  // Ajouter les RÉPONSES
  switch (question.type) {
    case QuestionType.QCM:
      if (question.options && Array.isArray(question.options)) {
        formatted += `\n`;
        question.options.forEach((opt: string, i: number) => {
          const letter = String.fromCharCode(65 + i);
          const isCorrect = question.correctAnswer === letter;
          const marker = isCorrect ? '<<<RÉPONSE CORRECTE>>>' : '';
          formatted += `☐ ${letter}. ${convertLaTeXToText(opt)} ${marker}\n`;
        });
        if (question.answer) {
          formatted += `\n<<<EXPLICATION: ${convertLaTeXToText(question.answer)}>>>`;
        }
      }
      break;
      
    case QuestionType.VRAI_FAUX:
      if (question.statements && Array.isArray(question.statements)) {
        formatted += `\n`;
        question.statements.forEach((stmt: any, i: number) => {
          const pointsPerStatement = question.pointsPerStatement || 1;
          const correctAnswer = stmt.isTrue ? 'Vrai' : 'Faux';
          formatted += `${i + 1}. ${stmt.statement} (${pointsPerStatement} pt)\n`;
          formatted += `   ☐ Vrai   ☐ Faux\n`;
          formatted += `   <<<RÉPONSE: ${correctAnswer}>>>\n\n`;
        });
      }
      break;
      
    case QuestionType.LEGENDER:
      const labelText = isEnglish ? '[Space to label the diagram/image]' : '[Espace pour légender le schéma/image]';
      formatted += `\n${labelText}\n`;
      if (question.answer) {
        formatted += `\n<<<CORRECTION:\n${question.answer}>>>`;
      }
      break;
      
    default:
      if (question.answer) {
        formatted += `\n<<<CORRECTION:\n${question.answer}>>>`;
      }
  }
  
  return formatted;
};

// Formater toutes les questions avec corrections
const formatExercisesWithCorrections = (exam: Exam): string => {
  let exercisesText = '';
  
  const isEnglish = exam.subject?.toLowerCase().includes('anglais') || 
                    exam.subject?.toLowerCase() === 'english';
  
  if (exam.questions && exam.questions.length > 0) {
    const sections = organizeQuestionsBySection(exam.questions);
    let globalIndex = 0;
    
    sections.forEach((questions, sectionName) => {
      if (sectionName !== 'Exercices') {
        exercisesText += `\n**${sectionName.toUpperCase()}**\n\n`;
      }
      
      questions.forEach((question) => {
        exercisesText += formatQuestionWithCorrection(question, globalIndex, isEnglish);
        exercisesText += `\n`;
        globalIndex++;
      });
    });
  }
  
  return exercisesText;
};

// Exporter la CORRECTION de l'examen vers Word (avec texte en rouge)
export const exportExamCorrectionToWord = async (exam: Exam): Promise<void> => {
  try {
    console.log('📄 [CORRECTION] Début de l\'export correction');
    console.log('📊 [CORRECTION] Données exam:', {
      subject: exam.subject,
      grade: exam.grade,
      questionsCount: exam.questions?.length || 0
    });
    
    if (!exam.subject) {
      throw new Error('Le champ subject est obligatoire pour l\'export de correction');
    }
    
    const templateBuffer = await loadTemplate();
    console.log('✅ [CORRECTION] Template chargé');
    
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // IMPORTANT: Vérification que subject est bien défini
    console.log('🔍 [DEBUG CORRECTION] exam.subject =', exam.subject);
    
    if (!exam.subject || exam.subject === 'undefined') {
      console.error('❌ [CORRECTION] exam.subject est vide ou undefined!');
      throw new Error('Le nom de la matière est requis pour générer la correction');
    }
    
    // Préparer les données pour le template
    const data = {
      Matiere: `${exam.subject} - CORRECTION`,  // BALISE PRINCIPALE
      Classe: exam.className || exam.grade || '',
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: exam.date || '',  // Date saisie par l'enseignant (format: JJ/MM/AAAA)
      Exercices: formatExercisesWithCorrections(exam)
    };
    
    console.log('📋 [CORRECTION] Données pour template:', {
      Matiere: data.Matiere,
      Classe: data.Classe
    });
    
    doc.render(data);
    console.log('✅ [CORRECTION] Template rempli');
    
    // Obtenir le zip généré
    const generatedZip = doc.getZip();
    
    // Modifier le XML pour ajouter la couleur rouge aux corrections
    try {
      const documentXml = generatedZip.file("word/document.xml")?.asText();
      if (documentXml) {
        let modifiedXml = documentXml;
        
        // 1. Mettre en GRAS les énoncés (texte entre **) - Version améliorée
        modifiedXml = modifiedXml.replace(
          /<w:t([^>]*)>([^<]*?)\*\*([^*]+?)\*\*([^<]*?)<\/w:t>/g,
          function(match, attrs, before, content, after) {
            return `<w:t${attrs}>${before}</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t${attrs}>${content}</w:t></w:r><w:r><w:t${attrs}>${after}`;
          }
        );
        
        // 2. Mettre en ROUGE et GRAS les corrections (texte entre <<<...>>>)
        modifiedXml = modifiedXml.replace(
          /<w:t([^>]*)>([^<]*?)<<<([^>]+?)>>>([^<]*?)<\/w:t>/g,
          function(match, attrs, before, content, after) {
            return `<w:t${attrs}>${before}</w:t></w:r><w:r><w:rPr><w:color w:val="FF0000"/><w:b/></w:rPr><w:t${attrs}>${content}</w:t></w:r><w:r><w:t${attrs}>${after}`;
          }
        );
        
        // 3. Nettoyer les marqueurs restants
        modifiedXml = modifiedXml.replace(/\*\*/g, '');
        modifiedXml = modifiedXml.replace(/<<</g, '');
        modifiedXml = modifiedXml.replace(/>>>/g, '');
        
        generatedZip.file("word/document.xml", modifiedXml);
        console.log('✅ [CORRECTION] Formatage appliqué : gras pour énoncés, rouge pour corrections');
      }
    } catch (formatError) {
      console.warn('⚠️ Impossible d\'appliquer le formatage:', formatError);
      // Continue sans la couleur
    }
    
    const output = generatedZip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    const fileName = `CORRECTION_${exam.subject.replace(/\s+/g, '_')}_${exam.grade}_${exam.semester.replace(/\s+/g, '_')}.docx`;
    console.log(`✅ [CORRECTION] Téléchargement: ${fileName}`);
    
    saveAs(output, fileName);
    
  } catch (error: any) {
    console.error('❌ [CORRECTION] Erreur:', error);
    console.error('❌ [CORRECTION] Stack:', error.stack);
    throw new Error(`Échec de l'export correction: ${error?.message || 'Erreur inconnue'}`);
  }
};

// Exporter plusieurs examens en ZIP
export const exportMultipleExamsToZip = async (exams: Exam[]): Promise<void> => {
  try {
    for (const exam of exams) {
      await exportExamToWord(exam);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'export multiple:', error);
    throw new Error(`Échec de l'export multiple: ${error?.message}`);
  }
};
