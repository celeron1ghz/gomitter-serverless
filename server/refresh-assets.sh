#!/bin/sh
cd `dirname $0`
cd ../client

echo building...
yarn build

echo syncing...
cd build
aws s3 sync . s3://gomitter-server

echo invalidation...
DIST_ID=`aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='gomitter web assets'].Id" --output text`
NOW=`date +%s`
aws cloudfront create-invalidation --distribution-id $DIST_ID --invalidation-batch "Paths={Quantity=1,Items=[/*]},CallerReference=$NOW"