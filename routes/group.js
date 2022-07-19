const express = require("express");
const messageRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;
const wrongDBMsg = "Sorry! There is something wrong with our database.";


// TODO
userRoutes.route("/group").post((req, res, next) => {
    let db_connect = dbo.getDb();
    db_connect
        .collection("group")
        .find({users_id: []})
        .toArray(function (err, result) {
            if (err) {
                res.json({appStatus: 0, msg: wrongDBMsg});
                return next(err);
            } 
            res.json({appStatus: 1, ...result});
        });
});
