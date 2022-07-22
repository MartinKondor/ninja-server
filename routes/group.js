const express = require("express");
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;
const { addGroup, getUserByEmail, wrongDBMsg, updateGroup } = require("./_utils");
const groupRoutes = express.Router();


groupRoutes.route("/group/friends").post((req, res, next) => {
    const db = dbo.getDb();
    const query = {
        users: {
            $in: [ new ObjectId(req.body.id) ],
            $size: 2
        }
    };

    const groupMap = (e) => {
        const u1 = new ObjectId(e.users[0]);
        const u2 = new ObjectId(e.users[1]);
        const uc = new ObjectId(req.body.id);

        // Choose the user who's id is not equal to the current user's id
        return u1 != uc ? u1 : u2;
    };

    db.collection("group")
        .find(query)
        .toArray((err, groups) => {
            if (err) {
                return res.json({appStatus: 0, msg: wrongDBMsg});
            }
            return res.json({
                appStatus: 1,
                result: groups.map(groupMap)
            });
        });
});

groupRoutes.route("/group/add_friend").post((req, res, next) => {
    req.checkBody("email", "You must give a valid email address.")
        .isEmail();
    req.checkBody("other_email", "You must give a valid email address.")
        .isEmail();

    const errors = req.validationErrors();
    if (errors) {
        return res.json({appStatus: 0, msg: errors[0].msg});
    }
    const db = dbo.getDb();

    // 3. to be called
    const addGroupCallback = (err, result) => {
        if (err) {

            // In a try-catch in case the error is not from the addGroup function
            try{
                if (err.msg) {
                    return res.json({appStatus: 0, msg: err.msg});    
                }
            } catch(e) {}

            return res.json({appStatus: 0, msg: wrongDBMsg});
        }
        return res.json({appStatus: 1, msg: "You've successfully sent the friend request"});
    };

    // 2. to be called
    const getU2Callback = (u1) => {
        return (err, u2) => {
            if (err) {
                return res.json({appStatus: 0, msg: wrongDBMsg});
            }
            if (!u2) {
                return res.json({appStatus: 0, msg: `The given email (${req.body.other_email}) is not registered`});
            }

            // Found both ids
            const users = [ new ObjectId(u1._id), new ObjectId(u2._id) ];
            const groupQuery = {
                users: {
                    $in: users
                }
            };
            
            // Search for the group if exists
            return  db.collection("group")
                .findOne(groupQuery, (err, foundGroup) => {
                    if (err) {
                        return res.json({appStatus: 0, msg: wrongDBMsg});
                    }

                    const u1IsInGroup = (foundGroup.users[0].equals(users[0]) || foundGroup.users[1].equals(users[0]));
                    const u2IsInGroup = (foundGroup.users[0].equals(users[1]) || foundGroup.users[1].equals(users[1]));
                    const isTheGroupForThem = u1IsInGroup && u2IsInGroup;

                    if (foundGroup) {
                        if ( ! isTheGroupForThem) {
                            return addGroup(db, users, addGroupCallback);
                        }
                        else {
                            if (!foundGroup.is_active) {
                                foundGroup.is_active = true;  // Accept friend request
    
                                const setQuery = {
                                    $set: {
                                        is_active: true
                                    }
                                };
                                return updateGroup(db, foundGroup._id, setQuery, (err) => {
                                    if (err) {
                                        return res.json({appStatus: 0, msg: wrongDBMsg});
                                    }
                                    return res.json({appStatus: 1, msg: "Now you are friends!"});
                                });
                            }
                            else {
                                return res.json({appStatus: 1, msg: "You are already friends!"});
                            }
                        }
                    }
                    else {
                        return addGroup(db, users, addGroupCallback);
                    }
                });
        };
    };

    // 1. to be called
    const getU1Callback = (err, u1) => {
        if (err) {
            return res.json({appStatus: 0, msg: wrongDBMsg});
        }
        if (!u1) {
            return res.json({appStatus: 0, msg: `The given email (${req.body.email}) is not registered`});
        }
        return getUserByEmail(db, req.body.other_email, getU2Callback(u1));
    };

    // First search if there is an existing group
    const findGroupQuery = {
        users: {
            $in: [ req.body.other_email, req.body.email ],
            $size: 2
        }
    };

    return getUserByEmail(db, req.body.email, getU1Callback);
});

module.exports = groupRoutes;
