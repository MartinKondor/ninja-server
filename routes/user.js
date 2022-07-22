const express = require("express");
const bcrypt = require("bcryptjs");
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;
const { wrongDBMsg, wrongUserIdMsg } = require("./_utils");
const userRoutes = express.Router();


userRoutes.route("/user/settings").post((req, res, next) => {
  req.checkBody("id", wrongUserIdMsg)
    .isLength({ min: 3 });
  req.checkBody("first_name", "The First Name field cannot be empty.")
    .isLength({ min: 3 });
  req.checkBody("last_name", "The Last Name field cannot be empty.")
    .isLength({ min: 3 });
  req.checkBody("old_password", "You must type in your old Password to make changes happen.")
    .isLength({ min: 3 });

  const errors = req.validationErrors();
  if (errors) {
    return res.json({appStatus: 0, msg: errors[0].msg});
  }

  const updatedColumns = {
    first_name: req.body.first_name,
    last_name: req.body.last_name
  };

  // Get the hash for the new password
  if (req.body.new_password) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(req.body.new_password, salt, (err, hash) => {
        updatedColumns['new_password'] = hash;
      });
    });
  }

  const db = dbo.getDb();
  db.collection("user")
    .findOne({ _id: new ObjectId(req.body.id) }, (err, foundUser) => {
        if (err) {
          return res.json({appStatus: 0, msg: wrongDBMsg});
        } 
        if (!foundUser) {
          return res.json({appStatus: 0, msg: "No user found with these credentials"});
        }
        else {
          
          const updateUserCallback = (err) => {
            if (err) {
              return res.json({appStatus: 0, msg: wrongDBMsg});
            }
            return res.json({appStatus: 1, msg: "Changes successfully saved!"});
          }

          const checkPwd = (err, isMatch) => {
              if (err) {
                res.json({appStatus: 0, msg: "Invalid password"});
                return next(err);
              }
              if (isMatch) {

                // Matched with the input password
                return db
                  .collection("user")
                  .updateOne(
                    { _id: new ObjectId(req.body.id) },
                    { $set: updatedColumns },
                    updateUserCallback
                  );
              }
              else {
                res.json({appStatus: 0, msg: "Wrong password"});
              }
          };

          return bcrypt.compare(req.body.old_password, foundUser.password, checkPwd);
        }
        
    });
});

userRoutes.route("/user").post((req, res, next) => {
  req.checkBody("id", wrongUserIdMsg)
    .isLength({ min: 3 });
  
  const errors = req.validationErrors();
  if (errors) {
    return res.json({appStatus: 0, msg: errors[0].msg});
  }

  const db = dbo.getDb();
  db.collection("user")
    .findOne({ _id: new ObjectId(req.body.id) }, (err, foundUser) => {
      if (err) {
        return res.json({appStatus: 0, msg: wrongDBMsg});
      } 
      return res.json({appStatus: 1, result: foundUser});
  });
});

userRoutes.route("/user/signin").post((req, res, next) => {
  req.checkBody("email", "The email field cannot be empty.")
    .isEmail();
  req.checkBody("password", "The password field cannot be empty.")
    .isLength({ min: 3 });

  const errors = req.validationErrors();
  if (errors) {
    return res.json({appStatus: 0, msg: errors[0].msg});
  }

  const db = dbo.getDb();
  const userQuery = { email: req.body.email };

  db.collection("user")
    .findOne(userQuery, (err, result) => {
      if (err) {
        return res.json({appStatus: 0, msg: wrongDBMsg});
      }

      // Check if passwords are the same
      db
        .collection("user")
        .findOne(userQuery, (err, result) => {
          if (err || !result) {
            return res.json({appStatus: 0, msg: "Wrong email or password"});
          }

          const checkPwdCallback = (err, isMatch) => {
              if (err) {
                return res.json({appStatus: 0, msg: "Invalid email or password"});
              }
              if (isMatch) {
                return res.json({appStatus: 1, token: result});
              }
              else {
                return res.json({appStatus: 0, msg: "Wrong email or password"});
              }
          };

          bcrypt.compare(req.body.password, result.password, checkPwdCallback);
        });

    });
});

// This section will help you create a new record.
userRoutes.route("/user/signup").post((req, response, next) => {
  req.checkBody("first_name", "The First Name field cannot be empty.")
    .isLength({ min: 3 });
  req.checkBody("last_name", "The Last Name field cannot be empty.")
    .isLength({ min: 3 });
  req.checkBody("password", "The Password field cannot be empty.")
    .isLength({ min: 3 });
  req.checkBody("password2", "The Second password field cannot be empty.")
    .isLength({ min: 3 });
  req.checkBody("email", "The Email field cannot be empty.")
    .isLength({ min: 3 })
    .isEmail();
  req.checkBody("birthday", "The Birthday field cannot be empty.")
    .isLength({ min: 8 });

  const errors = req.validationErrors();
  if (errors) {
    return response.json({appStatus: 0, msg: errors[0].msg});
  }
  if (req.body.password2 !== req.body.password) {
    return response.json({appStatus: 0, msg: "The two passwords must match"});
  }

  const db = dbo.getDb();
  let newUser = {
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    password: req.body.password,
    email: req.body.email,
    birthday: req.body.birthday,
  };

  // Check if there is a user with this email
  db.collection("user")
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
          db
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

module.exports = userRoutes;
