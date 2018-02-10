const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');

//load models
const User = require('../models/User');

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/user/login',
        failureFlash: true
    })(req, res, next);
});


router.get('/signup', (req, res) => {
    res.render('signup', {errors: {}, username: "", email: "", password: ""});
});

router.post('/signup', [
    check('email')
      .isEmail().withMessage('Định dạng email chưa đúng')
      .trim()
      .normalizeEmail()
      .custom((value, {req}) => {
        return new Promise((resolve, reject) => {
            User.findOne({email:req.body.email}, (err, user) =>{
                if (err) reject(new Error('Server Error'));
                if (Boolean(user)) reject(new Error('Email đã được đăng ký'));
                resolve(true);
            });
        });
    }),
    check('confirmPassword', 'Password và Confirm Password không giống')
        .custom((value, {req}) => value === req.body.password),
    check('username')
        .isAlphanumeric().withMessage('Username không thể có ký tự đặc biệt'),
    sanitize('username').trim().escape(),
  ], (req, res) => {
    const {username, email, password, confirmPassword} = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('signup', {errors: errors.mapped(), username, email, password});
        console.log(errors.mapped());
        return;
    } else {
        bcrypt.genSalt(10, (err, salt)=> {
            bcrypt.hash(password, salt, (err, hashPassword)=> {
                if (err) throw err;
                new User({username, email, password: hashPassword}).save()
                    .then(user => {
                        req.flash('success_msg', 'Bạn đã đăng ký thành công và có thể Đăng nhập');
                        res.redirect('/user/login');
                })
                    .catch(err => console.log(err));
            });
        });
    }
});

router.post('/login', (req, res) => {

});

module.exports = router;