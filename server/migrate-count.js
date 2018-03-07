const fs = require("fs");
const vo = require('vo');
const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true, region: 'ap-northeast-1' });

vo(function*(){
    let count = 0;
    let lastKey = {};
    let ret;

    for (const table of ["gomi2", "gomi_tweet2"]) {
        console.log(table, "start");

        ret = yield dynamodb.scan({ TableName: table, Select: 'COUNT' }).promise();

        while (1) {
            lastKey = ret.LastEvaluatedKey;
            count += ret.Count;

            console.log("  ...", count);

            if (!lastKey) break;

            ret = yield dynamodb.scan({ TableName: table, Select: 'COUNT', ExclusiveStartKey: lastKey }).promise();
        }

        console.log(table, "finished. count is", count);
    }
})
.catch(err => {
    console.log(err);
})
