const Q = require('q');
const mysql = require('mysql');

module.exports = class MySql {

  constructor(_config) {
    this.pool = mysql.createPool(_config);
  }

  query(sql, params) {
    let deferred = Q.defer();
    this.pool.query(sql, params, (err, rows) => {
      if (err)
        deferred.reject(err);
      else
        deferred.resolve(rows);
    });
    return deferred.promise;
  }

  createTransaction() {
    return new MySqlTransaction(this.pool);
  }

  format(sql, params) {
    return mysql.format(sql, params);
  }
};

class MySqlTransaction {

  constructor(_pool) {
    /** @type {mysql.Pool} */
    this.pool = _pool;
    this.connection;
  }

  begin() {
    let deferred = Q.defer();
    this.pool.getConnection((err, connection) => {
      if (err) {
        deferred.reject(err);
      }
      else {
        this.connection = connection;
        this.connection.beginTransaction(err => {
          if (err)
            deferred.reject(err);
          else
            deferred.resolve();
        });
      }
    });
    return deferred.promise;
  }

  query(sql, params) {
    if (!this.connection)
      throw 'Transactional connection has not been started yet.';
    
    let deferred = Q.defer();
    this.connection.query(sql, params, (err, rows) => {
      if (err) {
        console.warn(`MySqlTransaction: query failed, will rollback.`, err);
        this.connection.rollback(() => {
          this.connection.release();
          deferred.reject(err);
        });
      }
      else {
        deferred.resolve(rows);
      }
    });
    return deferred.promise;
  }

  commit() {
    if (!this.connection)
      throw 'Transactional connection has not been started yet.';
    
    let deferred = Q.defer();
    this.connection.commit(err => {
      if (err) {
        console.warn(`MySqlTransaction: commit failed, will rollback.`, err);
        this.connection.rollback(() => {
          this.connection.release();
          deferred.reject(err);
        });
      }
      else {
        this.connection.release();
        deferred.resolve();
      }
    });
    return deferred.promise;
  }

  abort() {
    if (!this.connection)
      throw 'Transactional connection has not been started yet.';
    this.connection.rollback(() => {
      console.warn(`MySqlTransaction: transaction is forcibly aborted.`);
      this.connection.release();
    });
  }

}

/**
 * return dbTransaction.begin()
  .then(() => {

    return dbTransaction.query('SELECT 1', [ ]);

  })
  .then(rows => {

    return dbTransaction.query('UPDATE ...');
  })
  .then(updateResult => {

    return dbTransaction.commit();
  })
  .then(() => {

  })
  .catch(err => {
    dbTransaction.abort();
    throw err;
  });
 */