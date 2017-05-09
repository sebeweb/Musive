var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;
//Salon
var room;

/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.get('/chat/:channel', function (req, res) {
    if (req.path !== "/room") {
        room = req.params.channel;
//        console.log(room);
        res.redirect("/room");
    }
});
app.use('/room', express.static(__dirname + '/public'));

/**
 * Liste des utilisateurs connectés
 */
var users = [];

/**
 * Historique des messages
 */
//var messages = [];

/*
 * L'objet messages 
 */
var msgs = {

};

/**
 * Liste des utilisateurs en train de saisir un message
 */
var typingUsers = [];

io.on('connection', function (socket) {
    /**
     * Utilisateur connecté à la socket
     */
    var loggedUser;
//    console.log(socket.handshake.url);
    socket.room = room;
    socket.join(room);
    /*
     * Historique des message par salon
     */
    msgs[room] = [];
//    console.log(usr);
//    console.log(socket.request);
    /**
     * Emission d'un événement "user-login" pour chaque utilisateur connecté
     */
//    for (i = 0; i < users.length; i++) {
//        console.log(users[i]);
//        socket.emit('user-login', users[i]);
//    }

    /** 
     * Emission d'un événement "chat-message" pour chaque message de l'historique
     */
    for (i = 0; i < msgs[room].length; i++) {
        if (msgs[room][i].username !== undefined) {

            socket.in(socket.room).emit('chat-message', msgs[room][i]);
        } else {
            socket.in(socket.room).emit('service-message', msgs[room][i]);
        }
    }

    /**
     * Déconnexion d'un utilisateur
     */
    socket.on('disconnect', function () {
        if (loggedUser !== undefined) {
            // Broadcast d'un 'service-message'
            var serviceMessage = {
                text: 'Utilisateur "' + loggedUser.username + '" déconnecté',
                type: 'logout'
            };
            socket.broadcast.in(socket.room).emit('service-message', serviceMessage);
            // Suppression de la liste des connectés
            var userIndex = users.indexOf(loggedUser);
            if (userIndex !== -1) {
                users.splice(userIndex, 1);
            }
            // Ajout du message à l'historique
            msgs[room].push(serviceMessage);
            // Emission d'un 'user-logout' contenant le user
            io.in(socket.room).emit('user-logout', loggedUser);
            // Si jamais il était en train de saisir un texte, on l'enlève de la liste
            var typingUserIndex = typingUsers.indexOf(loggedUser);
            if (typingUserIndex !== -1) {
                typingUsers.splice(typingUserIndex, 1);
            }
        }
    });

    /**
     * Connexion d'un utilisateur via le formulaire :
     */
    socket.on('user-login', function (user, callback) {
        // Vérification que l'utilisateur n'existe pas
        var userIndex = -1;
        for (i = 0; i < users.length; i++) {
            if (users[i].username === user.username) {
                userIndex = i;
            }
        }
        if (user !== undefined && userIndex === -1) { // S'il est bien nouveau
            // Sauvegarde de l'utilisateur et ajout à la liste des connectés
            loggedUser = user;
            users.push(loggedUser);
//            console.log(usr);
            // Envoi et sauvegarde des messages de service
            var userServiceMessage = {
                text: 'Vous êtes connecté en tant que "' + loggedUser.username + '"',
                type: 'login'
            };
            var broadcastedServiceMessage = {
                text: 'Utilisateur "' + loggedUser.username + '" connecté',
                type: 'login'
            };
            socket.emit('service-message', userServiceMessage);
            socket.broadcast.to(socket.room).emit('service-message', broadcastedServiceMessage);
            msgs[room].push(broadcastedServiceMessage);
//            console.log(loggedUser);
            io.emit('user-login', loggedUser);
            callback(true);
        } else {
            callback(false);
        }
    });

    /**
     * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
     */
    socket.on('chat-message', function (message) {
        // On ajoute le username au message et on émet l'événement
        message.username = loggedUser.username;
        io.in(socket.room).emit('chat-message', message);
        // Sauvegarde du message
        msgs[room].push(message);
        console.log(msgs);
        if (msgs[room].length > 150) {
            msgs[room].splice(0, 1);
        }
    });

    /**
     * Réception de l'événement 'start-typing'
     * L'utilisateur commence à saisir son message
     */
    socket.on('start-typing', function () {
        // Ajout du user à la liste des utilisateurs en cours de saisie
        if (typingUsers.indexOf(loggedUser) === -1) {
            typingUsers.push(loggedUser);
        }
        io.in(socket.room).emit('update-typing', typingUsers);
    });

    /**
     * Réception de l'événement 'stop-typing'
     * L'utilisateur a arrêter de saisir son message
     */
    socket.on('stop-typing', function () {
        var typingUserIndex = typingUsers.indexOf(loggedUser);
        if (typingUserIndex !== -1) {
            typingUsers.splice(typingUserIndex, 1);
        }
        io.in(socket.room).emit('update-typing', typingUsers);
    });
});

/**
 * Lancement du serveur en écoutant les connexions arrivant sur le port process.env.PORT
 */
http.listen(3000, process.env.PORT, function () {
    console.log('Server is listening on process.env.PORT');
});
