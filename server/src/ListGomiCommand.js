const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });

class ListGomiCommand {
  constructor() {
  }

  run() {
    return dynamodb.scan({
      TableName: 'gomi_tweet',
      KeyConditionExpression: 'id >= 0',
      //ExpressionAttributeValues: { ':id': 0 },
      Limit: 5,
      ScanIndexForward: false,
      //: next,
    }).promise().then(data => data.Items);
  }
}

module.exports = ListGomiCommand;