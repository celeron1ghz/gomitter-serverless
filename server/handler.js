'use strict';

const vo = require('vo');

const COMMANDS = {
  list:  require('./src/ListGomiCommand'),
  tweet: require('./src/TweetCommand'),
};

module.exports.main = (event, context, callback) => {
  return vo(function*(){
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
      const ret = yield obj.run();

      return callback(null, {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(ret),
      });

    } catch(e) {
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
      body: JSON.stringify({ error: err.message }),
    });
  });
};
