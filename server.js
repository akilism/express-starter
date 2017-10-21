const http = require('http');
const https = require('https');
const bankai = require('bankai/http');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { BasicStrategy } = require('passport-http');
const request = require('request');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const usr = require('./user');
// const addu2f = require('./u2f-middleware');

let app = express();

const upload = multer();

// const API_PORT = process.env.GQL_PORT || 3030;
// const API_HOST = process.env.GQL_HOST || 'localhost';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let ACCESS_LOG_PATH;
let ERROR_LOG_PATH;

if (IS_PRODUCTION) {
  ACCESS_LOG_PATH =
    process.env.ACCESS_LOG_PATH || path.join(__dirname, 'logs', 'access.log');
  ERROR_LOG_PATH =
    process.env.ERROR_LOG_PATH || path.join(__dirname, 'logs', 'error.log');
} else {
  ACCESS_LOG_PATH = path.join(__dirname, 'logs', 'access.log');
  ERROR_LOG_PATH = path.join(__dirname, 'logs', 'error.log');
}

const options = {
  key: fs.readFileSync('./.config/key.pem'),
  cert: fs.readFileSync('./.config/cert.pem')
};

passport.use(
  new BasicStrategy((username, password, done) => {
    usr
      .onAuthUser(username, password)
      .then(user => {
        // console.log(`🤗  successful login for: ${username}`);
        return done(null, Object.assign({}, user, { username }));
      })
      .catch(err => {
        console.log(`👹 failed login for: ${username}`);
        console.log(err);
        return done(null, false);
      });
  })
);

function checkSesh(userSession, cookieSession) {
  return userSession === cookieSession;
}

function isStaticFile(reqPath) {
  return (
    reqPath.indexOf('/2fa') > -1 ||
    reqPath.indexOf('/assets') > -1 ||
    reqPath.indexOf('/css') > -1
  );
}

function check2fa(req, res, next) {
  const user = req.user;
  const sesh =
    req.cookies && req.cookies['connect.sid']
      ? checkSesh(user.session, req.cookies['connect.sid'])
      : false;

  const isStatic = isStaticFile(req.path);
  if ((!user.key_handle || !user.public_key) && !isStatic) {
    console.log(`🐝  redirect to 2fa reg for ${user.username}`);
    res.send(fs.readFileSync('./2fa/reg.html').toString());
  } else if ((!user.auth_token || !sesh) && !isStatic) {
    console.log(`🐝  redirect to 2fa auth for ${user.username}`);
    res.send(fs.readFileSync('./2fa/auth.html').toString());
  } else {
    next();
  }
}

passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser((username, done) => {
  usr
    .fetchUser(username)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

app.use(cors());
app.use(helmet());
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(
  session({
    secret: process.env.COOKIE_SECRET || 'xakilscore',
    saveUninitialized: true,
    resave: false
    // cookie: { secure: true }
  })
);

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// Logging
if (IS_PRODUCTION) {
  const accessLogStream = fs.createWriteStream(ACCESS_LOG_PATH, { flags: 'a' });
  const errorLogStream = fs.createWriteStream(ERROR_LOG_PATH, { flags: 'a' });
  app.use(
    morgan('combined', {
      skip: (req, res) => res.statusCode >= 400,
      stream: errorLogStream
    })
  );

  app.use(
    morgan('combined', {
      skip: (req, res) => res.statusCode < 400,
      stream: accessLogStream
    })
  );
} else {
  app.use(morgan('dev'));
}

app.use(passport.initialize());
app.use(passport.session());

app.all('*', passport.authenticate('basic'), (req, res, next) => {
  // console.log(req.user);
  // console.log(req.cookies.types);
  res.cookie('ability', `${req.user.commenter}#${req.user.admin}`, {
    maxAge: 900000
    // httpOnly: false
  });
  next();
});

// app = addu2f(app);

// Static Assets.
app.use(express.static(IS_PRODUCTION ? 'dist' : 'client/assets'));

const compiler = IS_PRODUCTION ? null : bankai(path.join(__dirname, 'client'));

app.get('*', (req, res) => {
  if (IS_PRODUCTION) {
    res.sendFile(`${path.join(__dirname, 'dist')}/index.html`);
  } else {
    compiler(req, res, function() {
      res.statusCode = 404;
      res.send('👀 ✊🏿 👀');
    });
  }
});

const httpsServer = https.createServer(options, app);

httpsServer.listen(process.env.HTTPS_PORT || 4433, () => {
  console.log(`🏴 HTTPS Listening on port: ${httpsServer.address().port} 🏴`);
});

const httpServer = http.createServer(app);
httpServer.listen(process.env.HTTP_PORT || 8088, () => {
  console.log(`🏴 HTTP Listening on port: ${httpServer.address().port} 🏴`);
});
