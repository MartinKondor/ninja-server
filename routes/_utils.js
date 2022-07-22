const ObjectId = require("mongodb").ObjectId;
const GroupModel = require("../models/group");


function addGroup(db, ids, callback) {
    const group = GroupModel.create("", ids, false, false);

    // Is there a group like this?
    return db
        .collection("group")
        .findOne(group, (err, res) => {
            if (!res) {
                return db
                    .collection("group")
                    .insertOne(group, callback);
            }
            else {
                if (!res.is_active) {
                    return callback({msg: "The friend request was already sent."}, null);
                }
                return callback({msg: "There is already an existing group with these friends."}, null);
            }
        });
};

function updateGroup(db, id, updateQuery, callback) {
    return db
        .collection("group")
        .updateOne({_id: new ObjectId(id)}, updateQuery, callback);
}

function getUserByEmail(db, email, callback) {
    return db
        .collection("user")
        .findOne({ email: email }, callback);
};

function getUserById(db, id, callback) {
    return db
        .collection("user")
        .findOne({ _id: new ObjectId(id) }, callback);
};

const wrongDBMsg = "Sorry! There is something wrong with our database.";
const wrongUserIdMsg = "You have no user-rights to use this functionality.";

module.exports = {
    addGroup: addGroup,
    getUserById: getUserById,
    getUserByEmail: getUserByEmail,
    wrongDBMsg: wrongDBMsg,
    wrongUserIdMsg: wrongUserIdMsg,
    updateGroup: updateGroup
}
