const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
const _ = require('lodash');

class ListGomiCommand {
  constructor() {
  }

  run() {
    return dynamodb
      .get({ TableName: 'gomi_sequence', Key: { key: 'gomi_tweet' } }).promise()
      .then(data => {
        const seq = data.Item.current_number;
        const param = _.rangeRight(seq, seq - 10).map(i => { return { id: i } });

        return dynamodb.batchGet({
          RequestItems: { 'gomi_tweet2': { Keys: param } }
        }).promise();
      })
  }
/*
        return dynamodb.query({
          TableName: 'gomi_tweet2',
          KeyConditionExpression: 'id >= 0',
          //ExpressionAttributeValues: { ':id': 0 },
          Limit: 5,
          ScanIndexForward: false,
          //: next,
        }).promise()
      })
      .then(data => data.Items);
*/

}

module.exports = ListGomiCommand;