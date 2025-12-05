import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { Exam, QuestionType } from '../types';

// Charger le template Word
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

// Formater une question selon son type
const formatQuestion = (question: any, index: number): string => {
  let formatted = `\n${index + 1}. ${question.title} (${question.points} points)\n`;
  
  if (question.isDifferentiation) {
    formatted += `⭐ Question de différenciation\n`;
  }
  
  formatted += `\n${question.content}\n`;
  
  // Ajouter la ressource si présente
  if (question.hasResource && question.resource) {
    formatted += `\n--- Ressource ---\n`;
    if (question.resource.type === 'text') {
      formatted += question.resource.content + '\n';
    } else if (question.resource.type === 'image') {
      formatted += `[Insérer Image : ${question.resource.imageDescription || question.resource.title}]\n`;
    } else if (question.resource.type === 'table' || question.resource.type === 'graph') {
      formatted += question.resource.content + '\n';
    }
    formatted += `--- Fin Ressource ---\n`;
  }
  
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
          formatted += `${i + 1}. ${stmt.statement}\n   ☐ Vrai   ☐ Faux\n`;
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

// Formater toutes les questions de l'examen
const formatExercises = (exam: Exam): string => {
  let exercisesText = '';
  
  // Ajouter les ressources générales en premier
  if (exam.resources && exam.resources.length > 0) {
    exercisesText += `\n━━━━━━━━━━━━ RESSOURCES GÉNÉRALES ━━━━━━━━━━━━\n`;
    exam.resources.forEach((resource, index) => {
      exercisesText += `\nRessource ${index + 1} : ${resource.title}\n`;
      if (resource.type === 'text') {
        exercisesText += `${resource.content}\n`;
      } else if (resource.type === 'image' || resource.type === 'graph') {
        exercisesText += `[Insérer ${resource.type === 'image' ? 'Image' : 'Graphique'} : ${resource.imageDescription || resource.content}]\n`;
      } else if (resource.type === 'table') {
        exercisesText += `${resource.content}\n`;
      }
      exercisesText += `\n`;
    });
    exercisesText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }
  
  // Ajouter toutes les questions
  if (exam.questions && exam.questions.length > 0) {
    exam.questions.forEach((question, index) => {
      exercisesText += formatQuestion(question, index);
      exercisesText += `\n${'─'.repeat(60)}\n`;
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
    });
    
    // Préparer les données pour le template
    const data = {
      Matiere: exam.title || `Examen de ${exam.subject}`,
      Classe: exam.className || exam.grade,
      Duree: exam.duration || '2H',
      Enseignant: exam.teacherName || '..............................',
      Semestre: exam.semester || '..............................',
      Date: exam.date || '....',
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
