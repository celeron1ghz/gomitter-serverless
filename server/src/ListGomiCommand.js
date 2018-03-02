const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
const vo = require('vo');
const _ = require('lodash');

class ListGomiCommand {
  constructor(args,user){
    this.member_id = args.member_id;
  }

  run() {
    const self = this;
    return vo(function*(){
      const getList = self.member_id
        ? dynamodb.query({
            TableName: 'gomi_tweet2',
            IndexName: 'gomi_tweet2_gsi',
            KeyConditionExpression: 'member_id = :id',
            ExpressionAttributeValues: { ':id': self.member_id },
            Limit: 20,
            ScanIndexForward: false,
          }).promise().then(data => data.Items)
        : vo(function*(){
            const sequence = yield dynamodb
              .get({ TableName: 'gomi_sequence2', Key: { key: 'gomi_tweet' } }).promise()
              .then(data => data.Item);

            if (!sequence) return [];

            const seq = sequence.current_number;
            const history_ids = _.rangeRight(seq, seq - 20).map(i => { return { id: i } });
            console.log("TOP:", seq);

            return yield dynamodb
              .batchGet({ RequestItems: { 'gomi_tweet2': { Keys: history_ids } } }).promise()
              .then(data => data.Responses.gomi_tweet2);
          });

      const tweets = yield getList;

      if (tweets.length === 0) return [];

      const ids  = _.uniqBy(tweets.map(t => { return { gomi_id: t.gomi_id } }), 'gomi_id');
      const gomi = yield dynamodb
        .batchGet({ RequestItems: { 'gomi': { Keys: ids } } }).promise()
        .then(data => data.Responses.gomi);

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

module.exports = ListGomiCommand;