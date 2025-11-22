# Configuration MongoDB pour PEI Planner

## 🎯 Objectif

Cette application utilise maintenant **MongoDB Atlas** comme base de données partagée pour stocker les planifications. Cela permet à tous les enseignants, peu importe leur ordinateur, de voir et modifier les mêmes planifications pour une matière/classe donnée.

## ✅ Avantages de MongoDB

- ✅ **Partage entre ordinateurs** : Les planifications sont accessibles depuis n'importe quel ordinateur
- ✅ **Synchronisation en temps réel** : Les changements sont visibles par tous les enseignants
- ✅ **Sauvegarde automatique** : Les données sont sauvegardées dans le cloud
- ✅ **Fallback localStorage** : Si MongoDB n'est pas disponible, l'application utilise localStorage

## 📋 Configuration

### 1. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec :

```bash
# Clé API Google Gemini
GEMINI_API_KEY=votre_cle_api_gemini

# URL MongoDB Atlas (DÉJÀ CONFIGURÉE)
MONGO_URL=mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI
```

### 2. Configuration Vercel (Production)

Pour déployer sur Vercel :

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez ces variables :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `GEMINI_API_KEY` | Votre clé Gemini | Production, Preview, Development |
| `MONGO_URL` | `mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI` | Production, Preview, Development |

5. Cliquez sur **Save**
6. Re-déployez le projet

## 🏗️ Architecture

### Structure de la base de données

**Base de données** : `planpei`  
**Collection** : `planifications`

**Structure d'un document** :
```json
{
  "_id": "ObjectId automatique",
  "key": "Mathématiques_PEI 3",
  "subject": "Mathématiques",
  "grade": "PEI 3",
  "plans": [
    {
      "id": "uuid-1",
      "subject": "Mathématiques",
      "gradeLevel": "PEI 3",
      "teacherName": "M. Dupont",
      "unitTitle": "Algèbre et équations",
      "resources": "Manuel page 45-60",
      // ... autres champs
    }
  ],
  "lastUpdated": "2024-11-22T18:30:00.000Z"
}
```

### Flux de données

```
┌─────────────────────────────────────────┐
│  Enseignant A (Ordinateur 1)           │
│  Sélectionne: Mathématiques + PEI 3    │
└─────────────────────────────────────────┘
                 ↓
        ┌────────────────┐
        │  API Vercel    │
        │  /api/plans    │
        └────────────────┘
                 ↓
        ┌────────────────┐
        │  MongoDB Atlas │
        │  (Cloud)       │
        └────────────────┘
                 ↑
        ┌────────────────┐
        │  API Vercel    │
        │  /api/plans    │
        └────────────────┘
                 ↑
┌─────────────────────────────────────────┐
│  Enseignant B (Ordinateur 2)           │
│  Sélectionne: Mathématiques + PEI 3    │
│  → Voit les MÊMES planifications       │
└─────────────────────────────────────────┘
```

## 🔧 API Endpoints

### GET /api/planifications

Récupère les planifications pour une matière/classe.

**Paramètres** :
- `subject` : Nom de la matière (ex: "Mathématiques")
- `grade` : Niveau de classe (ex: "PEI 3")

**Exemple** :
```bash
GET /api/planifications?subject=Mathématiques&grade=PEI%203
```

**Réponse** :
```json
{
  "key": "Mathématiques_PEI 3",
  "plans": [...],
  "lastUpdated": "2024-11-22T18:30:00.000Z"
}
```

### POST /api/planifications

Sauvegarde/met à jour les planifications.

**Body** :
```json
{
  "subject": "Mathématiques",
  "grade": "PEI 3",
  "plans": [...]
}
```

**Réponse** :
```json
{
  "success": true,
  "key": "Mathématiques_PEI 3",
  "modified": 1,
  "lastUpdated": "2024-11-22T18:30:00.000Z"
}
```

### DELETE /api/planifications

Supprime une planification.

**Paramètres** :
- `subject` : Nom de la matière
- `grade` : Niveau de classe

## 🧪 Tests

### Test 1 : Vérifier la connexion MongoDB

1. Ouvrez la console du navigateur (F12)
2. Sélectionnez une matière et classe
3. Vous devriez voir dans la console :
   ```
   🔄 Chargement des plans depuis MongoDB pour Mathématiques - PEI 3
   ✅ X plan(s) chargé(s) depuis MongoDB
   ```

### Test 2 : Vérifier la synchronisation

1. **Ordinateur A** :
   - Connectez-vous avec "Mathématiques" + "PEI 3"
   - Créez 3 unités
   - Vérifiez dans la console : `✅ Plans sauvegardés avec succès dans MongoDB`

2. **Ordinateur B** (ou nouveau navigateur) :
   - Connectez-vous avec "Mathématiques" + "PEI 3"
   - Vous devriez voir les 3 mêmes unités !

### Test 3 : Vérifier le fallback localStorage

1. Déconnectez votre internet
2. Créez une planification
3. Vous devriez voir : `⚠️ Sauvegarde dans localStorage seulement (fallback)`
4. Reconnectez internet
5. Les données seront synchronisées automatiquement

## ❓ Dépannage

### Erreur : "MONGO_URL non définie"

**Solution** :
1. Vérifiez que `.env.local` existe et contient `MONGO_URL`
2. Sur Vercel, vérifiez les variables d'environnement
3. Re-déployez après avoir ajouté la variable

### Erreur : "Failed to load plans"

**Solution** :
1. Vérifiez votre connexion internet
2. Vérifiez que l'URL MongoDB est correcte
3. L'application utilisera localStorage comme fallback

### Les plans ne se synchronisent pas

**Solution** :
1. Ouvrez la console du navigateur (F12)
2. Recherchez des messages d'erreur
3. Vérifiez que les deux ordinateurs utilisent le même URL de production
4. Actualisez la page (F5)

### Erreur de connexion MongoDB

**Causes possibles** :
- URL MongoDB incorrecte
- Mot de passe expiré
- IP non autorisée dans MongoDB Atlas

**Solution** :
1. Connectez-vous à MongoDB Atlas
2. Vérifiez que l'IP `0.0.0.0/0` est autorisée (pour autoriser toutes les IPs)
3. Vérifiez que l'utilisateur `mohamedsherif` existe avec le bon mot de passe

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais commiter** le fichier `.env.local` dans Git
2. **Changer le mot de passe** MongoDB régulièrement
3. **Limiter les IPs** autorisées si possible (dans MongoDB Atlas)
4. **Créer un utilisateur** avec permissions limitées (lecture/écriture uniquement sur la DB `planpei`)

### Rotation du mot de passe

Si vous devez changer le mot de passe MongoDB :

1. Allez sur MongoDB Atlas
2. Database Access → Modifiez l'utilisateur `mohamedsherif`
3. Changez le mot de passe
4. Mettez à jour `MONGO_URL` dans `.env.local`
5. Mettez à jour la variable sur Vercel
6. Re-déployez

## 📊 Monitoring

### Vérifier l'utilisation MongoDB

1. Allez sur https://cloud.mongodb.com
2. Sélectionnez votre cluster `planpei`
3. Onglet **Metrics** pour voir :
   - Nombre de connexions
   - Utilisation de stockage
   - Requêtes par seconde

### Logs Vercel

1. Allez sur Vercel Dashboard
2. Sélectionnez le projet
3. Onglet **Logs** pour voir :
   - Requêtes API
   - Erreurs de connexion
   - Performance

## 🚀 Performance

### Optimisations actuelles

- ✅ **Connexion cachée** : Le client MongoDB est réutilisé entre les requêtes
- ✅ **Fallback localStorage** : Si MongoDB est lent, localStorage prend le relais
- ✅ **Index automatique** : MongoDB indexe automatiquement sur le champ `key`

### Recommandations futures

Si vous avez beaucoup d'enseignants et de planifications :

1. **Ajouter des index** sur `subject` et `grade`
2. **Implémenter un cache** avec Redis
3. **Pagination** si plus de 100 plans par matière/classe
4. **WebSockets** pour synchronisation en temps réel

## 📝 Changelog

### Version 2.0 (2024-11-22)

- ✅ Intégration MongoDB Atlas
- ✅ API Serverless Vercel
- ✅ Synchronisation multi-ordinateurs
- ✅ Fallback localStorage
- ✅ Logs détaillés dans console

### Version 1.0 (2024-11-21)

- ✅ localStorage uniquement (limité à un seul navigateur)

---

**Support** : Pour toute question, vérifiez d'abord la console du navigateur (F12) qui contient des logs détaillés.
