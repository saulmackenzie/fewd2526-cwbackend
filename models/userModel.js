const Datastore = require('gray-nedb');
const bcrypt = require('bcrypt');
const saltRounds = 10;

class userDAO {
    constructor(dbFilePath) {
        if (dbFilePath) {
            //embedded
            this.db = new Datastore({
                filename: dbFilePath,
                autoload: true
            });
        } else {
            //in memory
            this.db = new Datastore();
        }
    }

    init() {
        this.db.count({}, (err, count) => {
            if (err || count > 0) {
                console.log('User database already initialized or error occurred');
                return;
            }

            // const defaultAdmins = [
            //     {
            //         user: 'Admin1',
            //         password: '$2b$10$iYSJ.k77iGk4ZiWnbzb60u3GWpM8KmiW1a9vHMMxChjUchJmUbclG',
            //         role: 'organiser',
            //         familyId: 'family_1',
            //     },
            //     {
            //         user: 'Admin2',
            //         password: '$2b$10$iYSJ.k77iGk4ZiWnbzb60u3GWpM8KmiW1a9vHMMxChjUchJmUbclG',
            //         role: 'administrator',
            //         familyId: 'family_2',
            //     }
            // ];
            // defaultAdmins.forEach(admin => {
            //     this.db.update({ user: new RegExp(`^${admin.user}$`, 'i') }, { $set: admin }, { upsert: true }, (err, numUpserted) => {
            //         if (err) console.log(`Error upserting ${admin.user}:`, err);
            //         else console.log(`Ensured default admin account: ${admin.user}`);
            //     });
            // });
            return this;
        })
    }


    create(newUser, cb) {
        const that = this;
        let entry = newUser

        // If a callback is provided, use it
        if (typeof cb === 'function') {
            that.db.insert(entry, (err, newDoc) => {
                if (err) {
                    console.log("Can't insert user:", newUser.username, err);
                    return cb(err);
                }
                return cb(null, newDoc);
            });
            return;
        }

        // Otherwise return a Promise
        return new Promise((resolve, reject) => {
            that.db.insert(entry, (err, newDoc) => {
                if (err) {
                    console.log("Can't insert user:", newUser.username, err);
                    return reject(err);
                }
                resolve(newDoc);
            });
        });
    }



    lookup(user, family, cb) {
        // const regex = new RegExp(`^${user}$`, 'i');
        console.log("Looking up user:", user, "in family:", family);
        this.db.find({ $and: [{ username: user, familyId: family }] }, (err, entries) => {
            if (err) {
                //return cb(null, null);
                console.log(err)
                return err
            } else {
                console.log(entries)
                if (entries.length == 0) {
                    return cb(null, null);
                }
                return cb(null, entries[0]);
            }
        });
    }

    findByUsername(username, cb) {
        this.db.find({ username: username }, (err, entries) => {
            if (err) {
                console.log(err);
                return err;
            } else {
                console.log(entries);
                if (entries.length == 0) {
                    return cb(null, null);
                }
                return cb(null, entries[0]);
            } 
        });
    }

    getUserById(id, cb) {
        this.db.find({ _id: id }, (err, entries) => {
            if (err) {
                return cb(null, null);
            } else {
                if (entries.length == 0) {
                    return cb(null, null);
                }

                return cb(null, entries[0]);
            }
        });
    }

    getAllUsersInFamily(family) {
        return new Promise((resolve, reject) => {
            this.db.find({ familyId: family }, (err, users) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(users)
                    resolve(users);
                }
            });
        });
    }

    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.find({}, (err, users) => {
                if (err) {
                    reject(err);
                } else {
                    // Remove password from results for security
                    const safeUsers = users.map(user => {
                        const { password, ...safeUser } = user;
                        return safeUser;
                    });
                    resolve(safeUsers);
                }
            });
        });
    }

    updateUser(id, updateData) {
        return new Promise((resolve, reject) => {
            this.db.update({ _id: id }, { $set: updateData }, {}, (err, numReplaced) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(numReplaced);
                    console.log(`User number${id} updated, ${numReplaced} documents modified`);
                }
            });
        });
    }

    deleteUser(username) {
        return new Promise((resolve, reject) => {
            this.db.remove({ user: username }, {}, (err, numRemoved) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(numRemoved);
                    console.log(`User ${username} deleted, ${numRemoved} documents removed`);
                }
            });
        });
    }

}

const dao = new userDAO("./data/users.db");
dao.init();
module.exports = dao;