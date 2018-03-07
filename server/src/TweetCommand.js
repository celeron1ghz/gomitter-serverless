const vo = require('vo');
const crypto = require('crypto');
const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true });

function md5(val)   {
    var md5 = crypto.createHash('md5');
    md5.update(val);
    return md5.digest('hex');
}

class TweetCommand {
  constructor(args,user){
    this.member_id = user.screen_name;
    this.tweet     = args.tweet;
  }

//    const client = new Twitter({
//      consumer_key:        sess.consumerKey,
//      consumer_secret:     sess.consumerSecret,
//      access_token_key:    sess.tokenKey,
//      access_token_secret: sess.tokenSecret,
//    });
//    const ret = yield client.post('statuses/update', { status: req.body.tweet })
//        .then(data => null)
//        .catch(err => `${err[0].message} (${err[0].code})`);
//
//    if (ret != null)    {
//        res.status(403).send(ret);
//        return;
//    }

  run() {
    const self = this;

    return vo(function*(){
      // get seq no
      const seq = yield dynamodb.update({
        TableName: 'gomi_sequence2',
        Key: { key: 'gomi_tweet' },
        UpdateExpression: "ADD #count :i",
        ExpressionAttributeNames: { '#count': 'current_number' },
        ExpressionAttributeValues: {':i': 1},
        ReturnValues: 'UPDATED_NEW',
      }).promise().then(data => data.Attributes.current_number);

      const id = md5(self.tweet);
      const now = "" + Math.round(new Date().getTime() / 1000);
      const gomi = yield dynamodb.get({ TableName: 'gomi2', Key: {gomi_id:id} }).promise().then(data => data.Item);

      if (!gomi) {
        yield dynamodb.put({
          TableName: 'gomi2',
          Item: { gomi_id: id, text: self.tweet, created_by: self.member_id, count: 1 }
        }).promise();
      } else {
        yield dynamodb.update({
          TableName: 'gomi2',
          Key: { gomi_id: id },
          UpdateExpression: "ADD #count :i",
          ExpressionAttributeNames: { '#count': 'count' },
          ExpressionAttributeValues: {':i': 1},
          ReturnValues: 'NONE',
        }).promise();
      }

      // add tweet data
      yield dynamodb.put({
        TableName: 'gomi_tweet2',
        Item: { id: seq, gomi_id: id, member_id: self.member_id, created_at: now },
      }).promise();

      //count up
      yield dynamodb.update({
        TableName: 'gomi_rank2',
        Key: { gomi_id: id, member_id: self.member_id },
        UpdateExpression: "ADD #count :i",
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {':i': 1},
        ReturnValues: 'NONE',
      }).promise();

      yield dynamodb.update({
        TableName: 'gomi_rank2',
        Key: { gomi_id: id, member_id: "##GLOBAL##" },
        UpdateExpression: "ADD #count :i",
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {':i': 1},
        ReturnValues: 'NONE',
      }).promise();

      yield dynamodb.update({
        TableName: 'gomi_count2',
        Key: { member_id: self.member_id },
        UpdateExpression: "ADD #count :i",
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {':i': 1},
        ReturnValues: 'NONE',
      }).promise();

      yield dynamodb.update({
        TableName: 'gomi_count2',
        Key: { member_id: "##GLOBAL##" },
        UpdateExpression: "ADD #count :i",
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {':i': 1},
        ReturnValues: 'NONE',
      }).promise();

      return {};
    });
  }
}

module.exports = TweetCommand;