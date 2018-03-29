'use strict';

const jwt       = require('jsonwebtoken');
const vo        = require('vo');
const uniqid    = require('uniqid');
const Cookie    = require('cookie');
const aws       = require('aws-sdk');
const ssm       = new aws.SSM();
const dynamodb  = new aws.DynamoDB.DocumentClient();

const SESSION_TABLE           = 'gomi_session2';
const SSM_KEY_JWT_SECRET      = '/gomitter/jwt_token';
const SSM_KEY_CONSUMER_KEY    = '/gomitter/twitter_consumer_key';
const SSM_KEY_CONSUMER_SECRET = '/gomitter/twitter_consumer_secret';

const OAuth   = require('oauth').OAuth;
const Twitter = require('twitter');

class TwitterOAuth {
  static createInstance(event, keyName, secretName){
    return vo(function*(){
      const key    = yield ssm.getParameter({ Name: keyName,    WithDecryption: true }).promise().then(d => d.Parameter.Value);
      const secret = yield ssm.getParameter({ Name: secretName, WithDecryption: true }).promise().then(d => d.Parameter.Value);
      return new TwitterOAuth(event, key, secret);
    }).catch(err => {
      console.log("Error on creating oauth object:", err);
      throw err;
    });
  }

  constructor(event, key, secret) {
    this.consumer_key    = key;
    this.consumer_secret = secret;

    // fix path for aws's auto-assigned URL and mydomain
    const innerPath = event.path;
    const outerPath = event.requestContext.path;
    const cbPath    = outerPath.replace(innerPath, "/auth/callback");

    this.oauth = new OAuth(
      'https://api.twitter.com/oauth/request_token',
      'https://api.twitter.com/oauth/access_token',
      key,
      secret,
      '1.0A',
      'https://' + event.headers.Host + cbPath,
      'HMAC-SHA1'
    );
  }

  getOAuthRequestToken() {
    return new Promise((resolve, reject) => {
      this.oauth.getOAuthRequestToken((error, oauth_token, oauth_token_secret, results) => {
        if (error) { reject(error) }
        else       { resolve({ oauth_token, oauth_token_secret, results })  }
      });
    });
  }

  getOAuthAccessToken(token, secret, verifier) {
    return new Promise((resolve,reject) => {
      this.oauth.getOAuthAccessToken(token, secret, verifier, (error, access_token, access_token_secret, results) => {
        if (error) { reject(error) }
        else       { resolve({ access_token, access_token_secret, results })  }
      });
    });
  }

  call_get_api(token, token_secret, path, param) {
    const client = new Twitter({
      consumer_key:         this.consumer_key,
      consumer_secret:      this.consumer_secret,
      access_token_key:     token,
      access_token_secret:  token_secret,
    });

    return client.get(path, param);
  }
}

module.exports.auth = (event, context, callback) => {
  return vo(function*(){
    const uid   = uniqid();
    const oauth = yield TwitterOAuth.createInstance(event, SSM_KEY_CONSUMER_KEY, SSM_KEY_CONSUMER_SECRET);
    const auth  = yield oauth.getOAuthRequestToken();

    const ret = yield dynamodb.put({
      TableName: SESSION_TABLE,
      Item: {
        uid: uid,
        ttl: (new Date().getTime() / 1000 + 60 * 24),
        session: auth.oauth_token_secret,
      },
    }).promise();

    return callback(null, {
      statusCode: 302,
      body:       '',
      headers:    {
        'Location': 'https://twitter.com/oauth/authenticate?oauth_token=' + auth.oauth_token,
        'Set-Cookie': 'sessid=' + uid + '; secure;',
      },
    });

  }).catch(err => {
    console.log("Error on auth:", err);
    return callback(null, { statusCode: 500, body: "ERROR!" });
  });
};

module.exports.callback = (event, context, callback) => {
  return vo(function*(){
    if (!event.headers.Cookie) {
      throw { code: 400, message: 'NO_DATA' };
    }

    const sessid = Cookie.parse(event.headers.Cookie).sessid;
    const row    = yield dynamodb.get({ TableName: SESSION_TABLE, Key: { "uid": sessid } }).promise();

    if (!row.Item) {
      throw { code: 401, message: 'NO_DATA' };
    }

    const oauth = yield TwitterOAuth.createInstance(event, SSM_KEY_CONSUMER_KEY, SSM_KEY_CONSUMER_SECRET);
    const oauth_token_secret = row.Item.session;

    const query = event.queryStringParameters;
    const ret = yield oauth.getOAuthAccessToken(query.oauth_token, oauth_token_secret, query.oauth_verifier);
    const me  = yield oauth.call_get_api(ret.access_token, ret.access_token_secret, "account/verify_credentials", {});

    console.log(JSON.stringify({ status: "success", id: me.screen_name, name: me.name }));

    yield dynamodb.put({
      TableName: SESSION_TABLE,
      Item: {
        uid:                  sessid,
        twitter_id:           me.id_str,
        screen_name:          me.screen_name,
        display_name:         me.name,
        profile_image_url:    me.profile_image_url_https,
        access_token:         ret.access_token,
        access_token_secret:  ret.access_token_secret,
        ttl:                  Math.floor(new Date().getTime() / 1000 + (60 * 60 * 24)),
      },
    }).promise();

    const secret = yield ssm.getParameter({ Name: SSM_KEY_JWT_SECRET, WithDecryption: true }).promise().then(d => d.Parameter.Value);
    const signed = jwt.sign({ sessid: sessid }, secret);

    return callback(null, {
      statusCode: 200,
      headers: { 'Content-Type': "text/html"},
      body: `<script>window.opener.postMessage("${signed}", "*"); window.close();</script>`,
    });
  }).catch(err => {
    if (err instanceof Error) {
      console.log("Error on callback:", err);
      return callback(null, { statusCode: 500,      body: JSON.stringify({ error: err.message }) });
    } else {
      return callback(null, { statusCode: err.code, body: JSON.stringify({ error: err.message }) });
    }
  });
};

module.exports.me = (event, context, callback) => {
  return vo(function*(){
    if (!event.headers.Authorization) {
      throw { code: 400, message: 'INVALID_HEADER' };
    }

    const token_matched = event.headers.Authorization.match(/^Bearer\s+(.*?)$/);

    if (!token_matched) {
      throw { code: 400, message: 'INVALID_HEADER' };
    }

    const token  = token_matched[1];
    const secret = (yield ssm.getParameter({ Name: SSM_KEY_JWT_SECRET, WithDecryption: true }).promise() ).Parameter.Value;
    let sessid;

    try {
      const data = jwt.verify(token, secret);
      sessid = data.sessid;
    } catch(e) {
      console.log("Error on jwt verify:", e.toString());
      throw { code: 401, message: 'INVALID_HEADER' };
    }

    const ret = yield dynamodb.get({
      TableName: SESSION_TABLE,
      Key: { "uid": sessid },
      AttributesToGet: ['twitter_id', 'screen_name', 'display_name', 'profile_image_url']
    }).promise();

    const row = ret.Item;

    if (!row) {
      throw { code: 401, message: 'DATA_NOT_EXIST' };
    }

    if (!row.twitter_id) {
      throw { code: 401, message: 'DATA_NOT_EXIST' };
    }

    return callback(null, {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(row),
    });

  }).catch(err => {
    let code;
    let mess;
    console.log("ERROR:", err);

    if (err instanceof Error) {
      code = 500;
      mess = 'INTERNAL_ERROR';
    } else {
      code = err.code;
      mess = err.message;
    }

    return callback(null, {
      statusCode: code,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: mess }),
    });
  });
};