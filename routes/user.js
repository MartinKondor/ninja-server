const express = require("express");
const bcrypt = require("bcryptjs");
const userRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;
const wrongDBMsg = "Sorry! There is something wrong with our database.";


userRoutes.route("/user/settings").post((req, res, next) => {
  req
    .checkBody("id", "...")
    .isLength({ min: 3 });
  req
    .checkBody("first_name", "The First Name field cannot be empty.")
    .isLength({ min: 3 });
  req
    .checkBody("last_name", "The Last Name field cannot be empty.")
    .isLength({ min: 3 });
  req
    .checkBody("old_password", "You must type in your old Password to make changes happen.")
    .isLength({ min: 3 });

  const errors = req.validationErrors();
  if (errors) {
    return res.json({appStatus: 0, msg: errors[0].msg});
  }

  const updatedColumns = {
    first_name: req.body.first_name,
    last_name: req.body.last_name
  };

  if (req.body.new_password) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(req.body.new_password, salt, (err, hash) => {
        updatedColumns['new_password'] = hash;
      });
    });
  }

  let db_connect = dbo.getDb();
  db_connect
    .collection("user")
    .findOne({ _id: ObjectId(req.body.id) }, (err, result) => {
        if (err) {
          res.json({appStatus: 0, msg: wrongDBMsg});
          return next(err);
        } 
        if (!result) {
            res.json({appStatus: 0, msg: "No user found with these credentials"});
            return next(err);
        }
        else {
          const updateUser = (err) => {
            if (err) {
                res.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
            }
            return res.json({appStatus: 1});
          }
          const checkPwd = (err, isMatch) => {
              if (err) {
                res.json({appStatus: 0, msg: "Invalid password"});
                return next(err);
              }
              if (isMatch) {
                // Matched with the input password
                return db_connect
                  .collection("user")
                  .updateOne(
                    { _id: ObjectId(req.body.id) },
                    { $set: updatedColumns },
                    updateUser
                  );
              }
              else {
                res.json({appStatus: 0, msg: "Wrong password"});
              }
          };
          bcrypt.compare(req.body.old_password, result.password, checkPwd);
        }
        
    });
});

userRoutes.route("/user").get((req, res, next) => {
  let db_connect = dbo.getDb();
  db_connect
    .collection("user")
    .find({})
    .toArray(function (err, result) {
        if (err) {
          res.json({appStatus: 0, msg: wrongDBMsg});
          return next(err);
        } 
        res.json({appStatus: 1, ...result});
    });
});

userRoutes.route("/user/signin").post((req, res, next) => {
  req
    .checkBody("email", "The email field cannot be empty.")
    .isEmail();
  req
    .checkBody("password", "The password field cannot be empty.")
    .isLength({ min: 3 });

  let errors = req.validationErrors();
  if (errors) {
    return res.json({appStatus: 0, msg: errors[0].msg});
  }

  let db_connect = dbo.getDb();
  let myquery = { email: req.body.email };

  db_connect
    .collection("user")
    .findOne(myquery, (err, result) => {
      if (err) {
        res.json({appStatus: 0, msg: wrongDBMsg});
        return next(err);
      }

      // Check if passwords are the same
      db_connect
        .collection("user")
        .findOne({ email: req.body.email }, (err, result) => {
          if (err) {
            res.json({appStatus: 0, msg: "Wrong email or password"});
            return next(err);
          }
          if (!result) {
            res.json({appStatus: 0, msg: "No user found with this email"});
            return next(err);
          }

          const checkPwd = (err, isMatch) => {
              if (err) {
                res.json({appStatus: 0, msg: "Invalid email or password"});
                return next(err);
              }
              if (isMatch) {
                return res.json({appStatus: 1, token: result});
              }
              else {
                res.json({appStatus: 0, msg: "Wrong email or password"});
              }
          };
          bcrypt.compare(req.body.password, result.password, checkPwd);
        });

    });
});

// This section will help you create a new record.
userRoutes.route("/user/signup").post((req, response, next) => {
  req
    .checkBody("first_name", "The First Name field cannot be empty.")
    .isLength({ min: 3 });
  req
    .checkBody("last_name", "The Last Name field cannot be empty.")
    .isLength({ min: 3 });
  req
    .checkBody("password", "The Password field cannot be empty.")
    .isLength({ min: 3 });
  req
    .checkBody("password2", "The Second password field cannot be empty.")
    .isLength({ min: 3 });
  req
    .checkBody("email", "The Email field cannot be empty.")
    .isLength({ min: 3 })
    .isEmail();
  req
    .checkBody("birthday", "The Birthday field cannot be empty.")
    .isLength({ min: 8 });

  let errors = req.validationErrors();
  if (errors) {
    return response.json({appStatus: 0, msg: errors[0].msg});
  }
  if (req.body.password2 !== req.body.password) {
    return response.json({appStatus: 0, msg: "The two passwords must match"});
  }

  let db_connect = dbo.getDb();
  let newUser = {
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    password: req.body.password,
    email: req.body.email,
    birthday: req.body.birthday,
  };

  // Check if there is a user with this email
  db_connect
    .collection("user")
    .findOne({ email: newUser.email }, (err, res) => {
      if (err) {
        response.json({appStatus: 0, msg: wrongDBMsg});
        return next(err);
      }

      if (res) {  // There is a user registered with this email
        response.json({appStatus: 0, msg: "This email is already in use"});
      }
      else {  // No email found in the database

        const saveUserCallback = (err, hash) => {
          newUser.password = hash;

          // Save user
          db_connect
            .collection("user")
            .insertOne(newUser, (err, res) => {
              if (err) {
                response.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
              }
              response.json({appStatus: 1, ...res});
            });
        };

        // Save salt as password
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, saveUserCallback);
        });

      }
    });
});

// This section will help you update a record by id.
userRoutes.route("/user/update/:id").post((req, response, next) => {
  let db_connect = dbo.getDb(); 
  let myquery = { _id: ObjectId( req.params.id )}; 
  let newvalues = {   
    $set: {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      password: req.body.password,
      email: req.body.email,
      birthday: req.body.birthday,
    }, 
  }
  db_connect.collection("user").updateOne(myquery, newvalues, (err, res) => {
    if (err) {
      response.json({appStatus: 0, msg: wrongDBMsg});
      return next(err);
    }
    response.json({appStatus: 1});
  });
});


module.exports = userRoutes;
