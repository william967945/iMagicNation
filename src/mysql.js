const db = require("./common/db");

exports.listAll = () => {
  return db
    .query("SELECT * FROM vas_billing_accounts")
    .then((rows) => {
      return rows;
    })
    .finally(() => {});
};
