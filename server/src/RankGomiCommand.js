const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
const vo = require('vo');
const _ = require('lodash');

class RankGomiCommand {
  constructor(args,user){
    if (args.me) {
      this.member_id = user.screen_name;
    }
    this.next      = args.next;
  }

  run() {
    const self = this;
    const member_id = self.member_id || '##GLOBAL##';
    return vo(function*(){
      const ret = yield dynamodb.query({
        TableName: 'gomi_rank2',
        IndexName: 'gomi_rank2_gsi',
        KeyConditionExpression: 'member_id = :id',
        ExpressionAttributeNames:  { '#count': 'count' },
        ExpressionAttributeValues: { ':id': member_id },
        Limit: 10,
        ExclusiveStartKey: self.next ? { member_id: member_id, gomi_id: self.next } : null,
        ScanIndexForward: false,
        ProjectionExpression: 'gomi_id, #count',
      }).promise().then(data => {
        console.log(data.LastEvaluatedKey)
        return {
          tweets: data.Items,
          next: data.LastEvaluatedKey ? data.LastEvaluatedKey.gomi_id : null,
        };
      });

      if (ret.tweets.length === 0) return ret;

      const ids  = _.uniqBy(ret.tweets.map(t => { return { gomi_id: t.gomi_id } }), 'gomi_id');
      const gomi = yield dynamodb
        .batchGet({ RequestItems: { 'gomi2': { Keys: ids } } }).promise()
        .then(data => data.Responses.gomi2);

      const gomiIdx = {};

      for (const g of gomi) {
        gomiIdx[g.gomi_id] = g.text;
      }

      for (const t of ret.tweets) {
        t.tweet = gomiIdx[t.gomi_id];
        delete t.gomi_id;
      }

      return ret;
    });
  }
}

module.exports = RankGomiCommand;