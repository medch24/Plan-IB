export interface AssessmentData {
  criterion: string; // e.g. "A"
  criterionName: string; // e.g. "Connaissances et compréhension"
  maxPoints: number; // e.g. 8
  strands: string[]; // e.g. ["i. sélectionner...", "ii. appliquer..."]
  rubricRows: {
    level: string; // "1-2"
    descriptor: string; // "L'élève est capable de..."
  }[];
  exercises: {
    title: string;
    content: string;
    criterionReference: string; // "Critère A : i. ..."
    workspaceNeeded?: boolean;
  }[];
}

export interface UnitPlan {
  id: string;
  teacherName: string; // Added: Name of the teacher
  title: string;
  subject: string;
  gradeLevel: string;
  duration: string;
  
  // Inquiry Section
  keyConcept: string;
  relatedConcepts: string[];
  globalContext: string;
  statementOfInquiry: string;
  inquiryQuestions: {
    factual: string[];
    conceptual: string[];
    debatable: string[];
  };

  // Action Section
  objectives: string[]; // e.g., A, B, C, D
  atlSkills: string[];
  content: string;
  learningExperiences: string;

  // Assessment
  summativeAssessment: string; // Description of the task
  formativeAssessment: string;
  differentiation: string; // Added from PDF model
  
  // Resources & Reflection
  resources: string;
  reflection: {
    prior: string;
    during: string;
    after: string;
  };

  // Full Document for Criterion Referenced Assessment
  generatedAssessmentDocument: string; // Text view
  assessmentData?: AssessmentData; // Legacy single assessment
  assessments: AssessmentData[]; // New: Multiple assessments (A, B, C, D)
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
}

export enum GlobalContext {
  IDENTITIES_AND_RELATIONSHIPS = "Identities and relationships",
  ORIENTATION_IN_SPACE_AND_TIME = "Orientation in space and time",
  PERSONAL_AND_CULTURAL_EXPRESSION = "Personal and cultural expression",
  SCIENTIFIC_AND_TECHNICAL_INNOVATION = "Scientific and technical innovation",
  GLOBALIZATION_AND_SUSTAINABILITY = "Globalization and sustainability",
  FAIRNESS_AND_DEVELOPMENT = "Fairness and development"
}

export interface AIRequestConfig {
  temperature?: number;
}