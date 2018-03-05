const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
const vo = require('vo');
const _ = require('lodash');

class RankGomiCommand {
  constructor(args,user){
    this.member_id = args.member_id;
  }

  run() {
    const self = this;
    const member_id = self.member_id || '##GLOBAL##';
    return vo(function*(){
      const tweets = yield dynamodb.query({
        TableName: 'gomi_rank2',
        KeyConditionExpression: 'member_id = :id',
        ExpressionAttributeNames:  { '#count': 'count' },
        ExpressionAttributeValues: { ':id': member_id },
        Limit: 20,
        ScanIndexForward: false,
        ProjectionExpression: 'gomi_id, #count',
      }).promise().then(data => data.Items);

      if (tweets.length === 0) return [];

      const ids  = _.uniqBy(tweets.map(t => { return { gomi_id: t.gomi_id } }), 'gomi_id');
      const gomi = yield dynamodb
        .batchGet({ RequestItems: { 'gomi2': { Keys: ids } } }).promise()
        .then(data => data.Responses.gomi2);

      const gomiIdx = {};

      for (const g of gomi) {
        gomiIdx[g.gomi_id] = g.text;
      }

      for (const t of tweets) {
        t.tweet = gomiIdx[t.gomi_id];
        delete t.gomi_id;
      }

      return tweets;
    });
  }
}

module.exports = RankGomiCommand;