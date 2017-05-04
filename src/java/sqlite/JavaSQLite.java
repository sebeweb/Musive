package java.sqlite;

import java.sql.*;


public class JavaSQLite {

    /**
     * @param args the command line arguments
     */
    
    private Statement etat = null;
    
    
    public static void main(String[] args) {
        
        creerTable();
        
        
                
    }
    
    public static void creerTable(){
        
        Connection c = null;
        Statement stat = null;
        
        try{
            
            Class.forName("org.sqlite.JDBC");
            c = DriverManager.getConnection("jdbc:sqlite:chat.db");
            System.out.println("Connexion réussie");
            stat = c.createStatement();
            
            String commandeSQL;
            
            commandeSQL = "CREATE TABLE CHAT" +
                          "(ID INTEGER PRIMARY KEY  AUTOINCREMENT, " +
                          "PSEUDO     TEXT    NOT NULL, " +
                          "MESSAGES     TEXT    NOT NULL);"
                          ;
            
            stat.executeUpdate(commandeSQL);
            stat.close();
            c.close();
            
        }catch(Exception e)
        {
            
            System.out.println("Création de la table impossible : " + e.getMessage());
            
        }
        
        System.out.println("La création de la table s'est effectuée avec succès");
        
    }
}
