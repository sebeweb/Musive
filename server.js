var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('newdata');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('musive.db');

db.serialize(function () {
  db.run("CREATE TABLE IF NOT EXISTS Utilisateur (col1, col2, col3)");

  db.run("INSERT INTO Utilisateur VALUES (Nom, Password, E-mail)", ['Niels', 'mot-passe', 'test@test.my']);
  db.run("INSERT INTO Test VALUES (?, ?, ?)", ['a2', 'b2', 'c2']);
  db.run("INSERT INTO Test VALUES (?, ?, ?)", ['a3', 'b3', 'c3']);

  db.each("SELECT * FROM Test", function (err, row) {
    console.log(row);
  });
});
db.close();

