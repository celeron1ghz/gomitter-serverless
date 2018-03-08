const _ = require('lodash');
const fs = require("fs");
const vo = require('vo');
const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true, region: 'ap-northeast-1' });

vo(function*(){
    const table ="gomi_tweet";
    const data = fs.readFileSync(table + '.json');
    const tweets = JSON.parse(data);

    let total = 0;
    const member_count = {};
    const gomi_count = {};
    const member_gomi_count = {};

    for (const t of tweets) {
        if (t.member_id === "##global##") {
            continue;
        }

        total += 1;

        const label = t.member_id + '@' + t.gomi_id;
        if (!member_gomi_count[label]) member_gomi_count[label] = 0;
        member_gomi_count[label] += 1;

        if (!member_count[label]) member_count[label] = 0;
        member_count[label] += 1;

        if (!gomi_count[t.gomi_id]) gomi_count[t.gomi_id] = 0;
        gomi_count[t.gomi_id] += 1;
    }
    let queue;
    let chunk;

/*
    // this section's WCU is 200
    console.log("creating total...", total);
    yield dynamodb.update({
        TableName: 'gomi_count2',
        Key: { member_id: '##GLOBAL##' },
        UpdateExpression: "SET #count = :i",
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: {':i': total},
        ReturnValues: 'NONE',
    }).promise();

    console.log("creating member total count...", Object.keys(member_count).length);
    queue = [];
    for (const member_id of Object.keys(member_count) ) {
        const count = member_count[member_id];

        queue.push(dynamodb.update({
            TableName: 'gomi_count2',
            Key: { member_id: member_id },
            UpdateExpression: "SET #count = :i",
            ExpressionAttributeNames: { '#count': 'count' },
            ExpressionAttributeValues: {':i': count },
            ReturnValues: 'NONE',
        }).promise());
    }
    console.log("querying...", queue.length);
    chunk = _.chunk(queue, 1000);
    for (const q of chunk) {
      console.log("request", q.length, "...");
      yield Promise.all(q).catch(err => { console.log(err) });
    }
    console.log("finished", queue.length);
*/

/*
    // this section's WCU is 200
    console.log("creating gomi total count...", Object.keys(gomi_count).length);
    queue = [];
    for (const gomi_id of Object.keys(gomi_count) ) {
        const count = gomi_count[gomi_id];

        queue.push(dynamodb.update({
            TableName: 'gomi_rank2',
            Key: { member_id: '##GLOBAL##', gomi_id: gomi_id },
            UpdateExpression: "SET #count = :i",
            ExpressionAttributeNames: { '#count': 'count' },
            ExpressionAttributeValues: {':i': count },
            ReturnValues: 'NONE',
        }).promise());
    }

    console.log("creating gomi each count...", Object.keys(member_gomi_count).length);
    for (const label of Object.keys(member_gomi_count) ) {
        const count = member_gomi_count[label];
        const splitted = label.split('@');
        const member_id = splitted[0];
        const gomi_id   = splitted[1];

        queue.push(dynamodb.update({
            TableName: 'gomi_rank2',
            Key: { member_id: member_id, gomi_id: gomi_id },
            UpdateExpression: "SET #count = :i",
            ExpressionAttributeNames: { '#count': 'count' },
            ExpressionAttributeValues: {':i': count },
            ReturnValues: 'NONE',
        }).promise());
    }

    console.log("querying...", queue.length);
    chunk = _.chunk(queue, 1000);
    for (const q of chunk) {
      console.log("request", q.length, "...");
      yield Promise.all(q).catch(err => { console.log(err) });
    }
    console.log("finished", queue.length);
*/

})
.catch(err => {
    console.log(err);
});
