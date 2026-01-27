# 🎨 Solution Formatage Word - Gras et Rouge

## Problème Actuel
- ❌ Manipulation XML corrompait les fichiers Word
- ❌ Pas de formatage automatique gras/rouge
- ✅ Documents fonctionnels mais sans mise en forme

## Solution Professionnelle : Modifier le Template Word

### 📋 Étapes à Suivre

#### 1️⃣ OUVRIR LE TEMPLATE WORD
- Fichier : `public/Template_Examen_Ministere.docx`
- Ouvrir avec Microsoft Word

#### 2️⃣ CRÉER DES STYLES PERSONNALISÉS

**Style "Partie" (pour PARTIE I, PARTIE II, etc.)**
1. Dans Word : Accueil > Styles > Nouveau style
2. Nom : `Partie`
3. Formatage :
   - Police : Arial ou Calibri, 12pt
   - **GRAS** ✅
   - Couleur : Noir
4. Cliquer OK

**Style "Exercice" (pour EXERCICE 1, EXERCICE 2, etc.)**
1. Dans Word : Accueil > Styles > Nouveau style
2. Nom : `Exercice`
3. Formatage :
   - Police : Arial ou Calibri, 11pt
   - **GRAS** ✅
   - Couleur : Noir
4. Cliquer OK

**Style "Énoncé" (pour les énoncés de questions)**
1. Dans Word : Accueil > Styles > Nouveau style
2. Nom : `Enonce`
3. Formatage :
   - Police : Arial ou Calibri, 11pt
   - **GRAS** ✅
   - Couleur : Noir
4. Cliquer OK

**Style "Correction" (pour les réponses dans la correction)**
1. Dans Word : Accueil > Styles > Nouveau style
2. Nom : `Correction`
3. Formatage :
   - Police : Arial ou Calibri, 11pt
   - **GRAS** ✅
   - Couleur : **ROUGE (RGB: 255, 0, 0)** 🔴
4. Cliquer OK

#### 3️⃣ SAUVEGARDER LE TEMPLATE
- Fichier > Enregistrer sous
- Format : `.docx` (Document Word)
- Emplacement : `public/Template_Examen_Ministere.docx`

---

## 💻 Modifications du Code

Maintenant, je vais modifier le code pour utiliser ces styles Word.

### Changements dans `examWordExportService.ts`

Au lieu d'écrire du texte brut, nous allons utiliser des **balises de style**.

**Exemple :**
```typescript
// Au lieu de :
exercisesText += `\nEXERCICE 1 : Calculs (3 points)\n`;

// Utiliser :
exercisesText += `\n{#Exercice}EXERCICE 1 : Calculs (3 points)\n`;
```

---

## 🔧 ALTERNATIVE SIMPLE : Docxtemplater avec Modules

Si modifier le template est trop complexe, on peut utiliser un **module docxtemplater** pour le formatage.

### Module : `docxtemplater-style-module`

**Installation :**
```bash
npm install docxtemplater-style-module
```

**Utilisation :**
```typescript
import StyleModule from 'docxtemplater-style-module';

const doc = new Docxtemplater(zip, {
  modules: [new StyleModule()],
  paragraphLoop: true,
  linebreaks: true,
});

// Puis dans les données :
const data = {
  Exercices: formatExercises(exam)  // Avec balises de style
};
```

---

## 🎯 RECOMMANDATION FINALE

**Pour l'instant, je recommande :**

1. ✅ **Garder le système actuel** (documents fonctionnels sans formatage XML)
2. ✅ **Ajouter des balises simples** `[PARTIE I]`, `[EXERCICE 1]`, `[✓ CORRECTION]`
3. ✅ **Formater manuellement** après génération (5 minutes par document)

**Pour une solution automatique complète :**
- Utiliser `docxtemplater-style-module` (requiert installation npm)
- Ou créer un template Word avec styles prédéfinis
- Ou utiliser une autre bibliothèque (docx.js, officegen)

---

## 📝 Code avec Balises de Style (À implémenter)

```typescript
// Ajouter des préfixes pour identifier les éléments à formater
const formatExercises = (exam: Exam): string => {
  let exercisesText = '';
  
  if (exam.questions && exam.questions.length > 0) {
    const sections = organizeQuestionsBySection(exam.questions);
    let globalIndex = 0;
    
    sections.forEach((questions, sectionName) => {
      // Marquer les PARTIES pour formatage
      if (sectionName !== 'Exercices') {
        exercisesText += `\n[PARTIE_GRAS]${sectionName.toUpperCase()}[/PARTIE_GRAS]\n\n`;
      }
      
      questions.forEach((question) => {
        // Marquer les EXERCICES pour formatage
        exercisesText += `\n[EXERCICE_GRAS]EXERCICE ${globalIndex + 1} : ${question.title}[/EXERCICE_GRAS] (${question.points} pts)\n`;
        exercisesText += `\n[ENONCE_GRAS]${question.content}[/ENONCE_GRAS]\n`;
        
        globalIndex++;
      });
    });
  }
  
  return exercisesText;
};
```

Puis post-traiter ces balises dans Word avec un script VBA ou chercher/remplacer manuel.

---

## ❓ Quelle Solution Préférez-vous ?

1. **Balises simples + formatage manuel** (rapide, 5 min par doc)
2. **Module npm docxtemplater-style-module** (automatique, requiert installation)
3. **Template Word avec styles** (semi-automatique, requiert modification template)
4. **Nouvelle bibliothèque** (docx.js - génération complète du document)

Dites-moi votre préférence et je l'implémente ! 🚀
