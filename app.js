var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var storyRouter = require("./routes/story");
var app = express();
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("", indexRouter);
app.use("", usersRouter);
app.use("", storyRouter);
const PORT = process.env.PORT || 5051;

app.listen(PORT, function () {
  console.log("Server is running!");
});
module.exports = app;
