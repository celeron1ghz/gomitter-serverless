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
    //this.member_id = args.member_id;
    //this.tweet     = args.tweet;

    this.member_id = "mogemoge";
    this.tweet     = "" + new Date().getTime();
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
      const gomi = yield dynamodb.get({ TableName: 'gomi2', Key: {gomi_id:id} }).promise();

      if (!gomi.Item) {
        yield dynamodb.put({
          TableName: 'gomi2',
          Item: { gomi_id: id, text: self.tweet, created_by: self.member_id }
        }).promise();
      }

      yield dynamodb.put({
        TableName: 'gomi_tweet2',
        Item: { id: seq, gomi_id: id, member_id: self.member_id, created_at: now },
      }).promise();

      return {};
    });
  }
}

module.exports = TweetCommand;