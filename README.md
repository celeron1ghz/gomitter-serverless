# Gomitter Serverless （ごみったー さーばーれす）
TwitterのTimelineを荒らすやつ

#### 初代 (Perl)
https://github.com/celeron1ghz/Gomitter-Web/

#### 二代目 (nodejs + express + aws-serverless-express)
https://github.com/celeron1ghz/gomitter-nodejs/

#### 三代目 (nodejs with serverless framework + react)
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
Using `create-react-app`. Just build and deploy.

```
cd client
yarn build
cd build
aws s3 sync . s3://your-public-bucket --acl public-read
```
