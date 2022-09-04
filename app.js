//. app.js
var express = require( 'express' ),
    fs = require( 'fs' ),
    session = require( 'express-session' ),
    app = express();

require( 'dotenv' ).config();

var db = require( './api/db' );
app.use( '/api/db', db );


//. IDaaS(Auth0)
var settings_auth0_callback_url = 'AUTH0_CALLBACK_URL' in process.env ? process.env.AUTH0_CALLBACK_URL : ''; 
var settings_auth0_client_id = 'AUTH0_CLIENT_ID' in process.env ? process.env.AUTH0_CLIENT_ID : ''; 
var settings_auth0_client_secret = 'AUTH0_CLIENT_SECRET' in process.env ? process.env.AUTH0_CLIENT_SECRET : ''; 
var settings_auth0_domain = 'AUTH0_DOMAIN' in process.env ? process.env.AUTH0_DOMAIN : ''; 

var passport = require( 'passport' );
var Auth0Strategy = require( 'passport-auth0' );
var strategy = new Auth0Strategy({
  domain: settings_auth0_domain,
  clientID: settings_auth0_client_id,
  clientSecret: settings_auth0_client_secret,
  callbackURL: settings_auth0_callback_url
}, function( accessToken, refreshToken, extraParams, profile, done ){
  profile.idToken = extraParams.id_token;
  return done( null, profile );
});
passport.use( strategy );

passport.serializeUser( function( user, done ){
  done( null, user );
});
passport.deserializeUser( function( user, done ){
  done( null, user );
});


//. Session
var sess = {
  secret: 'LinePayIDaaSSecret',
  cookie: {
    path: '/',
    maxAge: (1 * 60 * 60 * 1000)  //. 1H
  },
  resave: false,
  saveUninitialized: true
};
app.use( session( sess ) );
app.use( passport.initialize() );
app.use( passport.session() );


app.use( function( req, res, next ){
  if( req && req.query && req.query.error ){
    console.log( req.query.error );
  }
  if( req && req.query && req.query.error_description ){
    console.log( req.query.error_description );
  }
  next();
});


//. login
app.get( '/auth0/login', passport.authenticate( 'auth0', {
  scope: 'openid profile email'
}, function( req, res ){
  res.redirect( '/' );
}));

//. logout
app.get( '/auth0/logout', function( req, res ){
  var returnTo = req.query.returnTo;

  req.logout( function(){
    //. 2021/Dec/01 に仕様が変わっている・・
    //. https://auth0.com/docs/product-lifecycle/deprecations-and-migrations/logout-return-to

    //. https://auth0.com/docs/api/authentication#logout
    res.redirect( 'https://' + settings_auth0_domain + '/v2/logout?client_id=' + settings_auth0_client_id + '&returnTo=' + returnTo );  //. こっちが正解
  });
});

app.get( '/auth0/callback', async function( req, res, next ){
  passport.authenticate( 'auth0', function( err, user ){
    if( err ) return next( err );
    if( !user ) return res.redirect( '/auth0/login' );

    req.logIn( user, function( err ){
      if( err ) return next( err );
      res.redirect( '/' );
    })
  })( req, res, next );
});

//. static folder & template folder
app.use( express.static( __dirname + '/public' ) );
app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

//. メイン処理
app.get( '/', async function( req, res ){
  var user = null;
  if( req.user ){ 
    //. ログインが確認できた場合はそのユーザー属性を持ってメインページへ
    user = req.user;
    var user_id = user.id; //user.emails[0].value;
    var r = await db.getUser( user_id );
    if( r && r.status && r.user ){
      user.type = r.user.type;
    }else{
      user.type = 0;
    }
    res.render( 'index', { user: user } );
  }else{
    //. ログインが確認できない場合はログインページへ
    res.redirect( '/auth0/login' );
  }
});



//. LINE Pay 用
var { v4: uuidv4 } = require( 'uuid' );
var cache = require( 'memory-cache' );

var line_pay = require( 'line-pay' );
var pay = new line_pay({
  channelId: process.env.LINE_PAY_CHANNEL_ID,
  channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
  hostname: process.env.LINE_PAY_HOSTNAMEyyp,
  isSandbox: true
});

//. 購入画面
app.use( '/pay/reserve', function( req, res ){
  //. 購入内容
  var options = JSON.parse( fs.readFileSync( './item.json' ) );
  options.orderId = uuidv4();
  options.confirmUrl = process.env.LINE_PAY_CONFIRM_URL;

  //. トランザクション ID をキーに購入内容をいったん記録して支払いページへ
  pay.reserve( options ).then( ( response ) => {
    var reservation = options;
    reservation.transactionId = response.info.transactionId;
    console.log( `Reservation was made. Detail is following.` );
    console.log( reservation );

    cache.put( reservation.transactionId, reservation );
    res.redirect( response.info.paymentUrl.web );
  });
});

//. 支払い画面
app.use( '/pay/confirm', function( req, res ){
  if( !req.query.transactionId ){
    throw new Error( 'Transaction Id not found' );
  }

  //. 購入内容を取り出す
  var reservation = cache.get( req.query.transactionId );
  if( !reservation ){
    throw new Error( 'Reservation not found' );
  }

  console.log( `Retrieved following reservation.` );
  console.log( reservation );

  //. 確認内容
  var confirmation = {
    transactionId: req.query.transactionId,
    amount: reservation.amount,
    currency: reservation.currency
  };

  console.log( `Going to confirm payment with following options` );
  console.log( confirmation );

  //. 支払い処理を実行
  pay.confirm( confirmation ).then( async function( response ){
    //. confirmation の内容（とreservation.orderId）をユーザー ID に紐づけて記録すればよい
    //. LINE Pay の取引内訳に transactionId が記録されているはず
    //.            売上結果にも transactionId と orderId が記録されているはず
    var user_id = ( req.user && req.user.emails && req.user.emails.length ? req.user.id/*req.user.emails[0].value*/ : null );
    if( user_id ){
      await db.setUserType( user_id, 1 );
      await db.createTransaction( confirmation.transactionId, user_id, reservation.orderId, confirmation.amount, confirmation.currency );
    }

    //. 元の画面にリダイレクト
    res.redirect( '/' );
  });
});



var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
