const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
// methods like GET won't have request body to pass jwt token
// we have to give authorization header to our request and jwt token is passed as (conti..)
// Bearer token
// let's verify jwt token sent by the user/client in server side
app.get("/books/", async (request, response) => {
  const authHeader = request.headers["authorization"]; //(using {authorization} gives an error in output)
  // console.log(authHeader) (just to play with the code)
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401); // 401 refers to unauthorized
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "asdfghjkl", async (error, payload) => {
      // incase jwt token is valid..then the corresponding payload is passed
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        const getBooksQuery = `
            SELECT
                *
            FROM
                book
            ORDER BY
                book_id;`;
        const booksArray = await db.all(getBooksQuery);
        response.send(booksArray);
      }
    });
  }
});

// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
// check if user exists or not
// verify password
// generate jwt token

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwToken = jwt.sign(payload, "asdfghjkl");
      response.send({ jwToken }); //with this we'll get jwtoken as response when we sent req
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
