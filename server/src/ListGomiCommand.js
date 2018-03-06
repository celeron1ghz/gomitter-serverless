const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
const vo = require('vo');
const _ = require('lodash');

const TWEET_PER_PAGE = 10;

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
            Limit: TWEET_PER_PAGE,
            ScanIndexForward: false,
          }).promise().then(data => { return { tweets: data.Items || [], next: data.LastEvaluatedKey }; })
        : vo(function*(){
            const sequence = yield dynamodb
              .get({ TableName: 'gomi_sequence2', Key: { key: 'gomi_tweet' } }).promise()
              .then(data => data.Item);

            if (!sequence) return { tweets: [] };

            const seq = sequence.current_number;
            const history_ids = _.rangeRight(seq, seq - TWEET_PER_PAGE - 1).filter(i => i > 0);

            const data = yield dynamodb.batchGet({
              RequestItems: {
                'gomi_tweet2': {
                  Keys: history_ids.map(i => { return { id: i } }),
                }
              }
            }).promise();

            const ret = { tweets: data.Responses.gomi_tweet2 };

            if (ret.tweets.length === TWEET_PER_PAGE + 1) {
              const last = ret.tweets.pop();
              ret.next = last.id;
            }

            return ret;
          });

      const ret = yield getList;
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

      ret.tweets = _.sortBy(ret.tweets, ['id']).reverse();
      return ret;
    });
  }
}

module.exports = ListGomiCommand;