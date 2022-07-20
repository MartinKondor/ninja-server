const express = require("express");
const groupRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;
const wrongDBMsg = "Sorry! There is something wrong with our database.";


const addGroup = (ids, callback) => {
    return db_connect
        .collection("group")
        .insertOne({ users: ids }, callback);
};

const getUserByEmail = (email, callback) => {
    return db_connect
        .collection("user")
        .findOne({ email: email }, callback);
};

groupRoutes.route("/group").post((req, res, next) => {
    let db_connect = dbo.getDb();
    db_connect
        .collection("group")
        .find({users_id: { $in: [req.body.id] }})
        .toArray((err, result) => {
            if (err) {
                res.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
            } 
            return res.json({appStatus: 1, ...result});
        });
});

groupRoutes.route("/group/add_friend").post((req, res, next) => {
    req
        .checkBody("email", "The Email field cannot be empty.")
        .isLength({ min: 3 });

    const addGroupCallback = (err, result) => {
        if (err) {
            res.json({appStatus: 0, msg: wrongDBMsg});
            return next(err);
        }
        return res.json({appStatus: 1, msg: "You've successfully created a new group"});
    };

    let db_connect = dbo.getDb();
    db_connect
        .collection("group")
        .find({users_id: { $in: [req.body.email, req.body.other_email] }})
        .toArray((err, result) => {
            if (err) {
                res.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
            }
            if (result) {
                return res.json({appStatus: 0, msg: "You are already friends!"});
            }
            return getUserByEmail(req.body.email, (err, u1) => {
                if (err) {
                    res.json({appStatus: 0, msg: wrongDBMsg});
                    return next(err);
                }
                return getUserByEmail(req.body.other_email, (err, u2) => {
                    if (err) {
                        res.json({appStatus: 0, msg: wrongDBMsg});
                        return next(err);
                    }

                    // Found both ids
                    return addGroup([ObjectId(u1._id), ObjectId(u2._id)], addGroupCallback);
                });
            });
        });
});

module.exports = groupRoutes;
