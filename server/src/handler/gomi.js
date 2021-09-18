'use strict';

const jwt = require('jsonwebtoken');
const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });

const COMMANDS = {
  rank:  require('../command/RankGomiCommand'),
  list:  require('../command/ListGomiCommand'),
  tweet: require('../command/TweetCommand'),
};

module.exports.main = async (event, context, callback) => {
  try {
    let token;

    try {
      const token_matched = event.headers.Authorization.match(/^Bearer\s+(.*?)$/);
      token = token_matched[1];
    } catch(e) {
      throw { code: 400, message: 'INVALID_HEADER' };
    }

    let sess;

    try {
      sess = jwt.verify(token, process.env.SSM_KEY_JWT_SECRET);
    } catch(e) {
      throw { code: 401, message: 'INVALID_TOKEN' };
    }


    let user;
    try {
      user = await dynamodb.get({
        TableName: "gomi_session2",
        Key: { "uid": sess.sessid },
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
      obj = new cmd(body,user);
    } catch(e) {
      throw { code: 400, message: 'INVALID_PARAM' };
    }


    try {
      console.log("ARGS:", user.screen_name, JSON.stringify(body));
      const ret = await obj.run();

      return callback(null, {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(ret),
      });

    } catch(e) {
      console.log("Error on running command:", e);
      throw { code: 400, message: 'INTERNAL_ERROR' };
    }

  } catch (err) {
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
  }
};
