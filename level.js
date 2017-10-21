const level = require('level');
const concat = require('concat-stream');

function readAll(db, opts) {
  return new Promise((resolve, reject) => {
    const stream = opts ? db.createReadStream(opts) : db.createReadStream();
    stream.on('error', err => reject(err));
    stream.pipe(
      concat(data => {
        resolve(data);
      })
    );
  });
}

function read(db, key) {
  return new Promise((resolve, reject) => {
    db.get(key, (err, data) => {
      return err ? reject(err) : resolve(data);
    });
  });
}

function write(db, key, val) {
  return new Promise((resolve, reject) => {
    db.put(key, val, err => {
      return err ? reject(err) : resolve(true);
    });
  });
}

function del(db, key) {
  return new Promise((resolve, reject) => {
    db.del(key, err => {
      return err ? reject(err) : resolve(true);
    });
  });
}

function batch(db, ops) {
  return new Promise((resolve, reject) => {
    db.batch(ops, err => {
      return err ? reject(err) : resolve(true);
    });
  });
}

module.exports = function(dbPath) {
  const db = level(dbPath);
  return {
    batch: batch.bind(null, db),
    del: del.bind(null, db),
    read: read.bind(null, db),
    readAll: readAll.bind(null, db),
    write: write.bind(null, db)
  };
};
