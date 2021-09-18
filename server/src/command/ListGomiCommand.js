const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });
const _ = require('lodash');

const TWEET_PER_PAGE = 10;

class ListGomiCommand {
  constructor(args,user){
    if (args.me) {
      this.member_id = user.screen_name;
    }
    this.next      = args.next;
  }

  async run() {
    const self = this;
      const getList = self.member_id
        ? dynamodb.query({
            TableName: 'gomi_tweet2',
            IndexName: 'gomi_tweet2_gsi',
            KeyConditionExpression: 'member_id = :id',
            ExpressionAttributeValues: { ':id': self.member_id },
            Limit: TWEET_PER_PAGE,
            ExclusiveStartKey: self.next ? { member_id: self.member_id, id: self.next } : null,
            ScanIndexForward: false,
          }).promise().then(data => {
            return {
              tweets: data.Items || [],
              next: data.LastEvaluatedKey ? data.LastEvaluatedKey.id : null,
            };
          })
        : async () => {
            let seq;

            if (self.next) {
              seq = self.next;
            } else {
              const sequence = await dynamodb
                .get({ TableName: 'gomi_sequence2', Key: { key: 'gomi_tweet' } }).promise()
                .then(data => data.Item);

              if (!sequence) return { tweets: [] };

              seq = sequence.current_number;
            }

            const history_ids = _.range(seq - TWEET_PER_PAGE, seq + 1).filter(i => i > 0);
            const data = await dynamodb.batchGet({
              RequestItems: {
                'gomi_tweet2': {
                  Keys: history_ids.map(i => { return { id: i } }),
                }
              }
            }).promise();

            const ret = { tweets: _.sortBy(data.Responses.gomi_tweet2, ['id']).reverse() };

            // show paging until zero
            if (history_ids.length === TWEET_PER_PAGE + 1) {
              const last = ret.tweets.pop();
              ret.next = last.id;
            }

            return ret;
          };

      const ret = await getList;
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

      const global = await dynamodb
        .get({ TableName: 'gomi_count2', Key: { member_id: self.member_id || '##GLOBAL##' } }).promise()
        .then(data => data.Item);

      ret.count = global ? global.count : 0;

      return ret;
  }
}

module.exports = ListGomiCommand;