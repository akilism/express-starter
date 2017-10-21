const level = require('./level');
const bcrypt = require('bcrypt');
const addDays = require('date-fns/add_days');
const uuid = require('uuid/v4');

const SALT_ROUNDS = 10;

const db =
  process.env.NODE_ENV === 'test'
    ? level('./db/testusers')
    : level('./db/users');

function read(key) {
  return db.read(`users~${key}`);
}

function write(key, val) {
  return db.write(`users~${key}`, value);
}

function deleteUser(key) {
  return db.del(`users~${key}`);
}

function fetchUser(username) {
  return read(username);
}

function userExists(username) {
  return fetchUser(username).then(user => user !== undefined);
}

function createUser(username, password, opts) {
  const id = uuid();
  return bcrypt.hash(password, SALT_ROUNDS).then(hash => {
    const user = {
      id,
      passwd: hash,
      last_login: null,
      failed_logins: [],
      key_handle: null,
      public_key: null,
      auth_token: null,
      opts
    };
    return write(username, user);
  });
}

function updateLastLogin(user) {
  const d = new Date();
  return Object.assign({}, user, { last_login: d });
}

function clearAuthToken(user) {
  return Object.assign({}, user, { auth_token: null });
}

function addFailedLogin(user) {
  const failed_logins = user.failed_logins;
  const d = new Date();
  return Object.assign({}, user, { failed_logins: failed_logins.concat(d) });
}

function validAuthToken(user) {
  // console.log(user.auth_token, Date.now(), user.auth_token > Date.now());
  if (!user.auth_token) {
    return false;
  }
  return user.auth_token > Date.now();
}

function authToken() {
  const d = addDays(new Date(), 1);
  const t = Date.parse(d);
  return t;
}

function updateAuthToken(user) {
  return Object.assign({}, user, { auth_token: authToken() });
}

function onNewUser(username, password, opts) {
  return userExists(username)
    .then(exists => {
      if (exists) {
        // error this user exists already.
        throw new Error('user exists');
      } else {
        return exists;
      }
    })
    .then(() => {
      return createUser(username, password, opts);
    });
}

function onLoginFail(username, user) {
  const updtUser = addFailedLogin(user);
  return write(username, updtUser).then(() => {
    // console.log('😒 login failed');
    throw new Error('login failed');
  });
}

function onLoginSuccess(username, user) {
  const updtUser = validAuthToken(user)
    ? updateAuthToken(updateLastLogin(user))
    : clearAuthToken(updateLastLogin(user));

  return write(username, updtUser).then(upUser => {
    const retUser = Object.assign({}, upUser);
    delete retUser.passwd;
    return retUser;
  });
}

function onAuthUser(username, password) {
  return fetchUser(username).then(user => {
    if (!user) {
      throw new Error('no user exists');
    }
    return bcrypt.compare(password, user.passwd).then(result => {
      if (result !== true) {
        //  console.log('😡 Login Fail');
        return onLoginFail(username, user);
      }
      return onLoginSuccess(username, user);
    });
  });
}

function onUpdateUser(username, userPatch) {
  return fetchUser(username).then(user => {
    const updtUser = Object.assign({}, user, userPatch);
    // console.log('updtUser', updtUser);
    return write(username, updtUser);
  });
}

function onDeleteUser(username) {
  return fetchUser(username).then(user => {
    return deleteUser(username);
  });
}

function onChangePasswd(username, currentPasswd, newPasswd) {
  return fetchUser(username).then(user => {
    if (!user) {
      throw new Error('no user exists');
    }
    return bcrypt
      .compare(currentPasswd, user.passwd)
      .then(result => {
        if (result !== true) {
          throw new Error('invalid password');
        }
        return bcrypt.hash(newPasswd, SALT_ROUNDS);
      })
      .then(passwd => {
        return onUpdateUser(username, { passwd });
      });
  });
}

module.exports = {
  authToken,
  fetchUser,
  onNewUser,
  onAuthUser,
  onUpdateUser,
  onDeleteUser,
  onChangePasswd
};
