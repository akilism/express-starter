const usr = require('./user');

function getAcctOpts(accountType) {
  switch (accountType.toLowerCase()) {
    case 'admin':
    case 'administrator':
      return {
        type: 'admin'
      };
    case 'user':
    default:
      return {
        type: 'user'
      };
  }
}

function main() {
  const command = process.argv[2] || '';
  switch (command.toLowerCase()) {
    case 'newuser':
      if (process.argv[3] && process.argv[4] && process.argv[5]) {
        usr
          .onNewUser(
            process.argv[3],
            process.argv[4],
            getAcctOpts(process.argv[5])
          )
          .then(user => {
            console.log(`🤗  Created User ${process.argv[3]}`);
          })
          .catch(err => {
            console.log('😡  Creation Failed.');
            console.log(err);
          });
      } else {
        console.log('node cli newuser <username> <password> <account_type>');
      }
      break;
    case 'updatepasswd':
      if (process.argv[3] && process.argv[4] && process.argv[5]) {
        usr
          .onChangePasswd(process.argv[3], process.argv[4], process.argv[5])
          .then(user => {
            console.log(`🤗  Updated password for user ${process.argv[3]}`);
          })
          .catch(err => {
            console.log('😩  Password change failed.');
            console.log(err);
          });
      } else {
        console.log(
          'node cli updatepasswd <username> <currentpassword> <newpassword>'
        );
      }
      break;
    case 'deleteuser':
      if (process.argv[3]) {
        usr
          .onDeleteUser(process.argv[3])
          .then(res => {
            if (res) {
              console.log(`👺  ${process.argv[3]} deleted.`);
            }
          })
          .catch(err => {
            console.log('💩  Deletion failed.');
            console.log(err);
          });
      } else {
        console.log('node cli deleteuser <username>');
      }
      break;
    default:
      console.log('Please supply a command: newuser, updatepasswd, deleteuser');
  }
}

main();
