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
  
  // CORRECTION: Pas de markers BOLD - utiliser du texte normal
  // Le formatage sera fait via le template Word lui-même
  let formatted = `\n${exerciseLabel} ${index + 1} : ${question.title} (${question.points} ${pointsLabel})\n`;
  
  if (question.isDifferentiation) {
    const diffLabel = isEnglish ? '⭐ Differentiation exercise' : '⭐ Exercice de différenciation';
    formatted += `${diffLabel}\n`;
  }
  
  // Énoncé de l'exercice (contenu)
  formatted += `\n${question.content}\n`;
  
  // Formater selon le type de question
  switch (question.type) {
    case QuestionType.QCM:
      if (question.options && Array.isArray(question.options)) {
        formatted += `\n`;
        question.options.forEach((opt: string, i: number) => {
          formatted += `☐ ${String.fromCharCode(65 + i)}. ${opt}\n`;
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
      // Titre de la section (sans markers BOLD)
      if (sectionName !== 'Exercices') {
        exercisesText += `\n${sectionName.toUpperCase()}\n\n`;
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
    
    // Préparer les données pour le template
    // Support de TOUTES les variantes possibles de balises (avec/sans accents)
    const data = {
      Matiere: exam.subject || 'Matière non spécifiée',  // Avec accent è
      Matiere_sans_accent: exam.subject || 'Matiere non specifiee',  // Sans accent
      Subject: exam.subject || 'Subject not specified',  // Anglais
      matiere: exam.subject || 'Matière non spécifiée',  // Minuscule avec accent
      subject: exam.subject || 'Matière non spécifiée',  // Minuscule sans accent
      Classe: exam.className || exam.grade || '',
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: new Date().toLocaleDateString('fr-FR'),
      Exercices: formatExercises(exam)
    };
    
    console.log('📋 [EXPORT] Données pour template:', {
      Matiere: data.Matiere,
      Classe: data.Classe,
      Semestre: data.Semestre,
      ExercicesLength: data.Exercices.length
    });
    
    doc.render(data);
    console.log('✅ [EXPORT] Template rempli');
    
    const output = zip.generate({
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
  
  // CORRECTION: Pas de markers BOLD
  let formatted = `\n${exerciseLabel} ${index + 1} : ${question.title} (${question.points} ${pointsLabel})\n`;
  
  if (question.isDifferentiation) {
    const diffLabel = isEnglish ? '⭐ Differentiation exercise' : '⭐ Exercice de différenciation';
    formatted += `${diffLabel}\n`;
  }
  
  // Énoncé de l'exercice
  formatted += `\n${question.content}\n`;
  
  // Ajouter les RÉPONSES
  switch (question.type) {
    case QuestionType.QCM:
      if (question.options && Array.isArray(question.options)) {
        formatted += `\n`;
        question.options.forEach((opt: string, i: number) => {
          const letter = String.fromCharCode(65 + i);
          const isCorrect = question.correctAnswer === letter;
          const marker = isCorrect ? '✓✓✓ RÉPONSE CORRECTE ✓✓✓' : '';
          formatted += `☐ ${letter}. ${opt} ${marker}\n`;
        });
        if (question.answer) {
          formatted += `\n✓✓✓ EXPLICATION: ${question.answer}\n`;
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
          formatted += `   ✓✓✓ RÉPONSE: ${correctAnswer}\n\n`;
        });
      }
      break;
      
    case QuestionType.LEGENDER:
      const labelText = isEnglish ? '[Space to label the diagram/image]' : '[Espace pour légender le schéma/image]';
      formatted += `\n${labelText}\n`;
      if (question.answer) {
        formatted += `\n✓✓✓ CORRECTION:\n${question.answer}\n`;
      }
      break;
      
    default:
      if (question.answer) {
        formatted += `\n✓✓✓ CORRECTION:\n${question.answer}\n`;
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
        exercisesText += `\n${sectionName.toUpperCase()}\n\n`;
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
    
    // Support de TOUTES les variantes possibles de balises (avec/sans accents)
    const data = {
      Matiere: `${exam.subject || 'Matière non spécifiée'} - CORRECTION`,  // Avec accent è
      Matiere_sans_accent: `${exam.subject || 'Matiere non specifiee'} - CORRECTION`,  // Sans accent
      Subject: `${exam.subject || 'Subject not specified'} - CORRECTION`,  // Anglais
      matiere: `${exam.subject || 'Matière non spécifiée'} - CORRECTION`,  // Minuscule avec accent
      subject: `${exam.subject || 'Matière non spécifiée'} - CORRECTION`,  // Minuscule sans accent
      Classe: exam.className || exam.grade || '',
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: new Date().toLocaleDateString('fr-FR'),
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
        // Ajouter la couleur rouge aux textes de correction (contenant ✓✓✓)
        // On cherche les runs de texte contenant les markers de correction
        let modifiedXml = documentXml;
        
        // Pattern pour identifier les corrections
        // On remplace les balises de texte contenant ✓✓✓ par des balises avec couleur rouge
        modifiedXml = modifiedXml.replace(
          /(<w:r>)(<w:t[^>]*>)([^<]*✓✓✓[^<]*<\/w:t>)/g,
          '$1<w:rPr><w:color w:val="FF0000"/><w:b/></w:rPr>$2$3'
        );
        
        generatedZip.file("word/document.xml", modifiedXml);
        console.log('✅ [CORRECTION] Couleur rouge appliquée aux corrections');
      }
    } catch (colorError) {
      console.warn('⚠️ Impossible d\'appliquer la couleur rouge:', colorError);
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
