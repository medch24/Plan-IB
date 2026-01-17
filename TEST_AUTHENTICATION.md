# 🧪 Guide de Test - Système d'Authentification

## 🌐 URL de l'application

**Application en direct** : https://3001-iwdtdr9erlfh9xdnv7y3p-d0b9e1e2.sandbox.novita.ai

## 🔐 Identifiants de connexion

- **Login** : `Alkawthar`
- **Mot de passe** : `Alkawthar@7786`

## ✅ Scénarios de test

### 1. Test de connexion initiale

**Étapes** :
1. Ouvrir l'URL de l'application dans votre navigateur
2. Vous devez voir l'écran de connexion avec :
   - Logo Al-Kawthar
   - Titre "🔒 Connexion Sécurisée"
   - Champs "Nom d'utilisateur" et "Mot de passe"
3. Entrer les identifiants :
   - Login : `Alkawthar`
   - Mot de passe : `Alkawthar@7786`
4. Cliquer sur "Se connecter"

**Résultat attendu** :
- ✅ Animation de chargement pendant la connexion
- ✅ Redirection vers l'écran de sélection de module
- ✅ Affichage des deux modules : "📚 PEI Planner" et "📝 Examens & Évaluations"

### 2. Test de connexion avec identifiants incorrects

**Étapes** :
1. Sur l'écran de connexion, entrer des identifiants incorrects
2. Cliquer sur "Se connecter"

**Résultat attendu** :
- ❌ Message d'erreur rouge : "Identifiants incorrects. Veuillez réessayer."
- ❌ Animation de secousse du message d'erreur
- ❌ Reste sur l'écran de connexion

### 3. Test de persistance de session

**Étapes** :
1. Se connecter avec les bons identifiants
2. Naviguer vers un module (PEI Planner ou Examens)
3. Fermer complètement le navigateur
4. Rouvrir le navigateur et accéder à l'URL de l'application

**Résultat attendu** :
- ✅ **PAS de demande de reconnexion**
- ✅ Accès direct à l'écran de sélection de module
- ✅ La session est conservée

### 4. Test du bouton de déconnexion (Écran de sélection)

**Étapes** :
1. Se connecter avec succès
2. Sur l'écran de sélection de module, chercher le bouton "Déconnexion" en haut à droite
3. Cliquer sur le bouton "Déconnexion"
4. Confirmer la déconnexion dans la popup

**Résultat attendu** :
- ✅ Popup de confirmation : "Êtes-vous sûr de vouloir vous déconnecter ?"
- ✅ Après confirmation, retour à l'écran de connexion
- ✅ Session effacée (localStorage vidé)

### 5. Test du bouton de déconnexion (Dashboard)

**Étapes** :
1. Se connecter
2. Sélectionner "PEI Planner"
3. Choisir une matière et une classe
4. Dans le Dashboard, chercher le bouton de déconnexion (icône 🚪)
5. Cliquer sur le bouton de déconnexion

**Résultat attendu** :
- ✅ Retour à l'écran de connexion
- ✅ Session effacée
- ✅ Données de session (matière/classe) effacées

### 6. Test de navigation complète

**Étapes** :
1. Se connecter
2. Choisir "📚 PEI Planner"
3. Sélectionner une matière (ex: "Mathématiques")
4. Sélectionner une classe (ex: "PEI 3")
5. Cliquer sur "Accéder aux unités PEI"
6. Vérifier que le Dashboard s'affiche
7. Se déconnecter
8. Vérifier le retour à l'écran de connexion

**Résultat attendu** :
- ✅ Toutes les étapes fonctionnent sans erreur
- ✅ La déconnexion ramène à l'écran de connexion

## 🐛 Problèmes connus

- **Erreurs 403** : Des ressources externes (API Gemini, logo) peuvent générer des erreurs 403, mais cela n'affecte pas le fonctionnement de l'authentification
- Ces erreurs sont visibles uniquement dans la console du navigateur (F12)

## 📊 Vérification du localStorage

Pour vérifier que la session est bien stockée :

1. Ouvrir les DevTools du navigateur (F12)
2. Aller dans l'onglet "Application" > "Local Storage"
3. Sélectionner l'URL de l'application
4. Vérifier la présence de :
   - `isAuthenticated` : `true`
   - `authTimestamp` : date/heure de connexion

Après déconnexion, ces valeurs doivent être supprimées.

## 🎯 Checklist rapide

- [ ] L'écran de connexion s'affiche au premier lancement
- [ ] Les identifiants corrects permettent de se connecter
- [ ] Les identifiants incorrects affichent une erreur
- [ ] La session persiste après fermeture du navigateur
- [ ] Le bouton de déconnexion fonctionne sur l'écran de sélection
- [ ] Le bouton de déconnexion fonctionne dans le Dashboard
- [ ] Après déconnexion, on revient à l'écran de connexion
- [ ] Impossible d'accéder à l'application sans connexion

## 📝 Notes

- Le système est maintenant **ACTIF** sur la branche `main`
- Tous les changements sont committés et poussés sur GitHub
- L'application est accessible immédiatement à l'URL fournie ci-dessus

---

**Status** : ✅ Système d'authentification déployé et fonctionnel !
