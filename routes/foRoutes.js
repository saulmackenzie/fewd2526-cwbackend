const express = require('express');
const controller = require('../controllers/foController');
const router = express.Router();
const passport = require("passport");

router.post("/register", controller.process_new_user);
router.post("/login", controller.handle_login)
router.get('/all-events', controller.json_events_endpoint);
router.get('/all-users',controller.json_users_endpoint);
router.post('/get-family-events', controller.family_events_endpoint);
router.post('/new-event-entry', controller.post_new_event);
router.post('/delete-event/:id', controller.delete_event);

router.use((req, res) => {
    res.status(404);
    res.type('text/plain');
    res.send('404 Not found');
});

// router.use((err, req, res, next) => {
//     res.status(500);
//     res.type('text/plain');
//     res.send("Internal Server Error.");
// })


module.exports = router;