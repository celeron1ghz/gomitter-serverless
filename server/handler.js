'use strict';

const vo = require('vo');

const COMMANDS = {

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


    try {
      const ret = yield new cmd(body).run();
      return callback(null, {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': event.headers.origin,
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(ret),
      });

    } catch(e) {
      console.log(e);
      throw { code: 400, message: 'INVALID_PARAM' };
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
      headers: {
        'Access-Control-Allow-Origin': event.headers.origin,
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: err.message }),
    });
  });
};
