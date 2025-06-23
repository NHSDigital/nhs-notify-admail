# Setup Steps for Local Development

## Setting up Terraform
- Install terraform globally! if on Mac, you can use "brew install terraform"
- Copy the [dev.auto.tfvars.json.example](./dev.auto.tfvars.json.example) file, taking away the .example, these settings will be loaded automatically when you dev locally
- Follow the below "Setting up the AWS CLI using SSO, to allow terraform to run locally"
- Navigate to the terraform directory
- Type "terraform init"
- If it complains about the Amplify app not being set up, follow the steps in the below section <b>"Creating and linking the Amplify App to Terraform"</b>
- Your Terraform is now set up!

## Setting up the AWS CLI using SSO, to allow terraform to run locally
- Install the AWS CLI, On mac you can use "brew install awscli"
- Type "aws configure sso" into the command line, and enter the following;
SSO session name: notifai
SSO Start URL: Enter Start URL
SSO Region: eu-west-1
SSO Registration scopes: sso:account:access

If Prompted, use AWS account "[[REPLACE-AWSACCOUNTNUMBER]]". it won't ask, if this is the only AWS account you have access to.
Once redirected, log in with your account, and follow the prompts as indicated
CLI default client Region: eu-west-1
CLI default output format: json
CLI profile name: default (If you don't make it use the default profile, terraform won't work automatically and will require extra work!)
Then run "aws sts get-caller-identity". If it gives you your UserID, Account and ARN, your SSO is set up correctly 🎉

You can login in future if neccesary using: "aws sso login --profile default", or re-running "aws configure sso" with the defaults

If you need to set up your sso again, delete Users/*User*/.aws/config

Note: If you fail, with an error where sso_region and sso_start_url aren't working, you can go to Enter Start URL, click on "get access keys" and implement the variables from one of the options, and try again