require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const ws = require("ws");
const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);

const port = 4000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const wss = new ws.Server({ server });
wss.on("connection", (connection, req) => {
  console.log("New WebSocket connection");
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(";").find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
          if (err) throw err;
          console.log(userData);
          const { username, userId } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    console.log(messageData);
    const { recipient, text } = messageData;
    if (recipient && text) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
      });
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(JSON.stringify({ text, sender: connection.userId, recipient, id: messageDoc._id }))
        );
    }
  });

  //notify everyone about each client
  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({ userId: c.userId, username: c.username })),
      })
    );
  });
});

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

function connection() {
  try {
    mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to the Database");
  } catch (error) {
    console.log("Failed to connect to database" + error.message);
  }
}
connection();

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log(username);
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });
    jwt.sign({ userId: createdUser._id, username }, process.env.JWT_SECRET, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).status(201).json({
        id: createdUser._id,
      });
    });
  } catch (err) {
    if (err) throw err;
    res.status(500).json(err);
  }
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("no token");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign({ userId: foundUser._id, username }, process.env.JWT_SECRET, {}, (err, token) => {
        res.cookie("token", token).json({
          id: foundUser._id,
        });
      });
    }
  }
});
