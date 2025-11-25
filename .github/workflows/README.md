# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### `deploy-lambda.yml`

Automatically deploys the Lambda function code to AWS when changes are made to the Lambda code.

**Triggers:**
- Push to `infrastructure/lambda/reminder-processor/**`
- Manual trigger via GitHub Actions UI

**Required Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS access key with Lambda update permissions
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key

**What it does:**
1. Checks out the code
2. Sets up Node.js 20
3. Installs Lambda dependencies (production only)
4. Creates a deployment zip package
5. Deploys to AWS Lambda
6. Verifies the deployment

## Setting up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

   - **Name:** `AWS_ACCESS_KEY_ID`
     **Value:** Your AWS access key ID
   
   - **Name:** `AWS_SECRET_ACCESS_KEY`
     **Value:** Your AWS secret access key

**Important:** The AWS credentials must have the following permissions:
- `lambda:UpdateFunctionCode`
- `lambda:GetFunction`
- `lambda:ListFunctions` (optional, for verification)

You can create an IAM user with a policy like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:*:function:ReminderProcessor"
    }
  ]
}
```

## Manual Deployment

You can manually trigger the workflow:

1. Go to **Actions** tab in GitHub
2. Select **Deploy Lambda Function** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Monitoring

- View workflow runs in the **Actions** tab
- Check CloudWatch Logs for Lambda execution logs
- Monitor deployment status in the workflow output

