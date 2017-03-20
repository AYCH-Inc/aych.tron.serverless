const fs = require('fs');
const Generator = require('yeoman-generator');

const buildPolicy = (serviceName, stage, region) => {
  return {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "cloudformation:List*",
          "cloudformation:Get*",
          "cloudformation:PreviewStackUpdate"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action":[
          "cloudformation:CreateStack",
          "cloudformation:CreateUploadBucket",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResource",
          "cloudformation:DescribeStackResources",
          "cloudformation:UpdateStack",
          "cloudformation:DescribeStacks"
        ],
        "Resource": `arn:aws:cloudformation:${region}:*:stack/${serviceName}-${stage}/*`
      },
      {
        "Effect": "Allow",
        "Action": [
          "lambda:Get*",
          "lambda:List*",
          "lambda:CreateFunction"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:CreateBucket"
        ],
        "Resource": [
          `arn:aws:s3:::${serviceName}*serverlessdeploymentbucket*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:DeleteBucket",
          "s3:ListBucketVersions"
        ],
        "Resource": [
          `arn:aws:s3:::${serviceName}*serverlessdeploymentbucket*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "lambda:AddPermission",
          "lambda:CreateAlias",
          "lambda:DeleteFunction",
          "lambda:InvokeFunction",
          "lambda:PublishVersion",
          "lambda:RemovePermission",
          "lambda:Update*"
        ],
        "Resource": `arn:aws:lambda:${region}:*:function:${serviceName}-${stage}-*`
      },
      {
        "Effect": "Allow",
        "Action": [
          "apigateway:GET"
        ],
        "Resource": [
          "arn:aws:apigateway:*::/restapis"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "apigateway:GET",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:DELETE"
        ],
        "Resource": [
          "arn:aws:apigateway:*::/restapis/*/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "iam:PassRole"
        ],
        "Resource": "arn:aws:iam::*:role/*"
      },
      {
        "Effect": "Allow",
        "Action": "kinesis:*",
        "Resource": `arn:aws:kinesis:*:*:stream/${serviceName}-${stage}-${region}`
      },
      {
        "Effect": "Allow",
        "Action": "iam:*",
        "Resource": `arn:aws:iam::*:role/${serviceName}-${stage}-${region}-lambdaRole`
      },
      {
        "Effect": "Allow",
        "Action": "sqs:*",
        "Resource": `arn:aws:sqs:*:*:${serviceName}-${stage}-${region}`
      },
      {
        "Effect":"Allow",
        "Action":[
          "cloudwatch:GetMetricStatistics"
        ],
        "Resource":[
          "*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents"
        ],
        "Resource": [
          "*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "events:Put*",
          "events:Remove*",
          "events:Delete*"
        ],
        "Resource": `arn:aws:events:*:*:rule/${serviceName}-${stage}-${region}`
      }
    ]
  };
};

const escapeValFilename = function (val) {
  return (val === '*') ? '_star_' : val;
};

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('project', {
      description: 'The name of the Serverless project',
      type: String
    });
    this.option('stage', {
      description: 'The name of a single stage to target',
      type: String,
      default: '*'
    });
    this.option('region', {
      description: 'The name of a single region to target',
      type: String,
      default: '*'
    });
  }

  prompting() {
    return this.prompt([{
      type: 'input',
      name: 'name',
      message: 'Your Serverless service name',
      default: this.appname // Default to current folder name
    }, {
      type: 'input',
      name: 'stage',
      message: 'You can specify a specific stage, if you like:',
      default: '*'
    }, {
      type: 'input',
      name: 'region',
      message: 'You can specify a specific region, if you like:',
      default: '*'
    }, {
      type    : 'confirm',
      name    : 'dynamodb',
      message : 'Does your service rely on DynamoDB?'
    }]).then((answers) => {
      this.slsSettings = {
        name: answers.name,
        stage: answers.stage,
        region: answers.region,
        dynamodb: answers.dynamodb
      };
      this.log('app name', answers.name);
      this.log('app stage', answers.stage);
      this.log('app region', answers.region);
    });
  }

  writing() {
    const done = this.async();

    const project = this.slsSettings.name;
    const stage = this.slsSettings.stage;
    const region = this.slsSettings.region;

    const policy = buildPolicy(project, stage, region);
    if(this.slsSettings.dynamodb) {
      policy.Statement.push({
        "Effect": "Allow",
        "Action": [
          "dynamodb:*"
        ],
        "Resource": [
          "arn:aws:dynamodb:*:*:table/*"
        ]
      });
    }
    const policyString = JSON.stringify(policy);
    const fileName = `${project}-${escapeValFilename(stage)}-${escapeValFilename(region)}-policy.json`;

    this.log(`Writing to ${fileName}`);
    fs.writeFile(fileName, policyString, done);

  }


};