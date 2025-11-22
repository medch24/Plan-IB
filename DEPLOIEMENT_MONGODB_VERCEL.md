# 🚀 Déploiement sur Vercel avec MongoDB

## 📋 Prérequis

- ✅ Compte GitHub avec le code poussé
- ✅ Compte Vercel (gratuit) : https://vercel.com
- ✅ Compte MongoDB Atlas (gratuit) : https://cloud.mongodb.com
- ✅ URL MongoDB fournie : `mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI`
- ✅ Clé API Google Gemini

---

## 🎯 Étape 1 : Vérifier MongoDB Atlas

### 1.1 Connexion à MongoDB Atlas

1. Allez sur https://cloud.mongodb.com
2. Connectez-vous avec votre compte
3. Sélectionnez le cluster **planpei**

### 1.2 Vérifier l'utilisateur

1. Sidebar → **Database Access**
2. Vérifiez que l'utilisateur `mohamedsherif` existe
3. Rôle : `Read and write to any database`
4. Si besoin de changer le mot de passe :
   - Cliquez sur **EDIT**
   - Edit Password → `Mmedch86` (ou nouveau mot de passe)
   - Update User

### 1.3 Autoriser toutes les IPs (Important !)

1. Sidebar → **Network Access**
2. Cliquez sur **ADD IP ADDRESS**
3. Sélectionnez **ALLOW ACCESS FROM ANYWHERE**
   - IP Address : `0.0.0.0/0`
   - Comment : `Vercel Serverless Functions`
4. Cliquez sur **Confirm**

> ⚠️ **Important** : Vercel utilise des IPs dynamiques, donc nous devons autoriser `0.0.0.0/0`

### 1.4 Vérifier la connexion string

Votre URL de connexion devrait être :
```
mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI
```

Format expliqué :
- `mongodb+srv://` : Protocole MongoDB avec SRV
- `mohamedsherif:Mmedch86` : Username:Password
- `@planpei.jcvu2uq.mongodb.net` : Cluster hostname
- `?appName=PlanPEI` : Nom de l'application

---

## 🎯 Étape 2 : Configurer Vercel

### 2.1 Connexion à Vercel

1. Allez sur https://vercel.com
2. Cliquez sur **Sign Up** ou **Log In**
3. Connectez-vous avec GitHub

### 2.2 Importer le projet depuis GitHub

1. Dashboard Vercel → Cliquez sur **Add New... → Project**
2. Sélectionnez votre repository GitHub : **Plan-IB**
3. Cliquez sur **Import**

### 2.3 Configurer le projet

**Framework Preset** : Vite (devrait être détecté automatiquement)

**Build and Output Settings** :
- Build Command : `npm run build`
- Output Directory : `dist`
- Install Command : `npm install`

**Root Directory** : `.` (racine)

### 2.4 ⚠️ IMPORTANT : Configurer les variables d'environnement

**AVANT de déployer**, cliquez sur **Environment Variables** :

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `GEMINI_API_KEY` | `votre_cle_gemini_ici` | Production, Preview, Development |
| `MONGO_URL` | `mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI` | Production, Preview, Development |

**Comment ajouter** :
1. Key : `GEMINI_API_KEY`
2. Value : Collez votre clé Gemini
3. Cochez : ☑ Production ☑ Preview ☑ Development
4. Cliquez sur **Add**

5. Key : `MONGO_URL`
6. Value : `mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI`
7. Cochez : ☑ Production ☑ Preview ☑ Development
8. Cliquez sur **Add**

### 2.5 Déployer

1. Vérifiez que les 2 variables sont bien ajoutées
2. Cliquez sur **Deploy**
3. Attendez 2-3 minutes pendant le build et déploiement

---

## 🎯 Étape 3 : Vérifier le déploiement

### 3.1 Accéder à l'application

Une fois le déploiement terminé :

1. Vercel affiche **Congratulations! 🎉**
2. Cliquez sur **Visit** ou copiez l'URL (ex: `https://plan-ib.vercel.app`)
3. Ouvrez l'URL dans votre navigateur

### 3.2 Tester la connexion MongoDB

1. Ouvrez l'application
2. Ouvrez la Console du navigateur (F12)
3. Sélectionnez une matière et classe
4. Vous devriez voir dans la console :
   ```
   🔄 Chargement des plans depuis MongoDB pour Mathématiques - PEI 3
   ✅ X plan(s) chargé(s) depuis MongoDB
   ```

Si vous voyez `❌ Erreur`, passez à l'étape de dépannage.

### 3.3 Tester la synchronisation multi-ordinateurs

**Test complet** :

1. **Ordinateur A** :
   - Ouvrez `https://plan-ib.vercel.app`
   - Sélectionnez "Mathématiques" + "PEI 3"
   - Créez 3 unités
   - Vérifiez la console : `✅ Plans sauvegardés avec succès dans MongoDB`

2. **Ordinateur B** (ou nouveau navigateur) :
   - Ouvrez la même URL `https://plan-ib.vercel.app`
   - Sélectionnez "Mathématiques" + "PEI 3"
   - **Vous devriez voir les 3 mêmes unités !**
   - Console : `✅ 3 plan(s) chargé(s) depuis MongoDB`

✅ **Si vous voyez les mêmes unités** → La synchronisation fonctionne !

---

## 🎯 Étape 4 : Vérifier les logs Vercel

### 4.1 Accéder aux logs

1. Dashboard Vercel → Votre projet **Plan-IB**
2. Onglet **Deployments**
3. Cliquez sur le dernier déploiement
4. Onglet **Functions**

### 4.2 Vérifier les API Functions

Vous devriez voir :
- `/api/planifications` → Serverless Function

Cliquez dessus pour voir :
- Invocations (nombre d'appels)
- Errors (erreurs éventuelles)
- Logs (logs détaillés)

### 4.3 Vérifier les erreurs

Si erreurs dans les logs :
- Vérifiez que `MONGO_URL` est bien configurée
- Vérifiez que MongoDB Atlas autorise `0.0.0.0/0`
- Vérifiez que l'utilisateur MongoDB existe

---

## 🔧 Dépannage

### ❌ Erreur : "MONGO_URL non définie"

**Cause** : Variable d'environnement manquante

**Solution** :
1. Vercel Dashboard → Projet → Settings
2. Environment Variables
3. Vérifiez que `MONGO_URL` existe
4. Si manquante, ajoutez-la
5. Redéployez : Deployments → ... → Redeploy

### ❌ Erreur : "Failed to connect to MongoDB"

**Cause 1** : URL MongoDB incorrecte

**Solution** :
1. Vérifiez l'URL dans les variables Vercel
2. Format doit être : `mongodb+srv://username:password@cluster.mongodb.net/?appName=PlanPEI`
3. Pas d'espaces, pas de caractères spéciaux non-encodés

**Cause 2** : IP non autorisée dans MongoDB Atlas

**Solution** :
1. MongoDB Atlas → Network Access
2. Vérifiez que `0.0.0.0/0` est autorisé
3. Si non, ajoutez-le (voir Étape 1.3)

**Cause 3** : Utilisateur MongoDB incorrect

**Solution** :
1. MongoDB Atlas → Database Access
2. Vérifiez que `mohamedsherif` existe
3. Vérifiez le mot de passe : `Mmedch86`
4. Si besoin, réinitialisez le mot de passe

### ❌ Erreur : "Authentication failed"

**Cause** : Mot de passe MongoDB incorrect

**Solution** :
1. MongoDB Atlas → Database Access → Edit User
2. Changez le mot de passe
3. Mettez à jour `MONGO_URL` dans Vercel avec le nouveau mot de passe
4. Redéployez

### ⚠️ Warning : "Fallback to localStorage"

**Cause** : MongoDB temporairement indisponible

**Solution** :
- C'est normal ! L'application utilise localStorage comme backup
- Les données seront synchronisées quand MongoDB reviendra
- Vérifiez MongoDB Atlas Status : https://status.mongodb.com

### 🔍 Debug avancé

Pour voir les logs détaillés :

1. Vercel Dashboard → Projet → Deployments
2. Cliquez sur le dernier déploiement
3. Onglet **Runtime Logs**
4. Filtrez par `/api/planifications`
5. Cherchez les erreurs MongoDB

---

## 🎛️ Configuration avancée

### Changer le nom de la base de données

Par défaut : `planpei`

Pour changer :

1. Éditez `api/planifications.ts` :
   ```typescript
   const DB_NAME = 'votre_nom_de_db';
   ```

2. Commit et push vers GitHub
3. Vercel redéploiera automatiquement

### Ajouter des index MongoDB

Pour améliorer les performances :

1. MongoDB Atlas → Votre cluster → Collections
2. Sélectionnez la collection `planifications`
3. Onglet **Indexes**
4. Cliquez sur **CREATE INDEX**
5. Index sur `key` :
   ```json
   { "key": 1 }
   ```
6. Options : Unique index ☑
7. Create Index

### Activer MongoDB Monitoring

1. MongoDB Atlas → Votre cluster
2. Onglet **Metrics**
3. Vous verrez :
   - Connexions actives
   - Opérations par seconde
   - Utilisation réseau
   - Utilisation stockage

---

## 📊 Monitoring de production

### Métriques Vercel

Dashboard Vercel → Projet → Analytics :
- Page views
- Visitor count
- Performance metrics
- API calls

### Métriques MongoDB

MongoDB Atlas → Cluster → Metrics :
- Connections
- Operations per second
- Network traffic
- Storage usage

### Alertes

**Configurer des alertes** :

1. MongoDB Atlas → Alerts
2. Configure Alert
3. Conditions :
   - Connexions > 100
   - Opérations > 1000/sec
   - Stockage > 500MB
4. Email de notification

---

## 🔒 Sécurité en production

### ✅ Checklist sécurité

- [ ] Variables d'environnement configurées sur Vercel
- [ ] Pas de secrets dans le code GitHub
- [ ] `.env.local` dans `.gitignore`
- [ ] MongoDB Network Access configuré
- [ ] Utilisateur MongoDB avec permissions minimales
- [ ] HTTPS activé (automatique sur Vercel)
- [ ] CORS configuré dans l'API

### Rotation des credentials

**Tous les 3-6 mois** :

1. **Changer le mot de passe MongoDB** :
   - MongoDB Atlas → Database Access → Edit User
   - Nouveau mot de passe

2. **Mettre à jour Vercel** :
   - Settings → Environment Variables
   - Edit `MONGO_URL` avec nouveau password
   - Redeploy

3. **Mettre à jour `.env.local`** (dev local) :
   - Modifier `MONGO_URL`
   - Redémarrer le serveur dev

---

## 🎉 Déploiement réussi !

Si vous avez suivi toutes les étapes :

✅ Application déployée sur Vercel  
✅ MongoDB Atlas connecté  
✅ Synchronisation multi-ordinateurs fonctionnelle  
✅ Variables d'environnement configurées  
✅ Logs et monitoring activés  

**URL de production** : `https://plan-ib.vercel.app` (ou votre domaine custom)

### Partager l'application

Vous pouvez maintenant partager l'URL avec tous les enseignants :
- Ils peuvent tous accéder à la même application
- Les planifications sont synchronisées entre tous
- Chaque enseignant voit le travail des autres

---

## 📞 Support

**En cas de problème** :

1. Consultez les logs :
   - Console du navigateur (F12)
   - Vercel Runtime Logs
   - MongoDB Atlas Logs

2. Vérifiez la documentation :
   - `CONFIGURATION_MONGODB.md`
   - `MIGRATION_MONGODB_RESUME.md`

3. Vérifiez les status :
   - Vercel Status : https://www.vercel-status.com
   - MongoDB Status : https://status.mongodb.com

---

**🚀 Votre application PEI Planner est maintenant en production avec synchronisation MongoDB !**
