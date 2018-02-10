const express = require('express');
const router = express.Router();
const {ensureAuthenticated} = require('../helpers/auth');

router.get('/', ensureAuthenticated, (req, res) => {
    req.session.user = req.user;
    res.render('index');
});

module.exports = router;