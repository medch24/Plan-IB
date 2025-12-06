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

// Générer les lignes pointillées pour les réponses
const generateAnswerLines = (numberOfLines: number): string => {
  return Array(numberOfLines).fill('.....................................').join('\n');
};

// Formater un exercice selon son type
const formatQuestion = (question: any, index: number): string => {
  // En-tête de l'exercice avec énoncé en GRAS (simulé avec MAJUSCULES pour Word)
  let formatted = `\nEXERCICE ${index + 1} : ${question.title.toUpperCase()} (${question.points} ${question.points > 1 ? 'points' : 'point'})\n`;
  
  if (question.isDifferentiation) {
    formatted += `⭐ Exercice de différenciation\n`;
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
      formatted += `\n[Espace pour légender le schéma/image]\n`;
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
        exercisesText += formatQuestion(question, globalIndex);
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
    const data = {
      Matiere: exam.subject || 'Mathématiques',
      Classe: exam.className || exam.grade,
      Duree: '2H',
      Enseignant: exam.teacherName || '',
      Semestre: exam.semester || '',
      Date: '',
      Exercices: formatExercises(exam)
    };
    
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
