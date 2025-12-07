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

// Générer les lignes pointillées pour les réponses (plus courtes pour rester dans les marges)
const generateAnswerLines = (numberOfLines: number): string => {
  // Lignes courtes pour rester dans les marges de la page (30 points)
  return Array(numberOfLines).fill('..............................').join('\n');
};

// Formater un exercice selon son type
const formatQuestion = (question: any, index: number, isEnglish: boolean = false): string => {
  // En-tête de l'exercice avec énoncé en GRAS (simulé avec MAJUSCULES + soulignement)
  const pointsLabel = isEnglish 
    ? (question.points > 1 ? 'points' : 'point')
    : (question.points > 1 ? 'points' : 'point');
  
  const exerciseLabel = isEnglish ? 'EXERCISE' : 'EXERCICE';
  // Utiliser MAJUSCULES pour simuler le gras dans Word
  let formatted = `\n${exerciseLabel} ${index + 1} : ${question.title.toUpperCase()} (${question.points} ${pointsLabel})\n`;
  
  if (question.isDifferentiation) {
    const diffLabel = isEnglish ? '⭐ Differentiation exercise' : '⭐ Exercice de différenciation';
    formatted += `${diffLabel}\n`;
  }
  
  // Énoncé de l'exercice
  formatted += `\n${question.content}\n`;
  
  // Les ressources sont maintenant intégrées directement dans le content de la question
  
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
  
  // Détecter si c'est un examen d'anglais (tout doit être en anglais)
  const isEnglish = exam.subject.toLowerCase().includes('anglais') || 
                    exam.subject.toLowerCase() === 'english';
  
  // Plus de ressources générales séparées - tout est intégré dans les exercices
  
  // Organiser les questions par sections
  if (exam.questions && exam.questions.length > 0) {
    const sections = organizeQuestionsBySection(exam.questions);
    let globalIndex = 0;
    
    sections.forEach((questions, sectionName) => {
      // Titre de la section en MAJUSCULES
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
    console.log('📄 Chargement du template...');
    const templateBuffer = await loadTemplate();
    
    console.log('📝 Génération du document...');
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // Options pour améliorer le formatage
    });
    
    // Préparer les données pour le template avec les balises correctes
    // IMPORTANT: Utiliser exam.subject (jamais exam.title qui peut être undefined)
    const data = {
      Matiere: exam.subject || 'Non définie',  // Toujours utiliser exam.subject avec fallback clair
      Classe: exam.className || exam.grade || '',
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: '',
      Exercices: formatExercises(exam)
    };
    
    // Debug log pour vérifier les données
    console.log('📊 Données exportées:', { Matiere: data.Matiere, Classe: data.Classe, Semestre: data.Semestre });
    
    console.log('🔧 Remplissage du template avec les données...');
    doc.render(data);
    
    console.log('💾 Génération du fichier Word...');
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Générer un nom de fichier approprié
    const fileName = `Examen_${exam.subject.replace(/\s+/g, '_')}_${exam.grade}_${exam.semester.replace(/\s+/g, '_')}.docx`;
    
    console.log(`✅ Téléchargement: ${fileName}`);
    saveAs(output, fileName);
    
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'export Word:', error);
    throw new Error(`Échec de l'export: ${error?.message || 'Erreur inconnue'}`);
  }
};

// Formater un exercice avec sa CORRECTION (réponses en rouge)
const formatQuestionWithCorrection = (question: any, index: number, isEnglish: boolean = false): string => {
  const exerciseLabel = isEnglish ? 'EXERCISE' : 'EXERCICE';
  const pointsLabel = isEnglish 
    ? (question.points > 1 ? 'points' : 'point')
    : (question.points > 1 ? 'points' : 'point');
  
  // Utiliser MAJUSCULES pour simuler le gras
  let formatted = `\n${exerciseLabel} ${index + 1} : ${question.title.toUpperCase()} (${question.points} ${pointsLabel})\n`;
  
  if (question.isDifferentiation) {
    const diffLabel = isEnglish ? '⭐ Differentiation exercise' : '⭐ Exercice de différenciation';
    formatted += `${diffLabel}\n`;
  }
  
  formatted += `\n${question.content}\n`;
  
  // Ajouter les RÉPONSES en fonction du type de question
  switch (question.type) {
    case QuestionType.QCM:
      if (question.options && Array.isArray(question.options)) {
        formatted += `\n`;
        question.options.forEach((opt: string, i: number) => {
          const letter = String.fromCharCode(65 + i);
          const isCorrect = question.correctAnswer === letter;
          // Marquer la bonne réponse avec ✓ et en rouge (simulé avec >>> <<<)
          const marker = isCorrect ? '>>> ✓ RÉPONSE CORRECTE <<<' : '';
          formatted += `☐ ${letter}. ${opt} ${marker}\n`;
        });
        // Explication de la réponse
        if (question.answer) {
          formatted += `\n>>> EXPLICATION: ${question.answer} <<<\n`;
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
          formatted += `   >>> RÉPONSE: ${correctAnswer} <<<\n\n`;
        });
      }
      break;
      
    case QuestionType.LEGENDER:
      const labelText = isEnglish ? '[Space to label the diagram/image]' : '[Espace pour légender le schéma/image]';
      formatted += `\n${labelText}\n`;
      if (question.answer) {
        formatted += `\n>>> CORRECTION:\n${question.answer}\n<<<\n`;
      }
      break;
      
    default:
      // Pour toutes les autres questions (réponses longues, définitions, etc.)
      if (question.answer) {
        formatted += `\n>>> CORRECTION:\n${question.answer}\n<<<\n`;
      }
  }
  
  return formatted;
};

// Formater toutes les questions avec corrections
const formatExercisesWithCorrections = (exam: Exam): string => {
  let exercisesText = '';
  
  const isEnglish = exam.subject.toLowerCase().includes('anglais') || 
                    exam.subject.toLowerCase() === 'english';
  
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

// Exporter la CORRECTION de l'examen vers Word (réponses en rouge)
export const exportExamCorrectionToWord = async (exam: Exam): Promise<void> => {
  try {
    console.log('📄 Chargement du template pour la correction...');
    const templateBuffer = await loadTemplate();
    
    console.log('📝 Génération du document de correction...');
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // Préparer les données pour le template
    const data = {
      Matiere: `${exam.subject || 'Non définie'} - CORRECTION`,  // Indiquer que c'est la correction avec fallback
      Classe: exam.className || exam.grade || '',
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: '',
      Exercices: formatExercisesWithCorrections(exam)  // Utiliser la fonction avec corrections
    };
    
    // Debug log
    console.log('📊 Données de correction exportées:', { Matiere: data.Matiere, Classe: data.Classe });
    
    console.log('🔧 Remplissage du template avec les corrections...');
    doc.render(data);
    
    console.log('💾 Génération du fichier Word de correction...');
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Nom de fichier avec "CORRECTION"
    const fileName = `CORRECTION_${exam.subject.replace(/\s+/g, '_')}_${exam.grade}_${exam.semester.replace(/\s+/g, '_')}.docx`;
    
    console.log(`✅ Téléchargement: ${fileName}`);
    saveAs(output, fileName);
    
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'export de la correction:', error);
    throw new Error(`Échec de l'export de la correction: ${error?.message || 'Erreur inconnue'}`);
  }
};

// Exporter plusieurs examens en ZIP
export const exportMultipleExamsToZip = async (exams: Exam[]): Promise<void> => {
  try {
    // Pour l'instant, on exporte un par un
    // TODO: Implémenter un vrai ZIP avec JSZip
    for (const exam of exams) {
      await exportExamToWord(exam);
      // Petite pause entre les exports
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'export multiple:', error);
    throw new Error(`Échec de l'export multiple: ${error?.message}`);
  }
};
