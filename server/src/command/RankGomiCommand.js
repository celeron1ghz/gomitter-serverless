const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
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
    let ekey = null;

    if (self.next) {
      const splitted = self.next.split(',');
      ekey = { member_id: member_id, gomi_id: splitted[0], count: +splitted[1] };
    }

      const ret = await dynamodb.query({
        TableName: 'gomi_rank2',
        IndexName: 'gomi_rank2_gsi',
        KeyConditionExpression: 'member_id = :id',
        ExpressionAttributeNames:  { '#count': 'count' },
        ExpressionAttributeValues: { ':id': member_id },
        Limit: 10,
        ExclusiveStartKey: ekey,
        ScanIndexForward: false,
        ProjectionExpression: 'gomi_id, #count',
      }).promise().then(data => {
        const ekey = data.LastEvaluatedKey;
        return {
          tweets: data.Items,
          next: ekey ? [ekey.gomi_id, ekey.count].join(',') : null,
        };
      });

      if (ret.tweets.length === 0) return ret;

      const ids  = _.uniqBy(ret.tweets.map(t => { return { gomi_id: t.gomi_id } }), 'gomi_id');
      const gomi = await dynamodb
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
  }
}

module.exports = RankGomiCommand;