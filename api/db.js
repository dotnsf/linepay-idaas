//. db.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    { v4: uuidv4 } = require( 'uuid' ),
    api = express();

require( 'dotenv' ).config();

//process.env.PGSSLMODE = 'no-verify';
var PG = require( 'pg' );
PG.defaults.ssl = true;
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : ''; 
var pg = null;
if( database_url ){
  console.log( 'database_url = ' + database_url );
  pg = new PG.Pool({
    connectionString: database_url,
    ssl: { require: true, rejectUnauthorized: false },
    idleTimeoutMillis: ( 3 * 86400 * 1000 )
  });
  pg.on( 'error', function( err ){
    console.log( 'error on working', err );
    if( err.code && err.code.startsWith( '5' ) ){
      try_reconnect( 1000 );
    }
  });
}

function try_reconnect( ts ){
  setTimeout( function(){
    console.log( 'reconnecting...' );
    pg = new PG.Pool({
      connectionString: database_url,
      ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: ( 3 * 86400 * 1000 )
    });
    pg.on( 'error', function( err ){
      console.log( 'error on retry(' + ts + ')', err );
      if( err.code && err.code.startsWith( '5' ) ){
        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );
        try_reconnect( ts );
      }
    });
  }, ts );
}

var settings_cors = 'CORS' in process.env ? process.env.CORS : '';
api.all( '/*', function( req, res, next ){
  if( settings_cors ){
    res.setHeader( 'Access-Control-Allow-Origin', settings_cors );
    res.setHeader( 'Vary', 'Origin' );
  }
  next();
});


api.use( bodyParser.urlencoded( { extended: true, limit: '50mb' } ) );
api.use( bodyParser.json( { limit: '50mb' }) );
api.use( express.Router() );

//. getUser
api.getUser = async function( user_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = "select * from users where id = $1";
          var query = { text: sql, values: [ user_id ] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              if( result && result.rows && result.rows.length > 0 ){
                resolve( { status: true, user: result.rows[0] } );
              }else{
                resolve( { status: false, error: 'no data' } );
              }
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. setUserType
api.setUserType = async function( user_id, user_type ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        if( !user_id ){
          resolve( { status: false, error: 'no id.' } );
        }else{
          try{
            var r = await this.getUser( user_id );
            if( r && r.status && r.user ){
              var sql = 'update users set type = $1, updated = $2 where id = $3';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ user_type, t, user_id ] };
              conn.query( query, function( err, result ){
                if( err ){
                  console.log( err );
                  resolve( { status: false, error: err } );
                }else{
                  resolve( { status: true, result: result } );
                }
              });
            }else{
              var sql = 'insert into users ( id, type, created, updated ) values ( $1, $2, $3, $4 )';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ user_id, user_type, t, t ] };
              conn.query( query, function( err, result ){
                if( err ){
                  console.log( err );
                  resolve( { status: false, error: err } );
                }else{
                  resolve( { status: true, result: result } );
                }
              });
            }
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: err } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. deleteUserType
api.deleteUserType = async function( user_id ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        if( !user_id ){
          resolve( { status: false, error: 'no id.' } );
        }else{
          try{
            var r = await this.getUser( user_id );
            if( r && r.status && r.user ){
              var sql = 'update users set type = 0, updated = $1 where id = $2';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ t, user_id ] };
              conn.query( query, function( err, result ){
                if( err ){
                  console.log( err );
                  resolve( { status: false, error: err } );
                }else{
                  resolve( { status: true, result: result } );
                }
              });
            }else{
              var sql = 'delete from users where id = $1';
              var t = ( new Date() ).getTime();
              var query = { text: sql, values: [ user_id ] };
              conn.query( query, function( err, result ){
                if( err ){
                  console.log( err );
                  resolve( { status: false, error: err } );
                }else{
                  resolve( { status: true, result: result } );
                }
              });
            }
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: err } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. createTransaction
api.createTransaction = async function( transaction_id, user_id, order_id, amount, currency ){
  return new Promise( async function( resolve, reject ){
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'insert into transactions( id, user_id, order_id, amount, currency, created, updated ) values ( $1, $2, $3, $4, $5, $6, $7 )';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ transaction_id, user_id, order_id, amount, currency, t, t ] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};


api.get( '/delete_user_type', async function( req, res ){
  var user_id = req.query.user_id;
  if( user_id ){
    await api.deleteUserType( user_id );
  }
  res.redirect( '/' );
});

//. api をエクスポート
module.exports = api;
