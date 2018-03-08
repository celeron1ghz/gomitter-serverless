# Gomitter Serverless （ごみったー さーばーれす）
TwitterのTimelineを荒らすやつ

#### 初代 (Perl[Amon2] + vuejs)
https://github.com/celeron1ghz/Gomitter-Web/

#### 二代目 (nodejs[express + aws-serverless-express] + vuejs)
https://github.com/celeron1ghz/gomitter-nodejs/

#### 三代目 (nodejs[serverless framework] + react)
https://github.com/celeron1ghz/gomitter-serverless/


# SETUP SERVER SIDE
## SETUP ENVIRONMENT VARIABLES
Set these value to `EC2 Parameter Store`.

 * `/twitter_oauth/jwt_token`: Secret seed for jwt


## SETUP SERVERLESS SCRIPT
```
cd client
sls deploy
```


# SETUP CLIENT SIDE
Update assets script available. Just run:

```
cd server
sh refresh-assets.sh
```

Running `yarn build`, `aws s3 sync` and `aws cloudfront create-invalidation`.
