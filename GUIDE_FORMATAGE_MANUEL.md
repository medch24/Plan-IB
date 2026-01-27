# 📝 Guide de Formatage Manuel des Documents Word

## 🎯 Objectif
Formater automatiquement les documents Word générés pour avoir :
- **PARTIES et EXERCICES en GRAS**
- **Corrections en ROUGE**

## 📋 MÉTHODE SIMPLE : Rechercher/Remplacer dans Word

Après avoir généré et téléchargé le document Word, suivez ces étapes :

### Étape 1 : Ouvrir le Document
- Ouvrir le fichier `.docx` téléchargé avec Microsoft Word

### Étape 2 : Formater les PARTIES en Gras
1. **Ctrl + H** (Rechercher/Remplacer)
2. **Rechercher** : `PARTIE I`
3. Cliquer sur **Format** > **Police** > Cocher **Gras**
4. **Remplacer par** : `PARTIE I` (même texte)
5. Cliquer **Remplacer tout**
6. Répéter pour `PARTIE II`, `PARTIE III`, etc.

### Étape 3 : Formater les EXERCICES en Gras
1. **Ctrl + H**
2. **Rechercher** : `EXERCICE` (recherche partielle)
3. Cliquer sur **Format** > **Police** > Cocher **Gras**
4. **Remplacer par** : `^&` (signifie "texte trouvé")
5. Options > Cocher **Utiliser les caractères génériques**
6. Rechercher : `EXERCICE *:*`
7. **Remplacer tout**

### Étape 4 : Formater les Corrections en Rouge
1. **Ctrl + H**
2. **Rechercher** : `[✓ RÉPONSE` (début des corrections)
3. Cliquer sur **Format** > **Police** 
   - Couleur : **Rouge**
   - Cocher **Gras**
4. **Remplacer par** : `^&`
5. **Remplacer tout**

### Étape 5 : Formater "CORRECTION:" en Rouge
1. **Ctrl + H**
2. **Rechercher** : `[CORRECTION:`
3. Format > Police > Rouge + Gras
4. **Remplacer par** : `^&`
5. **Remplacer tout**

---

## 🚀 SOLUTION AUTOMATIQUE (À IMPLÉMENTER)

Pour automatiser complètement, voici le code à ajouter :

### Option A : Utiliser `docx` Library (Python)

```python
from docx import Document
from docx.shared import RGBColor

def format_exam_document(filename):
    doc = Document(filename)
    
    for paragraph in doc.paragraphs:
        # Formater PARTIE en gras
        if paragraph.text.startswith('PARTIE'):
            for run in paragraph.runs:
                run.bold = True
        
        # Formater EXERCICE en gras
        if 'EXERCICE' in paragraph.text:
            for run in paragraph.runs:
                if 'EXERCICE' in run.text:
                    run.bold = True
        
        # Formater corrections en rouge
        if '[✓ RÉPONSE' in paragraph.text or '[CORRECTION' in paragraph.text:
            for run in paragraph.runs:
                run.font.color.rgb = RGBColor(255, 0, 0)
                run.bold = True
    
    doc.save(filename)
```

### Option B : Module Node.js `docx`

```typescript
import { Document, Paragraph, TextRun } from 'docx';

const formatExerciseText = (text: string) => {
  const parts: TextRun[] = [];
  
  // Détecter PARTIE et mettre en gras
  if (text.includes('PARTIE')) {
    parts.push(new TextRun({
      text: text,
      bold: true
    }));
  }
  // Détecter correction et mettre en rouge
  else if (text.includes('[✓ RÉPONSE') || text.includes('[CORRECTION')) {
    parts.push(new TextRun({
      text: text,
      bold: true,
      color: 'FF0000'
    }));
  }
  else {
    parts.push(new TextRun({ text }));
  }
  
  return parts;
};
```

---

## 💡 RECOMMANDATION IMMÉDIATE

**Pour aujourd'hui :**
1. ✅ Génère un examen avec le système actuel
2. ✅ Télécharge le fichier Word
3. ✅ **Formate manuellement** avec Rechercher/Remplacer (5 minutes)
4. ✅ Le document est prêt à utiliser !

**Pour la suite :**
- Je peux implémenter une solution automatique complète
- Soit via un script Python post-traitement
- Soit via une bibliothèque différente (docx.js)
- Soit via modification du template Word

---

## ❓ Quelle Solution Voulez-vous ?

**Option 1** : Garder le système actuel + formatage manuel (rapide, 5 min)

**Option 2** : Script Python automatique après génération

**Option 3** : Réécrire l'export avec bibliothèque `docx` (Node.js)

**Option 4** : Modifier le template Word avec styles prédéfinis

Dites-moi laquelle vous préférez et je l'implémente ! 🚀
