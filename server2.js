var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;
//Salon
var room;

//db
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/tchat.db');

// db.serialize(function () {
//     // Database initialization
//     db.get("SELECT * FROM sqlite_master WHERE 'users' ",
//            function(err, rows) {
//       if(err !== null) {
//         console.log(err);
//       }
// //    db.run("CREATE TABLE USER");
// //    db.run("CREATE TABLE IF NOT EXISTS USER (id INT, mail VARCHAR(255), pseudo VARCHAR(255), room VARCHAR(255))");
// //    db.run("CREATE TABLE IF NOT EXISTS MESSAGES (id INT, message TEXT, room, user)");
//
//     var stmt = db.prepare("INSERT INTO users VALUES (?,?,?,?)");
//     for (var i = 0; i < 10; i++) {
//         var m = "mail " + i;
//         var pseudo = "pseudo " + i;
//         var room = "formation";
//         stmt.run(i, m, pseudo, room);
//     }
//     stmt.finalize();
//
//     db.each("SELECT * FROM users", function (err, row) {
//         console.log("User id : " + row.id, row.mail, row.pseudo, row.room);
//     });
// });
//
//
// db.close();

// app.get('/create/user/:pseudo', function (req, res) {
//   //    res.send('Hello World');
//       //    var  mail = req.params.mail;
//           var pseudo = req.params.pseudo;
//     db.serialize(function () {
//         // Database initialization
//         db.get("SELECT * FROM 'users' ",
//                 function (err, rows) {
//                     if (err !== null) {
//                         console.log(err);
//                     }
//                     var stmt = db.prepare("INSERT 'pseudo' INTO users VALUES (?)");
//                         stmt.run(pseudo);
//                     stmt.finalize();
//                     db.each("SELECT rowid AS id, info FROM lorem") {
//               //      db.each("SELECT * FROM users WHERE pseudo="+pseudo, function (err, row)) {
//                         console.log("User id : " + row.id, row.pseudo);
//                     });
//                 });
//     });
//     db.close();
// });


app.get('/test', function (req, res) {

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {

  db.run('CREATE TABLE lorem (info TEXT)');
  var stmt = db.prepare('INSERT INTO lorem VALUES (?)');

  for (var i = 0; i < 10; i++) {
    stmt.run('Ipsum ' + i);
  }

  stmt.finalize();

  db.each('SELECT rowid AS id, info FROM lorem', function(err, row) {
    console.log(row.id + ': ' + row.info);
  });
});

db.close();
});




/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.get('/chat/:channel', function (req, res) {
    var user = req.query.user;
    if (req.path !== "/room") {
        room = req.params.channel;
        res.redirect("/room?" + user);
    }
});
app.use('/room', express.static(__dirname + '/public'));

/**
 * Liste des utilisateurs connectés
 */
var users = [];

/*
 * L'objet messages
 */
var messages = {};

/**
 * Liste des utilisateurs en train de saisir un message
 */
var typingUsers = [];

io.on('connection', function (socket) {
    /**
     * Utilisateur connecté à la socket
     */
    var loggedUser;
    socket.room = room;
    socket.join(room);
    /*
     * Historique des message par salon
     */
    messages[room] = [];
    /**
     * Emission d'un événement "user-login" pour chaque utilisateur connecté
     */
    for (i = 0; i < users.length; i++) {
        socket.emit('user-login', users[i]);
    }
    /**
     * Emission d'un événement "chat-message" pour chaque message de l'historique
     */
    for (i = 0; i < messages[room].length; i++) {
//        if (messages[room][i].username !== undefined) {

        socket.in(socket.room).emit('chat-message', messages[room][i]);
//        } else {
//            socket.in(socket.room).emit('service-message', messages[room][i]);
//        }
    }

    /**
     * Déconnexion d'un utilisateur
     */
    socket.on('disconnect', function () {
        if (loggedUser !== undefined) {
            // Broadcast d'un 'service-message'
//            var serviceMessage = {
//                text: 'Utilisateur "' + loggedUser.username + '" déconnecté',
//                type: 'logout'
//            };
//            socket.broadcast.in(socket.room).emit('service-message', serviceMessage);
            // Suppression de la liste des connectés
            var userIndex = users.indexOf(loggedUser);
            if (userIndex !== -1) {
                users.splice(userIndex, 1);
            }
            // Ajout du message à l'historique
//            messages[room].push(serviceMessage);
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
            // Envoi et sauvegarde des messages de service
//            var userServiceMessage = {
//                text: 'Vous êtes connecté en tant que "' + loggedUser.username + '"',
//                type: 'login'
//            };
//            var broadcastedServiceMessage = {
//                text: 'Utilisateur "' + loggedUser.username + '" connecté',
//                type: 'login'
//            };
//            socket.emit('service-message', userServiceMessage);
//            socket.broadcast.to(socket.room).emit('service-message', broadcastedServiceMessage);
//            messages[room].push(broadcastedServiceMessage);
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
        messages[room].push(message);
//        console.log(messages);
        if (messages[room].length > 150) {
            messages[room].splice(0, 1);
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
http.listen(3000 || process.env.PORT, function () {
    console.log('Server is listening on *:3000');
});
