const express = require('express');


const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const multer = require('multer')
const constants = require('constants');
const constant = require('./config/constants');


const port = process.env.PORT || 8042;
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const path = require('path');

const session = require('express-session');
const bodyParser = require('body-parser');

//require routes
const rootRoute = require('./app/controllers/index');
const userRoute = require('./app/controllers/user');

//require models
const Chat = require('./app/models/Chat');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


/***************Mongodb configuratrion********************/
var configDB = require('./config/database.js');
//configuration ===============================================================
mongoose.connect(configDB.url).catch(err => console.log(err)); // connect to our database


require('./config/passport')(passport); // pass passport for configuration

//set up our express application
//app.use(bodyParser()); // get information from html forms

//view engine setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'app/views'));
app.set('view engine', 'ejs');

//express-session middleware
const sessionMiddleWare = session({
    secret: 'Long is awesome',
    resave: true,
    saveUninitialized: true
})

app.use(sessionMiddleWare);

//passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(flash()); // use connect-flash for flash messages stored in session

//Global variables
app.use(function(req,res,next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user;
    next();
});

// routes ======================================================================
app.use('/', rootRoute);
app.use('/user', userRoute);

 //socket.io config

 //connect express-session and socket.io session
io.use(function(socket,next){
    sessionMiddleWare(socket.request, socket.request.res, next);
});
const userList = [];
//main execution
 io.on('connection', function(socket){
    const {user={}} = socket.request.session;
    if (typeof user.username != 'undefined') {
        console.log(`${user.username} connected`);
        userList.push(user.username);
        io.emit('user connected', userList);
        //render previous chat messages 
        Chat.find().then(chats => {
            socket.emit('render chatroom', {user_id: user._id, chats});
        }).catch(err => console.log(err));
    }
    socket.on('chat message', msg => {
        new Chat({message: msg, user_id: user._id, username: user.username}).save()
            .then(chat => console.log(chat)); 
        socket.broadcast.emit('chat message', {user: user.username, msg});
    });
    socket.on('user is typing', () =>{
        socket.broadcast.emit('user is typing', {username: user.username, user_id: user._id});
    });
    socket.on('user is not typing', () =>{        
        socket.broadcast.emit('user is not typing', user._id);
    });

    socket.on('disconnect', function(){
        if (typeof user.username != 'undefined') {
            userList.splice(userList.indexOf(user.username),1);
            io.emit('user disconnected', userList);
            console.log('disconnect userList: ', userList);     
        }   
    });
});


//launch ======================================================================
http.listen(port);
console.log('Server started on ' + port);

//catch 404 and forward to error handler
app.use(function (req, res, next) {
    res.status(404).render('404', {title: "Sorry, page not found", session: req.sessionbo});
});

app.use(function (req, res, next) {
    res.status(500).render('404', {title: "Sorry, page not found"});
});
exports = module.exports = app;