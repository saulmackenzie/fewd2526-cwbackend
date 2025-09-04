const familyorganiserDAO = require('../models/foModel');
const userDAO = require('../models/userModel.js');
const utils = require("../lib/utils");
const db = new familyorganiserDAO("./data/events.db");
db.init();

exports.json_events_endpoint = (req, res) => {
    db.getAllEvents().then((list) => {
        res.json(list);
    })
}

exports.json_users_endpoint = (req, res) => {
    userDAO.getAllUsers().then((users) => {
        res.json(users);
    })
}

exports.process_new_user = (req, res, next) => {
    const user = req.body.username;
    const password = req.body.password;
    const family = req.body.familyId;
    const saltHash = utils.genPassword(password);

    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const newUser = {
        username: user,
        hash: hash,
        salt: salt,
        familyId: family || 'family_1', // Default family if not provided
        role: "administrator",
        createdAt: new Date().toISOString(),
    };

    console.log(newUser);

    userDAO.create(newUser, function (err, user) {
        res.json({ success: true, user: user });
    });
};


exports.family_events_endpoint = (req, res) => {
    console.log(req.body)
    const familyId = req.body.familyId;
    console.log(familyId)
    // res.json(familyId);
    db.getAllEvents().then((list) => {
        const familyEvents = list.filter(event => event.familyId === familyId);
        res.json(familyEvents);
    })
}

exports.new_event_entry = (req, res) => {
    userDAO.getAllUsersInFamily(req.family).then((users) => {
        const participantList = users.map(user => user.user)
        res.render('newEvent', {
            'title': 'Family Events',
            'user': req.user,
            'users': participantList
        })
    })
}
exports.post_new_event = (req, res) => {
    if (req.body.userrole != "administrator") {
        res.status(400).json({ msg: "Events must be associated with an administrator." });
        return;
    }
    db.addEvent(
        req.body.event,
        req.body.date,
        req.body.startTime,
        req.body.endTime,
        req.body.location,
        req.body.requiredItems,
        req.body.username,
        req.body.userfamily
    );

    res.json({ success: true, msg: "event added" });
}


exports.handle_login = (req, res) => {
    console.log(req.body);
    const currentUser = req.body.username || 'Admin1';
    const currentUserRole = req.body.role || 'member';
    const currentUserFamily = req.body.familyId || 'family_1';

    userDAO.lookup(currentUser, currentUserFamily, (err, user) => {
        console.log(err, user)

        if (err || !user) {
            return res.status(403).json({ msg: 'error or no user found' });
        }
        console.log(user)
        let isValid = false;
        if (user) {
            isValid = utils.validPassword(
                req.body.password,
                user.hash,
                user.salt
            );
        }
        console.log("user: ", user)
        if (isValid) {
            const tokenObject = utils.issueJWT(user);
            return res.status(200).json({
                success: true,
                token: tokenObject.token,
                expiresIn: tokenObject.expires,
                username: user.username,
                userrole: user.role,
                userfamily: user.familyId,
            });
        } else {
            return res
                .status(401)
                .json({ success: false, msg: "problem" });

        }

    });
};

exports.show_edit_event = (req, res) => {
    const eventId = req.params.id;
    const currentUser = req.user;
    const currentUserFamily = req.family;
    let familyMembers = [];

    userDAO.getAllUsersInFamily(currentUserFamily).then(
        (users) => {
            familyMembers = users.map(user => user.user)
        })

    userDAO.lookup(currentUser, currentUserFamily, (err, user) => {
        if (err || !user) return res.status(403).send('Error');
        db.getEventById(eventId).then((event) => {
            if (!event) {
                res.status(404).send('Event not found');
                return;
            }
            if (event.organiser !== currentUser) {
                return res.status(403).send('Forbidden');
            }
            res.json(event);
        })
            .catch((err) => {
                res.status(500).json({ success: false, error: err });
            });
    });
};

// Update event
exports.update_event = (req, res) => {
    const eventId = req.params.id;
    const currentUser = req.user;

    userDAO.lookup(currentUser, req.family, (err, user) => {
        if (err || !user) return res.status(403).send('Forbidden');
        db.getEventById(eventId).then((event) => {
            if (!event) {
                res.status(404).send('Event not found');
                return;
            }
            if (event.organiser !== currentUser) {
                return res.status(403).send('Forbidden');
            }

            const updateData = {
                event: req.body.event,
                description: req.body.description,
                requiredItems: req.body.requiredItems,
                location: req.body.location,
                date: req.body.date,
                organiser: req.body.organiser,
                startTime: req.body.startTime,
                endTime: req.body.endTime,
                eventType: req.body.eventType,
                organiser: currentUser,
                familyId: event.familyId,
                participants: req.body.participants

            };
            db.updateEvent(eventId, updateData).then((numUpdated) => {
                if (numUpdated === 0) {
                    res.status(404).send('Event not found');
                    return;
                }
                res.redirect('/loggedIn');
            })
                .catch((err) => {
                    console.log('Error updating event:', err);
                    res.status(500).send('Error updating event');
                });
        })
            .catch((err) => {
                console.log('Error fetching event:', err);
                res.status(500).send('Error retrieving event');
            });
    });
};

// Delete event
exports.delete_event = (req, res) => {
    const eventId = req.params.id;
    const currentUser = req.body.username;
    const currentFamily = req.body.userfamily;
    console.log(eventId)
    userDAO.lookup(currentUser, currentFamily, (err, user) => {
        if (err || !user) return res.status(403).json({ 'message': 'Forbidden' });
        db.getEventById(eventId).then((event) => {
            if (!event) {
                res.status(404).json({ 'message': 'Event not found' });
                return;
            }
            if (event.organiser !== currentUser) {
                return res.status(403).json({ 'message': 'Forbidden' });
            }
            db.deleteEvent(eventId).then((numDeleted) => {
                if (numDeleted === 0) {
                    res.status(404).json({ 'message': 'Event not found' });
                    return;
                }
                res.status(202).json({ 'event deleted': numDeleted })
            })
                .catch((err) => {
                    console.log('Error deleting event:', err);
                    res.status(500).json({
                        'message': 'Error deleting event'
                    });
                })
        })
    })
 }

    // User Management Functions
    exports.show_user_management = (req, res) => {
        userDAO.getAllUsers().then((users) => {
            familyUsers = users.filter(user => user.familyId === req.family);
            res.render('userManagement', {
                title: 'Manage Family Members',
                users: familyUsers,
                user: req.user
            });
        })
            .catch((err) => {
                console.log('Error fetching users:', err);
                res.status(500).send('Error retrieving users');
            });
    }

    exports.add_new_family_member = (req, res) => {
        const username = req.body.username;
        const password = req.body.password;
        const role = req.body.role || 'member';
        family = req.family || 'family_1'; // Default family if not provided

        if (!username || !password) {
            res.status(400).send('Username and password required');
            return;
        }

        userDAO.lookup(username, family, (err, existingUser) => {
            if (existingUser && existingUser.familyId === family) {
                res.status(400).send(`User ${username} already exists`);
                return;
            }

            userDAO.addUser(username, password, role, family)
            res.redirect('/manage-users');
        })
    }

    exports.delete_user = (req, res) => {
        const username = req.params.user;

        userDAO.deleteUser(username).then((numDeleted) => {
            if (numDeleted === 0) {
                res.status(404).send('User not found');
                return;
            }
            res.redirect('/manage-users');
        })
            .catch((err) => {
                console.log('Error deleting user:', err);
                res.status(500).send('Error deleting user');
            });
    }

    // Show user details
    exports.show_user_details = (req, res) => {
        const username = req.params.user;
        userDAO.lookup(username, req.family, (err, userDetails) => {
            if (err || !userDetails) {
                res.status(404).send('User not found');
                return;
            }
            res.render('editUser', {
                title: `User Details - ${username}`,
                user: userDetails,
            });
        });
    };

    exports.edit_user = (req, res) => {
        const userIdForEdit = req.params.id;

        const currentUser = req.user;
        userDAO.getUserById(userIdForEdit, (err, user) => {
            if (err || !currentUser) return res.status(403).send('Forbidden');
            if (!user) {
                res.status(404).send('User not found');
                return;
            }
            res.render('editUser', {
                title: 'Edit User',
                user: user
            });
        })
    }

    exports.update_user = (req, res) => {
        const userIdForEdit = req.params.id;
        const family = req.family;

        const updateData = {
            user: req.body.username,
            role: req.body.role,
            familyId: family,
            _id: userIdForEdit
        };

        userDAO.updateUser(userIdForEdit, updateData).then((numUpdated) => {
            if (numUpdated === 0) {
                res.status(404).send('User not updated');
                return;
            }
            res.redirect('/manage-users');
        })
            .catch((err) => {
                console.log('Error updating user:', err);
                res.status(500).send('Error updating event');
            });
    }

