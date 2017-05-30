var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;
//var id = 1;
var idUser;
//Salon
var room;
//db
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/chat.db');
/*
 * L'objet messages
 */
var messages = {};

db.serialize(function () {
    // Database initialization
//     db.get("SELECT * FROM sqlite_master WHERE 'users' ",
//            function(err, rows) {
//       if(err !== null) {
//         console.log(err);
//       }
//            db.run("CREATE TABLE USER");
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY ,pseudo VARCHAR(255), mail VARCHAR(255))");
    db.run("CREATE TABLE IF NOT EXISTS chat_message (id INTEGER PRIMARY KEY AUTOINCREMENT, id_users integer, messages TEXT,heure TIMESTAMP,id_formation integer, FOREIGN KEY(id_users) REFERENCES users ( id ))");
    db.run("CREATE TABLE IF NOT EXISTS formation (id INTEGER PRIMARY KEY AUTOINCREMENT,id_users	integer,numero_formation integer,FOREIGN KEY(id) REFERENCES chat_message ( id_formation ))");
//CREATE TABLE sqlite_sequence(name,seq)

});
//
//
// db.close();

//app.get('/create/user/:pseudo', function (req, res) {
//          var  mail = req.params.mail;
//          var pseudo = req.params.pseudo;
//    db.serialize(function () {
//        // Database initialization
//        db.get("SELECT * FROM 'users' ",
//                function (err, rows) {
//                    if (err !== null) {
//                        console.log(err);
//                    }
//                    var stmt = db.prepare("INSERT 'mail' INTO users VALUES (?)");
//                        stmt.run(mail);
//                    stmt.finalize();
//                    db.each("SELECT * FROM users WHERE mail="+mail, function (err, row) {
//                        console.log("User id : " + row.id, row.mail, row.pseudo, row.room);
//                    });
//                });
//    });
//    db.close();
//});

app.get('/create/user/:mail', function (req, res) {
//app.get('/create/user/', function (req, res) {
    var mail = req.params.mail;
//    var mail = req.query.mail;
    db.serialize(function () {
        var getUser = db.prepare("SELECT * FROM 'users' WHERE mail=(?)");
        getUser.get(mail, function (err, row) {
            //si le mail n'existe pas on la créer et on se connect au chat
            if (row === undefined) {
                console.log("undefined");
                var stmt = db.prepare("INSERT INTO users(mail) VALUES (?)");
                stmt.run(mail);
                stmt.finalize();
//                redirect create pseudo
                res.redirect("/create/user/" + mail);
                //sinon on se connect au chat
            } else {
//                res.redirect("/chat/?user=" + row.pseudo);
                idUser = row.id;
                console.log("User id : " + row.id, row.mail, row.pseudo);
            }
        });
        getUser.finalize();
    });
});

app.get('/add/message/', function (req, res) {
    var msg = req.query.msg;
    console.log(msg);
    if (msg != '') {
//        console.log();
        db.serialize(function () {
            var stmt = db.prepare("INSERT INTO chat_message(id_users, messages,  heure, id_formation) VALUES (?, ?, ?, ?)");
            var date = new Date();
            stmt.run(idUser, msg.text, date, room);
            stmt.finalize();
        });
    }
    res.redirect("/get/messages/");
});

app.get('/get/messages/', function (req, res) {
    db.all("SELECT * FROM chat_message INNER JOIN users ON chat_message.id_users = users.id  WHERE id_formation =" + room, function (err, rows) {
        if (messages[room].length == 0) {
            res.send(rows);
        } else {
            res.writeHead(200);
            res.end('done');
        }
    });
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
/**
 * Liste des utilisateurs en train de saisir un message
 */
var typingUsers = [];
io.on('connection', function (socket, req) {
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
    console.log(room);

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
        console.log(messages[room][i] + "ko");
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
            console.log(users[i].username);
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
//        req. = message.text;
        message.username = loggedUser.username;
//        console.log();
        io.in(socket.room).emit('chat-message', messages[room]);
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
http.listen(process.env.PORT || 5000, function () {
    console.log('Server is listening on process.env.PORT');
});
