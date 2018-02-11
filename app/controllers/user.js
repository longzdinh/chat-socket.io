const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const async = require('async');

//load models
const User = require('../models/User');

router.get('/login', (req, res) => {
    if (req.user) {
        res.redirect('/');
    } else {
        res.render('login');
    }
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

router.get('/forgot', (req, res) => {
    res.render('forgot');
});

router.post('/forgot', (req, res, next) => {
    async.waterfall([
        function(done) {
          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');
            done(err, token);
          });
        },
        function(token, done) {
          User.findOne({ email: req.body.email }, function(err, user) {
            if (!user) {
              req.flash('error_msg', 'Email này không tồn tại. Xin vui lòng Đăng ký');
              return res.redirect('/user/forgot');
            }
    
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
            user.save(function(err) {
              done(err, token, user);
            });
          });
        },
        function(token, user, done) {

            const smtpTransport = nodemailer.createTransport({
                host: 'smtp.mailgun.org',
                port: 587,
                auth: {
                user: 'postmaster@sandbox057158f8cb0b45fea64b1ca02ef23dcb.mailgun.org',
                pass: '8dc6912bf1bbdba7d21cbb0b34fbb42a'
                }
            });
            const mailOptions = {
            to: user.email,
            from: 'passwordreset@chat.io',
            subject: 'Node.js Password Reset',
            text: 'Bạn nhận được email này vì bạn (hay một người khác) đã yêu cầu reset password tài khoản tại ChatIO\n\n' +
              'Hãy click link dưới đây hoặc paste đường link vào trình duyệt để hoàn thành việc reset password:\n\n' +
              'http://' + req.headers.host + '/user/reset/' + token + '\n\n' +
              'Nếu bạn không muốn reset password, vui lòng bỏ qua email này. Password sẽ được giữ nguyên.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success_msg', 'Email đã được gửi đến ' + user.email + ' với link reset password');
            done(err, 'done');
          });
        }
      ], function(err) {
        if (err) return next(err);
        res.redirect('/user/forgot');
      });
});

router.get('/reset/:token', (req, res) => {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error_msg', 'Password reset token sai hoặc hết hạn');
          return res.redirect('/forgot');
        }
        res.render('reset');
    });
});

router.post('/reset/:token', (req, res) => {
    if (req.body.password !== req.body.confirmPassword) {
        req.flash('error_msg', 'Password và Confirm password không giống');
        res.render('reset');
    } else {
    console.log(req.body);
    async.waterfall([
        function(done) {
          User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
            if (!user) {
              req.flash('error_msg', 'Password reset token không đúng hoặc hết hạn');
              return res.redirect('back');
            }
            user.password = req.body.password;  
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          });
        },
        function(user, done) {
            const smtpTransport = nodemailer.createTransport({
                host: 'smtp.mailgun.org',
                port: 587,
                auth: {
                user: 'postmaster@sandbox057158f8cb0b45fea64b1ca02ef23dcb.mailgun.org',
                pass: '8dc6912bf1bbdba7d21cbb0b34fbb42a'
                }
            });
            const mailOptions = {
            to: user.email,
            from: 'passwordreset@chat.io',
            subject: 'Password đã thay đổi',
            text: 'Hello,\n\n' +
              'Password của tài khoản ' + user.email + ' đã được thay đổi.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success_msg', 'Success! Password đã được update');
            done(err);
          });
        }
      ], function(err) {
        res.redirect('/');
      });
    }
});

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports = router;