
class GroupModel {
    static create(name, users, is_open, is_active) {
        return {
            name: name,
            users: users,
            is_open: is_open,
            is_active: is_active
        }
    }
}

module.exports = GroupModel;
