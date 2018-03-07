# Gomitter Serverless （ごみったー さーばーれす）
TwitterのTimelineを荒らすやつ

#### 初代 (Perl)
https://github.com/celeron1ghz/Gomitter-Web/

#### 二代目 (nodejs + express + aws-serverless-express)
https://github.com/celeron1ghz/gomitter-nodejs/

#### 三代目 (nodejs with serverless framework)
https://github.com/celeron1ghz/gomitter-serverless/


# SETUP SERVER SIDE
## SETUP ENVIRONMENT VARIABLES
Set these value to `EC2 Parameter Store`.

 * `/slack/webhook/dev`: Slack incoming webhook URL


## SETUP SERVERLESS SCRIPT
```
git clone https://github.com/celeron1ghz/lambda-aws-billing-notifier.git
cd twitter-bot-mimin
sls deploy
```


# SETUP CLIENT SIDE
TDB
