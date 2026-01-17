# 🔒 Système d'Authentification

## Vue d'ensemble

Le système d'authentification a été ajouté pour sécuriser l'accès à la plateforme pédagogique Al-Kawthar. Les utilisateurs doivent maintenant se connecter avant d'accéder aux modules PEI Planner ou Examens.

## Identifiants de connexion

**Login**: `Alkawthar`  
**Mot de passe**: `Alkawthar@7786`

## Fonctionnalités

### ✅ Connexion persistante
- Une fois connecté, l'utilisateur reste connecté même après fermeture du navigateur
- La session est stockée de manière sécurisée dans le localStorage
- Aucune reconnexion nécessaire à chaque visite

### 🚪 Déconnexion
- Bouton de déconnexion disponible sur l'écran de sélection de module
- Bouton de déconnexion également présent dans le Dashboard
- Confirmation requise avant déconnexion pour éviter les clics accidentels
- La déconnexion efface complètement la session

### 🔐 Sécurité
- Les identifiants sont vérifiés côté client
- La session est horodatée pour traçabilité
- Interface utilisateur moderne et responsive
- Messages d'erreur clairs en cas d'échec de connexion

## Architecture

### Composants

1. **AuthenticationScreen** (`components/AuthenticationScreen.tsx`)
   - Écran de connexion principal
   - Gère la validation des identifiants
   - Stocke la session dans localStorage
   - Animation et feedback visuel

2. **App.tsx** (modifié)
   - Vérifie l'authentification au démarrage
   - Redirige vers AuthenticationScreen si non authentifié
   - Gère la déconnexion globale

3. **LoginScreen.tsx** (modifié)
   - Ajout du bouton de déconnexion
   - Permet de se déconnecter avant de choisir un module

### Flux d'authentification

```
Démarrage de l'application
    ↓
Vérification de la session (localStorage)
    ↓
┌─────────────────────────┬──────────────────────────┐
│ Session valide          │ Pas de session           │
│     ↓                   │     ↓                    │
│ Aller à LoginScreen     │ Afficher                 │
│ (sélection module)      │ AuthenticationScreen     │
└─────────────────────────┴──────────────────────────┘
```

### Stockage de la session

```javascript
// Après connexion réussie
localStorage.setItem('isAuthenticated', 'true');
localStorage.setItem('authTimestamp', new Date().toISOString());

// Lors de la déconnexion
localStorage.removeItem('isAuthenticated');
localStorage.removeItem('authTimestamp');
```

## Améliorations futures possibles

1. **Authentification backend**
   - Déplacer la validation des identifiants vers un serveur sécurisé
   - Utiliser des tokens JWT pour plus de sécurité
   - Implémenter un système de refresh tokens

2. **Gestion multi-utilisateurs**
   - Différents rôles (enseignant, coordinateur, admin)
   - Historique des connexions
   - Gestion des permissions par module

3. **Sécurité renforcée**
   - Hash des mots de passe
   - Rate limiting pour éviter les attaques par force brute
   - Expiration automatique des sessions après X jours

4. **Fonctionnalités supplémentaires**
   - Récupération de mot de passe
   - Changement de mot de passe
   - Authentification à deux facteurs (2FA)

## Notes techniques

- Les identifiants sont actuellement stockés en dur dans le composant
- Pour une production réelle, ils devraient être gérés côté serveur
- Le système utilise localStorage qui persiste entre les sessions
- Compatible avec tous les navigateurs modernes

## Support

Pour toute question concernant l'authentification, contactez l'équipe technique Al-Kawthar.
