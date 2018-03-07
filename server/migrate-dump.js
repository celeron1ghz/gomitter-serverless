const fs = require("fs");
const vo = require('vo');
const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true, region: 'ap-northeast-1' });

vo(function*(){
    const tweets = [];
    let lastKey = {};
    let ret;

    for (const table of ["gomi"]) {
        console.log(table, "start");

        ret = yield dynamodb.scan({ TableName: table }).promise();

        while (1) {
            lastKey = ret.LastEvaluatedKey;
            tweets.push(...ret.Items);

            console.log("TTL =", tweets.length, "ADD =", ret.Items.length, "key =", lastKey);

            if (!lastKey) break;

            ret = yield dynamodb.scan({ TableName: table, ExclusiveStartKey: lastKey }).promise();
        }

        fs.writeFile(table + '.json', JSON.stringify(tweets));
        console.log(table, "finished");
    }
})
.catch(err => {
    console.log(err);
})
