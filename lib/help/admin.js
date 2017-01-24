const cloneDatabase = `/**
  Clone database on another server to here.
  <p>
  Generally, you should dropDatabase() first as otherwise the cloned information will MERGE
  into whatever data is already present in this database.  (That is however a valid way to use
  clone if you are trying to do something intentionally, such as union three non-overlapping
  databases into one.)
  <p>
  This is a low level administrative function will is not typically used.

  * @param {String} from Where to clone from (dbhostname[:port]).  May not be this database
                 (self) as you cannot clone to yourself.
  * @return Object returned has member ok set to true if operation succeeds, false otherwise.
  * See also: db.copyDatabase()
  */`

module.exports = {
  cloneDatabase: cloneDatabase,
  cloneCollection: '',
};
