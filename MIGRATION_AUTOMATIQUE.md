# 🔄 Migration Automatique localStorage → MongoDB

## 🎯 Fonctionnalité

Cette fonctionnalité migre **automatiquement** toutes les planifications existantes dans localStorage vers MongoDB dès qu'un utilisateur ouvre l'application.

### Pourquoi cette fonctionnalité ?

**Scénario** :
- Enseignant A a créé des planifications sur son ordinateur quand l'application utilisait localStorage
- L'application est maintenant mise à jour pour utiliser MongoDB
- Sans migration : Ces planifications resteraient bloquées sur l'ordinateur A
- **Avec migration** : Dès que l'enseignant A ouvre l'application, ses planifications sont automatiquement envoyées vers MongoDB et deviennent accessibles à tous !

---

## ⚙️ Comment ça fonctionne ?

### 1. Au démarrage de l'application

```javascript
// App.tsx - Au montage du composant
useEffect(() => {
  runMigration(); // Exécuté automatiquement
}, []);
```

### 2. Vérification du localStorage

```javascript
// Vérifie s'il y a des données à migrer
if (needsMigration()) {
  // Il y a des planifications locales
  migrateLocalStorageToMongoDB();
}
```

### 3. Migration intelligente

Pour chaque planification dans localStorage :

```
┌─────────────────────────────────────────┐
│ localStorage                            │
│ {                                       │
│   "Mathématiques_PEI 3": [6 plans],    │
│   "Sciences_PEI 2": [4 plans]          │
│ }                                       │
└─────────────────────────────────────────┘
           ↓ Migration automatique
┌─────────────────────────────────────────┐
│ 1. Extraire subject + grade            │
│    "Mathématiques" + "PEI 3"           │
│                                         │
│ 2. Vérifier si existe dans MongoDB     │
│    → Si OUI: ignorer (ne pas écraser)  │
│    → Si NON: migrer                    │
│                                         │
│ 3. Sauvegarder dans MongoDB            │
│    POST /api/planifications             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ MongoDB Atlas                           │
│ Planifications accessibles à TOUS !    │
└─────────────────────────────────────────┘
```

### 4. Règles de migration

✅ **Migré** :
- Planifications qui n'existent PAS dans MongoDB
- Planifications avec au moins 1 plan

⏭️ **Ignoré** :
- Planifications qui existent DÉJÀ dans MongoDB (évite les conflits)
- Planifications vides
- Clés localStorage invalides

❌ **Erreur** :
- Problème de connexion MongoDB
- Format de données invalide

---

## 📊 Logs dans la console

### Quand il y a des données à migrer

```
🔄 Vérification des données localStorage à migrer vers MongoDB...
📦 2 planification(s) trouvée(s) dans localStorage

🔄 Migration de Mathématiques_PEI 3 (6 plan(s))...
✅ Mathématiques_PEI 3 migré avec succès (6 plan(s))

🔄 Migration de Sciences_PEI 2 (4 plan(s))...
✅ Sciences_PEI 2 migré avec succès (4 plan(s))

📊 Résumé de la migration:
   ✅ Migrés: 2
   ❌ Erreurs: 0
   ⏭️ Ignorés: 0

✅ Migration réussie : 2 planification(s) migrée(s) vers MongoDB
📢 Ces données sont maintenant accessibles à tous les enseignants !
```

### Quand les données existent déjà dans MongoDB

```
🔄 Vérification des données localStorage à migrer vers MongoDB...
📦 1 planification(s) trouvée(s) dans localStorage

🔄 Migration de Mathématiques_PEI 3 (6 plan(s))...
ℹ️ Mathématiques_PEI 3 existe déjà dans MongoDB (6 plan(s)), ignoré

📊 Résumé de la migration:
   ✅ Migrés: 0
   ❌ Erreurs: 0
   ⏭️ Ignorés: 1
```

### Quand localStorage est vide

```
🔄 Vérification des données localStorage à migrer vers MongoDB...
ℹ️ Aucune donnée localStorage à migrer
✅ Aucune migration nécessaire (localStorage vide ou déjà migré)
```

---

## 🧪 Scénarios de test

### Test 1 : Migration de nouvelles données

**Préparation** :
1. Ouvrez la console du navigateur (F12)
2. Créez des planifications dans localStorage (via l'ancienne version)
   ```javascript
   localStorage.setItem('myp_shared_planifications', JSON.stringify({
     "Mathématiques_PEI 3": [
       { id: "1", subject: "Mathématiques", gradeLevel: "PEI 3", unitTitle: "Test" }
     ]
   }));
   ```

**Test** :
1. Actualisez la page
2. Observez les logs dans la console
3. **Résultat attendu** :
   - `✅ Migration réussie : 1 planification(s) migrée(s)`
   - Les données sont maintenant dans MongoDB

**Vérification** :
1. Ouvrez l'application sur un autre ordinateur
2. Sélectionnez "Mathématiques" + "PEI 3"
3. Vous devriez voir les plans migrés !

### Test 2 : Pas de duplication

**Préparation** :
1. Des planifications existent déjà dans MongoDB
2. Les mêmes planifications sont dans localStorage

**Test** :
1. Actualisez la page
2. Observez les logs

**Résultat attendu** :
- `ℹ️ Mathématiques_PEI 3 existe déjà dans MongoDB, ignoré`
- Aucune duplication
- Les données MongoDB ne sont PAS écrasées

### Test 3 : Migration partielle

**Préparation** :
1. localStorage contient 3 planifications
2. MongoDB contient déjà 1 de ces 3 planifications

**Test** :
1. Actualisez la page
2. Observez les logs

**Résultat attendu** :
```
✅ Migrés: 2
⏭️ Ignorés: 1
```

---

## 🔍 Code source

### Fonction principale : `migrateLocalStorageToMongoDB()`

**Fichier** : `services/databaseService.ts`

```typescript
export async function migrateLocalStorageToMongoDB(): Promise<{
  success: boolean;
  migrated: number;
  errors: number;
}> {
  // 1. Charger toutes les planifications localStorage
  const localPlanifications = loadSharedPlanifications();
  
  // 2. Pour chaque planification
  for (const key of Object.keys(localPlanifications)) {
    // 3. Extraire subject et grade
    const [subject, grade] = parseKey(key);
    
    // 4. Vérifier si existe déjà dans MongoDB
    const existingPlans = await loadPlansFromDatabase(subject, grade);
    
    if (existingPlans.length > 0) {
      // Déjà migré, ignorer
      continue;
    }
    
    // 5. Sauvegarder dans MongoDB
    await savePlansToDatabase(subject, grade, localPlanifications[key]);
  }
  
  return { success, migrated, errors };
}
```

### Déclenchement automatique : `App.tsx`

```typescript
// Au montage du composant (une seule fois)
useEffect(() => {
  const runMigration = async () => {
    if (needsMigration()) {
      const result = await migrateLocalStorageToMongoDB();
      console.log(`✅ ${result.migrated} planification(s) migrée(s)`);
    }
  };
  
  runMigration();
}, []);
```

---

## ⚠️ Points importants

### 1. Migration non destructive

- ✅ localStorage **n'est PAS vidé** après la migration
- ✅ Sert de backup en cas de problème MongoDB
- ✅ Les données restent accessibles localement

### 2. Priorité MongoDB

Quand des planifications existent dans MongoDB ET localStorage :
- **MongoDB a la priorité**
- localStorage sert uniquement de fallback si MongoDB est indisponible

### 3. Une seule migration par session

- La migration s'exécute **une seule fois** au démarrage
- Flag `migrationDone` empêche les migrations répétées
- Si vous actualisez la page, la migration re-vérifie mais n'envoie que les nouvelles données

### 4. Performance

- Migration **asynchrone** : N'bloque pas l'interface
- Exécutée en **arrière-plan** au chargement de l'application
- Les utilisateurs peuvent commencer à travailler immédiatement

---

## 🔧 Configuration

Aucune configuration requise ! La migration est **automatique** et **transparente**.

### Variables d'environnement nécessaires

Les mêmes que pour le système MongoDB :

```bash
GEMINI_API_KEY=votre_cle_gemini
MONGO_URL=mongodb+srv://mohamedsherif:Mmedch86@planpei.jcvu2uq.mongodb.net/?appName=PlanPEI
```

---

## 📈 Avantages

### Pour les utilisateurs

✅ **Zéro action requise** : Tout est automatique  
✅ **Pas de perte de données** : Les planifications locales sont préservées  
✅ **Partage instantané** : Les données deviennent accessibles à tous  
✅ **Backup automatique** : localStorage reste comme sauvegarde  

### Pour l'école

✅ **Transition en douceur** : De localStorage vers MongoDB sans interruption  
✅ **Récupération de données** : Toutes les planifications existantes sont conservées  
✅ **Collaboration immédiate** : Les enseignants peuvent collaborer sans recréer les planifications  

---

## ❓ FAQ

### Q : Que se passe-t-il si MongoDB est indisponible ?

**R** : La migration échoue silencieusement, mais l'application reste fonctionnelle avec localStorage. La migration sera réessayée au prochain démarrage.

### Q : Les données localStorage sont-elles supprimées après migration ?

**R** : Non ! localStorage reste intact et sert de backup.

### Q : Si j'ai des planifications différentes dans localStorage et MongoDB ?

**R** : MongoDB a la priorité. Les planifications localStorage ne sont migrées que si MongoDB ne contient rien pour cette matière/classe.

### Q : La migration ralentit-elle l'application ?

**R** : Non. La migration s'exécute en arrière-plan de manière asynchrone. L'interface reste réactive.

### Q : Puis-je forcer une nouvelle migration ?

**R** : Oui. Supprimez les planifications MongoDB et actualisez la page. localStorage sera migré à nouveau.

### Q : Comment voir le résultat de la migration ?

**R** : Ouvrez la console du navigateur (F12). Vous verrez des logs détaillés :
- Nombre de planifications migrées
- Nombre d'erreurs
- Nombre de planifications ignorées

---

## 🎉 Résultat

Cette fonctionnalité garantit que **toutes les planifications existantes** des enseignants sont automatiquement synchronisées vers MongoDB et deviennent accessibles à tous, **sans aucune intervention manuelle**.

C'est une transition en douceur de l'ancien système (localStorage) vers le nouveau système (MongoDB) tout en préservant toutes les données existantes !
