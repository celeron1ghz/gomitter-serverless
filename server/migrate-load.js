const fs = require("fs");
const vo = require('vo');
const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB.DocumentClient({ convertEmptyValues: true, region: 'ap-northeast-1' });

vo(function*(){
    for (const table of ["gomi_tweet"]) {
        const data = fs.readFileSync(table + '.json');
        const tweets = JSON.parse(data);

        console.log(table, "=", tweets.length);

        let rows = [];
        let cnt = tweets.length;

        for (const t of tweets) {
            if (t.member_id === "##global##") {
                continue;
            }

            t.created_at = t.created_at + "";


            rows.push({ PutRequest: { Item: t } });
            cnt--;

            if (rows.length > 24) {
                // full-throttle on gomi2       WCU is 20
                // full-throttle on gomi_tweet2 WCU is 50
                console.log("  batchWrite... remain=", cnt);
                yield dynamodb.batchWrite({ RequestItems: { [table + "2"]: rows } }).promise();
                rows = [];
            }
        }

        yield dynamodb.batchWrite({ RequestItems: { [table + "2"]: rows } }).promise();
    }
})
.catch(err => {
    console.log(err);
})
