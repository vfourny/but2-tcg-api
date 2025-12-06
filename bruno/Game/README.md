# Game - Tests WebSocket

Tests pour le système de jeu multijoueur via WebSocket (Socket.io).

## ⚠️ Important : Socket.io et WebSocket

**Socket.io** utilise un protocole spécial au-dessus de WebSocket. Bruno supporte les WebSockets avec le type `ws`, mais Socket.io a son propre format de messages.

### Format des messages Socket.io

- **Connexion** : `ws://localhost:3001/socket.io/?EIO=4&transport=websocket`
- **Événements** : `42["nomEvenement", {...données...}]`
  - `42` = préfixe pour les événements
  - `["nom", data]` = tableau avec nom de l'événement et données

## 📋 Fichiers Bruno disponibles

### 0. Get Deck ID (Helper)
Requête HTTP pour récupérer votre deck ID.

### 1. Connect WebSocket
Connexion WebSocket au serveur Socket.io.

### 2. Create Room
Créer une nouvelle room de jeu.

### 3. Join Room
Rejoindre une room existante.

### 4. Draw Cards
Piocher jusqu'à 5 cartes.

### 5. Play Card
Placer un Pokemon sur le board.

### 6. Attack
Attaquer le Pokemon adverse.

## 🎮 Workflow avec Bruno

### Préparation

1. **Démarrer le serveur** : `npm run dev`

2. **Obtenir le token JWT** :
   ```
   Bruno → Auth/Sign In → Copier le token
   ```

3. **Obtenir le Deck ID** :
   ```
   Bruno → Game/0. Get Deck ID → Copier le deck ID
   ```

### Test avec 1 client (Debug)

1. **Ouvrir "1. Connect WebSocket"**
   - L'URL contient déjà les paramètres Socket.io
   - Cliquer sur "Connect"
   - Vous devriez voir des messages du serveur

2. **Créer une room** :
   - Ouvrir "2. Create Room"
   - Remplacer `REMPLACER_PAR_VOTRE_DECK_ID` par votre deck ID
   - Format du body : `42["createRoom",{"deckId":"xxx"}]`
   - Envoyer le message
   - Copier le roomId de la réponse

### Test avec 2 clients (Partie complète)

**Client 1 (Bruno) :**
1. Connect WebSocket
2. Create Room → Copier roomId
3. Attendre que le client 2 rejoigne

**Client 2 (HTML recommandé ou second Bruno) :**
1. Connect WebSocket (nouveau profil Bruno ou HTML)
2. Join Room avec le roomId

**Ensuite les deux :**
1. Draw Cards → `42["drawCards",{"roomId":"..."}]`
2. Play Card → `42["playCard",{"roomId":"...","cardIndex":0}]`
3. Attack → `42["attack",{"roomId":"..."}]`

## 🔧 Notes Techniques

### Authentification Socket.io

Le token JWT doit être passé lors de la connexion. Deux options :

**Option 1 : URL (peut ne pas fonctionner avec Bruno)**
```
ws://localhost:3001/socket.io/?EIO=4&transport=websocket&token={{token}}
```

**Option 2 : Via le handshake Socket.io (complexe)**

Si l'authentification échoue, vous verrez une erreur `Authentication error` dans les logs du serveur.

### Format des réponses

Les réponses du serveur commencent par :
- `0` = message de handshake
- `2` = ping
- `3` = pong
- `40` = connexion établie
- `42["event",{...}]` = événement

**Exemples de réponses :**
```
42["roomCreated",{"roomId":"uuid...","message":"Room créée..."}]
42["gameStarted",{"message":"...","gameState":{...}}]
42["gameStateUpdated",{"message":"...","gameState":{...}}]
42["error",{"message":"..."}]
```

## ⚠️ Limitation de Bruno avec Socket.io

Bruno supporte les WebSockets standards mais **Socket.io a un protocole complexe** :
- Handshake initial
- Messages ping/pong automatiques
- Format de message propriétaire
- Authentification via options de connexion

### Alternative Recommandée : Client HTML

Pour une expérience optimale, utilisez le **client HTML de test** :

```
test-game-client.html
```

Le client HTML gère automatiquement :
- ✅ Protocole Socket.io complet
- ✅ Authentification JWT
- ✅ Reconnexion automatique
- ✅ Interface graphique
- ✅ Logs en temps réel
- ✅ État du jeu visuel

## 🎯 Choix de la méthode

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **Bruno WebSocket** | Intégré à Bruno, pas besoin de navigateur | Protocole Socket.io complexe, auth difficile |
| **Client HTML** | Simple, visuel, protocole géré | Nécessite un navigateur |

**Recommandation** : Utilisez le **client HTML** pour tester, et Bruno pour les requêtes HTTP (Get Deck ID, Sign In).

## 📚 Documentation

- `GAME_SYSTEM.md` - Documentation complète du système
- `QUICK_START.md` - Guide de démarrage rapide
- `test-game-client.html` - Client HTML de test

## 🐛 Dépannage

### Bruno ne se connecte pas au WebSocket
- ✅ Vérifier que le serveur tourne
- ✅ Vérifier l'URL : `ws://localhost:3001/socket.io/?EIO=4&transport=websocket`
- ✅ Regarder les logs du serveur

### "Authentication error"
- ✅ Le token JWT n'est pas passé correctement
- ✅ Utilisez le client HTML qui gère l'auth automatiquement

### Messages incompréhensibles
- ✅ C'est normal, Socket.io utilise un format binaire/texte mixte
- ✅ Cherchez les messages commençant par `42["`
- ✅ Le reste sont des messages de contrôle (ping/pong/handshake)

### Pas de réponse aux événements
- ✅ Vérifier le format du message : `42["event",{...}]`
- ✅ Vérifier que les données JSON sont valides
- ✅ Regarder les logs du serveur pour les erreurs
