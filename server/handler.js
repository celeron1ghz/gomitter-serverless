'use strict';

module.exports.main = (event, context, callback) => {
  return callback(null, {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': event.headers.origin,
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ mess: "Hello!" }),
  });
};
