const aws = require('aws-sdk');
const execSync = require('child_process').execSync;

const ssm = new aws.SSM({ region: 'ap-northeast-1' });
const acm = new aws.ACM({ region: 'us-east-1' });

module.exports.OAI_ID =
  () => ssm.getParameter({ Name: '/gomitter/oai_id', WithDecryption: true }).promise()
          .then(data => data.Parameter.Value);

module.exports.CAMELON_CERT_ARN =
  () => acm.listCertificates({}).promise()
          .then(data => data.CertificateSummaryList.filter(data => data.DomainName === '*.camelon.info')[0])
          .then(data => data.CertificateArn);
