const express = require("express");
const groupRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;
const wrongDBMsg = "Sorry! There is something wrong with our database.";


const addGroup = (db_connect, ids, callback) => {
    const group = {
        name: "",
        users: ids,
        is_open: false,
        is_active: false
    };

    // Is there a group like this?
    return db_connect
        .collection("group")
        .findOne(group, (err, res) => {
            if (!res) {
                return db_connect
                    .collection("group")
                    .insertOne(group, callback);
            }
            else {
                // TODO tell that there is already a group
            }
        });
};

const getUserByEmail = (db_connect, email, callback) => {
    return db_connect
        .collection("user")
        .findOne({ email: email }, callback);
};

const getUserById = (db_connect, id, callback) => {
    return db_connect
        .collection("user")
        .findOne({ _id: id }, callback);
};

groupRoutes.route("/group").post((req, res, next) => {
    let db_connect = dbo.getDb();
    db_connect
        .collection("group")
        .find({users: { $in: [ObjectId(req.body.id)] }})
        .toArray((err, result) => {
            if (err) {
                res.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
            } 
            return res.json({appStatus: 1, result: result.map((e) => {
                return getUserById(db_connect, e._id, (err, result2) => {
                    console.log(result2);

                    if (err || !result2) {
                        return null;
                    }
                    return result2;
                });
            })});
        });
});

groupRoutes.route("/group/add_friend").post((req, res, next) => {
    req
        .checkBody("email", "The Email field cannot be empty.")
        .isLength({ min: 3 });

    let errors = req.validationErrors();
    if (errors) {
        return response.json({appStatus: 0, msg: errors[0].msg});
    }

    let db_connect = dbo.getDb();
    return db_connect
        .collection("group")
        .findOne({users: { $in: [req.body.email, req.body.other_email] }}, (err, result) => {
            if (err) {
                res.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
            }
            if (result) {
                return res.json({appStatus: 0, msg: "You are already friends!"});
            }
            return getUserByEmail(db_connect, req.body.email, (err, u1) => {
                if (err) {
                    res.json({appStatus: 0, msg: wrongDBMsg});
                    return next(err);
                }
                if (!u1) {
                    return res.json({appStatus: 0, msg: "The given email is not registered"});
                }
                return getUserByEmail(db_connect, req.body.other_email, (err, u2) => {
                    if (err) {
                        res.json({appStatus: 0, msg: wrongDBMsg});
                        return next(err);
                    }
                    if (!u2) {
                        return res.json({appStatus: 0, msg: "The given email is not registered"});
                    }

                    // Found both ids
                    return addGroup(db_connect, [ObjectId(u1._id), ObjectId(u2._id)], (err, result) => {
                        if (err) {
                            res.json({appStatus: 0, msg: wrongDBMsg});
                            return next(err);
                        }
                        return res.json({appStatus: 1, msg: "You've successfully sent the friend request"});
                    });

                });
            });
        });
});

module.exports = groupRoutes;
