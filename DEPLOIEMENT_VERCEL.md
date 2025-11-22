# 🚀 Guide de Déploiement Vercel - PEI Planner Al-Kawthar

## ⚠️ IMPORTANT: Configuration de la Clé API

**L'ancienne clé API a été compromise et désactivée.** Vous devez configurer une nouvelle clé API Gemini.

---

## 📋 Étapes de Déploiement

### 1. Obtenir une Nouvelle Clé API Gemini

1. Aller sur: https://aistudio.google.com/app/apikey
2. Se connecter avec votre compte Google
3. Cliquer sur **"Create API Key"**
4. Copier la clé générée (commence par `AIza...`)

**⚠️ IMPORTANT:** Ne JAMAIS commit cette clé dans le code. Elle doit être configurée comme variable d'environnement.

---

### 2. Déployer sur Vercel

#### Option A: Deploy Button (Recommandé)

1. Cliquer sur le bouton:
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/medch24/Plan-IB)

2. Lors du déploiement, Vercel demandera les variables d'environnement
3. Ajouter: `GEMINI_API_KEY` = votre_clé_api

#### Option B: Import Manuel

1. Aller sur https://vercel.com/new
2. Importer le repository `medch24/Plan-IB`
3. Vercel détecte automatiquement Vite
4. **AVANT** de cliquer "Deploy":

---

### 3. ⚙️ Configurer les Variables d'Environnement

**C'est l'étape CRITIQUE !**

Dans Vercel, aller dans:
```
Project Settings → Environment Variables
```

Ajouter la variable suivante:

| Name | Value | Environments |
|------|-------|--------------|
| `GEMINI_API_KEY` | Votre clé API Gemini | ✅ Production<br>✅ Preview<br>✅ Development |

**Format attendu:**
```
GEMINI_API_KEY=AIzaSy...votre_cle_ici
```

**⚠️ Sans cette variable, l'application ne fonctionnera pas !**

---

### 4. ✅ Vérifier le Déploiement

Après le déploiement:

1. Ouvrir l'URL fournie par Vercel (ex: `https://plan-ib.vercel.app`)
2. Vérifier que l'écran de connexion s'affiche
3. Sélectionner une matière et une classe
4. Tester la création d'une unité manuelle
5. Tester la génération AI (Planification Annuelle)

---

### 5. 🐛 Résolution de Problèmes

#### Erreur: "GEMINI_API_KEY non définie"

**Solution:**
1. Aller dans Vercel → Project Settings → Environment Variables
2. Vérifier que `GEMINI_API_KEY` est bien configurée
3. Redéployer: Deployments → ... → Redeploy

#### Erreur: "Your API key was reported as leaked"

**Solution:**
1. La clé API a été compromise
2. Générer une NOUVELLE clé sur https://aistudio.google.com/app/apikey
3. Mettre à jour dans Vercel Environment Variables
4. Redéployer

#### Erreur 403 ou "Could not establish connection"

**Solution:**
- Vérifier que la clé API est valide
- Vérifier que l'API Gemini est activée sur votre compte Google Cloud
- Vérifier les quotas API sur Google Cloud Console

---

## 📝 Configuration Build Vercel

Vercel utilise automatiquement la configuration de `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**Commandes:**
- Build: `npm run build`
- Output: `dist/`
- Framework: Vite (détecté automatiquement)

---

## 🔐 Sécurité

### ✅ Bonnes Pratiques

- ✅ Clé API stockée dans les variables d'environnement Vercel
- ✅ Clé API JAMAIS dans le code source
- ✅ `.env.local` dans `.gitignore`
- ✅ `.env.local.example` fourni pour référence

### ❌ À NE JAMAIS FAIRE

- ❌ Commit la clé API dans Git
- ❌ Partager la clé API publiquement
- ❌ Hardcoder la clé dans le code
- ❌ Utiliser la même clé sur plusieurs projets publics

---

## 📊 Vérifier que tout fonctionne

### Checklist Post-Déploiement

- [ ] L'application charge sans erreurs
- [ ] Le logo Al-Kawthar s'affiche
- [ ] L'écran de connexion fonctionne
- [ ] Sélection Matière + Classe fonctionne
- [ ] Dashboard affiche correctement
- [ ] Création d'unité manuelle fonctionne
- [ ] Modal "Planification Annuelle" s'ouvre
- [ ] Champs Enseignant et Ressources visibles dans le modal
- [ ] Génération AI fonctionne (pas d'erreur 403)
- [ ] Export Word fonctionne

---

## 🆘 Support

### Logs Vercel

Pour voir les erreurs:
1. Aller dans Vercel Dashboard
2. Cliquer sur votre déploiement
3. Onglet "Functions" → Voir les logs en temps réel

### Console Navigateur

Ouvrir la console (F12) et vérifier:
- Pas d'erreurs 403
- Pas d'erreurs "API_KEY is not defined"
- Messages de log AI si activés

---

## 🎯 URL de Test

Après déploiement, votre application sera accessible à:
```
https://plan-ib.vercel.app
```
(ou l'URL personnalisée que vous avez configurée)

---

## ✨ Nouvelles Fonctionnalités dans ce Déploiement

1. **Modal Planification Annuelle** avec:
   - ✅ Matière et Niveau pré-remplis (non modifiables)
   - ✅ Champ "Nom de l'enseignant(e)"
   - ✅ Champ "Ressources"
   - ✅ Génération de 4-6 unités complètes

2. **Sécurité améliorée**:
   - ✅ Clé API uniquement en variable d'environnement
   - ✅ Pas de clé hardcodée dans le code

3. **Meilleure gestion d'erreurs**:
   - ✅ Messages d'erreur explicites
   - ✅ Logs détaillés dans la console
   - ✅ Validation JSON améliorée

---

**Bonne chance avec votre déploiement ! 🚀**
