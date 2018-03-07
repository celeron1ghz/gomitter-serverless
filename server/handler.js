'use strict';

const vo  = require('vo');
const jwt = require('jsonwebtoken');
const aws = require('aws-sdk');
const ssm = new aws.SSM();
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });

const COMMANDS = {
  rank:  require('./src/RankGomiCommand'),
  list:  require('./src/ListGomiCommand'),
  tweet: require('./src/TweetCommand'),
};

module.exports.main = (event, context, callback) => {
  return vo(function*(){
    let token;

    try {
      const token_matched = event.headers.Authorization.match(/^Bearer\s+(.*?)$/);
      token = token_matched[1];
    } catch(e) {
      throw { code: 400, message: 'INVALID_HEADER' };
    }

    const secret = (yield ssm.getParameter({ Name: '/twitter_oauth/jwt_token', WithDecryption: true }).promise() ).Parameter.Value;
    let sess;
    try {
      sess = jwt.verify(token, secret);
    } catch(e) {
      throw { code: 401, message: 'INVALID_TOKEN' };
    }


    let user;
    try {
      user = yield dynamodb.get({
        TableName: "twitter_oauth",
        Key: { "uid": sess.sessid },
        AttributesToGet: ['twitter_id', 'screen_name', 'display_name', 'profile_image_url'],
      }).promise().then(data => data.Item);
    } catch(e) {
      throw e; // maybe dynamodb's internal error
    }

    if (!user) {
      throw { code: 401, message: 'EXPIRED' };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch(e) {
      throw { code: 400, message: 'INVALID_BODY' };
    }

    const cmd = COMMANDS[body.command];
    if (!cmd) {
      throw { code: 400, message: 'INVALID_COMMAND' };
    }


    let obj;
    try {
      obj = new cmd(body);
    } catch(e) {
      throw { code: 400, message: 'INVALID_PARAM' };
    }


    try {
      console.log("ARGS:", JSON.stringify(body,null,2));
      const ret = yield obj.run();

      return callback(null, {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(ret),
      });

    } catch(e) {
      console.log(e);
      throw { code: 400, message: 'INTERNAL_ERROR' };
    }

  }).catch(err => {
    let code;

    if (err instanceof Error) {
      console.log("Error on endpoint:", err);
      code = 500;
    } else {
      code = err.code;
    }

    return callback(null, {
      statusCode: code,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
    });
  });
};
